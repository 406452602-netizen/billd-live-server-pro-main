import { getRandomOne, getRangeRandom } from 'billd-utils';
import { ParameterizedContext } from 'koa';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import { mq } from '@/config/rabbitmq';
import {
  COMMON_HTTP_CODE,
  IM_NAMESPACE,
  IM_RABBITMQ_EXCHANGE,
  IM_REDIS_KEY,
  PROJECT_ENV,
} from '@/constant';
import liveController from '@/controller/live.controller';
import liveViewController from '@/controller/liveView.controller';
import wsUserMessageController from '@/controller/wsUserMessage.controller';
import { CustomError } from '@/model/customError.model';
import { strSlice } from '@/utils';

import liveRecordController from './liveRecord.controller';
import redisController from './redis.controller';
import wsMessageController from './wsMessage.controller';

class WsController {
  common = {
    getAllWsClusterInfo: async () => {
      const res = await redisController.getAllHashVal(
        IM_REDIS_KEY.clusterWsMap
      );
      const host_list = res.map((v) => {
        const item = JSON.parse(v);
        return item.value;
      });
      return host_list;
    },
    getLiveRoomClusterInfo: async (roomId: string) => {
      const res = await redisController.getAllHashField(
        IM_REDIS_KEY.liveRoomClusterInfo + roomId
      );
      return Object.keys(res);
    },

    getChatClusterInfo: async (userId: string) => {
      const res = await redisController.getAllHashField(
        IM_REDIS_KEY.chatRoomClusterInfo + IM_NAMESPACE.chat + userId
      );
      return Object.keys(res);
    },
  };

  sendMsg = async (ctx: ParameterizedContext, next) => {
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const data = ctx.request.body;
    const liveRoomId = data.live_room_id;
    if (!liveRoomId) {
      return;
    }
    const recRes = await liveController.common.findLiveRecordByLiveRoomId(
      liveRoomId
    );
    const live_record_id = recRes?.live_record_id;
    let { client_env, client_app, client_app_version, client_ip, user_agent } =
      ctx.request.body;
    const { headers } = ctx.request;
    if (!client_env) {
      client_env = strSlice(String(headers['x-billd-env']), 90);
    }
    if (!client_app) {
      client_app = strSlice(String(headers['x-billd-app']), 90);
    }
    if (!client_app_version) {
      client_app_version = strSlice(String(headers['x-billd-appver']), 90);
    }
    if (!client_ip) {
      client_ip = strSlice(String(headers['x-real-ip']), 90);
    }
    if (!user_agent) {
      user_agent = strSlice(String(headers['user-agent']), 490);
    }
    await wsMessageController.common.create({
      user_id: userInfo.id,
      live_room_id: liveRoomId,
      live_record_id,
      msg_type: data.msg_type,
      content_type: data.content_type,
      content: data.content,
      origin_content: data.content,
      username: userInfo.username,
      origin_username: userInfo.username,
      send_msg_time: data.send_msg_time,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      user_agent,
    });
    if (live_record_id) {
      const danmu = await wsMessageController.common.getCountByLiveRecordId(
        live_record_id
      );
      await liveRecordController.common.update({ id: live_record_id, danmu });
    }
    // 1.先查找该房间在哪些集群
    // 2.往这些集群广播消息
    const liveRoomClusterInfo = await this.common.getLiveRoomClusterInfo(
      liveRoomId
    );
    console.log('liveRoomClusterInfo', liveRoomClusterInfo);
    liveRoomClusterInfo.forEach((cluster) => {
      if (mq.channel) {
        const prefix = `billd-im-server-${PROJECT_ENV}-`;
        mq.channel
          ?.assertExchange(
            IM_RABBITMQ_EXCHANGE.fanoutMessage(`${prefix}${cluster}`),
            'fanout',
            {
              durable: false,
            }
          )
          .then(() => {
            mq.channel?.publish(
              IM_RABBITMQ_EXCHANGE.fanoutMessage(`${prefix}${cluster}`),
              '',
              Buffer.from(
                JSON.stringify({
                  ...data,
                  namespace: IM_NAMESPACE.live,
                  user: {
                    username: userInfo.username,
                    avatar: userInfo.avatar,
                  },
                })
              )
            );
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });

    successHandler({ ctx });
    await next();
  };

  sendUserMsg = async (ctx: ParameterizedContext, next) => {
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    let data = ctx.request.body;

    data = { ...data, source_user_id: userInfo.id };
    await wsUserMessageController.common.create({
      ...data,
    });

    const chatRoomClusterInfo = await this.common.getChatClusterInfo(
      data.target_user_id
    );
    // 1.先查找该房间在哪些集群
    // 2.往这些集群广播消息
    console.log('liveRoomClusterInfo', chatRoomClusterInfo);
    chatRoomClusterInfo.forEach((cluster) => {
      if (mq.channel) {
        const prefix = `billd-im-server-${PROJECT_ENV}-`;
        mq.channel
          ?.assertExchange(
            IM_RABBITMQ_EXCHANGE.fanoutMessage(`${prefix}${cluster}`),
            'fanout',
            {
              durable: false,
            }
          )
          .then(() => {
            mq.channel?.publish(
              IM_RABBITMQ_EXCHANGE.fanoutMessage(`${prefix}${cluster}`),
              '',
              Buffer.from(
                JSON.stringify({
                  ...data,
                  namespace: IM_NAMESPACE.chat,
                  user: {
                    username: userInfo.username,
                    avatar: userInfo.avatar,
                  },
                })
              )
            );
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });

    successHandler({ ctx });
    await next();
  };

  join = async (ctx: ParameterizedContext, next) => {
    const { live_room_id, socket_id, host } = ctx.request.body;
    if (!live_room_id) {
      throw new CustomError({
        msg: 'live_room_id错误',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const host_list = await this.common.getAllWsClusterInfo();
    const index = getRandomOne([0, host_list.length - 1]);

    successHandler({ ctx, data: { host_list, index } });

    await next();
  };

  keepJoined = async (ctx: ParameterizedContext, next) => {
    const { uuid, live_room_id, duration, cluster_id } = ctx.request.body;

    const { userInfo } = await authJwt(ctx);

    await redisController.setExpire({
      key: `${IM_REDIS_KEY.join}${String(uuid)}`,
      seconds: 30,
    });
    const recRes = await liveController.common.findLiveRecordByLiveRoomId(
      live_room_id
    );
    const live_record_id = recRes?.live_record_id;
    if (!live_record_id) {
      successHandler({ ctx, data: 'live_record_id为空' });
      await next();
      return;
    }
    if (userInfo?.id) {
      const [affectedCount] = await liveViewController.common.updateDuration({
        live_record_id,
        live_room_id,
        duration,
        user_id: userInfo.id,
      });
      if (!affectedCount) {
        let { client_env, client_app, client_app_version, client_ip } =
          ctx.request.body;
        const { headers } = ctx.request;
        if (!client_env) {
          client_env = strSlice(String(headers['x-billd-env']), 90);
        }
        if (!client_app) {
          client_app = strSlice(String(headers['x-billd-app']), 90);
        }
        if (!client_app_version) {
          client_app_version = strSlice(String(headers['x-billd-appver']), 90);
        }
        if (!client_ip) {
          client_ip = strSlice(String(headers['x-real-ip']), 90);
        }
        await liveViewController.common.create({
          live_record_id,
          live_room_id,
          duration,
          user_id: userInfo.id,
          client_ip,
          client_app,
          client_app_version,
          client_env,
        });
      }
    }

    successHandler({ ctx, data: 'ok' });

    await next();
  };

  getWsInfo = async (ctx: ParameterizedContext, next) => {
    const host_list = await this.common.getAllWsClusterInfo();
    const index = getRangeRandom(0, host_list.length - 1);
    successHandler({ ctx, data: { host_list, index } });

    await next();
  };

  addClusterWs = async (ctx: ParameterizedContext, next) => {
    const { id, host, protocol } = ctx.request.body;
    if (!id || !host || !protocol) {
      throw new CustomError({
        msg: 'id, host, protocol错误',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await redisController.setHashVal({
      key: IM_REDIS_KEY.clusterWsMap,
      value: { id, host, protocol },
      field: id,
    });
    successHandler({ ctx });

    await next();
  };

  delClusterWs = async (ctx: ParameterizedContext, next) => {
    const { id } = ctx.request.body;
    if (!id) {
      throw new CustomError({
        msg: 'id错误',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await redisController.delHashVal({
      key: IM_REDIS_KEY.clusterWsMap,
      field: id,
    });
    successHandler({ ctx });

    await next();
  };
}

export default new WsController();
