import Router from 'koa-router';

import wsUserMessageController from '@/controller/wsUserMessage.controller';

const wsMessageRouter = new Router({ prefix: '/ws_user_message' });

wsMessageRouter.get('/list', wsUserMessageController.getList);

wsMessageRouter.post(
  '/customerService/list',
  wsUserMessageController.customerServiceList
);

wsMessageRouter.post('/update', wsUserMessageController.update);

wsMessageRouter.get(
  '/getLastMessagesByTargetUserId/:targetUserId',
  wsUserMessageController.getLastMessagesByTargetUserId
);

export default wsMessageRouter;
