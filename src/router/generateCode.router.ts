import Router from 'koa-router';

import generateCodeController from '@/controller/generateCode.controller';

const generateCodeRouter = new Router({ prefix: '/generate-code' });

generateCodeRouter.get('/download', generateCodeController.generateAndDownload);

export default generateCodeRouter;
