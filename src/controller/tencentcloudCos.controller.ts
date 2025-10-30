import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
import { CustomError } from '@/model/customError.model';
import { TENCENTCLOUD_COS } from '@/spec-config';
import { getPolicyByRes } from '@/utils/tencentcloud-cos';

class TencentcloudCosController {
  getPolicyByRes = async (ctx: ParameterizedContext, next) => {
    // @ts-ignore
    const { prefix }: { prefix: string } = ctx.request.query;
    if (!TENCENTCLOUD_COS['res-1305322458'].prefix[prefix]) {
      throw new CustomError({
        msg: `非法prefix！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const res = await getPolicyByRes({ prefix });
    successHandler({
      ctx,
      data: res,
    });
    await next();
  };
}

export default new TencentcloudCosController();
