import { ParameterizedContext } from 'koa';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
// 从生成的 types 文件导入接口
import { IGameTransactionRecord } from '@/interface';
import { CustomError } from '@/model/customError.model';
import GameConsumptionRecordService from '@/service/gameConsumptionRecord.service';
import GameTransactionRecordService from '@/service/gameTransactionRecord.service';

class GameTransactionRecordController {
  create = async (ctx: ParameterizedContext, next) => {
    const data: IGameTransactionRecord = ctx.request.body;
    const result = await GameTransactionRecordService.create(data);
    successHandler({ ctx, data: result });
    await next();
  };

  find = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await GameTransactionRecordService.find(id);
    if (!result) {
      throw new CustomError({
        msg: `不存在id为${id}的gameTransactionRecord记录！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    successHandler({ ctx, data: result });
    await next();
  };

  getGameConsumptionList = async (ctx: ParameterizedContext, next) => {
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const data: any = ctx.request.query;
    data.user_id = userInfo.id;
    const result = await GameConsumptionRecordService.getList(data);
    successHandler({ ctx, data: result });
    await next();
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const data:any = ctx.request.query;
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    if (!userInfo.is_admin) {
      data.user_id = userInfo.id;
    }
    const result = await GameTransactionRecordService.getList(data);
    successHandler({ ctx, data: result });
    await next();
  };

  update = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const data: Partial<IGameTransactionRecord> = ctx.request.body;
    const isUpdated = await GameTransactionRecordService.update(id, data);
    if (!isUpdated) {
      throw new CustomError({
        msg: `更新id为${id}的gameTransactionRecord记录失败！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    successHandler({
      ctx,
      data: { message: `id为${id}的gameTransactionRecord记录更新成功` },
    });
    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const isDeleted = await GameTransactionRecordService.delete(id);
    if (!isDeleted) {
      throw new CustomError({
        msg: `删除id为${id}的gameTransactionRecord记录失败！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    successHandler({
      ctx,
      data: { message: `id为${id}的gameTransactionRecord记录删除成功` },
    });
    await next();
  };
}

export default new GameTransactionRecordController();
