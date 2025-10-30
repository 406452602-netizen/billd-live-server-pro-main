import svgCaptcha from 'svg-captcha';

import { COMMON_ERROE_MSG } from '@/constant';
import redisController from '@/controller/redis.controller';
import { RedisLock } from '@/utils/redisLock';

/**
 * 验证码服务类
 * 处理验证码的生成、验证和管理
 */
class CaptchaService {
  /**
   * 生成验证码
   * @param options 验证码配置选项
   * @returns 包含验证码SVG和key的对象
   */
  async generateCaptcha(
    options: {
      key?: string; // 可选的自定义key
      length?: number; // 验证码长度，默认为4
      width?: number; // SVG宽度
      height?: number; // SVG高度
      noise?: number; // 干扰线数量
    } = {}
  ): Promise<{ svg: string; captchaKey: string; captchaCode: string }> {
    const { length = 4, width = 120, height = 40, noise = 3 } = options;

    // 生成唯一的验证码key
    const captchaKey = options.key || this.generateUniqueKey();

    // 生成验证码
    const captcha = svgCaptcha.create({
      size: length,
      width,
      height,
      noise,
      ignoreChars: '0o1i', // 忽略容易混淆的字符
      color: true, // 彩色验证码
      background: '#f0f0f0', // 背景色
    });

    const captchaCode = captcha.text.toLowerCase(); // 转为小写存储

    // 使用分布式锁确保并发安全
    const lockKey = `captcha:lock:${captchaKey}`;
    const lockValue = `${Date.now()}:${Math.random()}`;

    try {
      // 尝试获取锁
      const locked = await RedisLock.acquireLock(lockKey, lockValue, 5000);
      if (!locked) {
        throw new Error(COMMON_ERROE_MSG.serverError);
      }

      // 存储验证码到Redis，设置5分钟过期
      await redisController.setExVal({
        prefix: 'captcha:',
        key: captchaKey,
        value: captchaCode,
        exp: 5 * 60, // 5分钟有效期
      });

      // 释放锁
      await RedisLock.releaseLock(lockKey, lockValue);

      return {
        svg: captcha.data,
        captchaKey,
        captchaCode,
      };
    } catch (error) {
      // 确保在错误情况下释放锁
      await RedisLock.releaseLock(lockKey, lockValue);
      throw error;
    }
  }

  /**
   * 验证验证码
   * @param captchaKey 验证码key
   * @param userInput 用户输入的验证码
   * @returns 包含验证结果和原因的对象
   */
  async verifyCaptcha(captchaKey: string, userInput: string): Promise<{valid: boolean; reason?: 'invalid' | 'expired' | 'empty'}> {
    if (!captchaKey || !userInput) {
      return { valid: false, reason: 'empty' };
    }

    try {
      // 从Redis获取验证码
      const storedCode = await redisController.getVal({
        prefix: 'captcha:',
        key: captchaKey,
      });

      if (!storedCode) {
        return { valid: false, reason: 'expired' }; // 验证码不存在或已过期
      }

      // 忽略大小写比较
      const isMatch = storedCode.toLowerCase() === userInput.toLowerCase();
      
      // 无论验证成功失败都删除，防止重复使用
      await this.clearCaptcha(captchaKey);

      return { 
        valid: isMatch, 
        reason: isMatch ? undefined : 'invalid' // 验证码不匹配
      };
    } catch (error) {
      console.error('验证验证码失败:', error);
      return { valid: false, reason: 'expired' };
    }
  }

  /**
   * 清除验证码
   * @param captchaKey 验证码key
   */
  async clearCaptcha(captchaKey: string): Promise<void> {
    try {
      await redisController.del({
        prefix: 'captcha:',
        key: captchaKey,
      });
    } catch (error) {
      console.error('清除验证码失败:', error);
    }
  }

  /**
   * 生成唯一的验证码key
   * @returns 唯一key
   */
  private generateUniqueKey(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new CaptchaService();
