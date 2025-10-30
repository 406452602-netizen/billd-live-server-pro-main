import { getRandomString } from 'billd-utils';
import { ParameterizedContext } from 'koa';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import {
  COMMON_HTTP_CODE,
  PROJECT_ENV,
  PROJECT_ENV_ENUM,
  REDIS_KEY,
} from '@/constant';
import areaController from '@/controller/area.controller';
import redisController from '@/controller/redis.controller';
import srsController from '@/controller/srs.controller';
import userLiveRoomController from '@/controller/userLiveRoom.controller';
import { initUser } from '@/init/initUser';
import { IList } from '@/interface';
import { CustomError } from '@/model/customError.model';
import liveRoomService from '@/service/liveRoom.service';
import { ILiveRoom } from '@/types/ILiveRoom';
import { tencentcloudCssUtils } from '@/utils/tencentcloud-css';

class LiveRoomController {
  common = {
    findKey: (id) => liveRoomService.findKey(id),
    isExist: (ids) => liveRoomService.isExist(ids),
    create: ({
      title,
      desc,
      status,
      is_fake,
      is_show,
      remark,
      key,
      type,
      priority,
      cover_img,
      bg_img,
      notice_msg,
      system_msg,
      pull_rtmp_url,
      pull_flv_url,
      pull_hls_url,
      pull_webrtc_url,
      pull_cdn_rtmp_url,
      pull_cdn_flv_url,
      pull_cdn_hls_url,
      pull_cdn_webrtc_url,
      push_cdn_rtmp_url,
      push_rtmp_url,
      push_obs_server,
      push_obs_stream_key,
      push_webrtc_url,
      push_srt_url,
      push_cdn_obs_server,
      push_cdn_obs_stream_key,
      push_cdn_webrtc_url,
      push_cdn_srt_url,
      forward_bilibili_url,
      forward_huya_url,
      forward_douyu_url,
      forward_douyin_url,
      forward_kuaishou_url,
      forward_xiaohongshu_url,
    }: ILiveRoom) =>
      liveRoomService.create({
        title,
        desc,
        status,
        is_fake,
        is_show,
        remark,
        key,
        type,
        priority,
        cover_img,
        bg_img,
        notice_msg,
        system_msg,
        pull_rtmp_url,
        pull_flv_url,
        pull_hls_url,
        pull_webrtc_url,
        pull_cdn_rtmp_url,
        pull_cdn_flv_url,
        pull_cdn_hls_url,
        pull_cdn_webrtc_url,
        push_cdn_rtmp_url,
        push_rtmp_url,
        push_obs_server,
        push_obs_stream_key,
        push_webrtc_url,
        push_srt_url,
        push_cdn_obs_server,
        push_cdn_obs_stream_key,
        push_cdn_webrtc_url,
        push_cdn_srt_url,
        forward_bilibili_url,
        forward_huya_url,
        forward_douyu_url,
        forward_douyin_url,
        forward_kuaishou_url,
        forward_xiaohongshu_url,
      }),
    update: ({
      id,
      title,
      desc,
      status,
      is_fake,
      is_show,
      remark,
      key,
      type,
      priority,
      cover_img,
      bg_img,
      notice_msg,
      system_msg,
      pull_rtmp_url,
      pull_flv_url,
      pull_hls_url,
      pull_webrtc_url,
      pull_cdn_rtmp_url,
      pull_cdn_flv_url,
      pull_cdn_hls_url,
      pull_cdn_webrtc_url,
      push_cdn_rtmp_url,
      push_rtmp_url,
      push_obs_server,
      push_obs_stream_key,
      push_webrtc_url,
      push_srt_url,
      push_cdn_obs_server,
      push_cdn_obs_stream_key,
      push_cdn_webrtc_url,
      push_cdn_srt_url,
      forward_bilibili_url,
      forward_huya_url,
      forward_douyu_url,
      forward_douyin_url,
      forward_kuaishou_url,
      forward_xiaohongshu_url,
    }: ILiveRoom) =>
      liveRoomService.update({
        id,
        title,
        desc,
        status,
        is_fake,
        is_show,
        remark,
        key,
        type,
        priority,
        cover_img,
        bg_img,
        notice_msg,
        system_msg,
        pull_rtmp_url,
        pull_flv_url,
        pull_hls_url,
        pull_webrtc_url,
        pull_cdn_rtmp_url,
        pull_cdn_flv_url,
        pull_cdn_hls_url,
        pull_cdn_webrtc_url,
        push_cdn_rtmp_url,
        push_rtmp_url,
        push_obs_server,
        push_obs_stream_key,
        push_webrtc_url,
        push_srt_url,
        push_cdn_obs_server,
        push_cdn_obs_stream_key,
        push_cdn_webrtc_url,
        push_cdn_srt_url,
        forward_bilibili_url,
        forward_huya_url,
        forward_douyu_url,
        forward_douyin_url,
        forward_kuaishou_url,
        forward_xiaohongshu_url,
      }),
    findAllById: (ids: number[]) => liveRoomService.findAllById(ids),
    findAll: () => liveRoomService.findAll(),
    find: (id: number) => liveRoomService.find(id),
    findPure: (id: number) => liveRoomService.findPure(id),
    getList: ({
      id,
      status,
      is_show,
      is_fake,
      title,
      desc,
      type,
      pull_rtmp_url,
      pull_flv_url,
      pull_hls_url,
      pull_webrtc_url,
      pull_cdn_flv_url,
      pull_cdn_hls_url,
      pull_cdn_rtmp_url,
      pull_cdn_webrtc_url,
      push_rtmp_url,
      push_obs_server,
      push_obs_stream_key,
      push_webrtc_url,
      push_srt_url,
      push_cdn_obs_server,
      push_cdn_obs_stream_key,
      push_cdn_rtmp_url,
      push_cdn_srt_url,
      push_cdn_webrtc_url,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<ILiveRoom>) =>
      liveRoomService.getList({
        id,
        status,
        is_show,
        is_fake,
        title,
        desc,
        type,
        pull_rtmp_url,
        pull_flv_url,
        pull_hls_url,
        pull_webrtc_url,
        pull_cdn_flv_url,
        pull_cdn_hls_url,
        pull_cdn_rtmp_url,
        pull_cdn_webrtc_url,
        push_rtmp_url,
        push_obs_server,
        push_obs_stream_key,
        push_webrtc_url,
        push_srt_url,
        push_cdn_obs_server,
        push_cdn_obs_stream_key,
        push_cdn_rtmp_url,
        push_cdn_srt_url,
        push_cdn_webrtc_url,
        orderBy,
        orderName,
        nowPage,
        pageSize,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      }),
    getPureList: ({
      id,
      status,
      is_show,
      is_fake,
      title,
      desc,
      type,
      pull_rtmp_url,
      pull_flv_url,
      pull_hls_url,
      pull_webrtc_url,
      pull_cdn_flv_url,
      pull_cdn_hls_url,
      pull_cdn_rtmp_url,
      pull_cdn_webrtc_url,
      push_rtmp_url,
      push_obs_server,
      push_obs_stream_key,
      push_webrtc_url,
      push_srt_url,
      push_cdn_obs_server,
      push_cdn_obs_stream_key,
      push_cdn_rtmp_url,
      push_cdn_srt_url,
      push_cdn_webrtc_url,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<ILiveRoom>) =>
      liveRoomService.getPureList({
        id,
        status,
        is_show,
        is_fake,
        title,
        desc,
        type,
        pull_rtmp_url,
        pull_flv_url,
        pull_hls_url,
        pull_webrtc_url,
        pull_cdn_flv_url,
        pull_cdn_hls_url,
        pull_cdn_rtmp_url,
        pull_cdn_webrtc_url,
        push_rtmp_url,
        push_obs_server,
        push_obs_stream_key,
        push_webrtc_url,
        push_srt_url,
        push_cdn_obs_server,
        push_cdn_obs_stream_key,
        push_cdn_rtmp_url,
        push_cdn_srt_url,
        push_cdn_webrtc_url,
        orderBy,
        orderName,
        nowPage,
        pageSize,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      }),
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const params = ctx.request.query;
    const result = await this.common.getList(params);
    successHandler({ ctx, data: result });
    await next();
  };

  getBilibili = async (ctx: ParameterizedContext, next) => {
    const roomId = initUser.user_bilibili.live_room.id || -1;
    const result = await this.common.find(roomId);
    successHandler({ ctx, data: result });
    await next();
  };

  find = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await this.common.find(id);
    successHandler({ ctx, data: result });
    await next();
  };

  findAndLive = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await this.common.find(id);
    successHandler({ ctx, data: result });
    await next();
  };

  verifyPkKey = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const { key } = ctx.request.query;
    const result = await redisController.getVal({
      prefix: REDIS_KEY.livePkKey,
      key: `${id}`,
    });
    let pass = false;
    try {
      if (result) {
        const res = JSON.parse(result);
        if (res.value.key === key) {
          pass = true;
        }
      }
    } catch (error) {
      console.log(error);
    }
    successHandler({ ctx, data: pass });
    await next();
  };

  updateKey = async (ctx: ParameterizedContext, next) => {
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const liveRoom = await userLiveRoomController.common.findByUserId(
      userInfo.id || -1
    );
    if (!liveRoom) {
      throw new CustomError({
        msg: `你还没有开通直播间！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    } else {
      const key = getRandomString(20);
      const srsPushRes = srsController.common.getPushUrl({
        isdev: PROJECT_ENV === PROJECT_ENV_ENUM.prod ? 'no' : 'yes',
        userId: userInfo.id!,
        liveRoomId: liveRoom.live_room!.id!,
        type: liveRoom.live_room!.type!,
        key,
      });
      const cdnPushRes = tencentcloudCssUtils.getPushUrl({
        isdev: PROJECT_ENV === PROJECT_ENV_ENUM.prod ? 'no' : 'yes',
        userId: userInfo.id!,
        liveRoomId: liveRoom.live_room!.id!,
        type: liveRoom.live_room!.type!,
        key,
      });
      await this.common.update({
        id: liveRoom.live_room!.id!,
        key,
        push_rtmp_url: srsPushRes.rtmp_url,
        push_obs_server: srsPushRes.obs_server,
        push_obs_stream_key: srsPushRes.obs_stream_key,
        push_webrtc_url: srsPushRes.webrtc_url,
        push_srt_url: srsPushRes.srt_url,

        push_cdn_srt_url: cdnPushRes.srt_url,
        push_cdn_rtmp_url: cdnPushRes.rtmp_url,
        push_cdn_obs_server: cdnPushRes.obs_server,
        push_cdn_obs_stream_key: cdnPushRes.obs_stream_key,
        push_cdn_webrtc_url: cdnPushRes.webrtc_url,
      });
      successHandler({ ctx, data: { srsPushRes, cdnPushRes } });
    }
    await next();
  };

  create = async (ctx: ParameterizedContext, next) => {
    const data = ctx.request.body;
    await this.common.create({
      ...data,
      key: getRandomString(20),
    });
    successHandler({ ctx });
    await next();
  };

  update = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const data: ILiveRoom = ctx.request.body;
    await this.common.update({
      id,
      ...data,
    });
    successHandler({ ctx });
    await next();
  };

  updateMyLiveRoom = async (ctx: ParameterizedContext, next) => {
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const liveRoom = await userLiveRoomController.common.findByUserId(
      userInfo.id || -1
    );
    if (!liveRoom) {
      throw new CustomError({
        msg: `你还没有开通直播间！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const data: ILiveRoom = ctx.request.body;

    if (data.areaId !== undefined) {
      const isExist = await areaController.common.isExist([data.areaId]);
      if (!isExist) {
        throw new CustomError({
          msg: `不存在id为${data.areaId}的分区！`,
          httpStatusCode: COMMON_HTTP_CODE.paramsError,
          errorCode: COMMON_HTTP_CODE.paramsError,
        });
      }
      const areaRes = await areaController.common.findOneByIdPure(data.areaId);
      if (areaRes.p_id) {
        // @ts-ignore
        await liveRoom.live_room.setAreas([areaRes.p_id, data.areaId]);
      }
    }

    await this.common.update({
      ...data,
      id: liveRoom.live_room?.id,
    });
    successHandler({ ctx });
    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const isExist = await liveRoomService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的直播间！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await liveRoomService.delete(id);
    successHandler({ ctx });
    await next();
  };
}

export default new LiveRoomController();
