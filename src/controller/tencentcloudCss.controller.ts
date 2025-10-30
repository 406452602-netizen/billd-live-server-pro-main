import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';
import { handleVerifyAuth } from '@/app/verify.middleware';
import { wsSocket } from '@/config/websocket';
import liveRedisController from '@/config/websocket/live-redis.controller';
import {
  COMMON_HTTP_CODE,
  DEFAULT_AUTH_INFO,
  PROJECT_ENV,
  PROJECT_ENV_ENUM,
  REDIS_KEY,
  SRS_CB_URL_QUERY,
} from '@/constant';
import liveController from '@/controller/live.controller';
import liveRecordController from '@/controller/liveRecord.controller';
import liveRoomController from '@/controller/liveRoom.controller';
import userLiveRoomController from '@/controller/userLiveRoom.controller';
import { CustomError } from '@/model/customError.model';
import { LiveRoomTypeEnum } from '@/types/ILiveRoom';
import {
  ITencentcloudCssPublishCb,
  ITencentcloudCssUnPublishCb,
} from '@/types/srs';
import { WsMsgTypeEnum } from '@/types/websocket';
import { liveRoomVerifyAuth } from '@/utils/business';
import { chalkERROR, chalkSUCCESS, chalkWARN } from '@/utils/chalkTip';
import { tencentcloudCssUtils } from '@/utils/tencentcloud-css';

import redisController from './redis.controller';

class TencentcloudCssController {
  allowDev = true;

  common = {
    isLive: async (roomId: number) => {
      const liveRes = await liveController.common.findByLiveRoomId(
        Number(roomId)
      );
      return !!liveRes;
      // const res = await tencentcloudCssUtils.queryLiveStream({ roomId });
      // return !!res.res?.OnlineInfo.length;
    },
    closeLive: async ({ live_room_id }) => {
      const liveRes =
        await liveController.common.findByLiveRoomIdAndLiveRoomType({
          live_room_id: Number(live_room_id),
        });
      if (liveRes?.id) {
        await redisController.delByPrefix({
          prefix: `${
            REDIS_KEY.tencentcloudCssPublishing + String(live_room_id)
          }`,
        });
        const res = await tencentcloudCssUtils.dropLiveStream({
          roomId: live_room_id,
        });
        await liveController.common.updateByIdAndLiveRoomType({
          id: liveRes.id,
          remark: 'closeLive-tencentcloudCss',
        });
        await liveController.common.delete(liveRes.id);
        await liveRecordController.common.update({
          id: liveRes.live_record_id,
          // @ts-ignore
          end_time: +new Date(),
        });
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
        live_room_type: LiveRoomTypeEnum.tencentcloud_css,
        flag_id,
      });
      if (!liveRes?.id) {
        return;
      }
      await redisController.delByPrefix({
        prefix: `${REDIS_KEY.tencentcloudCssPublishing + String(live_room_id)}`,
      });
      await tencentcloudCssUtils.dropLiveStream({ roomId: live_room_id });
      await liveController.common.update({
        id: liveRes.id,
        remark: 'handleUnpublish-closeLive-tencentcloudCss',
      });
      await liveController.common.delete(liveRes.id);
      await liveRecordController.common.update({
        id: liveRes.live_record_id,
        // @ts-ignore
        end_time: +new Date(),
      });
    },
  };

  isLive = async (ctx: ParameterizedContext, next) => {
    const res = await this.common.isLive(+ctx.params.roomId);
    successHandler({
      ctx,
      data: { is_live: res },
    });
    await next();
  };

  push = async (ctx: ParameterizedContext, next) => {
    const { liveRoomId } = ctx.request.body;
    const authRes = await handleVerifyAuth({
      ctx,
      shouldAuthArr: [DEFAULT_AUTH_INFO.LIVE_PUSH_CDN.auth_value],
    });
    if (!authRes.flag) {
      throw new CustomError({
        msg: `缺少${authRes.diffArr.join()}权限！`,
        httpStatusCode: COMMON_HTTP_CODE.forbidden,
        errorCode: COMMON_HTTP_CODE.forbidden,
      });
    }
    const userLiveRoomInfo =
      await userLiveRoomController.common.findByLiveRoomIdAndKey(
        Number(liveRoomId)
      );
    const pushRes = tencentcloudCssUtils.getPushUrl({
      isdev: PROJECT_ENV === PROJECT_ENV_ENUM.prod ? 'no' : 'yes',
      userId: authRes.userInfo.id!,
      liveRoomId,
      type:
        userLiveRoomInfo?.live_room?.type || LiveRoomTypeEnum.tencentcloud_css,
      key: userLiveRoomInfo?.live_room?.key || '',
    });
    const pullRes = tencentcloudCssUtils.getPullUrl({
      liveRoomId,
    });
    await liveRoomController.common.update({
      id: liveRoomId,
      pull_cdn_rtmp_url: pullRes.rtmp,
      pull_cdn_flv_url: pullRes.flv,
      pull_cdn_hls_url: pullRes.hls,
      pull_cdn_webrtc_url: pullRes.webrtc,
    });
    successHandler({ ctx, data: pushRes });
    await next();
  };

  remoteAuth = async (ctx: ParameterizedContext, next) => {
    console.log(chalkWARN(`tencentcloud_css remote_auth`), ctx.request.query);
    const roomId = ctx.request.query[SRS_CB_URL_QUERY.roomId] as string;
    const publishKey = ctx.request.query[SRS_CB_URL_QUERY.publishKey] as string;
    const isdev = ctx.request.query[SRS_CB_URL_QUERY.isdev] as string;
    if (this.allowDev && isdev === 'yes') {
      console.log(
        chalkSUCCESS(`[tencentcloud_css remote_auth] 开发模式，不鉴权`)
      );
      successHandler({
        ctx,
        data: '[tencentcloud_css remote_auth] 开发模式，不鉴权',
      });
      await next();
    } else {
      const res = await liveRoomVerifyAuth({ roomId, publishKey });
      if (res.code === 0) {
        console.log(chalkSUCCESS(`[tencentcloud_css remote_auth] ${res.msg}`));
        successHandler({
          ctx,
          data: '[tencentcloud_css remote_auth] success',
        });
        await next();
      } else {
        console.error(chalkERROR(`[tencentcloud_css remote_auth] ${res.msg}`));
        successHandler({
          httpStatusCode: 403,
          ctx,
          data: '[tencentcloud_css remote_auth] fail',
        });
        await next();
      }
    }
  };

  onPublish = async (ctx: ParameterizedContext, next) => {
    // @ts-ignore
    const { body }: { body: ITencentcloudCssPublishCb } = ctx.request;
    console.log(chalkWARN(`tencentcloud_css on_publish参数`), body);
    try {
      if (body.errcode !== 0) {
        console.error(
          chalkERROR(
            `[tencentcloud_css on_publish] 推流错误，errcode: ${body.errcode}`
          )
        );
        successHandler({
          ctx,
          data: `[tencentcloud_css on_publish] 推流错误，errcode: ${body.errcode}`,
        });
        await next();
        return;
      }
      const reg = /^roomId___(\d+)$/g;
      const roomId = reg.exec(body.stream_id)?.[1];
      const params = new URLSearchParams(body.stream_param);
      const publishKey = params.get(SRS_CB_URL_QUERY.publishKey);
      const isdev = params.get(SRS_CB_URL_QUERY.isdev);
      const authRes = await liveRoomVerifyAuth({ roomId, publishKey });
      if (this.allowDev && isdev === 'yes') {
        console.log(
          chalkSUCCESS(`[tencentcloud_css on_publish] 开发模式，不鉴权`)
        );
      } else if (authRes.code !== 0) {
        console.error(
          chalkERROR(`[tencentcloud_css on_publish] ${authRes.msg}，不能推流`)
        );
        successHandler({
          code: 1,
          ctx,
          data: `[tencentcloud_css on_publish] ${authRes.msg}，不能推流`,
        });
        return;
      } else {
        console.log(
          chalkSUCCESS(`[tencentcloud_css on_publish] ${authRes.msg}，能推流`)
        );
      }
      const liveRes = await liveController.common.findByLiveRoomId(
        Number(roomId)
      );
      if (!liveRes) {
        console.log(
          chalkERROR(`[srs on_publish] 房间id：${Number(roomId)}，没正在直播`)
        );
        successHandler({
          code: 1,
          ctx,
          data: `[srs on_publish] 房间id：${Number(roomId)}，没正在直播`,
        });
        await next();
        return;
      }
      await liveController.common.update({
        id: liveRes.id,
        flag_id: body.sequence,
      });
      wsSocket.io
        ?.to(`${Number(roomId)}`)
        .emit(WsMsgTypeEnum.roomLiving, { live_room_id: roomId });
      liveRedisController.setTencentcloudCssPublishing({
        data: {
          live_room_id: Number(roomId),
          live_record_id: liveRes.live_record_id!,
          live_id: liveRes.id!,
        },
        exp: 5,
      });
      successHandler({
        ctx,
        data: `[tencentcloud_css on_publish] ${String(authRes?.msg)}`,
      });
      await next();
    } catch (error) {
      console.log(error);
      successHandler({
        ctx,
        data: '[tencentcloud_css on_publish] catch error',
      });
      await next();
    }
  };

  onUnpublish = async (ctx: ParameterizedContext, next) => {
    // @ts-ignore
    const { body }: { body: ITencentcloudCssUnPublishCb } = ctx.request;
    console.log(chalkWARN(`tencentcloud_css on_unpublish参数`), body);
    try {
      const reg = /^roomId___(\d+)$/g;
      const flag_id = body.sequence;
      const roomId = reg.exec(body.stream_id)?.[1];
      const params = new URLSearchParams(body.stream_param);
      const publishKey = params.get(SRS_CB_URL_QUERY.publishKey);
      const isdev = params.get(SRS_CB_URL_QUERY.isdev);
      const authRes = await liveRoomVerifyAuth({ roomId, publishKey });
      if (this.allowDev && isdev === 'yes') {
        console.log(
          chalkSUCCESS(`[tencentcloud_css on_unpublish] 开发模式，不鉴权`)
        );
      } else if (authRes.code !== 0) {
        console.error(
          chalkERROR(`[tencentcloud_css on_unpublish] ${authRes.msg}，不能断流`)
        );
        return;
      } else {
        console.log(
          chalkSUCCESS(`[tencentcloud_css on_unpublish] ${authRes.msg}`)
        );
      }
      const liveRes = await liveController.common.findLiveRecordByLiveRoomId(
        Number(roomId)
      );
      if (!liveRes) {
        console.error(
          chalkERROR(
            `[tencentcloud_css on_unpublish] 不能断流，房间id：${roomId!}，没在直播`
          )
        );
        successHandler({
          ctx,
          data: `[tencentcloud_css on_unpublish] 不能断流，房间id：${roomId!}，没在直播`,
        });
        await next();
        return;
      }
      await this.common.handleUnpublish({
        live_room_id: Number(roomId),
        flag_id,
      });
      wsSocket.io?.to(`${roomId!}`).emit(WsMsgTypeEnum.roomNoLive);
      successHandler({
        ctx,
        data: `[tencentcloud_css on_unpublish] ${String(authRes?.msg)}`,
      });
      await next();
    } catch (error) {
      console.log(error);
      successHandler({
        ctx,
        data: '[tencentcloud_css on_unpublish] catch error',
      });
      await next();
    }
  };
}

export default new TencentcloudCssController();
