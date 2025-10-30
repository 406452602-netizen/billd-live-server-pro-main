import { redisClient } from '@/config/redis';

/**
 * Redis分布式锁工具类
 * 用于解决并发场景下的数据一致性问题
 */
export class RedisLock {
  /**
   * 获取分布式锁
   * @param lockKey 锁的键名
   * @param lockValue 锁的值（用于标识锁的拥有者）
   * @param expire 锁的过期时间（毫秒）
   * @returns 是否获取成功
   */
  static async acquireLock(
    lockKey: string,
    lockValue: string,
    expire: number
  ): Promise<boolean> {
    try {
      const result = await redisClient.set(lockKey, lockValue, {
        EX: Math.ceil(expire / 1000), // 转换为秒
        NX: true, // 只有当键不存在时才设置
      });
      return result === 'OK';
    } catch (error) {
      console.error('Failed to acquire lock:', error);
      return false;
    }
  }

  /**
   * 释放分布式锁
   * @param lockKey 锁的键名
   * @param lockValue 锁的值（用于验证是否为锁的拥有者）
   * @returns 是否释放成功
   */
  static async releaseLock(
    lockKey: string,
    lockValue: string
  ): Promise<boolean> {
    try {
      // 预加载Lua脚本，确保只有锁的拥有者才能释放锁
      const releaseScript = `
        if redis.call('get', KEYS[1]) == ARGV[1] then
          return redis.call('del', KEYS[1])
        else
          return 0
        end
      `;

      // 加载脚本并获取sha1
      const scriptSha = await redisClient.scriptLoad(releaseScript);
      
      // 使用evalSha执行脚本，使用node-redis v4正确的参数格式
      const result = await redisClient.evalSha(scriptSha, {
        keys: [lockKey],
        arguments: [lockValue],
      });
      
      return result === 1;
    } catch (error) {
      console.error('Failed to release lock:', error);
      return false;
    }
  }

  /**
   * 使用分布式锁包装异步函数
   * @param lockKey 锁的键名
   * @param fn 需要在锁保护下执行的异步函数
   * @param options 锁的配置选项
   * @returns 函数执行结果
   */
  static async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    options: {
      expire?: number; // 锁的过期时间（毫秒），默认10秒
      retryCount?: number; // 重试次数，默认3次
      retryDelay?: number; // 重试间隔（毫秒），默认500毫秒
    } = {}
  ): Promise<T> {
    const {
      expire = 10000,
      retryCount = 3,
      retryDelay = 500,
    } = options;

    // 生成唯一的锁值，用于标识锁的拥有者
    const lockValue = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let attempts = 0;
    let acquiredLock = false;

    try {
      // 尝试获取锁
      while (attempts < retryCount) {
        acquiredLock = await this.acquireLock(lockKey, lockValue, expire);
        if (acquiredLock) {
          break;
        }

        attempts++;
        if (attempts >= retryCount) {
          throw new Error('Failed to acquire lock after multiple attempts');
        }

        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      if (!acquiredLock) {
        throw new Error('Failed to acquire lock');
      }

      // 执行被保护的函数
      return await fn();
    } finally {
      // 确保释放锁
      if (acquiredLock) {
        await this.releaseLock(lockKey, lockValue);
      }
    }
  }
}