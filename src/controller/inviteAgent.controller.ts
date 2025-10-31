import { ParameterizedContext } from 'koa';
import SnowflakeId from 'snowflake-id';

import { signJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import {
  COMMON_HTTP_CODE,
  COMMON_SUCCESS_MSG,
  DEFAULT_ROLE_INFO,
  DEFAULT_TOKEN_EXP,
  THIRD_PLATFORM,
} from '@/constant';
// 从生成的 types 文件导入接口
import loginRecordController from '@/controller/loginRecord.controller';
import { IInviteAgent, InviteAgent, LoginRecordEnum } from '@/interface';
import { CustomError } from '@/model/customError.model';
import inviteAgentService from '@/service/inviteAgent.service';
import thirdUserService from '@/service/thirdUser.service';
import userService from '@/service/user.service';
import walletService from '@/service/wallet.service';
import { IUser } from '@/types/IUser';
import { generateUniqueInviteCode, strSlice, validateUsername } from '@/utils';
import { getAncestors } from '@/utils/permissionUtils';
import { RedisLock } from '@/utils/redisLock';

const snowflake = new SnowflakeId({
  mid: 1, // 机器 ID，范围 0 - 1023
  offset: (2022 - 1970) * 31536000 * 1000, // 起始时间戳偏移量
});

class InviteAgentController {
  create = async (ctx: ParameterizedContext, next) => {
    const data: IInviteAgent = ctx.request.body;
    if (data.invite_class === InviteAgent.agent) {
      if (data.agent_account_for! >= 1) {
        data.agent_account_for! *= 0.01;
      }
    } else {
      data.agent_account_for = undefined;
    }

    data.invite_code = generateUniqueInviteCode();
    const user: IUser = ctx.state.userInfo;

    data.ancestors = user.ancestors;
    data.invite_user_id = user.id!;
    if (ctx.state.userInfo.id === 1) {
      data.link_identifier = snowflake.generate();
    } else {
      data.link_identifier = ctx.state.userInfo.link_identifier;
    }
    const result = await inviteAgentService.create(data);
    if (!result) {
      throw new CustomError({
        msg: `创建inviteAgent失败！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    successHandler({ ctx, data: data.invite_code });
    await next();
  };

  find = async (ctx: ParameterizedContext, next) => {
    const { invite_code } = ctx.params;
    const result = await inviteAgentService.find(invite_code, false);
    if (!result) {
      throw new CustomError({
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        msg: `不存在invite_code为${invite_code}的inviteAgent记录！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    successHandler({ ctx, data: result });
    await next();
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const { body } = ctx.request;
    const result = await inviteAgentService.getList(
      body,
      ctx.state.userInfo.id
    );
    successHandler({ ctx, data: result });
    await next();
  };

  update = async (ctx: ParameterizedContext, next) => {
    const invite_code = ctx.params.invite_code as string;
    const data: Partial<IInviteAgent> = ctx.request.body;
    const isUpdated = await inviteAgentService.update(invite_code, data);
    if (!isUpdated) {
      throw new CustomError({
        msg: `更新invite_code为${invite_code}的inviteAgent记录失败！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    successHandler({
      ctx,
      data: { message: `invite_code为${invite_code}的inviteAgent记录更新成功` },
    });
    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const invite_code = +ctx.params.invite_code;
    const isDeleted = await inviteAgentService.delete(invite_code);
    if (!isDeleted) {
      throw new CustomError({
        msg: `删除invite_code为${invite_code}的inviteAgent记录失败！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    successHandler({
      ctx,
      data: { message: `invite_code为${invite_code}的inviteAgent记录删除成功` },
    });
    await next();
  };

  register = async (ctx: ParameterizedContext, next) => {
    const data = ctx.request.body;
    const { inviteCode, username, password, is_client } = data;

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
    if (!inviteCode) {
      throw new CustomError({
        msg: `邀请码为空！`,
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
    const inviteAgent = await inviteAgentService.find(inviteCode);
    if (!inviteAgent) {
      throw new CustomError({
        msg: `邀请码不正确或过期！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    if (
      (is_client && inviteAgent.invite_class === InviteAgent.agent) ||
      (!is_client && inviteAgent.invite_class === InviteAgent.member)
    ) {
      throw new CustomError({
        msg: `邀请码平台不正确，请选择${is_client ? '管理端' : '客户端'}注册！`,
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
          if (inviteAgent.invite_class === InviteAgent.agent) {
            createUserInfo = await userService.createAgentUser({
              parent_id: inviteAgent.invite_user_id,
              username,
              password,
              agent_account_for: inviteAgent.agent_account_for,
              link_identifier: inviteAgent.link_identifier,
            });
          } else {
            createUserInfo = await userService.create({
              parent_id: inviteAgent.invite_user_id,
              username,
              password,
              agent_account_for: inviteAgent.agent_account_for,
              link_identifier: inviteAgent.link_identifier,
            });
          }
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
        let isAgent = false;
        if (createUserInfo) {
          createUserInfo.ancestors = getAncestors(
            createUserInfo,
            inviteAgent.ancestors!
          );
          if (inviteAgent.invite_class === InviteAgent.member) {
            // @ts-ignore
            await createUserInfo.setRoles([DEFAULT_ROLE_INFO.SVIP_USER.id]);
          } else if (inviteAgent.invite_class === InviteAgent.agent) {
            // @ts-ignore
            await createUserInfo.setRoles([DEFAULT_ROLE_INFO.ADMIN.id]);
            isAgent = true;
          }
          const exp = DEFAULT_TOKEN_EXP;
          const token = signJwt({
            userInfo: {
              id: createUserInfo.id,
              username: createUserInfo.username,
              avatar: createUserInfo.avatar,
              desc: createUserInfo.desc,
            },
            exp,
          });
          await userService.update({
            id: createUserInfo.id,
            is_agent: isAgent,
            ancestors: createUserInfo.ancestors,
            token,
          });
          await walletService.create({
            user_id: createUserInfo.id,
            balance: 0,
          });
          await thirdUserService.create({
            user_id: createUserInfo.id,
            third_user_id: createUserInfo.id,
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
            client_app_version = strSlice(
              String(headers['x-billd-appver']),
              90
            );
          }
          if (!client_ip) {
            client_ip = strSlice(String(headers['x-real-ip']), 90);
          }
          if (!user_agent) {
            user_agent = strSlice(String(headers['user-agent']), 490);
          }
          await loginRecordController.common.create({
            user_id: createUserInfo.id,
            type: LoginRecordEnum.registerUsername,
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
          await next();
        }
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
}

export default new InviteAgentController();
