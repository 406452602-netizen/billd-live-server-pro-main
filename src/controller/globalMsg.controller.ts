import { ParameterizedContext } from 'koa';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
import { GlobalMsgTypeEnum, IGlobalMsg, IList } from '@/interface';
import { CustomError } from '@/model/customError.model';
import globalMsgService from '@/service/globalMsg.service';

class GlobalMsgController {
  common = {
    create: (data: IGlobalMsg) => globalMsgService.create(data),
    find: (id: number) => globalMsgService.find(id),
    getList: ({
      id,
      user_id,
      client_ip,
      type,
      show,
      priority,
      title,
      content,
      remark,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IGlobalMsg>) =>
      globalMsgService.getList({
        id,
        user_id,
        client_ip,
        type,
        show,
        priority,
        title,
        content,
        remark,
        orderBy,
        orderName,
        nowPage,
        pageSize,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      }),
    getAll: ({
      id,
      user_id,
      client_ip,
      type,
      show,
      priority,
      title,
      content,
      remark,
      orderBy,
      orderName,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IGlobalMsg>) =>
      globalMsgService.getAll({
        id,
        user_id,
        client_ip,
        type,
        show,
        priority,
        title,
        content,
        remark,
        orderBy,
        orderName,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      }),
    getAllPure: ({
      id,
      user_id,
      client_ip,
      type,
      show,
      priority,
      title,
      content,
      remark,
      orderBy,
      orderName,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IGlobalMsg>) =>
      globalMsgService.getAllPure({
        id,
        user_id,
        client_ip,
        type,
        show,
        priority,
        title,
        content,
        remark,
        orderBy,
        orderName,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      }),
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const data: IList<IGlobalMsg> = ctx.request.query;
    const result = await this.common.getList(data);
    successHandler({ ctx, data: result });
    await next();
  };

  getGlobal = async (ctx: ParameterizedContext, next) => {
    const { userInfo } = await authJwt(ctx);
    const data: IList<IGlobalMsg> = ctx.request.query;
    const result: IGlobalMsg[] = [];
    const result1 = await this.common.getAllPure({
      ...data,
      // @ts-ignore
      type: [
        GlobalMsgTypeEnum.system,
        GlobalMsgTypeEnum.activity,
        GlobalMsgTypeEnum.notification,
      ],
    });
    result.push(...result1);
    if (userInfo?.id) {
      const result2 = await this.common.getAllPure({
        ...data,
        type: GlobalMsgTypeEnum.user,
        user_id: userInfo.id,
      });
      result.push(...result2);
    }
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
    const { user_id, client_ip, priority, show, type, remark }: IGlobalMsg =
      ctx.request.body;
    const isExist = await globalMsgService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的全局消息！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await globalMsgService.update({
      id,
      user_id,
      client_ip,
      priority,
      show,
      type,
      remark,
    });
    successHandler({ ctx });
    await next();
  };

  create = async (ctx: ParameterizedContext, next) => {
    const data = ctx.request.body;
    await this.common.create(data);
    successHandler({ ctx });
    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const isExist = await globalMsgService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的全局消息！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await globalMsgService.delete(id);
    successHandler({ ctx });
    await next();
  };
}

export default new GlobalMsgController();
