import Router from 'koa-router';

import GameTransactionRecordController from '@/controller/gameTransactionRecord.controller';

const gameTransactionRecordRouter = new Router({
  prefix: '/gameTransactionRecord',
});

gameTransactionRecordRouter.post(
  '/create',
  GameTransactionRecordController.create
);
gameTransactionRecordRouter.get(
  '/find/:id',
  GameTransactionRecordController.find
);
gameTransactionRecordRouter.get(
  '/list',
  GameTransactionRecordController.getList
);
gameTransactionRecordRouter.put(
  '/update',
  GameTransactionRecordController.update
);
gameTransactionRecordRouter.delete(
  '/delete/:id',
  GameTransactionRecordController.delete
);

gameTransactionRecordRouter.get(
  '/gameConsumptionList',
  GameTransactionRecordController.getGameConsumptionList
);

export default gameTransactionRecordRouter;
