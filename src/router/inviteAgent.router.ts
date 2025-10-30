import Router from 'koa-router';

import InviteAgentController from '@/controller/inviteAgent.controller';

const inviteAgentRouter = new Router({ prefix: '/inviteAgent' });

inviteAgentRouter.post('/create', InviteAgentController.create);
inviteAgentRouter.get('/:invite_code', InviteAgentController.find);
inviteAgentRouter.post('/list', InviteAgentController.getList);
inviteAgentRouter.put('/update', InviteAgentController.update);
inviteAgentRouter.delete('/:invite_code', InviteAgentController.delete);

inviteAgentRouter.post('/register', InviteAgentController.register);

export default inviteAgentRouter;
