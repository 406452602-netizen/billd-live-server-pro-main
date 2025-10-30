import axios from 'axios';
import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';
import { wsSocket } from '@/config/websocket';
import liveRedisController from '@/config/websocket/live-redis.controller';
import {
  PROJECT_ENV,
  PROJECT_ENV_ENUM,
  REDIS_KEY,
  SRS_CB_URL_QUERY,
} from '@/constant';
import liveController from '@/controller/live.controller';
import liveRecordController from '@/controller/liveRecord.controller';
import { SRS_CONFIG } from '@/secret/secret';
import { LiveRoomTypeEnum } from '@/types/ILiveRoom';
import { IApiV1Clients, IApiV1Streams, ISrsCb, ISrsRTC } from '@/types/srs';
import { WsMsgTypeEnum } from '@/types/websocket';
import { getForwardMapUrl } from '@/utils';
import { liveRoomVerifyAuth } from '@/utils/business';
import { chalkERROR, chalkSUCCESS, chalkWARN } from '@/utils/chalkTip';
import { forwardThirdPartyLiveStreaming } from '@/utils/process';
import { myaxios } from '@/utils/request';

import redisController from './redis.controller';

class SRSController {
  allowDev = true;

  common = {
    isLive: async (roomId: number) => {
      try {
        const liveRes = await liveController.common.findByLiveRoomId(
          Number(roomId)
        );
        return !!liveRes;
      } catch (error) {
        console.log(error);
        return true;
      }
    },
    closeLive: async ({ live_room_id }: { live_room_id: number }) => {
      const liveRes =
        await liveController.common.findByLiveRoomIdAndLiveRoomType({
          live_room_id: Number(live_room_id),
        });
      if (liveRes?.id) {
        await redisController.delByPrefix({
          prefix: `${REDIS_KEY.srsPublishing + String(live_room_id)}`,
        });
        await liveController.common.updateByIdAndLiveRoomType({
          id: liveRes.id,
          remark: 'closeLive-srs',
        });
        await liveController.common.delete(liveRes.id);
        await liveRecordController.common.update({
          id: liveRes.live_record_id,
          // @ts-ignore
          end_time: +new Date(),
        });
        const res = await this.common.deleteApiV1Clients(
          liveRes?.flag_id || ''
        );
        return {
          code: 0,
          res,
          flag_id: liveRes?.flag_id,
        };
      }
      return { code: -1, live_room_id, msg: '没有直播记录' };
    },
    handleUnpublish: async ({ live_room_id, flag_id }) => {
      const liveRes = await liveController.common.findOne({
        live_room_id: Number(live_room_id),
        live_room_type: LiveRoomTypeEnum.srs,
        flag_id,
      });
      await redisController.delByPrefix({
        prefix: `${REDIS_KEY.srsPublishing + String(live_room_id)}`,
      });
      if (liveRes?.id) {
        await liveController.common.update({
          id: liveRes.id,
          remark: 'handleUnpublish-closeLive-srs',
        });
        await liveController.common.delete(liveRes.id);
        await liveRecordController.common.update({
          id: liveRes.live_record_id,
          // @ts-ignore
          end_time: +new Date(),
        });
        this.common.deleteApiV1Clients(liveRes?.flag_id || '');
      }
    },
    getApiV1ClientDetail: (clientId: string) =>
      myaxios.get(`${SRS_CONFIG.httpApi}/api/v1/clients/${clientId}`),
    getApiV1StreamsDetail: (streamsId: string) =>
      myaxios.get(`${SRS_CONFIG.httpApi}/api/v1/streams/${streamsId}`),
    getApiV1Clients: ({ start, count }: { start: number; count: number }) =>
      myaxios.get<IApiV1Clients>(
        `${SRS_CONFIG.httpApi}/api/v1/clients/?start=${start}&count=${count}`
      ),
    getApiV1Streams: ({ start, count }: { start: number; count: number }) =>
      myaxios.get<IApiV1Streams>(
        `${SRS_CONFIG.httpApi}/api/v1/streams/?start=${start}&count=${count}`
      ),
    deleteApiV1Clients: (clientId: string) =>
      myaxios.delete(`${SRS_CONFIG.httpApi}/api/v1/clients/${clientId}`),
    getPullUrl: (data: { liveRoomId: number }) => {
      const http = PROJECT_ENV === PROJECT_ENV_ENUM.dev ? 'http' : 'https';
      return {
        rtmp: `rtmp://${SRS_CONFIG.PullDomain}/${SRS_CONFIG.AppName}/roomId___${data.liveRoomId}`,
        flv: `${http}://${SRS_CONFIG.PullDomain}/${SRS_CONFIG.AppName}/roomId___${data.liveRoomId}.flv`,
        hls: `${http}://${SRS_CONFIG.PullDomain}/${SRS_CONFIG.AppName}/roomId___${data.liveRoomId}.m3u8`,
        webrtc: `webrtc://${SRS_CONFIG.PullDomain}/${SRS_CONFIG.AppName}/roomId___${data.liveRoomId}`,
      };
    },
    getPushUrl: (data: {
      /** yes不需要鉴权，no需要鉴权 */
      isdev: 'yes' | 'no';
      liveRoomId: number;
      userId: number;
      type: LiveRoomTypeEnum;
      key: string;
    }) => {
      const pushParams = (type: LiveRoomTypeEnum) =>
        `?${SRS_CB_URL_QUERY.roomId}=${data.liveRoomId}&${SRS_CB_URL_QUERY.publishType}=${type}&${SRS_CB_URL_QUERY.publishKey}=${data.key}&${SRS_CB_URL_QUERY.userId}=${data.userId}&${SRS_CB_URL_QUERY.isdev}=${data.isdev}`;
      return {
        rtmp_url: `rtmp://${SRS_CONFIG.PushDomain}/${
          SRS_CONFIG.AppName
        }/roomId___${data.liveRoomId}${pushParams(data.type)}`,
        obs_server: `rtmp://${SRS_CONFIG.PushDomain}/${SRS_CONFIG.AppName}/roomId___${data.liveRoomId}`,
        obs_stream_key: pushParams(LiveRoomTypeEnum.obs),
        webrtc_url: `webrtc://${SRS_CONFIG.PushDomain}/${
          SRS_CONFIG.AppName
        }/roomId___${data.liveRoomId}${pushParams(data.type)}`,
        srt_url: ``,
      };
    },
  };

  rtcV1Publish = async (ctx: ParameterizedContext, next) => {
    const { sdp, streamurl }: ISrsRTC = ctx.request.body;
    const res = await myaxios.post(`${SRS_CONFIG.httpApi}/rtc/v1/publish/`, {
      sdp,
      streamurl,
    });
    successHandler({
      ctx,
      data: res,
    });
    await next();
  };

  rtcV1Play = async (ctx: ParameterizedContext, next) => {
    const { sdp, streamurl }: ISrsRTC = ctx.request.body;
    const res = await myaxios.post(`${SRS_CONFIG.httpApi}/rtc/v1/play/`, {
      sdp,
      streamurl,
    });
    successHandler({
      ctx,
      data: res,
    });
    await next();
  };

  rtcV1Whep = async (ctx: ParameterizedContext, next) => {
    const { app, stream, sdp }: { app: string; stream: string; sdp: string } =
      ctx.request.body;
    // WARN 线上服务器的是whip-play
    const res = await axios.post(
      `${SRS_CONFIG.httpApi}/rtc/v1/whip-play/?app=${app}&stream=${stream}`,
      sdp
    );
    // WARN 本地测试的是whep
    // const res = await axios.post(
    //   `${SRS_CONFIG.httpApi}/rtc/v1/whep/?app=${app}&stream=${stream}`,
    //   sdp
    // );
    successHandler({
      ctx,
      data: { answer: res.data },
    });
    await next();
  };

  getApiV1Streams = async (ctx: ParameterizedContext, next) => {
    const { start, count }: any = ctx.request.query;
    const res = await this.common.getApiV1Streams({ start, count });
    successHandler({
      ctx,
      data: res,
    });
    await next();
  };

  getApiV1Clients = async (ctx: ParameterizedContext, next) => {
    const { start, count }: any = ctx.request.query;
    const res = await this.common.getApiV1Clients({ start, count });
    successHandler({
      ctx,
      data: res,
    });
    await next();
  };

  /** 踢掉观众 */
  deleteAudience = async (ctx: ParameterizedContext, next) => {
    successHandler({
      ctx,
    });
    await next();
  };

  deleteApiV1Clients = async (ctx: ParameterizedContext, next) => {
    successHandler({
      ctx,
    });
    await next();
  };

  onStop = async (ctx: ParameterizedContext, next) => {
    ctx.body = { code: 0, msg: '[on_stop] all success, pass' };
    await next();
  };

  onPlay = async (ctx: ParameterizedContext, next) => {
    ctx.body = {
      code: 0,
      msg: `[on_play] all success, pass`,
    };
    await next();
  };

  onPublish = async (ctx: ParameterizedContext, next) => {
    // https://ossrs.net/lts/zh-cn/docs/v5/doc/http-callback#nodejs-koa-example
    // code等于数字0表示成功，其他错误码代表失败。
    try {
      // @ts-ignore
      const { body }: { body: ISrsCb } = ctx.request;
      console.log(chalkWARN(`srs on_publish参数`), body);
      const roomIdStr = body.stream.replace(/\.m3u8$/g, '');
      const reg = /^roomId___(\d+)$/g;
      const roomId = reg.exec(roomIdStr)?.[1];

      if (!roomId) {
        console.error(chalkERROR(`[srs on_publish] 房间id不存在！`));
        ctx.body = { code: 1, msg: '[srs on_publish] 房间id不存在！' };
        await next();
        return;
      }
      // body.param格式：?pushtype=0&pushkey=xxxxx
      const params = new URLSearchParams(body.param);
      const publishKey = params.get(SRS_CB_URL_QUERY.publishKey);
      const publishType = params.get(SRS_CB_URL_QUERY.publishType);
      const userId = params.get(SRS_CB_URL_QUERY.userId);
      const isdev = params.get(SRS_CB_URL_QUERY.isdev);
      if (!Number(userId)) {
        console.error(chalkERROR(`[srs on_publish] userId不存在！`));
        ctx.body = { code: 1, msg: '[srs on_publish] userId不存在！' };
        await next();
        return;
      }
      const authRes = await liveRoomVerifyAuth({ roomId, publishKey });
      const { liveRoomInfo } = authRes;
      if (this.allowDev && isdev === 'yes') {
        console.log(chalkSUCCESS(`[srs on_publish] 开发模式，不鉴权`));
      } else if (authRes.code !== 0) {
        console.error(chalkERROR(`[srs on_publish] ${authRes.msg}`));
        successHandler({
          code: 1,
          ctx,
          data: `[srs on_publish] ${authRes.msg}`,
        });
        return;
      } else {
        console.log(chalkSUCCESS(`[srs on_unpublish] ${authRes.msg}`));
      }
      const liveRes = await liveController.common.findByLiveRoomId(
        Number(roomId)
      );
      if (!liveRes) {
        console.log(
          chalkERROR(`[srs on_publish] 房间id：${roomId}，没正在直播`)
        );
        successHandler({
          code: 1,
          ctx,
          data: `[srs on_publish] 房间id：${roomId}，没正在直播`,
        });
        await next();
        return;
      }
      await liveController.common.update({
        id: liveRes.id,
        flag_id: body.client_id,
      });
      if (
        [
          LiveRoomTypeEnum.forward_all,
          LiveRoomTypeEnum.forward_bilibili,
          LiveRoomTypeEnum.forward_douyin,
          LiveRoomTypeEnum.forward_douyu,
          LiveRoomTypeEnum.forward_huya,
          LiveRoomTypeEnum.forward_kuaishou,
          LiveRoomTypeEnum.forward_xiaohongshu,
        ].includes(Number(publishType))
      ) {
        if (liveRoomInfo) {
          if (
            ![
              LiveRoomTypeEnum.tencentcloud_css,
              LiveRoomTypeEnum.tencentcloud_css_pk,
            ].includes(liveRoomInfo.type!)
          ) {
            let index = 0;
            const max = 30;
            const timer = setInterval(() => {
              if (index > max) {
                clearInterval(timer);
              }
              index += 1;
              // 根据body.stream_id，轮询判断查找流里面的audio，audio有值了，再转推流
              this.common
                .getApiV1StreamsDetail(body.stream_id)
                .then((res1) => {
                  if (res1 && res1.stream?.video && res1.stream?.audio) {
                    clearInterval(timer);
                    console.log(chalkSUCCESS('开始使用srs转推'));

                    if (Number(publishType) === LiveRoomTypeEnum.forward_all) {
                      [
                        LiveRoomTypeEnum.forward_bilibili,
                        LiveRoomTypeEnum.forward_douyin,
                        LiveRoomTypeEnum.forward_douyu,
                        LiveRoomTypeEnum.forward_huya,
                        LiveRoomTypeEnum.forward_kuaishou,
                        LiveRoomTypeEnum.forward_xiaohongshu,
                      ].forEach((item) => {
                        forwardThirdPartyLiveStreaming({
                          platform: Number(publishType),
                          localFlv: liveRoomInfo?.pull_flv_url || '',
                          remoteRtmp: getForwardMapUrl({
                            liveRoom: liveRoomInfo,
                          })[item],
                        });
                      });
                    } else {
                      forwardThirdPartyLiveStreaming({
                        platform: Number(publishType),
                        localFlv: liveRoomInfo?.pull_flv_url || '',
                        remoteRtmp: getForwardMapUrl({
                          liveRoom: liveRoomInfo,
                        })[Number(publishType)],
                      });
                    }
                  } else {
                    console.log(chalkWARN('缺少音频或视频轨，暂不使用srs转推'));
                  }
                })
                .catch((error) => {
                  console.log(error);
                });
            }, 1000);
          } else {
            console.log(chalkSUCCESS('开始使用cdn转推'));
            if (Number(publishType) === LiveRoomTypeEnum.forward_all) {
              [
                LiveRoomTypeEnum.forward_bilibili,
                LiveRoomTypeEnum.forward_douyin,
                LiveRoomTypeEnum.forward_douyu,
                LiveRoomTypeEnum.forward_huya,
                LiveRoomTypeEnum.forward_kuaishou,
                LiveRoomTypeEnum.forward_xiaohongshu,
              ].forEach((item) => {
                forwardThirdPartyLiveStreaming({
                  platform: Number(publishType),
                  localFlv: liveRoomInfo?.pull_cdn_flv_url || '',
                  remoteRtmp: getForwardMapUrl({
                    liveRoom: liveRoomInfo,
                  })[item],
                });
              });
            } else {
              forwardThirdPartyLiveStreaming({
                platform: Number(publishType),
                localFlv: liveRoomInfo?.pull_cdn_flv_url || '',
                remoteRtmp: getForwardMapUrl({
                  liveRoom: liveRoomInfo,
                })[Number(publishType)],
              });
            }
          }
        } else {
          console.warn(chalkWARN('不存在直播间信息不转推'));
        }
      } else {
        console.log(chalkWARN(`非转推直播间`));
      }
      wsSocket.io
        ?.to(`${roomId}`)
        .emit(WsMsgTypeEnum.roomLiving, { live_room_id: roomId });
      liveRedisController.setSrsPublishing({
        data: {
          live_room_id: Number(roomId),
          live_record_id: liveRes.live_record_id!,
          live_id: liveRes.id!,
        },
        exp: 5,
      });
      successHandler({
        code: 0,
        ctx,
        data: `[srs on_publish] ${String(authRes?.msg)}`,
      });
      await next();
    } catch (error) {
      console.log(error);
      successHandler({
        code: 1,
        ctx,
        data: '[srs on_publish] catch error',
      });
      await next();
    }
  };

  onUnpublish = async (ctx: ParameterizedContext, next) => {
    // https://ossrs.net/lts/zh-cn/docs/v5/doc/http-callback#nodejs-koa-example
    // code等于数字0表示成功，其他错误码代表失败。
    // @ts-ignore
    const { body }: { body: ISrsCb } = ctx.request;
    console.log(chalkWARN(`srs on_unpublish参数`), body);
    try {
      const roomIdStr = body.stream.replace(/\.m3u8$/g, '');
      const { client_id } = body;
      const reg = /^roomId___(\d+)$/g;
      const roomId = reg.exec(roomIdStr)?.[1];

      if (!roomId) {
        console.error(chalkERROR('[srs on_unpublish] 房间id不存在！'));
        ctx.body = { code: 1, msg: '[srs on_unpublish] 房间id不存在！' };
        await next();
        return;
      }
      // body.param格式：?pushtype=0&pushkey=xxxxx
      const params = new URLSearchParams(body.param);
      const publishKey = params.get(SRS_CB_URL_QUERY.publishKey);
      const isdev = params.get(SRS_CB_URL_QUERY.isdev);
      const authRes = await liveRoomVerifyAuth({ roomId, publishKey });
      if (this.allowDev && isdev === 'yes') {
        console.log(chalkSUCCESS(`[srs on_unpublish] 开发模式，不鉴权`));
        successHandler({
          code: 0,
          ctx,
          data: `[srs on_unpublish] 开发模式，不鉴权`,
        });
        await next();
        return;
      }
      if (authRes.code !== 0) {
        console.error(chalkERROR(`[srs on_unpublish] ${authRes.msg}`));
        successHandler({
          code: 1,
          ctx,
          data: `[srs on_unpublish] ${authRes.msg}`,
        });
        await next();
        return;
      }
      console.log(chalkSUCCESS(`[srs on_unpublish] ${authRes.msg}`));

      const liveRes = await liveController.common.findLiveRecordByLiveRoomId(
        Number(roomId)
      );
      if (!liveRes) {
        successHandler({
          code: 1,
          ctx,
          data: `[srs on_unpublish] 房间id：${roomId}，没在直播`,
        });
        await next();
        return;
      }
      await this.common.handleUnpublish({
        live_room_id: Number(roomId),
        flag_id: client_id,
      });
      wsSocket.io?.to(`${roomId}`).emit(WsMsgTypeEnum.roomNoLive);
      successHandler({
        code: 0,
        ctx,
        data: `[srs on_unpublish] ${String(authRes?.msg)}`,
      });
    } catch (error) {
      console.log(error);
      successHandler({
        code: 1,
        ctx,
        data: '[srs on_unpublish] catch error',
      });
    }
    await next();
  };

  onDvr = async (ctx: ParameterizedContext, next) => {
    // https://ossrs.net/lts/zh-cn/docs/v5/doc/http-callback#nodejs-koa-example
    // code等于数字0表示成功，其他错误码代表失败。
    ctx.body = { code: 0, msg: '[on_dvr] success' };
    await next();
  };
}

export default new SRSController();
