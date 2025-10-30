import { ParameterizedContext } from 'koa';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
import { IList, ILoginRecord } from '@/interface';
import { CustomError } from '@/model/customError.model';
import loginRecordService from '@/service/loginRecord.service';
import { strSlice } from '@/utils';

class LoginRecordController {
  common = {
    create: (data: ILoginRecord, options?: any) => loginRecordService.create(data, options),
    find: (id: number) => loginRecordService.find(id),
    getList: ({
      id,
      user_id,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      type,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<ILoginRecord>) =>
      loginRecordService.getList({
        id,
        user_id,
        client_ip,
        client_env,
        client_app,
        client_app_version,
        type,
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
    const data: IList<ILoginRecord> = ctx.request.query;
    const result = await this.common.getList(data);
    successHandler({ ctx, data: result });
    await next();
  };

  getMyList = async (ctx: ParameterizedContext, next) => {
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const data: IList<ILoginRecord> = ctx.request.query;
    const result = await this.common.getList({ ...data, user_id: userInfo.id });
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
    const { type, client_ip, user_agent, remark }: ILoginRecord =
      ctx.request.body;
    const isExist = await loginRecordService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的登录记录！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await loginRecordService.update({
      id,
      type,
      client_ip,
      user_agent,
      remark,
    });
    successHandler({ ctx });
    await next();
  };

  create = async (ctx: ParameterizedContext, next) => {
    const { type, user_id, remark }: ILoginRecord = ctx.request.body;
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
    await this.common.create({
      type,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      user_agent,
      user_id,
      remark,
    });
    successHandler({ ctx });
    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const isExist = await loginRecordService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的登录记录！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await loginRecordService.delete(id);
    successHandler({ ctx });
    await next();
  };
}

export default new LoginRecordController();
