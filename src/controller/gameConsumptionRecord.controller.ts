import { ParameterizedContext } from 'koa';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
import { CustomError } from '@/model/customError.model';
import GameConsumptionRecordService from '@/service/gameConsumptionRecord.service';

class GameConsumptionRecordController {
  /**
   * 代理商查询旗下用户交易情况
   * 需要登录认证，且只能查询自己代理的用户
   */
  getAgentUserRecords = async (ctx: ParameterizedContext, next) => {
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }

    // 检查用户是否为代理商
    if (!userInfo.is_agent || Number(userInfo.is_agent) !== 1) {
      throw new CustomError({
        msg: '非代理商账号，无权限查询旗下用户交易记录',
        httpStatusCode: COMMON_HTTP_CODE.forbidden,
        errorCode: COMMON_HTTP_CODE.forbidden,
      });
    }

    const { query } = ctx.request;
    const data: any = query;
    data.userId = userInfo.id; // 传入当前代理商用户ID

    const result = await GameConsumptionRecordService.getAgentUserRecords(
      data,
      userInfo.id!
    );
    successHandler({ ctx, data: result });
    await next();
  };
}

export default new GameConsumptionRecordController();
