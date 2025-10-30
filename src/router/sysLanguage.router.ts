import Router from 'koa-router';

import sysLanguageController from '@/controller/sysLanguage.controller';

const languageRouter = new Router({ prefix: '/sysLanguage' });
languageRouter.get('/getList', sysLanguageController.getList);
languageRouter.get('/findDict/:code', sysLanguageController.findDict);

export default languageRouter;
