import Router from 'koa-router';

import GameConsumptionRecordController from '@/controller/gameConsumptionRecord.controller';

const gameConsumptionRecordRouter = new Router({
  prefix: '/gameConsumptionRecord',
});

/**
 * 代理商查询旗下用户交易情况接口
 * 需要登录认证，且只能查询自己代理的用户
 */
gameConsumptionRecordRouter.get(
  '/agentUserRecords',
  GameConsumptionRecordController.getAgentUserRecords
);

export default gameConsumptionRecordRouter;
