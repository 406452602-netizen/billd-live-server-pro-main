import { getRandomString } from 'billd-utils';
import { ParameterizedContext } from 'koa';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE, PROJECT_ENV, PROJECT_ENV_ENUM } from '@/constant';
import liveRoomController from '@/controller/liveRoom.controller';
import srsController from '@/controller/srs.controller';
import { IList, IUserLiveRoom, SwitchEnum } from '@/interface';
import { CustomError } from '@/model/customError.model';
import liveRoomService from '@/service/liveRoom.service';
import userLiveRoomService from '@/service/userLiveRoom.service';
import { LiveRoomStatusEnum, LiveRoomTypeEnum } from '@/types/ILiveRoom';

class UserLiveRoomController {
  common = {
    getList: ({
      id,
      user_id,
      live_room_id,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IUserLiveRoom>) =>
      userLiveRoomService.getList({
        id,
        user_id,
        live_room_id,
        orderBy,
        orderName,
        nowPage,
        pageSize,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      }),
    findAll: () => userLiveRoomService.findAll(),
    create: (data: IUserLiveRoom) => userLiveRoomService.create(data),
    findByUserId: (userId: number) => userLiveRoomService.findByUserId(userId),
    findByUserIdList: (userId: number) =>
      userLiveRoomService.findByUserIdList(userId),
    findByLiveRoomId: (liveRoomId: number) =>
      userLiveRoomService.findByLiveRoomId(liveRoomId),
    findByLiveRoomIdAndKey: (liveRoomId: number) =>
      userLiveRoomService.findByLiveRoomIdAndKey(liveRoomId),
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const data = ctx.request.query;
    const result = await this.common.getList(data);
    successHandler({ ctx, data: result });
    await next();
  };

  find = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await userLiveRoomService.find(id);
    successHandler({ ctx, data: result });
    await next();
  };

  findByUserId = async (ctx: ParameterizedContext, next) => {
    const userId = +ctx.params.userId;
    const result = await this.common.findByUserId(userId);
    successHandler({ ctx, data: result });
    await next();
  };

  update = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const { user_id, live_room_id }: IUserLiveRoom = ctx.request.body;
    const isExist = await userLiveRoomService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的用户直播间！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await userLiveRoomService.update({
      id,
      user_id,
      live_room_id,
    });
    successHandler({ ctx });
    await next();
  };

  create = async (ctx: ParameterizedContext, next) => {
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    let isAdmin = false;
    let count = 0;
    for (let i = 0; i < userInfo.roles!.length; i += 1) {
      if (userInfo.roles![i].role_value === 'SUPER_ADMIN') {
        isAdmin = true;
        break;
      }
    }
    if (!isAdmin) {
      const isExist = await this.common.findByUserId(userInfo.id!);
      if (isExist) {
        throw new CustomError({
          msg: `你已开通直播间！`,
          httpStatusCode: COMMON_HTTP_CODE.paramsError,
          errorCode: COMMON_HTTP_CODE.paramsError,
        });
      }
    } else {
      const list = await this.common.findByUserIdList(userInfo.id!);
      count = list.length;
    }

    const key = getRandomString(20);
    const liveRoom = await liveRoomController.common.create({
      title: `${userInfo.username!.slice(0, 10)}${
        isAdmin ? count : ''
      }的直播间`,
      key,
      type: LiveRoomTypeEnum.obs,
      priority: 21,
      is_show: SwitchEnum.yes,
      status: LiveRoomStatusEnum.normal,
    });
    const pullUrlRes = srsController.common.getPullUrl({
      liveRoomId: liveRoom.id!,
    });
    const pushUrlRes = srsController.common.getPushUrl({
      isdev: PROJECT_ENV === PROJECT_ENV_ENUM.prod ? 'no' : 'yes',
      userId: userInfo.id!,
      liveRoomId: liveRoom.id!,
      type: LiveRoomTypeEnum.srs,
      key,
    });
    await liveRoomService.update({
      pull_rtmp_url: pullUrlRes.rtmp,
      pull_flv_url: pullUrlRes.flv,
      pull_hls_url: pullUrlRes.hls,
      pull_webrtc_url: pullUrlRes.webrtc,
      push_rtmp_url: pushUrlRes.rtmp_url,
      push_obs_server: pushUrlRes.obs_server,
      push_obs_stream_key: pushUrlRes.obs_stream_key,
      push_webrtc_url: pushUrlRes.webrtc_url,
      push_srt_url: pushUrlRes.srt_url,
      id: liveRoom.id,
    });
    const result = await this.common.create({
      user_id: userInfo.id,
      live_room_id: liveRoom.id,
    });
    successHandler({ ctx, data: result });
    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const isExist = await userLiveRoomService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的用户直播间！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await userLiveRoomService.delete(id);
    successHandler({ ctx });
    await next();
  };
}

export default new UserLiveRoomController();
