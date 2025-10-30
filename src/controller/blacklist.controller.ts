import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE, REDIS_KEY } from '@/constant';
import redisController from '@/controller/redis.controller';
import { BlacklistTypeEnum, IBlacklist, IList } from '@/interface';
import { CustomError } from '@/model/customError.model';
import blacklistService from '@/service/blacklist.service';

export async function handleDelRedisByDbLiveList() {
  // try {
  //   await redisController.delByPrefix({
  //     prefix: REDIS_KEY.dbLiveList,
  //   });
  // } catch (error) {
  //   console.log(error);
  // }
}

class BlacklistController {
  common = {
    create: (data: IBlacklist) => blacklistService.create(data),
    findAllByType: async (type: BlacklistTypeEnum) => {
      let res: IBlacklist[] = [];
      try {
        const cache = await redisController.getVal({
          prefix: REDIS_KEY.db_blacklist,
          key: 'findAllByType',
        });
        if (!cache) {
          res = await blacklistService.findAllByType(type);
          await redisController.setExVal({
            prefix: REDIS_KEY.db_blacklist,
            key: 'findAllByType',
            value: res,
            exp: 60 * 1,
          });
        } else {
          res = cache || [];
        }
      } catch (error) {
        console.log(error);
      }
      return res;
    },
    findAllClientIpNotNull: async () => {
      let res: IBlacklist[] = [];
      try {
        const cache = await redisController.getVal({
          prefix: REDIS_KEY.db_blacklist,
          key: 'findAllClientIpNotNull',
        });
        if (!cache) {
          res = await blacklistService.findAllClientIpNotNull();
          await redisController.setExVal({
            prefix: REDIS_KEY.db_blacklist,
            key: 'findAllClientIpNotNull',
            value: res,
            exp: 60 * 1,
          });
        } else {
          res = cache || [];
        }
      } catch (error) {
        console.log(error);
      }
      return res;
    },
    findAllByClientIp: (client_ip: string) =>
      blacklistService.findAllByClientIp(client_ip),
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const {
      id,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IBlacklist> = ctx.request.query;
    const result = await blacklistService.getList({
      id,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    successHandler({ ctx, data: result });
    await next();
  };

  find = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await blacklistService.find(id);
    successHandler({ ctx, data: result });
    await next();
  };

  update = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const data: IBlacklist = ctx.request.body;
    const isExist = await blacklistService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的黑名单！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await blacklistService.update(data);
    successHandler({ ctx });
    await next();
  };

  create = async (ctx: ParameterizedContext, next) => {
    const data: IBlacklist = ctx.request.body;
    await this.common.create(data);
    successHandler({ ctx });
    await next();
  };

  addAdminDisable = async (ctx: ParameterizedContext, next) => {
    const { user_id }: IBlacklist = ctx.request.body;
    if (!user_id) {
      throw new CustomError({
        msg: `user_id参数错误！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const res = await blacklistService.findAllByUserId(user_id);
    if (!res.find((v) => v.type === BlacklistTypeEnum.disable_msg)) {
      await this.common.create({
        user_id,
        type: BlacklistTypeEnum.admin_disable,
      });
    }
    successHandler({ ctx });
    await next();
  };

  delAdminDisable = async (ctx: ParameterizedContext, next) => {
    const { user_id }: IBlacklist = ctx.request.body;
    if (!user_id) {
      throw new CustomError({
        msg: `user_id参数错误！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await blacklistService.deleteAll({
      user_id,
      type: BlacklistTypeEnum.admin_disable,
    });
    successHandler({ ctx });
    await next();
  };

  addDisableMsg = async (ctx: ParameterizedContext, next) => {
    const { user_id }: IBlacklist = ctx.request.body;
    if (!user_id) {
      throw new CustomError({
        msg: `user_id参数错误！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const res = await blacklistService.findAllByUserId(user_id);
    if (!res.find((v) => v.type === BlacklistTypeEnum.disable_msg)) {
      await this.common.create({
        user_id,
        type: BlacklistTypeEnum.disable_msg,
      });
    }
    successHandler({ ctx });
    await next();
  };

  delDisableMsg = async (ctx: ParameterizedContext, next) => {
    const { user_id }: IBlacklist = ctx.request.body;
    if (!user_id) {
      throw new CustomError({
        msg: `user_id参数错误！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await blacklistService.deleteAll({
      user_id,
      type: BlacklistTypeEnum.disable_msg,
    });
    successHandler({ ctx });
    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const isExist = await blacklistService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的黑名单！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await blacklistService.delete(id);
    successHandler({ ctx });
    await next();
  };
}

export default new BlacklistController();
