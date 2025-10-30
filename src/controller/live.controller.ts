import fs from 'fs';
import path from 'path';

import { ParameterizedContext } from 'koa';
import nodeSchedule from 'node-schedule';
import { rimrafSync } from 'rimraf';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import {
  COMMON_HTTP_CODE,
  IM_REDIS_KEY,
  REDIS_KEY,
  SCHEDULE_TYPE,
  WEBM_DIR,
} from '@/constant';
import areaController from '@/controller/area.controller';
import liveRecordController from '@/controller/liveRecord.controller';
import liveRoomController from '@/controller/liveRoom.controller';
import redisController from '@/controller/redis.controller';
import srsController from '@/controller/srs.controller';
import tencentcloudCssController from '@/controller/tencentcloudCss.controller';
import userLiveRoomController from '@/controller/userLiveRoom.controller';
import { IList, ILive } from '@/interface';
import { CustomError } from '@/model/customError.model';
import liveService from '@/service/live.service';
import { LiveRoomTypeEnum } from '@/types/ILiveRoom';
import { strSlice } from '@/utils';
import { getForwardList, killPid } from '@/utils/process';
import { tencentcloudCssUtils } from '@/utils/tencentcloud-css';

class LiveController {
  common = {
    startLive: async ({
      user_id,
      live_room_type,
      area_id,
      area_name,
      client_ip,
      client_env,
      client_app,
      client_app_version,
    }) => {
      if (
        !Object.values(LiveRoomTypeEnum)
          .filter((value) => typeof value === 'number')
          .includes(live_room_type)
      ) {
        return { code: 1, msg: `live_room_type错误！` };
      }
      const userLiveRoom = await userLiveRoomController.common.findByUserId(
        user_id
      );
      if (!userLiveRoom) {
        return { code: 1, msg: `你还没有开通直播间！` };
      }
      if (!userLiveRoom.live_room_id) {
        return { code: 1, msg: `userLiveRoom.live_room_id错误！` };
      }
      const isLiving = await this.common.findByLiveRoomId(
        userLiveRoom.live_room_id
      );
      if (isLiving) {
        return { code: 1, msg: `正在直播！` };
      }
      if (area_id !== undefined) {
        const isExist = await areaController.common.isExist([area_id]);
        if (!isExist) {
          return { code: 1, msg: `不存在id为${area_id as string}的分区！` };
        }
        const areaRes = await areaController.common.findOneByIdPure(area_id);
        if (areaRes.p_id) {
          // @ts-ignore
          await userLiveRoom.live_room?.setAreas?.([areaRes.p_id, area_id]);
        }
      }
      const srsPullRes = srsController.common.getPullUrl({
        liveRoomId: userLiveRoom.live_room_id,
      });
      const cdnPullRes = tencentcloudCssUtils.getPullUrl({
        liveRoomId: userLiveRoom.live_room_id,
      });
      await liveRoomController.common.update({
        id: userLiveRoom.live_room_id,
        type: live_room_type,
        pull_rtmp_url: srsPullRes.rtmp,
        pull_flv_url: srsPullRes.flv,
        pull_hls_url: srsPullRes.hls,
        pull_webrtc_url: srsPullRes.webrtc,
        pull_cdn_rtmp_url: cdnPullRes.rtmp,
        pull_cdn_flv_url: cdnPullRes.flv,
        pull_cdn_hls_url: cdnPullRes.hls,
        pull_cdn_webrtc_url: cdnPullRes.webrtc,
      });
      const recRes = await liveRecordController.common.create({
        live_room_type,
        user_id: Number(user_id),
        live_room_id: userLiveRoom.live_room_id,
        duration: 0,
        danmu: 0,
        view: 0,
        area_id,
        area_name,
        start_time: +new Date(),
        client_ip,
        client_env,
        client_app,
        client_app_version,
        remark: '',
      });
      const liveRes = await this.common.create({
        live_room_type,
        live_record_id: recRes.id,
        live_room_id: userLiveRoom.live_room_id,
        user_id: Number(user_id),
      });
      return { code: 0, data: liveRes };
    },
    startLiveByRoomId: async ({
      user_id,
      room_id,
      live_room_type,
      area_id,
      area_name,
      client_ip,
      client_env,
      client_app,
      client_app_version,
    }) => {
      if (
        !Object.values(LiveRoomTypeEnum)
          .filter((value) => typeof value === 'number')
          .includes(live_room_type)
      ) {
        return { code: 1, msg: `live_room_type错误！` };
      }
      const userLiveRoom = await userLiveRoomController.common.findByLiveRoomId(
        room_id
      );
      if (!userLiveRoom) {
        return { code: 1, msg: `你还没有开通直播间！` };
      }
      if (!userLiveRoom.live_room_id) {
        return { code: 1, msg: `userLiveRoom.live_room_id错误！` };
      }
      const isLiving = await this.common.findByLiveRoomId(
        userLiveRoom.live_room_id
      );
      if (isLiving) {
        return { code: 1, msg: `正在直播！` };
      }
      if (area_id !== undefined) {
        const isExist = await areaController.common.isExist([area_id]);
        if (!isExist) {
          return { code: 1, msg: `不存在id为${area_id as string}的分区！` };
        }
        const areaRes = await areaController.common.findOneByIdPure(area_id);
        if (areaRes.p_id) {
          // @ts-ignore
          await userLiveRoom.live_room?.setAreas?.([areaRes.p_id, area_id]);
        }
      }
      const srsPullRes = srsController.common.getPullUrl({
        liveRoomId: userLiveRoom.live_room_id,
      });
      const cdnPullRes = tencentcloudCssUtils.getPullUrl({
        liveRoomId: userLiveRoom.live_room_id,
      });
      await liveRoomController.common.update({
        id: userLiveRoom.live_room_id,
        type: live_room_type,
        pull_rtmp_url: srsPullRes.rtmp,
        pull_flv_url: srsPullRes.flv,
        pull_hls_url: srsPullRes.hls,
        pull_webrtc_url: srsPullRes.webrtc,
        pull_cdn_rtmp_url: cdnPullRes.rtmp,
        pull_cdn_flv_url: cdnPullRes.flv,
        pull_cdn_hls_url: cdnPullRes.hls,
        pull_cdn_webrtc_url: cdnPullRes.webrtc,
      });
      const recRes = await liveRecordController.common.create({
        live_room_type,
        user_id: Number(user_id),
        live_room_id: userLiveRoom.live_room_id,
        duration: 0,
        danmu: 0,
        view: 0,
        area_id,
        area_name,
        start_time: +new Date(),
        client_ip,
        client_env,
        client_app,
        client_app_version,
        remark: '',
      });
      const liveRes = await this.common.create({
        live_room_type,
        live_record_id: recRes.id,
        live_room_id: userLiveRoom.live_room_id,
        user_id: Number(user_id),
      });
      return { code: 0, data: liveRes };
    },
    closeLive: async ({ liveRoomId }: { liveRoomId: number }) => {
      const liveRoom = await liveRoomController.common.find(liveRoomId);
      let tencentcloudCssCloseRes;
      let srsCloseRes;
      if (liveRoom?.type !== undefined) {
        if (
          [
            LiveRoomTypeEnum.tencentcloud_css,
            LiveRoomTypeEnum.tencentcloud_css_pk,
          ].includes(liveRoom.type)
        ) {
          tencentcloudCssCloseRes =
            await tencentcloudCssController.common.closeLive({
              live_room_id: liveRoomId,
            });
        } else {
          srsCloseRes = await srsController.common.closeLive({
            live_room_id: liveRoomId,
          });
        }
      }
      nodeSchedule.cancelJob(`${SCHEDULE_TYPE.blobIsExist}___${liveRoomId}`);
      const roomDir = path.resolve(WEBM_DIR, `roomId_${liveRoomId}`);
      if (fs.existsSync(roomDir)) {
        rimrafSync(roomDir);
      }
      return { tencentcloudCssCloseRes, srsCloseRes };
    },
    update: ({
      id,
      live_record_id,
      user_id,
      live_room_id,
      live_room_type,
      flag_id,
      remark,
    }: ILive) => {
      return liveService.update({
        id,
        live_record_id,
        user_id,
        live_room_id,
        live_room_type,
        flag_id,
        remark,
      });
    },
    updateByIdAndLiveRoomType: ({
      id,
      live_record_id,
      user_id,
      live_room_id,
      live_room_type,
      flag_id,
      remark,
    }: ILive) => {
      return liveService.updateByIdAndLiveRoomType({
        id,
        live_record_id,
        user_id,
        live_room_id,
        live_room_type,
        flag_id,
        remark,
      });
    },
    updateByIds: (
      {
        live_record_id,
        user_id,
        live_room_id,
        live_room_type,
        flag_id,
        remark,
      }: ILive,
      ids: number[]
    ) => {
      return liveService.updateByIds(
        {
          live_record_id,
          user_id,
          live_room_id,
          live_room_type,
          flag_id,
          remark,
        },
        ids
      );
    },
    deleteByIds: (ids: number[]) => {
      return liveService.deleteByIds(ids);
    },
    liveUser: async (roomId: string) => {
      const res = await redisController.getAllHashVal(
        IM_REDIS_KEY.liveRoomUserList + roomId
      );
      const res2 = res.map((val) => {
        let item;
        try {
          const json = JSON.parse(val).value.userInfo;
          item = {
            user_username: json.username,
            user_avatar: json.avatar,
            live_room_id: roomId,
            live_room_title: '',
          };
        } catch (error) {
          console.error(error);
        }
        return item;
      });
      return res2;
    },
    findAll: async ({
      id,
      live_record_id,
      live_room_id,
      user_id,
      live_room_type,
      flag_id,
      remark,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<ILive>) => {
      const result = await liveService.findAll({
        id,
        live_record_id,
        live_room_id,
        user_id,
        live_room_type,
        flag_id,
        remark,
        nowPage,
        pageSize,
        orderBy,
        orderName,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      });
      return result;
    },
    findAllByLessthanRangTimeEnd: async ({
      id,
      live_record_id,
      live_room_id,
      user_id,
      live_room_type,
      flag_id,
      remark,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeEnd,
    }: IList<ILive>) => {
      const result = await liveService.findAllByLessthanRangTimeEnd({
        id,
        live_record_id,
        live_room_id,
        user_id,
        live_room_type,
        flag_id,
        remark,
        nowPage,
        pageSize,
        orderBy,
        orderName,
        keyWord,
        rangTimeEnd,
      });
      return result;
    },
    findOne: async ({
      id,
      live_record_id,
      live_room_id,
      user_id,
      live_room_type,
      flag_id,
      remark,
    }: IList<ILive>) => {
      const result = await liveService.findOne({
        id,
        live_record_id,
        live_room_id,
        user_id,
        live_room_type,
        flag_id,
        remark,
      });
      return result;
    },
    getList: async ({
      id,
      live_record_id,
      live_room_id,
      user_id,
      live_room_type,
      flag_id,
      remark,
      childOrderName,
      childOrderBy,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<ILive>) => {
      const result = await liveService.getList({
        id,
        live_record_id,
        live_room_id,
        user_id,
        live_room_type,
        flag_id,
        remark,
        childOrderName,
        childOrderBy,
        orderBy,
        orderName,
        nowPage,
        pageSize,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      });
      return result;
    },
    getPureList: async ({
      id,
      live_record_id,
      live_room_id,
      user_id,
      live_room_type,
      flag_id,
      remark,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<ILive>) => {
      const result = await liveService.getPureList({
        id,
        live_record_id,
        live_room_id,
        user_id,
        live_room_type,
        flag_id,
        remark,
        nowPage,
        pageSize,
        orderBy,
        orderName,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      });
      return result;
    },
    delete: async (id: number, isRoute?: boolean) => {
      const isExist = await liveService.isExist([id]);
      if (!isExist) {
        if (isRoute) {
          throw new CustomError({
            msg: `不存在id为${id}的直播！`,
            httpStatusCode: COMMON_HTTP_CODE.paramsError,
            errorCode: COMMON_HTTP_CODE.paramsError,
          });
        }
      } else {
        await liveService.delete(id);
      }
    },
    deleteByLiveRoomId: async (liveRoomIdArr: number[]) => {
      if (!liveRoomIdArr.length) {
        console.log('liveRoomIdArr为空');
        return 0;
      }
      const res = await liveService.deleteByLiveRoomId(liveRoomIdArr);
      return res;
    },
    findByLiveRoomId: async (liveRoomId: number) => {
      const res = await liveService.findByLiveRoomId(liveRoomId);
      return res;
    },
    findLiveRecordByLiveRoomId: (liveRoomId: number) => {
      return liveService.findLiveRecordByLiveRoomId(liveRoomId);
    },
    findByLiveRoomIdAndLiveRoomType: (data: ILive) =>
      liveService.findByLiveRoomIdAndLiveRoomType(data),
    liveRoomisLive: async (liveRoomId: number) => {
      const res = await liveService.liveRoomisLive(liveRoomId);
      return res;
    },
    create: async ({
      id,
      live_record_id,
      live_room_id,
      user_id,
      live_room_type,
      flag_id,
      remark,
    }: ILive) => {
      const res = await liveService.create({
        id,
        live_record_id,
        live_room_id,
        user_id,
        live_room_type,
        flag_id,
        remark,
      });
      return res;
    },
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const result = await this.common.getList(ctx.request.query);
    successHandler({ ctx, data: result });
    await next();
  };

  getPureList = async (ctx: ParameterizedContext, next) => {
    const result = await this.common.getPureList(ctx.request.query);
    successHandler({ ctx, data: result });
    await next();
  };

  getLiveRoomOnlineUser = async (ctx: ParameterizedContext, next) => {
    const live_room_id = +ctx.params.live_room_id;
    if (!live_room_id) {
      throw new CustomError({
        msg: `live_room_id错误`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const res = await this.common.liveUser(`${live_room_id}`);
    successHandler({ ctx, data: res });
    await next();
  };

  getLiveRoomOnlineUserCount = async (ctx: ParameterizedContext, next) => {
    const live_room_id = +ctx.params.live_room_id;
    if (!live_room_id) {
      throw new CustomError({
        msg: `live_room_id错误`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const res = await redisController.getHashLenVal(
      `${IM_REDIS_KEY.liveRoomUserList}${live_room_id}`
    );
    successHandler({ ctx, data: { count: res } });
    await next();
  };

  getAllLiveRoomOnlineUser = async (ctx: ParameterizedContext, next) => {
    const key = `${REDIS_KEY.joined}`;
    const res = await this.common.liveUser(key);
    successHandler({ ctx, data: res });
    await next();
  };

  listDuplicateRemoval = async (ctx: ParameterizedContext, next) => {
    successHandler({ ctx });
    await next();
  };

  renderFakeLive = async (ctx: ParameterizedContext, next) => {
    successHandler({ ctx });
    await next();
  };

  renderFakeLiveByBilibili = async (ctx: ParameterizedContext, next) => {
    successHandler({ ctx });
    await next();
  };

  addFakeLive = async (ctx: ParameterizedContext, next) => {
    successHandler({ ctx });
    await next();
  };

  delFakeLive = async (ctx: ParameterizedContext, next) => {
    successHandler({ ctx });
    await next();
  };

  startLive = async (ctx: ParameterizedContext, next) => {
    const { live_room_type, area_id, area_name, room_id } = ctx.request.body;
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
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
    let res;
    if (room_id) {
      res = await this.common.startLiveByRoomId({
        user_id: userInfo.id,
        room_id,
        live_room_type,
        area_id,
        area_name,
        client_ip,
        client_env,
        client_app,
        client_app_version,
      });
    } else {
      res = await this.common.startLive({
        user_id: userInfo.id,
        live_room_type,
        area_id,
        area_name,
        client_ip,
        client_env,
        client_app,
        client_app_version,
      });
    }

    successHandler({ ctx, data: res });
    await next();
  };

  closeMyLive = async (ctx: ParameterizedContext, next) => {
    const { room_id } = ctx.request.body;
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    let res;
    if (room_id) {
      res = await this.common.closeLive({
        liveRoomId: room_id,
      });
    } else {
      const userLiveRoom = await userLiveRoomController.common.findByUserId(
        userInfo.id || -1
      );
      if (!userLiveRoom?.live_room_id) {
        throw new CustomError({
          msg: `你还没有开通直播间！`,
          httpStatusCode: COMMON_HTTP_CODE.paramsError,
          errorCode: COMMON_HTTP_CODE.paramsError,
        });
      }
      res = await this.common.closeLive({
        liveRoomId: userLiveRoom.live_room_id,
      });
    }

    successHandler({ ctx, data: res });
    await next();
  };

  closeLiveByLiveRoomId = async (ctx: ParameterizedContext, next) => {
    const { live_room_id } = ctx.params;
    if (!live_room_id) {
      throw new CustomError({
        msg: `live_room_id错误`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await this.common.closeLive(live_room_id);
    successHandler({ ctx });
    await next();
  };

  isLive = async (ctx: ParameterizedContext, next) => {
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const userLiveRoom = await userLiveRoomController.common.findByUserId(
      userInfo.id || -1
    );
    if (!userLiveRoom?.live_room_id) {
      throw new CustomError({
        msg: `你还没有开通直播间！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const res = await this.common.liveRoomisLive(userLiveRoom?.live_room_id);
    successHandler({ ctx, data: res });
    await next();
  };

  liveRoomisLive = async (ctx: ParameterizedContext, next) => {
    const live_room_id = +ctx.params.live_room_id;
    if (!live_room_id) {
      throw new CustomError({
        msg: `live_room_id错误`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const res = await this.common.liveRoomisLive(live_room_id);
    successHandler({ ctx, data: res });
    await next();
  };

  getForwardList = async (ctx: ParameterizedContext, next) => {
    const res: any = await getForwardList();
    let list: any[] = [];
    if (res.stdout !== '') {
      list = res.stdout.split('\n');
    }
    successHandler({ ctx, data: { list, res } });
    await next();
  };

  killForward = async (ctx: ParameterizedContext, next) => {
    const { pid } = ctx.params;
    if (!pid) {
      throw new CustomError({
        msg: `pid为空`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const res = await killPid(pid);
    successHandler({ ctx, data: res });
    await next();
  };

  find = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await liveService.find(id);
    successHandler({ ctx, data: result });

    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    await this.common.delete(id, true);
    successHandler({ ctx });

    await next();
  };
}

export default new LiveController();
