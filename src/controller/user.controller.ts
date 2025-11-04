import { arrayUnique, getRandomString } from 'billd-utils';
import { ParameterizedContext } from 'koa';

import { authJwt, jwtVerify, signJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import {
  COMMON_ERROE_MSG,
  COMMON_ERROR_CODE,
  COMMON_HTTP_CODE,
  COMMON_SUCCESS_MSG,
  DEFAULT_ROLE_INFO,
  DEFAULT_TOKEN_EXP,
  MAX_TOKEN_EXP,
  REDIS_KEY,
  THIRD_PLATFORM,
} from '@/constant';
import authController from '@/controller/auth.controller';
import loginRecordController from '@/controller/loginRecord.controller';
import redisController from '@/controller/redis.controller';
import { IList, LoginRecordEnum } from '@/interface';
import { CustomError } from '@/model/customError.model';
import roleService from '@/service/role.service';
import thirdUserService from '@/service/thirdUser.service';
import userService from '@/service/user.service';
import walletService from '@/service/wallet.service';
import { IUser } from '@/types/IUser';
import { strSlice, validateUsername } from '@/utils';
import { RedisLock } from '@/utils/redisLock';

class UserController {
  common = {
    findAndToken: (id: number) => userService.findAndToken(id),
    findAll: (ids: number[]) => userService.findAll(ids),
    isExist: (ids) => userService.isExist(ids),
    list: (data, userId) => userService.getList(data, userId),
    create: (data: IUser, options?: any) => userService.create(data, options),
    isSameName: (username: string) => userService.isSameName(username),
  };

  create = async (ctx: ParameterizedContext, next) => {
    const data: IUser = ctx.request.body;
    const username = data.username?.trim();
    const password = data.password?.trim();
    const { user_roles } = data;

    // 先进行不需要访问数据库的基础校验
    if (!username) {
      throw new CustomError({
        msg: `用户名为空！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    if (!password) {
      throw new CustomError({
        msg: `密码为空！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    // 使用统一的用户名校验函数
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      throw new CustomError({
        msg: usernameValidation.message,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    if (password.length < 6 || password.length > 18) {
      throw new CustomError({
        msg: `密码长度要求6-18位！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    // 再进行需要访问数据库的校验
    const isExistSameName = await userService.isSameName(username);
    if (isExistSameName) {
      throw new CustomError({
        msg: `已存在用户名为${username}的用户！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    data.is_admin = true;
    const createUserInfo = await this.common.create(data);
    if (user_roles) {
      // @ts-ignore
      await createUserInfo.setRoles(user_roles);
    }
    await walletService.create({ user_id: createUserInfo?.id, balance: 0 });
    await thirdUserService.create({
      user_id: createUserInfo?.id,
      third_user_id: createUserInfo?.id,
      third_platform: THIRD_PLATFORM.website,
    });
    let { client_env, client_app, client_app_version, client_ip, user_agent } =
      ctx.request.body;
    const { headers } = ctx.request;
    if (!client_env) {
      client_env = strSlice(String(headers['x-billd-env']), 90);
    }
    if (!client_app) {
      client_app = strSlice(String(headers['x-billd-app']), 90);
    }
    if (!client_app_version) {
      client_app_version = strSlice(String(headers['x-billd-appver']), 90);
    }
    if (!client_ip) {
      client_ip = strSlice(String(headers['x-real-ip']), 90);
    }
    if (!user_agent) {
      user_agent = strSlice(String(headers['user-agent']), 490);
    }
    await loginRecordController.common.create({
      user_id: createUserInfo?.id,
      type: LoginRecordEnum.registerUsername,
      user_agent,
      client_ip,
      client_env,
      client_app,
      client_app_version,
    });
    successHandler({ ctx });
    await next();
  };

  register = async (ctx: ParameterizedContext, next) => {
    const data: IUser = ctx.request.body;
    const username = data.username?.trim();
    const password = data.password?.trim();

    // 先进行基本参数校验
    if (!username || !password) {
      throw new CustomError({
        msg: `用户名或密码为空！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    if (username.length < 3 || username.length > 12) {
      throw new CustomError({
        msg: `用户名长度要求3-12位！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    if (password.length < 6 || password.length > 18) {
      throw new CustomError({
        msg: `密码长度要求6-18位！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    // 使用分布式锁包装核心业务逻辑
    await RedisLock.withLock(
      `register:${username}`,
      async () => {
        // 再次检查用户名是否已存在（在锁的保护下）
        const isExistSameName = await userService.isSameName(username);
        if (isExistSameName) {
          throw new CustomError({
            msg: `已存在用户名为${username}的用户！`,
            httpStatusCode: COMMON_HTTP_CODE.paramsError,
            errorCode: COMMON_HTTP_CODE.paramsError,
          });
        }

        let createUserInfo;
        try {
          createUserInfo = await this.common.create({
            username,
            password,
          });
        } catch (error) {
          // 捕获用户名重复错误
          if (
            error instanceof Error &&
            (error.message.includes('用户名已存在') ||
              error.message.includes('用户名为'))
          ) {
            throw new CustomError({
              msg: `已存在用户名为${username}的用户！`,
              httpStatusCode: COMMON_HTTP_CODE.paramsError,
              errorCode: COMMON_HTTP_CODE.paramsError,
            });
          }
          throw error;
        }
        // @ts-ignore
        await createUserInfo.setRoles([DEFAULT_ROLE_INFO.VIP_USER.id]);
        await walletService.create({
          user_id: createUserInfo?.id,
          balance: 0,
        });
        await thirdUserService.create({
          user_id: createUserInfo?.id,
          third_user_id: createUserInfo?.id,
          third_platform: THIRD_PLATFORM.website,
        });
        let {
          client_env,
          client_app,
          client_app_version,
          client_ip,
          user_agent,
        } = ctx.request.body;
        const { headers } = ctx.request;
        if (!client_env) {
          client_env = strSlice(String(headers['x-billd-env']), 90);
        }
        if (!client_app) {
          client_app = strSlice(String(headers['x-billd-app']), 90);
        }
        if (!client_app_version) {
          client_app_version = strSlice(String(headers['x-billd-appver']), 90);
        }
        if (!client_ip) {
          client_ip = strSlice(String(headers['x-real-ip']), 90);
        }
        if (!user_agent) {
          user_agent = strSlice(String(headers['user-agent']), 490);
        }
        await loginRecordController.common.create({
          user_id: createUserInfo?.id,
          type: LoginRecordEnum.registerUsername,
          user_agent,
          client_ip,
          client_env,
          client_app,
          client_app_version,
        });

        successHandler({ ctx });
        await next();
      },
      {
        expire: 10000, // 10秒过期
        retryCount: 3, // 重试3次
        retryDelay: 500, // 每次重试间隔500ms
      }
    ).catch((error) => {
      if (error.message.includes('Failed to acquire lock')) {
        throw new CustomError({
          msg: `操作太频繁，请稍后再试！`,
          httpStatusCode: COMMON_HTTP_CODE.serverError,
          errorCode: COMMON_HTTP_CODE.serverError,
        });
      }
      throw error;
    });
  };

  qrCodeLoginStatus = async (ctx: ParameterizedContext, next) => {
    const { platform, login_id } = ctx.request.query as {
      platform: string;
      login_id: string;
    };
    if (!THIRD_PLATFORM[platform]) {
      throw new CustomError({
        msg: 'platform错误！',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const res = await redisController.getVal({
      prefix: REDIS_KEY.qrCodeLogin,
      key: `${platform}___${login_id}`,
    });
    if (!res) {
      successHandler({ ctx, data: { isLogin: false } });
    } else {
      const origin = JSON.parse(res);
      successHandler({ ctx, data: origin.value });
    }
    await next();
  };

  qrCodeLogin = async (ctx: ParameterizedContext, next) => {
    const { platform }: { platform: string } = ctx.request.body;
    if (!THIRD_PLATFORM[platform]) {
      throw new CustomError({
        msg: 'platform错误！',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    let { exp } = ctx.request.body;
    if (!exp) {
      exp = DEFAULT_TOKEN_EXP;
    } else if (exp > MAX_TOKEN_EXP) {
      exp = MAX_TOKEN_EXP;
    }
    const createDate = {
      login_id: getRandomString(8),
      exp,
      platform,
      isLogin: false,
      token: '',
    };
    const redisExp = 60 * 5;
    await redisController.setExVal({
      prefix: REDIS_KEY.qrCodeLogin,
      key: `${platform}___${createDate.login_id}`,
      exp: redisExp,
      value: createDate,
    });
    successHandler({ ctx, data: createDate });
    await next();
  };

  usernameLogin = async (ctx: ParameterizedContext, next) => {
    const { username, password, is_client } = ctx.request.body;
    let { exp } = ctx.request.body;
    if (!exp) {
      exp = DEFAULT_TOKEN_EXP;
    } else if (exp > MAX_TOKEN_EXP) {
      exp = MAX_TOKEN_EXP;
    }
    const userRes = await userService.usernameLogin({ username, password });
    if (!userRes) {
      throw new CustomError({
        msg: COMMON_ERROE_MSG.usernameOrPwdError,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_ERROR_CODE.usernameOrPwdError,
      });
    }

    if (is_client && userRes.is_agent) {
      throw new CustomError({
        msg: COMMON_ERROE_MSG.invalidLogin,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_ERROR_CODE.usernameOrPwdError,
      });
    } else if (!is_client && !userRes.is_agent) {
      throw new CustomError({
        msg: COMMON_ERROE_MSG.invalidLogin,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_ERROR_CODE.usernameOrPwdError,
      });
    }
    const { userInfo } = await jwtVerify(userRes.token || '');
    let token;
    if (!userInfo) {
      token = signJwt({
        userInfo: {
          id: userRes.id,
          username: userRes.username,
          avatar: userRes.avatar,
          desc: userRes.desc,
          password,
        },
        exp,
      });
      await userService.update({
        id: userRes.id,
        token,
      });
    } else {
      token = userRes.token;
    }
    let { client_env, client_app, client_app_version, client_ip, user_agent } =
      ctx.request.body;
    const { headers } = ctx.request;
    if (!client_env) {
      client_env = strSlice(String(headers['x-billd-env']), 90);
    }
    if (!client_app) {
      client_app = strSlice(String(headers['x-billd-app']), 90);
    }
    if (!client_app_version) {
      client_app_version = strSlice(String(headers['x-billd-appver']), 90);
    }
    if (!client_ip) {
      client_ip = strSlice(String(headers['x-real-ip']), 90);
    }
    if (!user_agent) {
      user_agent = strSlice(String(headers['user-agent']), 490);
    }
    await loginRecordController.common.create({
      user_id: userRes.id,
      type: LoginRecordEnum.loginUsername,
      user_agent,
      client_ip,
      client_env,
      client_app,
      client_app_version,
    });
    successHandler({
      ctx,
      data: token,
      msg: COMMON_SUCCESS_MSG.loginSuccess,
    });

    /**
     * 这个其实是最后一个中间件了，其实加不加调不调用next都没硬性，但是为了防止后面要
     * 是扩展又加了一个中间件，这里不调用await next()的话，会导致下一个中间件出现404或其他问题，
     * 因此还是得在这调用一次await next()
     */
    await next();
  };

  idLogin = async (ctx: ParameterizedContext, next) => {
    const { id, password } = ctx.request.body;
    let { exp } = ctx.request.body;
    if (!exp) {
      exp = DEFAULT_TOKEN_EXP;
    } else if (exp > MAX_TOKEN_EXP) {
      exp = MAX_TOKEN_EXP;
    }
    const userRes = await userService.idLogin({ id, password });
    if (!userRes) {
      throw new CustomError({
        msg: COMMON_ERROE_MSG.idOrPwdError,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_ERROR_CODE.idOrPwdError,
      });
    }
    const { userInfo } = await jwtVerify(userRes.token || '');
    let token;
    if (!userInfo) {
      token = signJwt({
        userInfo: {
          id: userRes.id,
          username: userRes.username,
          avatar: userRes.avatar,
          desc: userRes.desc,
        },
        exp,
      });
      await userService.update({
        id: userRes.id,
        token,
      });
    } else {
      token = userRes.token;
    }
    let { client_env, client_app, client_app_version, client_ip, user_agent } =
      ctx.request.body;
    const { headers } = ctx.request;
    if (!client_env) {
      client_env = strSlice(String(headers['x-billd-env']), 90);
    }
    if (!client_app) {
      client_app = strSlice(String(headers['x-billd-app']), 90);
    }
    if (!client_app_version) {
      client_app_version = strSlice(String(headers['x-billd-appver']), 90);
    }
    if (!client_ip) {
      client_ip = strSlice(String(headers['x-real-ip']), 90);
    }
    if (!user_agent) {
      user_agent = strSlice(String(headers['user-agent']), 490);
    }
    await loginRecordController.common.create({
      user_id: userRes.id,
      type: LoginRecordEnum.loginId,
      user_agent,
      client_ip,
      client_env,
      client_app,
      client_app_version,
    });
    successHandler({
      ctx,
      data: token,
      msg: COMMON_SUCCESS_MSG.loginSuccess,
    });

    /**
     * 这个其实是最后一个中间件了，其实加不加调不调用next都没硬性，但是为了防止后面要
     * 是扩展又加了一个中间件，这里不调用await next()的话，会导致下一个中间件出现404或其他问题，
     * 因此还是得在这调用一次await next()
     */
    await next();
  };

  list = async (ctx: ParameterizedContext, next) => {
    // @ts-ignore
    const {
      id,
      orderBy,
      parent_user_id,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IUser> = ctx.request.query;

    const { userInfo } = await authJwt(ctx);
    let parent_id;
    let is_admin;

    if (!userInfo?.is_admin) {
      is_admin = false;
    }
    if (parent_user_id) {
      parent_id = parent_user_id;
    } else if (userInfo?.id !== 1 && is_admin !== false) {
      parent_id = 1;
    }
    const result = await this.common.list(
      {
        id,
        orderBy,
        parent_id,
        is_admin,
        orderName,
        nowPage,
        pageSize,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      },
      userInfo?.is_admin ? undefined : userInfo?.id
    );
    successHandler({ ctx, data: result });

    await next();
  };

  find = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await userService.findAccount(id);
    successHandler({ ctx, data: result });

    await next();
  };

  getUserInfo = async (ctx: ParameterizedContext, next) => {
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }

    const [auths, result] = await Promise.all([
      authController.common.getUserAuth(userInfo.id!),
      userService.getUserInfo(userInfo.id!),
    ]);

    successHandler({ ctx, data: { ...result, auths } });
    await next();
  };

  updatePwd = async (ctx: ParameterizedContext, next) => {
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const { oldpwd, newpwd } = ctx.request.body;
    if (!oldpwd || !newpwd) {
      throw new CustomError({
        msg: `oldpwd和newpwd不能为空！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const user = await userService.findPwd(userInfo.id!);
    if (user?.password !== oldpwd) {
      throw new CustomError({
        msg: `旧密码错误！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await userService.updatePwd({
      id: userInfo.id,
      password: newpwd,
      token: '',
    });
    successHandler({ ctx, msg: '修改密码成功！' });
    await next();
  };

  update = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const { username, desc, status, avatar }: IUser = ctx.request.body;
    if (!username || username.length < 3 || username.length > 12) {
      throw new CustomError({
        msg: `用户名长度要求3-12位！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const isExist = await userService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的用户！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const isExistSameName = await userService.isSameName(username);
    if (isExistSameName && isExistSameName.id !== id) {
      throw new CustomError({
        msg: `已存在用户名为${username}的用户！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await userService.update({
      id,
      username,
      desc,
      status,
      avatar,
    });
    successHandler({ ctx });

    await next();
  };

  updateUserRole = async (ctx: ParameterizedContext, next) => {
    const user_id = +ctx.params.id;
    const { user_roles }: IUser = ctx.request.body;

    if (!user_roles || !user_roles.length) {
      throw new CustomError({
        msg: 'user_roles要求number[]！',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    const isExistUser = await userService.isExist([user_id]);
    if (!isExistUser) {
      throw new CustomError({
        msg: `不存在id为${user_id}的用户！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const ids = arrayUnique(user_roles);
    const isExistRole = await roleService.isExist(ids);
    if (!isExistRole) {
      throw new CustomError({
        msg: `${ids.toString()}中存在不存在的角色！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const result = await roleService.updateUserRole({
      user_id,
      role_ids: user_roles,
    });
    successHandler({ ctx, data: result });

    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    successHandler({ ctx, msg: '敬请期待' });
    await next();
  };

  /**
   * 保持用户活跃
   * 网页会定时访问此接口，通过验证token来保持用户活跃状态
   * token验证成功后会自动在缓存中更新用户活跃状态
   */
  keepAlive = async (ctx: ParameterizedContext, next) => {
    const { code, errorCode, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }

    successHandler({ ctx, msg: '保持活跃成功' });
    await next();
  };
}

export default new UserController();
