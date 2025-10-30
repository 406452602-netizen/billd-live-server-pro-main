import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';

class MqController {
  create = async (ctx: ParameterizedContext, next) => {
    successHandler({ ctx });
    await next();
  };

  publish = async (ctx: ParameterizedContext, next) => {
    successHandler({ ctx });
    await next();
  };
}

export default new MqController();
