import { ParameterizedContext } from 'koa';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
import { CustomError } from '@/model/customError.model';
import userStatisticsService from '@/service/userStatistics.service';

class UserStatisticsController {
  /**
   * 获取用户的总流水和总输赢统计
   * 接口：GET /user-statistics/total
   * @param ctx Koa上下文
   * @param next 下一个中间件
   */
  async getUserTotalStatistics(ctx: ParameterizedContext, next) {
    // 验证用户身份
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }

    // 获取查询参数
    const { userId, ...params } = ctx.request.query;
    // 如果没有提供userId，则使用当前登录用户的ID
    let targetUserId = userId ? Number(userId) : userInfo.id;
    if (!userInfo.is_agent) {
      targetUserId = userInfo.id;
    }

    // 调用服务获取统计数据
    const result = await userStatisticsService.getUserTotalStatistics(
      targetUserId!,
      params
    );

    // 返回成功响应
    successHandler({ ctx, data: result });
    await next();
  }

  /**
   * 获取批量用户的总流水和总输赢统计
   * 接口：GET /user-statistics/batch
   * @param ctx Koa上下文
   * @param next 下一个中间件
   */
  async getUsersTotalStatistics(ctx: ParameterizedContext, next) {
    // 验证用户身份
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }

    // 只有代理用户才能使用此接口
    if (!userInfo.is_agent) {
      throw new CustomError({
        msg: '只有代理用户才能查看批量统计数据',
        httpStatusCode: COMMON_HTTP_CODE.forbidden,
        errorCode: 10001,
      });
    }

    // 获取查询参数
    const params: any = ctx.request.query;
    // 调用服务获取统计数据
    const result =
      await userStatisticsService.getUsersTotalStatisticsBySingleQuery(params);

    // 返回成功响应
    successHandler({ ctx, data: result });
    await next();
  }
}

export default new UserStatisticsController();
