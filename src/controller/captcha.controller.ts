import successHandler from '@/app/handler/success-handle';
import {
  COMMON_ERROE_MSG,
  COMMON_ERROR_CODE,
  COMMON_HTTP_CODE,
} from '@/constant';
import { CustomError } from '@/model/customError.model';
import captchaService from '@/service/captcha.service';
import { ParameterizedContext } from 'koa';

/**
 * 验证码控制器
 * 处理验证码的生成和验证请求
 */
class CaptchaController {
  /**
   * 生成验证码
   * @param ctx Koa上下文
   */
  async generate(ctx: ParameterizedContext) {
    try {
      const { key, length, width, height, noise } = ctx.request.query || {};

      // 转换类型
      const options: any = {};
      if (key && typeof key === 'string') options.key = key;
      if (length) options.length = Number(length);
      if (width) options.width = Number(width);
      if (height) options.height = Number(height);
      if (noise) options.noise = Number(noise);

      // 生成验证码
      const result = await captchaService.generateCaptcha(options);

      // 设置响应类型为SVG
      ctx.type = 'image/svg+xml';
      ctx.body = result.svg;

      // 可以将captchaKey设置到响应头，供前端使用
      ctx.set('X-Captcha-Key', result.captchaKey);
    } catch (error) {
      throw new CustomError({
        msg: COMMON_ERROE_MSG.serverError,
        httpStatusCode: COMMON_HTTP_CODE.serverError,
        errorCode: COMMON_ERROR_CODE.serverError,
      });
    }
  }

  /**
   * 验证验证码
   * @param ctx Koa上下文
   */
  async verify(ctx: ParameterizedContext) {
    try {
      const { captcha_key, captcha_code } = ctx.request.body || {};

      // 参数验证
      if (!captcha_key || !captcha_code) {
        throw new CustomError({
          msg: '验证码参数不完整',
          httpStatusCode: COMMON_HTTP_CODE.paramsError,
          errorCode: COMMON_HTTP_CODE.paramsError,
        });
      }

      // 验证验证码
      const verifyResult = await captchaService.verifyCaptcha(
        captcha_key,
        captcha_code
      );

      if (!verifyResult.valid) {
        let errorMsg = '验证码错误';
        let errorCode = COMMON_HTTP_CODE.paramsError;

        if (verifyResult.reason === 'expired') {
          errorMsg = '验证码已过期，请重新获取';
          errorCode = COMMON_ERROR_CODE.captchaExpired;
        }

        throw new CustomError({
          msg: errorMsg,
          httpStatusCode: COMMON_HTTP_CODE.paramsError,
          errorCode: errorCode,
        });
      }

      successHandler({ ctx, data: { isValid: true } });
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError({
        msg: COMMON_ERROE_MSG.serverError,
        httpStatusCode: COMMON_HTTP_CODE.serverError,
        errorCode: COMMON_ERROR_CODE.serverError,
      });
    }
  }

  /**
   * 生成带key的验证码（返回JSON格式，包含key和svg）
   * @param ctx Koa上下文
   */
  async generateWithKey(ctx: ParameterizedContext) {
    try {
      const { length, width, height, noise } = ctx.request.query || {};

      // 转换类型
      const options: any = {};
      if (length) options.length = Number(length);
      if (width) options.width = Number(width);
      if (height) options.height = Number(height);
      if (noise) options.noise = Number(noise);

      // 生成验证码
      const result = await captchaService.generateCaptcha(options);

      successHandler({
        ctx,
        data: {
          captchaKey: result.captchaKey,
          svg: result.svg,
        },
      });
    } catch (error) {
      throw new CustomError({
        msg: COMMON_ERROE_MSG.serverError,
        httpStatusCode: COMMON_HTTP_CODE.serverError,
        errorCode: COMMON_ERROR_CODE.serverError,
      });
    }
  }
}

export default new CaptchaController();
