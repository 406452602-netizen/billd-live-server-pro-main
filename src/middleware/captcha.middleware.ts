import { ParameterizedContext } from 'koa';

import { COMMON_ERROR_CODE, COMMON_HTTP_CODE } from '@/constant';
import { CustomError } from '@/model/customError.model';
import captchaService from '@/service/captcha.service';

/**
 * 验证码验证中间件
 */
class CaptchaMiddleware {
  /**
   * 验证验证码（强制验证）
   * 用于登录等关键接口
   */
  async verifyCaptcha(ctx: ParameterizedContext, next: () => Promise<void>) {
    const { captcha_key, captcha_code } = ctx.request.body || {};

    // 参数验证
    if (!captcha_key) {
      throw new CustomError({
        msg: '验证码key不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    if (!captcha_code) {
      throw new CustomError({
        msg: '验证码不能为空',
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
      let errorCode = COMMON_ERROR_CODE.manMachineError;

      if (verifyResult.reason === 'expired') {
        errorMsg = '验证码已过期，请重新获取';
        errorCode = COMMON_ERROR_CODE.captchaExpired;
      }

      throw new CustomError({
        msg: errorMsg,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode,
      });
    }

    await next();
  }

  /**
   * 可选验证验证码
   * 根据特定条件决定是否需要验证
   * 例如：根据登录失败次数或IP风险等级
   */
  async optionalVerifyCaptcha(
    ctx: ParameterizedContext,
    next: () => Promise<void>
  ) {
    // 这里可以添加逻辑判断是否需要验证验证码
    // 例如：检查登录失败次数、IP风险等

    // 暂时简单实现：如果请求中包含验证码参数，则验证；否则跳过
    const { captcha_key, captcha_code } = ctx.request.body || {};

    if (captcha_key && captcha_code) {
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
          errorCode,
        });
      }
    }

    await next();
  }

  /**
   * 根据IP进行验证码验证
   * 可以用于防止针对同一IP的暴力破解
   */
  async verifyCaptchaByIp(
    ctx: ParameterizedContext,
    next: () => Promise<void>
  ) {
    const clientIp = ctx.ip;
    const { captcha_code } = ctx.request.body || {};

    // 使用IP作为验证码key
    const captchaKey = `ip:${clientIp}`;

    if (!captcha_code) {
      throw new CustomError({
        msg: '验证码不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    // 验证验证码
    const verifyResult = await captchaService.verifyCaptcha(
      captchaKey,
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
        httpStatusCode: errorCode,
        errorCode,
      });
    }

    await next();
  }
}

export default new CaptchaMiddleware();
