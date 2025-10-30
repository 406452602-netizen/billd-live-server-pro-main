import { filterObj } from 'billd-utils';
import jwt from 'jsonwebtoken';

import { redisClient } from '@/config/redis';
import { COMMON_ERROE_MSG, COMMON_HTTP_CODE } from '@/constant';
import userController from '@/controller/user.controller';
import { JWT_SECRET } from '@/secret/secret';
import { IUser, UserStatusEnum } from '@/types/IUser';
import { judgeUserStatus } from '@/utils';

// 用户活跃状态的Redis键前缀
const USER_ACTIVE_PREFIX = 'user:active:';
// 用户活跃状态过期时间（10分钟，单位：秒）
const USER_ACTIVE_EXPIRE = 60 * 10;

/**
 * 验证jwt
 */
export const jwtVerify = (token: string) => {
  return new Promise<{
    code: number;
    errorCode?: number;
    msg: string;
    userInfo?: IUser;
  }>((resolve) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      // 判断非法/过期token
      if (err) {
        let msg = err.message;
        if (err.message.indexOf('expired') !== -1) {
          msg = COMMON_ERROE_MSG.jwtExpired;
        }
        if (err.message.indexOf('invalid') !== -1) {
          msg = COMMON_ERROE_MSG.invalidToken;
        }
        resolve({ code: COMMON_HTTP_CODE.unauthorized, msg });
        return;
      }

      async function main() {
        try {
          const userResult = await userController.common.findAndToken(
            decoded?.userInfo?.id
          );
          if (!userResult) {
            // 这个用户已经被删除了
            resolve({
              code: COMMON_HTTP_CODE.unauthorized,
              msg: '该用户不存在！',
            });
            return;
          }
          if (userResult.token !== token) {
            // 1.防止修改密码后，原本的token还能用
            // 2.重新登录问题，重新登录会更新token（这个待优化，应该是异地重新登陆了才更新token）
            resolve({
              code: COMMON_HTTP_CODE.unauthorized,
              msg: COMMON_ERROE_MSG.jwtExpired,
            });
            return;
          }
          const userStatusRes = judgeUserStatus(userResult.status!);
          if (userStatusRes.status !== UserStatusEnum.normal) {
            // 判断用户状态
            resolve({
              code: COMMON_HTTP_CODE.unauthorized,
              errorCode: userStatusRes.errorCode,
              msg: userStatusRes.msg,
            });
            return;
          }
          // 如果验证成功，将用户标记为活跃
          if (userResult?.id && !userResult?.is_agent) {
            const userId = userResult.id;
            const username = userResult.username || '';
            // 格式：user:active:userId:username，便于后续同步时获取用户信息
            const redisKey = `${USER_ACTIVE_PREFIX}${userId}:${username}`;

            try {
              // 存储用户活跃状态，设置5分钟过期
              await redisClient.set(redisKey, '1', {
                EX: USER_ACTIVE_EXPIRE,
              });
            } catch (error) {
              console.error('更新用户活跃状态失败:', error);
              // 不影响主流程
            }
          }

          resolve({
            code: COMMON_HTTP_CODE.success,
            msg: '验证token通过！',
            // userInfo: filterObj({ ...userResult }, ['password', 'token']),
            userInfo: filterObj({ ...userResult }, ['token']),
          });
        } catch (error: any) {
          resolve({ code: COMMON_HTTP_CODE.paramsError, msg: error });
        }
      }

      // 如果token正确，解密token获取用户id，根据id查数据库的token判断是否一致。
      main();
    });
  });
};

/**
 * 自动验证jwt
 */
export const authJwt = async (ctx) => {
  // 首先判断请求头有没有authorization
  if (ctx.req.headers.authorization === undefined) {
    return { code: COMMON_HTTP_CODE.unauthorized, msg: '未登录！' };
  }

  const token = ctx.req.headers.authorization?.split(' ')[1];
  const res = await jwtVerify(token);
  return res;
};

/**
 * 生成jwt，exp单位：小时
 */
export const signJwt = (value: {
  userInfo: IUser;
  exp: number;
  is_agent?: boolean;
}): string => {
  const userInfo = {
    id: value.userInfo.id,
    username: value.userInfo.username,
    avatar: value.userInfo.avatar,
    password: value.userInfo.password,
  };
  if (!value.userInfo.is_agent) {
    // 格式：user:active:userId:username，便于后续同步时获取用户信息
    const redisKey = `${USER_ACTIVE_PREFIX}${userInfo.id!}:${userInfo.username!}`;

    // 存储用户活跃状态，设置5分钟过期
    redisClient.set(redisKey, '1', {
      EX: USER_ACTIVE_EXPIRE,
    });
  }

  const res = jwt.sign(
    { userInfo, exp: Math.floor(Date.now() / 1000) + 60 * 60 * value.exp },
    JWT_SECRET
  );
  return res;
};
