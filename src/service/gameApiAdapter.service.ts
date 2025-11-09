import { GAME_API_PLATFORM_PREFIX, REDIS_KEY_PREFIX } from '@/constant';
import redisController from '@/controller/redis.controller';
import { IGameTransactionRecord } from '@/interface';
import {
  BetHistoryParams,
  BetListByPageParams,
  BetListParams,
  BetLoginParams,
  CreatePlayerParams,
  DepositParams,
  GameApiResponse,
  GameBetListResponse,
  IGameApi,
  UpdatePlayerStatusParams,
  WinningNumberParams,
  WithdrawParams,
} from '@/interface/game/IGameApi';
import gameApiNewService from '@/service/gameApiNew.service';
import gameApiThirdService from '@/service/gameApiThird.service';
import gameTransactionRecordService from '@/service/gameTransactionRecord.service';
import walletService from '@/service/wallet.service';
import { IUser } from '@/types/IUser';
import { RedisLock } from '@/utils/redisLock';
import { TimezoneUtil } from '@/utils/timezone';

import gameApiService from './gameApi.service';
import gamesService from './games.service';

/**
 * 游戏API适配器服务
 * 用于适配不同游戏平台的API调用
 */
class GameApiAdapterService {
  // 存储游戏ID到API服务的映射
  private gameApiServices: Map<number, IGameApi> = new Map();

  constructor() {
    // 初始化时注册默认的游戏API服务
    this.registerGameApiService(1, gameApiService);
    this.registerGameApiService(2, gameApiNewService);
    this.registerGameApiService(3, gameApiThirdService);
  }

  /**
   * 处理loginId，添加平台前缀并零填充到指定长度
   */
  private processLoginId(loginId: string | number): string {
    if (!loginId) return '';

    // 添加平台前缀
    const prefix = GAME_API_PLATFORM_PREFIX || '';
    const loginIdStr = String(loginId);

    // 计算需要零填充的长度
    const totalLength = 11;
    const zeroPaddingLength = totalLength - prefix.length - loginIdStr.length;

    // 如果长度不足，需要填充零；如果长度超过，需要截断
    if (zeroPaddingLength > 0) {
      // 需要零填充
      const zeroPadding = '0'.repeat(zeroPaddingLength);
      return `${prefix}${zeroPadding}${loginIdStr}`;
    }
    // 需要截断，确保总长度为11位
    const availableLength = totalLength - prefix.length;
    return `${prefix}${loginIdStr.substring(0, availableLength)}`;
  }

  /**
   * 获取游戏的时区信息（从Redis缓存中获取）
   */
  private async getGameTimezone(gameId: number): Promise<string> {
    const cacheKey = `game_timezone_${gameId}`;
    const fullKey = `${REDIS_KEY_PREFIX}game_api___${cacheKey}`;

    try {
      // 1. 尝试从Redis获取缓存数据
      const cachedTimezone = await redisController.getVal({
        prefix: '',
        key: fullKey,
      });

      if (cachedTimezone) {
        console.log(`[Redis缓存] 命中游戏时区信息缓存，gameId: ${gameId}`);
        return cachedTimezone;
      }

      // 2. 缓存不存在，从数据库获取
      const game = await gamesService.find(gameId);
      const timezone =
        game?.api_timezone_region || TimezoneUtil.getServerTimezone();

      // 3. 将获取的时区信息缓存到Redis，设置过期时间为1天（86400秒）
      await redisController.setExVal({
        prefix: `${REDIS_KEY_PREFIX}game_api___`,
        key: cacheKey,
        value: timezone,
        exp: 86400,
      });

      console.log(`[Redis缓存] 游戏时区信息已缓存，gameId: ${gameId}`);
      return timezone;
    } catch (error) {
      console.error(`获取游戏时区信息失败，gameId: ${gameId}，错误:`, error);
      return 'Asia/Shanghai'; // 默认使用上海时区
    }
  }

  /**
   * 获取游戏时区偏移量（分钟）
   */
  private async getTimezoneOffset(gameId: number): Promise<number> {
    try {
      const apiTimezone = await this.getGameTimezone(gameId);

      // 如果API时区为空，则没有时区差异
      if (!apiTimezone || apiTimezone.trim() === '') {
        return 0;
      }

      const serverTimezone = TimezoneUtil.getServerTimezone();
      return TimezoneUtil.getTimezoneOffset(serverTimezone, apiTimezone);
    } catch (error) {
      console.error(`获取游戏时区偏移量失败，gameId: ${gameId}，错误:`, error);
      return 0; // 出错时默认没有时区差异
    }
  }

  /**
   * 根据游戏时区调整请求参数中的时间
   * - 服务器时区到API时区的转换
   */
  private async adjustRequestTimezone(
    gameId: number,
    params: any
  ): Promise<any> {
    const adjustedParams = { ...params };

    try {
      const offsetMinutes = await this.getTimezoneOffset(gameId);

      // 如果没有时区差异，直接返回原参数
      if (offsetMinutes === 0) {
        return adjustedParams;
      }

      // 调整参数中的时间字段
      // 服务器时区(如UTC+8) -> API时区(如UTC)
      // 当offsetMinutes为-480时，需要将时间减去8小时
      if (adjustedParams.fromDate) {
        adjustedParams.fromDate = TimezoneUtil.adjustTime(
          adjustedParams.fromDate,
          offsetMinutes, // 使用getTimezoneOffset返回的原始值
          'YYYY-MM-DD HH:mm:ss'
        );
      }
      if (adjustedParams.toDate) {
        adjustedParams.toDate = TimezoneUtil.adjustTime(
          adjustedParams.toDate,
          offsetMinutes, // 使用getTimezoneOffset返回的原始值
          'YYYY-MM-DD HH:mm:ss'
        );
      }
    } catch (error) {
      console.error(`调整请求时区失败，gameId: ${gameId}，错误:`, error);
    }

    return adjustedParams;
  }

  /**
   * 根据游戏时区调整响应数据中的时间
   * - API时区到服务器时区的转换
   */
  private async adjustResponseTimezone(
    gameId: number,
    data: any
  ): Promise<any> {
    // 确保返回数据结构与输入一致
    if (!data) return Array.isArray(data) ? [] : null;

    try {
      const offsetMinutes = await this.getTimezoneOffset(gameId);

      // 如果没有时区差异，直接返回原数据
      if (offsetMinutes === 0) {
        return data;
      }

      // 处理单个对象
      if (!Array.isArray(data) && typeof data === 'object') {
        const adjustedItem = { ...data };

        // 处理包含'time'的字段
        Object.keys(adjustedItem).forEach((key) => {
          if (
            key.toLowerCase().includes('time') &&
            typeof adjustedItem[key] === 'string'
          ) {
            // 对于响应数据，我们需要反转offsetMinutes
            // API时区(如UTC) -> 服务器时区(如UTC+8)
            // 当offsetMinutes为-480时，需要将时间增加8小时，所以使用-offsetMinutes
            adjustedItem[key] = TimezoneUtil.adjustTime(
              adjustedItem[key],
              offsetMinutes * -1, // 使用负的offsetMinutes来反转时区转换
              'YYYY-MM-DD HH:mm:ss'
            );
          }
        });

        return adjustedItem;
      }

      // 处理数组
      if (Array.isArray(data)) {
        return data.map((item: any) => {
          if (!item || typeof item !== 'object') {
            return item;
          }

          const adjustedItem = { ...item };

          // 处理包含'time'的字段
          Object.keys(adjustedItem).forEach((key) => {
            if (
              key.toLowerCase().includes('time') &&
              typeof adjustedItem[key] === 'string'
            ) {
              // 对于响应数据，我们需要反转offsetMinutes
              adjustedItem[key] = TimezoneUtil.adjustTime(
                adjustedItem[key],
                offsetMinutes * -1, // 使用负的offsetMinutes来反转时区转换
                'YYYY-MM-DD HH:mm:ss'
              );
            }
          });

          return adjustedItem;
        });
      }

      return data;
    } catch (error) {
      console.error(`调整响应时区失败，gameId: ${gameId}，错误:`, error);
      return data;
    }
  }

  /**
   * 注册游戏API服务
   * @param gameId 游戏ID
   * @param apiService 实现了IGameApi接口的服务
   */
  registerGameApiService(gameId: number, apiService: IGameApi): void {
    this.gameApiServices.set(gameId, apiService);
  }

  /**
   * 获取指定游戏ID的API服务
   * @param gameId 游戏ID
   * @returns 实现了IGameApi接口的服务
   * @throws 当游戏ID不支持时抛出错误
   */
  private getGameApiService(gameId: number): IGameApi {
    const service = this.gameApiServices.get(gameId);
    if (!service) {
      throw new Error(`不支持的游戏ID: ${gameId}`);
    }
    return service;
  }

  /**
   * 创建玩家
   */
  async createPlayer(
    gameId: string | number,
    params: CreatePlayerParams
  ): Promise<GameApiResponse> {
    const service = this.getGameApiService(Number(gameId));
    // 处理loginId，添加平台前缀并零填充
    const processedParams = {
      ...params,
      loginId: params.loginId ? this.processLoginId(params.loginId) : undefined,
    };
    const result = await service.createPlayer(processedParams);
    return result;
  }

  /**
   * 获取玩家资料
   */
  async getProfile(gameId: string | number, loginId): Promise<GameApiResponse> {
    const service = this.getGameApiService(Number(gameId));
    // 处理loginId，添加平台前缀并零填充
    const processedLoginId = this.processLoginId(loginId);
    const result = await service.getProfile(processedLoginId);
    return result;
  }

  /**
   * 完整的存款业务流程
   * 包含游戏API存款、钱包扣款和交易记录创建
   */
  async completeWithdraw(
    gameId: string | number,
    params: { amount: number; userId?: number }
  ) {
    try {
      // 确保userId存在
      if (!params.userId) {
        throw new Error('用户ID不能为空');
      }

      // 执行游戏API存款操作
      const result = await this.withdraw(gameId, params);

      return result;
    } catch (error) {
      console.error('完整存款流程失败:', error);
      throw new Error(
        `存款失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 存款
   */
  async deposit(
    gameId: number,
    params: DepositParams
  ): Promise<GameApiResponse> {
    let result;
    if (params.amount && Number(params.amount) > 0) {
      // 扣除用户钱包金额
      await walletService.changeBalanceByUserId({
        user_id: Number(params.loginId),
        balance: -params.amount,
      });

      // 添加游戏交易记录
      const gameTransactionData: IGameTransactionRecord = {
        user_id: Number(params.loginId),
        game_id: gameId,
        amount: -params.amount,
        transaction_type: 1, // 存款类型
        game_name: 'game_name',
      };
      // 获取create方法返回的包含主键的数据
      const createdRecord = await gameTransactionRecordService.create(
        gameTransactionData
      );
      // 处理loginId，添加平台前缀并零填充
      const infoParams = {
        ...params,
        serial: createdRecord?.id,
        loginId: params.loginId
          ? this.processLoginId(params.loginId)
          : undefined,
      };
      const service = this.getGameApiService(Number(gameId));
      result = await service.deposit(infoParams);
    }
    return result;
  }

  /**
   * 取款
   * 在service层使用Redis锁确保原子性
   */
  async withdraw(
    gameId: string | number,
    params: WithdrawParams
  ): Promise<GameApiResponse> {
    // 参数验证在service层作为最后保障
    if (!params.amount || Number(params.amount) <= 0 || !params.loginId) {
      return {
        code: 400,
        message: '参数无效',
        data: null,
      };
    }

    const userId = Number(params.loginId);
    // 生成分布式锁键，确保同一用户对同一游戏的提款操作互斥
    const lockKey = `withdraw_lock_${userId}_${gameId}`;

    try {
      // 使用Redis分布式锁保证原子性
      return await RedisLock.withLock(
        lockKey,
        async () => {
          // 1. 再次验证余额（避免并发导致的超提）
          const profileResult = await this.getProfile(gameId, userId);
          const gameBalance = profileResult?.data?.balance || 0;

          if (gameBalance < Number(params.amount)) {
            return {
              code: 400,
              message: '游戏余额不足',
              data: null,
            };
          }

          // 2. 添加游戏交易记录
          const gameTransactionData: IGameTransactionRecord = {
            user_id: userId,
            game_id: Number(gameId),
            amount: params.amount,
            transaction_type: 2, // 取款类型
            game_name: 'game_name',
          };

          const createdRecord = await gameTransactionRecordService.create(
            gameTransactionData
          );

          // 3. 更新用户钱包余额（增加余额）
          const walletUpdated = await walletService.changeBalanceByUserId({
            user_id: userId,
            balance: Number(params.amount), // 提款时余额增加
          });

          if (!walletUpdated) {
            throw new Error('更新钱包余额失败');
          }

          // 4. 执行游戏API提款操作
          const service = this.getGameApiService(Number(gameId));
          const infoParams = {
            ...params,
            serial: createdRecord?.id,
            loginId: this.processLoginId(params.loginId!),
          };

          const result = await service.withdraw(infoParams);

          // 5. 验证提款结果
          if (
            result.code !== 200 ||
            (result.data && result.data.status === '0')
          ) {
            // 如果游戏平台返回失败，这里需要有补偿机制
            // 但由于不使用事务，我们需要记录日志并可能需要手动处理
            console.error(`游戏平台提款失败，但本地已更新，需要补偿:`, result);
          }

          console.log(`用户${userId}从游戏${gameId}提款处理完成`);
          return result;
        },
        {
          expire: 30000, // 锁超时时间30秒
          retryCount: 2,
          retryDelay: 1000,
        }
      );
    } catch (error) {
      console.error(`用户${userId}从游戏${gameId}提款异常:`, error);
      return {
        code: 500,
        message: error instanceof Error ? error.message : '提款失败',
        data: null,
      };
    }
  }

  /**
   * 投注登录
   */
  async betLogin(
    gameId: string | number,
    params: BetLoginParams
  ): Promise<GameApiResponse> {
    const service = this.getGameApiService(Number(gameId));
    // 处理loginId，添加平台前缀并零填充
    const processedParams = {
      ...params,
      loginId: params.loginId ? this.processLoginId(params.loginId) : undefined,
    };
    const result = await service.betLogin(processedParams);
    return result;
  }

  /**
   * 投注大厅
   */
  async betLobby(
    gameId: number,
    {
      userInfo,
      view,
      loginPass,
      backUrl,
      id,
    }: {
      userInfo: IUser;
      view: any;
      loginPass: string | undefined;
      backUrl: string;
      id?: number;
    }
  ): Promise<string | null> {
    try {
      const userId = userInfo.id!;

      // 构建Redis键名
      const redisKey = `userCurrentGame___${userId}`;

      // 获取上一个游戏ID
      const previousGameIdStr = await redisController.getVal({
        prefix: REDIS_KEY_PREFIX,
        key: redisKey,
      });
      const previousGameId = previousGameIdStr
        ? Number(previousGameIdStr)
        : null;

      // 如果有上一个游戏ID且与当前游戏ID不同，提取上一个游戏的余额
      if (previousGameId && previousGameId !== gameId) {
        try {
          // 首先获取上一个游戏的余额
          const profileResult = await this.getProfile(previousGameId, userId);
          const gameBalance = profileResult?.data?.balance || 0;

          console.log(
            `Game ${previousGameId} balance for user ${userId}:`,
            gameBalance
          );

          // 如果有余额，使用withdraw方法提取确切金额
          if (gameBalance > 0) {
            await this.withdraw(previousGameId, {
              loginId: userId,
              amount: gameBalance,
            });
            // console.log(
            //   `Successfully withdrew balance ${gameBalance} from game ${previousGameId} for user ${userId}`
            // );
          }
        } catch (error) {
          console.error(
            `Failed to withdraw balance from game ${previousGameId} for user ${userId}:`,
            error
          );
          // 提取失败不影响用户进入新游戏
        }
      }

      // 获取用户钱包余额
      const walletInfo = await walletService.findByUserId(userId);
      const balance = walletInfo?.balance || 0;

      // 充值到游戏
      if (balance > 0) {
        await this.deposit(gameId, {
          loginId: userId,
          amount: balance,
        });
      }

      // 更新Redis记录当前游戏ID
      await redisController.setExVal({
        prefix: REDIS_KEY_PREFIX,
        key: redisKey,
        value: gameId.toString(),
        exp: 86400, // 设置1天过期时间
      });

      const service = this.getGameApiService(Number(gameId));

      // 处理loginId，添加平台前缀并零填充
      const processedLoginId = this.processLoginId(userId);
      const result = await service.betLobby({
        loginId: processedLoginId,
        view,
        loginPass,
        id,
        backUrl,
      });
      return result;
    } catch (error) {
      console.error('betLobby error:', error);
      return null;
    }
  }

  /**
   * 投注列表
   */
  async betList(
    gameId: string | number,
    params: BetListParams
  ): Promise<GameApiResponse> {
    const service = this.getGameApiService(Number(gameId));

    // 调整请求参数中的时间
    const adjustedParams = await this.adjustRequestTimezone(
      Number(gameId),
      params
    );
    // 处理loginId，添加平台前缀并零填充
    const processedParams = {
      ...adjustedParams,
      loginId: adjustedParams.loginId
        ? this.processLoginId(adjustedParams.loginId)
        : undefined,
    };
    const result = await service.betList(processedParams);

    // 调整响应数据中的时间
    // if (result && result.data) {
    //   // 确保返回的数据格式正确
    //   result.data = await this.adjustResponseTimezone(
    //     Number(gameId),
    //     result.data
    //   );
    // }

    return result;
  }

  /**
   * 分页投注列表
   */
  async betListByPage(
    gameId: string | number,
    params: BetListByPageParams
  ): Promise<GameBetListResponse> {
    const service = this.getGameApiService(Number(gameId));

    // 调整请求参数中的时间
    const adjustedParams = await this.adjustRequestTimezone(
      Number(gameId),
      params
    );
    // 处理loginId，添加平台前缀并零填充
    const processedParams = {
      ...adjustedParams,
      loginId: adjustedParams.loginId
        ? this.processLoginId(adjustedParams.loginId)
        : undefined,
    };
    const result = await service.betListByPage(processedParams);

    // 调整响应数据中的时间
    // if (result && result.data) {
    //   // 由于GameBetListResponse要求data是GameBetRecord[]，而adjustResponseTimezone返回any[]
    //   // 这里直接赋值，TypeScript会进行类型检查
    //   result.data = await this.adjustResponseTimezone(
    //     Number(gameId),
    //     result.data
    //   );
    // }

    return result;
  }

  /**
   * 投注历史
   */
  async betHistory(
    gameId: string | number,
    params: BetHistoryParams
  ): Promise<GameApiResponse> {
    const service = this.getGameApiService(Number(gameId));

    // 调整请求参数中的时间
    const adjustedParams = await this.adjustRequestTimezone(
      Number(gameId),
      params
    );
    // 处理loginId，添加平台前缀并零填充
    const processedParams = {
      ...adjustedParams,
      loginId: adjustedParams.loginId
        ? this.processLoginId(adjustedParams.loginId)
        : undefined,
    };
    const result = await service.betHistory(processedParams);

    // 调整响应数据中的时间
    if (result && result.data) {
      // 确保返回的数据格式正确
      result.data = await this.adjustResponseTimezone(
        Number(gameId),
        result.data
      );
    }

    return result;
  }

  /**
   * 中奖号码
   */
  async winningNumber(
    gameId: string | number,
    params: WinningNumberParams
  ): Promise<GameApiResponse> {
    const service = this.getGameApiService(Number(gameId));

    // 调整请求参数中的时间
    const adjustedParams = await this.adjustRequestTimezone(
      Number(gameId),
      params
    );
    // 处理loginId，添加平台前缀并零填充
    const processedParams = {
      ...adjustedParams,
      loginId: adjustedParams.loginId
        ? this.processLoginId(adjustedParams.loginId)
        : undefined,
    };
    const result = await service.winningNumber(processedParams);

    // 调整响应数据中的时间
    if (result && result.data) {
      // 确保返回的数据格式正确
      result.data = await this.adjustResponseTimezone(
        Number(gameId),
        result.data
      );
    }

    return result;
  }

  /**
   * 开奖结果
   */
  async drawResult(
    gameId: string | number,
    fromDate: string,
    toDate: string
  ): Promise<GameBetListResponse> {
    const service = this.getGameApiService(Number(gameId));

    const result = await service.drawResult(fromDate, toDate);

    return result;
  }

  /**
   * 更新玩家状态/密码
   */
  async updatePlayerStatus(
    gameId: string | number,
    params: UpdatePlayerStatusParams
  ): Promise<GameApiResponse> {
    const service = this.getGameApiService(Number(gameId));
    // 处理loginId，添加平台前缀并零填充
    const processedParams = {
      ...params,
      loginId: params.loginId ? this.processLoginId(params.loginId) : undefined,
    };
    const result = await service.updatePlayerStatus(processedParams);
    return result;
  }

  /**
   * 获取游戏列表
   * 这个方法不需要gameId参数，因为它返回所有可用的游戏
   */
  async getGames(params: any, loginId) {
    // 获取游戏列表
    const gamesResult = await gamesService.getList(params);

    // 如果有游戏数据，为每个游戏添加配置信息
    if (gamesResult.rows && gamesResult.rows.length > 0) {
      // 为了避免多次异步请求阻塞，使用Promise.all并行处理
      const gamesWithConfig = await Promise.all(
        gamesResult.rows.map(async (game: any) => {
          try {
            let profileResult;
            if (loginId) {
              // 使用游戏的game_id作为配置查询的loginId参数
              // getProfile方法内部会处理loginId
              profileResult = await this.getProfile(game.game_id, loginId);
            }
            // 显式列出所有需要返回的字段，确保不包含非数据库字段
            return {
              game_id: game.game_id,
              game_name: game.game_name,
              developer: game.developer,
              version: game.version,
              image: game.image,
              status: game.status,
              icon: game.icon,
              created_at: game.created_at,
              updated_at: game.updated_at,
              deleted_at: game.deleted_at,
              config: profileResult.data || {},
            };
          } catch (error) {
            // 如果获取配置失败，记录错误但仍然返回游戏信息
            console.error(
              `获取游戏${game.game_id as string}配置信息失败:`,
              error
            );
            return {
              game_id: game.game_id,
              game_name: game.game_name,
              developer: game.developer,
              version: game.version,
              image: game.image,
              status: game.status,
              icon: game.icon,
              created_at: game.created_at,
              updated_at: game.updated_at,
              deleted_at: game.deleted_at,
              config: null,
              configError: error,
            };
          }
        })
      );

      // 更新结果中的游戏数组
      gamesResult.rows = gamesWithConfig;
    }

    return gamesResult;
  }

  async getGamesName(data) {
    const gamesResult = await gamesService.getList(data);
    return gamesResult;
  }

  /**
   * 一键提款功能
   * 从所有游戏中提取余额
   * 在service层使用Redis锁确保整个过程的原子性
   */
  async withdrawAll(userId?: number) {
    // 生成用户级别的分布式锁键，确保同一用户的一键提款操作互斥
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const userLockKey = `withdrawAll_lock_${userId}`;

    try {
      // 使用Redis分布式锁保证整个一键提款过程的原子性
      return await RedisLock.withLock(
        userLockKey,
        async () => {
          // 1. 基本参数验证
          if (!userId) {
            throw new Error('用户ID不能为空');
          }

          console.log(`用户 (ID: ${userId}) 开始执行一键提款`);

          // 2. 获取所有游戏列表及其配置信息
          const gamesResult = await this.getGames({}, userId);
          const withdrawalResults: any = [];
          let totalWithdrawn = 0;

          // 3. 处理游戏提款
          if (gamesResult.rows && gamesResult.rows.length > 0) {
            // 筛选出有余额的游戏
            const gamesWithBalance = gamesResult.rows.filter(
              (game: any) => game.config?.balance > 0
            );

            // 如果没有有余额的游戏
            if (gamesWithBalance.length === 0) {
              // 为所有游戏添加余额为0的记录
              gamesResult.rows.forEach((game: any) => {
                withdrawalResults.push({
                  game_id: game.game_id,
                  game_name: game.game_name,
                  amount: 0,
                  success: false,
                  message: '余额为0或无法获取余额',
                });
              });

              return {
                success: false,
                totalWithdrawn: 0,
                details: withdrawalResults,
                message: '所有游戏余额为0',
              };
            }

            // 4. 串行处理每个游戏的提款，确保顺序执行和错误隔离
            // 虽然性能稍低，但对于金融操作安全性更重要
            for (let i = 0; i < gamesWithBalance.length; i += 1) {
              const game: any = gamesWithBalance[i];
              const amount = game.config.balance;

              try {
                // 生成游戏级别的分布式锁键（额外保障）
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                const gameLockKey = `withdraw_lock_${userId}_${game.game_id}`;

                // 对单个游戏的提款使用锁保护
                // eslint-disable-next-line no-await-in-loop
                const withdrawResult = await RedisLock.withLock(
                  gameLockKey,
                  async () => {
                    // 再次验证游戏余额，防止并发提款导致超提
                    const updatedProfile = await this.getProfile(
                      game.game_id,
                      userId
                    );
                    const currentBalance = updatedProfile?.data?.balance || 0;

                    if (currentBalance <= 0 || currentBalance !== amount) {
                      throw new Error(
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        `游戏余额已变化，当前余额: ${currentBalance}`
                      );
                    }

                    // 调用withdraw方法处理单个游戏的提款
                    // eslint-disable-next-line no-return-await
                    return await this.withdraw(game.game_id, {
                      loginId: userId.toString(),
                      amount: currentBalance,
                    });
                  },
                  {
                    expire: 15000,
                    retryCount: 1,
                    retryDelay: 500,
                  }
                );

                // 验证提款结果
                if (
                  withdrawResult.code === 200 &&
                  (!withdrawResult.data || withdrawResult.data.status !== '0')
                ) {
                  // 提款成功，累计总金额
                  totalWithdrawn += amount;

                  withdrawalResults.push({
                    game_id: game.game_id,
                    game_name: game.game_name,
                    amount,
                    success: true,
                    message: '提款成功',
                  });
                } else {
                  throw new Error(withdrawResult.message || '游戏平台返回失败');
                }
              } catch (error) {
                console.error(`游戏${game.game_id as string}提款失败:`, error);
                withdrawalResults.push({
                  game_id: game.game_id,
                  game_name: game.game_name,
                  amount,
                  success: false,
                  message: error instanceof Error ? error.message : '提款失败',
                });
                // 错误处理：单个游戏提款失败不影响其他游戏的提款过程
              }
            }
          }

          // 5. 处理没有游戏数据的情况
          if (withdrawalResults.length === 0) {
            return {
              success: false,
              totalWithdrawn: 0,
              details: [],
              message: '没有找到可提款的游戏',
            };
          }

          // 6. 判断是否全部提款成功
          const allSuccess = withdrawalResults.every(
            (item: any) => item.success
          );
          const successCount = withdrawalResults.filter(
            (item: any) => item.success
          ).length;

          return {
            success: allSuccess,
            totalWithdrawn,
            details: withdrawalResults,
            message: allSuccess
              ? // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                `全部${withdrawalResults.length}个游戏提款成功`
              : // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                `部分游戏提款失败，成功${successCount}个，失败${
                  withdrawalResults.length - successCount
                }个`,
          };
        },
        {
          expire: 60000, // 一键提款的锁超时时间设为60秒
          retryCount: 1,
          retryDelay: 2000,
        }
      );
    } catch (error) {
      return {
        success: false,
        totalWithdrawn: 0,
        details: [],
        message:
          error instanceof Error ? error.message : '一键提款过程发生异常',
      };
    }
  }

  async getGameIntegrations(gameId: number) {
    // 定义缓存键名
    const cacheKey = `game_integrations_${gameId}`;
    const fullKey = `${REDIS_KEY_PREFIX}game_api___${cacheKey}`;

    try {
      // 1. 尝试从Redis获取缓存数据
      const cachedData = await redisController.getVal({
        prefix: '',
        key: fullKey,
      });

      // 如果缓存存在，直接返回缓存数据
      if (cachedData) {
        console.log(`[Redis缓存] 命中游戏集成信息缓存，gameId: ${gameId}`);
        return cachedData;
      }

      // 2. 缓存不存在，从原始接口获取数据
      const service = this.getGameApiService(gameId);
      const result = await service.getGames();

      // 3. 将获取的数据缓存到Redis中，设置过期时间为15分钟（900秒）
      await redisController.setExVal({
        prefix: `${REDIS_KEY_PREFIX}game_api___`,
        key: cacheKey,
        value: result,
        exp: 900,
      });

      console.log(`[Redis缓存] 游戏集成信息已缓存，gameId: ${gameId}`);
      return result;
    } catch (error) {
      console.error(`获取游戏集成信息失败，gameId: ${gameId}，错误:`, error);

      // 发生错误时，尝试从缓存获取数据作为后备方案
      try {
        const cachedData = await redisController.getVal({
          prefix: '',
          key: fullKey,
        });
        if (cachedData) {
          console.log(
            `[Redis缓存] 发生错误时从缓存获取游戏集成信息，gameId: ${gameId}`
          );
          return cachedData;
        }
      } catch (cacheError) {
        console.error(
          `从缓存获取游戏集成信息也失败，gameId: ${gameId}，错误:`,
          cacheError
        );
      }

      // 如果没有缓存或者获取缓存也失败，抛出原始错误
      throw error;
    }
  }
}

export default new GameApiAdapterService();
