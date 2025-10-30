import Router from 'koa-router';

import userStatisticsController from '@/controller/userStatistics.controller';

const userStatisticsRouter = new Router({ prefix: '/user-statistics' });

/**
 * 获取用户的总流水和总输赢统计
 * 支持通过userId参数指定要查询的用户ID，默认查询当前登录用户
 * 支持通过时间范围参数筛选统计数据
 */
userStatisticsRouter.get(
  '/total',
  userStatisticsController.getUserTotalStatistics
);

/**
 * 获取批量用户的总流水和总输赢统计
 * 支持通过parent_user_id参数指定要查询的父级用户ID，默认查询当前登录用户的下级
 * 支持分页参数（nowPage, pageSize）和时间范围参数筛选统计数据
 * 只有代理用户才能访问此接口
 */
userStatisticsRouter.get(
  '/batch',
  userStatisticsController.getUsersTotalStatistics
);

export default userStatisticsRouter;
