import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';
import sysLanguageService from '@/service/sysLanguage.service';

class UserController {
  common = {
    findDict: (code: string) => sysLanguageService.findDict(code),
    getList: () => sysLanguageService.getList(),
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const result = await sysLanguageService.getList();
    successHandler({ ctx, data: result });
    await next();
  };

  findDict = async (ctx: ParameterizedContext, next) => {
    const { code } = ctx.params;
    const result = await sysLanguageService.findDict(code);
    successHandler({ ctx, data: result });
    await next();
  };
}

export default new UserController();
