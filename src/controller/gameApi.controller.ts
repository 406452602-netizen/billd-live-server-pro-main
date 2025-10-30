import fs from 'fs';

import { ParameterizedContext } from 'koa';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
import { CustomError } from '@/model/customError.model';
import gameApiAdapterService from '@/service/gameApiAdapter.service';
import { resolveApp } from '@/utils';

class GameApiController {
  /**
   * 创建玩家
   */
  createPlayer = async (ctx: ParameterizedContext, next) => {
    const { gameId, loginId, loginPass, fullName, ...otherParams } =
      ctx.request.body;

    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    if (!loginId || !loginPass || !fullName) {
      throw new CustomError({
        msg: 'loginId, loginPass, fullName 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    const result = await gameApiAdapterService.createPlayer(gameId, {
      loginId,
      loginPass,
      fullName,
      ...otherParams,
    });

    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 获取玩家资料
   */
  getProfile = async (ctx: ParameterizedContext, next) => {
    const { gameId, loginId } = ctx.request.query as {
      gameId: string;
      loginId: string;
    };

    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    if (!loginId) {
      throw new CustomError({
        msg: 'loginId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    const result = await gameApiAdapterService.getProfile(gameId, loginId);
    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 存款
   */
  deposit = async (ctx: ParameterizedContext, next) => {
    let { loginId } = ctx.request.body;
    const { amount, gameId } = ctx.request.body;

    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    if (!amount) {
      throw new CustomError({
        msg: '金额 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    if (ctx.state.userInfo?.id && !loginId) {
      throw new CustomError({
        msg: 'loginId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    } else {
      loginId = ctx.state.userInfo?.id;
    }

    // 调用服务层的完整存款业务流程
    const result = await gameApiAdapterService.deposit(gameId, {
      loginId,
      amount,
    });

    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 取款
   */
  withdraw = async (ctx: ParameterizedContext, next) => {
    const { amount, gameId } = ctx.request.body;

    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    if (!amount) {
      throw new CustomError({
        msg: '金额 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    if (!ctx.state.userInfo?.id) {
      throw new CustomError({
        msg: '用户id 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    // 调用服务层的完整取款业务流程
    const result = await gameApiAdapterService.withdraw(gameId, {
      amount,
      loginId: ctx.state.userInfo?.id,
    });

    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 投注登录
   */
  betLogin = async (ctx: ParameterizedContext, next) => {
    const { gameId, ...data } = ctx.request.query as {
      gameId: string;
      loginId: string;
      loginPass: string;
    };
    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    if (!data.loginId || !data.loginPass) {
      throw new CustomError({
        msg: 'loginId, loginPass 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    const result = await gameApiAdapterService.betLogin(gameId, data);

    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 投注大厅
   */
  betLobby = async (ctx: ParameterizedContext, next) => {
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }

    const { gameId, id } = ctx.request.query as {
      gameId?: number;
      id?: string; // 如果为集成游戏API，需要带上集成游戏中对应的id
    }; // 默认使用游戏ID 1
    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    let result = await gameApiAdapterService.betLobby(gameId, {
      userInfo,
      view: 'mobile',
      id: Number(id),
      backUrl: ctx.request.origin,
      loginPass: userInfo.password,
    });
    if (result == null) {
      const createPlayerResult = await gameApiAdapterService.createPlayer(
        Number(gameId),
        {
          loginId: userInfo.id!,
          loginPass: userInfo.password,
          fullName: userInfo?.username,
        }
      );
      console.log(createPlayerResult);
      result = await gameApiAdapterService.betLobby(gameId, {
        userInfo,
        view: 'mobile',
        id: Number(id),
        backUrl: ctx.request.origin,
        loginPass: userInfo?.password,
      });
    }

    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 投注列表
   */
  betList = async (ctx: ParameterizedContext, next) => {
    const { gameId, ...data } = ctx.request.query;

    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    if (!data.loginId) {
      throw new CustomError({
        msg: 'loginId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    const result = await gameApiAdapterService.betList(gameId as string, data);

    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 分页投注列表
   */
  betListByPage = async (ctx: ParameterizedContext, next) => {
    const { gameId, ...data } = ctx.request.query;

    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    if (!data.loginId || !data.pageNo) {
      throw new CustomError({
        msg: 'loginId, page, limit 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    const result = await gameApiAdapterService.betListByPage(
      gameId as string,
      data
    );

    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 投注历史
   */
  betHistory = async (ctx: ParameterizedContext, next) => {
    const { gameId, ...data } = ctx.request.query;

    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    if (!data.loginId) {
      throw new CustomError({
        msg: 'loginId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    const result = await gameApiAdapterService.betHistory(
      gameId as string,
      data
    );

    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 中奖号码
   */
  winningNumber = async (ctx: ParameterizedContext, next) => {
    const { gameId, ...data } = ctx.request.query;

    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    const result = await gameApiAdapterService.winningNumber(
      gameId as string,
      data
    );
    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 开奖结果
   */
  drawResult = async (ctx: ParameterizedContext, next) => {
    const { gameId, from_date, to_date } = ctx.request.query;

    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    const result = await gameApiAdapterService.drawResult(
      gameId as string,
      from_date as string,
      to_date as string
    );
    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 更新玩家状态/密码
   */
  updatePlayerStatus = async (ctx: ParameterizedContext, next) => {
    const { gameId, ...data } = ctx.request.query;

    if (!gameId) {
      throw new CustomError({
        msg: 'gameId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    if (!data.loginId) {
      throw new CustomError({
        msg: 'loginId 不能为空',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
      });
    }

    const result = await gameApiAdapterService.updatePlayerStatus(
      gameId as string,
      data
    );

    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 获取游戏列表
   * 这个方法不需要gameId参数
   */
  getGames = async (ctx: ParameterizedContext, next) => {
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const data = ctx.request.query;

    // 使用本地数据库查询游戏列表
    const result = await gameApiAdapterService.getGames(data, userInfo.id!);
    successHandler({ ctx, data: result });
    await next();
  };

  getGamesNames = async (ctx: ParameterizedContext, next) => {
    const data = ctx.request.query;
    const result = await gameApiAdapterService.getGamesName(data);
    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 一键提款
   */
  withdrawAll = async (ctx: ParameterizedContext, next) => {
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }

    // 直接将完整的用户信息传递给服务层
    const result = await gameApiAdapterService.withdrawAll(userInfo?.id);

    successHandler({ ctx, data: result });
    await next();
  };

  /**
   * 获取第三方API秘钥
   * 对外开放接口，接收JSON格式的秘钥内容，将其写入文件并返回访问链接
   */
  getThirdPartyApiKey = async (ctx: ParameterizedContext, next) => {
    try {
      // 从请求体中获取秘钥内容
      const keyContent = ctx.request.query;

      if (!keyContent || typeof keyContent !== 'object') {
        throw new CustomError({
          msg: '请求体必须包含JSON格式的秘钥内容',
          httpStatusCode: COMMON_HTTP_CODE.paramsError,
        });
      }

      // 生成唯一的文件名，使用时间戳避免覆盖
      const timestamp = Date.now();
      const fileName = `third_party_api_key_${timestamp}.json`;
      const filePath = resolveApp(`/upload/${fileName}`);

      // 确保upload目录存在
      const uploadDir = resolveApp('/upload');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // 将秘钥内容写入文件
      fs.writeFileSync(filePath, JSON.stringify(keyContent, null, 2));

      // 生成访问链接
      // 从请求头中获取主机信息，或者使用默认值
      const host = ctx.request.headers.host || 'localhost:3000';
      const protocol = ctx.request.headers['x-forwarded-proto'] || 'http';
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const link = `${protocol}://${host}`;

      ctx.body = {
        data: {
          link,
        },
        code: COMMON_HTTP_CODE.success,
        playerID: '123',
        error: '123',
        description: '123',
      };
      // 返回响应
      // successHandler({
      //   ctx,
      //   data: {
      //     link,
      //   },
      //   playerId: '123',
      //   error: '123',
      //   description: '123',
      // });
      await next();
    } catch (error) {
      console.error('获取第三方API秘钥失败:', error);
      throw new CustomError({
        msg: `获取第三方API秘钥失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        httpStatusCode: COMMON_HTTP_CODE.serverError,
      });
    }
  };

  /**
   * 获取游戏集成信息
   */
  getGameIntegrations = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await gameApiAdapterService.getGameIntegrations(id);
    successHandler({ ctx, data: result.data });
    await next();
  };
}

export default new GameApiController();
