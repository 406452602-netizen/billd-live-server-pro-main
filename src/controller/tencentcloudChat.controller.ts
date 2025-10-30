import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';
import { TENCENTCLOUD_CHAT_SDK_SECRETKEY } from '@/secret/secret';
import { TENCENTCLOUD_CHAT_SDK_APPID } from '@/spec-config';
import { TLSSigAPIv2 } from '@/utils/TLSSigAPIv2';

class TencentcloudChatController {
  common = {
    genUserSig(userId: string) {
      const api = new TLSSigAPIv2(
        TENCENTCLOUD_CHAT_SDK_APPID,
        TENCENTCLOUD_CHAT_SDK_SECRETKEY
      );
      const sig = api.genUserSig(userId, 86400 * 180);
      return sig;
    },
  };

  genUserSigRoute = async (ctx: ParameterizedContext, next) => {
    const { userId } = ctx.request.body;
    const result = this.common.genUserSig(userId);
    successHandler({ ctx, data: result });
    await next();
  };
}

export default new TencentcloudChatController();
