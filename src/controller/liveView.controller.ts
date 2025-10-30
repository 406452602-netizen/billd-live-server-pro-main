import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
import { IList, ILiveView } from '@/interface';
import { CustomError } from '@/model/customError.model';
import liveViewService from '@/service/liveView.service';
import { strSlice } from '@/utils';

class LiveViewController {
  common = {
    getCountByLiveRecordId: (live_record_id: number) =>
      liveViewService.getCountByLiveRecordId(live_record_id),
    updateDuration: (data: ILiveView) => liveViewService.updateDuration(data),
    create: (data: ILiveView) => liveViewService.create(data),
    find: (id: number) => liveViewService.find(id),
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const {
      id,
      live_record_id,
      live_room_id,
      user_id,
      duration,
      user_agent,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      remark,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      childKeyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<ILiveView> = ctx.request.query;
    const result = await liveViewService.getList({
      id,
      live_record_id,
      live_room_id,
      user_id,
      duration,
      user_agent,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      remark,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      childKeyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    successHandler({ ctx, data: result });
    await next();
  };

  find = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await this.common.find(id);
    successHandler({ ctx, data: result });
    await next();
  };

  update = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const {
      live_record_id,
      live_room_id,
      user_id,
      duration,
      user_agent,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      remark,
    }: ILiveView = ctx.request.body;
    const isExist = await liveViewService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的记录！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await liveViewService.update({
      id,
      live_record_id,
      live_room_id,
      user_id,
      duration,
      user_agent,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      remark,
    });
    successHandler({ ctx });
    await next();
  };

  create = async (ctx: ParameterizedContext, next) => {
    const {
      id,
      live_record_id,
      live_room_id,
      user_id,
      duration,
      user_agent,
      remark,
    }: ILiveView = ctx.request.body;
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
    await this.common.create({
      id,
      live_record_id,
      live_room_id,
      user_id,
      duration,
      user_agent,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      remark,
    });
    successHandler({ ctx });
    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const isExist = await liveViewService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的记录！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await liveViewService.delete(id);
    successHandler({ ctx });
    await next();
  };
}

export default new LiveViewController();
