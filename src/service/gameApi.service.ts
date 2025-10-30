import axios from 'axios';

import { REDIS_KEY_PREFIX } from '@/constant';
import redisController from '@/controller/redis.controller';
import {
  BetHistoryParams,
  BetListByPageParams,
  BetListParams,
  BetLoginParams,
  CreatePlayerParams,
  DepositParams,
  GameApiResponse,
  GameBetListResponse,
  GameResponse,
  IGameApi,
  UpdatePlayerStatusParams,
  WinningNumberParams,
  WithdrawParams,
} from '@/interface/game/IGameApi';
import { GAME_API_CONFIG } from '@/secret/secret';

function stringify(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value);
    }
  });
  return params.toString();
}

class GameApiService implements IGameApi {
  baseUrl?: string;

  apiUser?: string;

  apiPass?: string;

  user?: string;

  pass?: string;

  constructor() {
    // 从新的配置结构中获取原始Game API的配置
    this.baseUrl = GAME_API_CONFIG.VBOSS?.url;
    this.apiUser = GAME_API_CONFIG.VBOSS?.apiUser;
    this.apiPass = GAME_API_CONFIG.VBOSS?.apiPass;
    this.user = GAME_API_CONFIG.VBOSS?.user;
    this.pass = GAME_API_CONFIG.VBOSS?.pass;
  }

  private makeRequestUrl(
    endpoint: string,
    params: Record<string, any>
  ): string {
    const queryParams = {
      apiUser: this.apiUser,
      apiPass: this.apiPass,
      user: this.user,
      pass: this.pass,
      ...params,
    };

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const url = `${this.baseUrl}${endpoint}?${stringify(queryParams)}`;
    return url;
  }

  private async makeRequest(
    endpoint: string,
    params: Record<string, any>
  ): Promise<GameApiResponse> {
    try {
      const queryParams = {
        apiUser: this.apiUser,
        apiPass: this.apiPass,
        user: this.user,
        pass: this.pass,
        ...params,
      };

      const url = this.makeRequestUrl(endpoint, queryParams);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return {
        code: response?.status || 200,
        message: response.data?.errorMessage || 'success',
        data: response?.data,
      };
    } catch (error: any) {
      console.error(`Game API Error (${endpoint}):`, error.message);
      return {
        code: 500,
        message: error.message || 'Internal server error',
        data: null,
      };
    }
  }

  /**
   * 创建玩家
   */
  async createPlayer(params: CreatePlayerParams): Promise<GameApiResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      ...params,
      loginId: params.loginId ? params.loginId : undefined,
    };
    const result = await this.makeRequest('/api/createPlayer', processedParams);

    // 检查响应中的status是否为0，如果是则抛出异常
    if (result.data && result.data.status === '0') {
      throw new Error(result.data.errorMessage || '创建玩家失败');
    }

    return result;
  }

  /**
   * 获取玩家资料
   */
  async getProfile(loginId: string): Promise<GameApiResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      loginId: loginId || undefined,
    };
    const result = await this.makeRequest('/api/getProfile', processedParams);
    return result;
  }

  /**
   * 存款
   */
  async deposit(params: DepositParams): Promise<GameApiResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      ...params,
      loginId: params.loginId ? params.loginId : undefined,
    };
    const result = await this.makeRequest('/api/deposit', processedParams);
    return result;
  }

  /**
   * 取款
   */
  async withdraw(params: WithdrawParams): Promise<GameApiResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      ...params,
      loginId: params.loginId ? params.loginId : undefined,
    };
    const result = await this.makeRequest('/api/withdraw', processedParams);
    return result;
  }

  /**
   * 投注登录
   */
  async betLogin(params: BetLoginParams): Promise<GameApiResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      ...params,
      loginId: params.loginId ? params.loginId : undefined,
    };
    const result = await this.makeRequest('/api/betLogin', processedParams);

    // 如果登录成功，将sessionId和tokenCode与loginId绑定到redis
    if (
      result.code === 200 &&
      result.data &&
      result.data.sessionId &&
      result.data.tokenCode &&
      params.loginId
    ) {
      const { sessionId, tokenCode } = result.data;
      // 使用处理过的带有前缀的loginId
      const prefixedLoginId = params.loginId;
      const redisKey = `${REDIS_KEY_PREFIX}gameApi_${prefixedLoginId}`;

      await redisController.setExVal({
        prefix: REDIS_KEY_PREFIX,
        key: redisKey,
        value: JSON.stringify({ sessionId, tokenCode }),
        exp: 7200, // 过期时间2小时
      });
    }

    return result;
  }

  /**
   * 投注大厅
   * view: Default is "" for desktop view, for mobile view is "mobile"
   */
  async betLobby(params: {
    loginId: string;
    view: any;
    loginPass?: string;
  }): Promise<string | null> {
    // 为loginId添加平台前缀
    const prefixedLoginId = params.loginId;

    // 从redis获取loginId绑定的tokenCode和sessionId

    const redisKey = `${REDIS_KEY_PREFIX}gameApi_${prefixedLoginId}`;
    const redisVal = await redisController.getVal({
      prefix: REDIS_KEY_PREFIX,
      key: redisKey,
    });

    let tokenCode = '';
    let sessionId = '';

    if (redisVal) {
      try {
        const { tokenCode: storedTokenCode, sessionId: storedSessionId } =
          JSON.parse(redisVal);
        tokenCode = storedTokenCode;
        sessionId = storedSessionId;
      } catch (error) {
        console.error('解析Redis中的游戏API数据失败:', error);
      }
    } else {
      // Redis中不存在数据，执行betLogin登录
      const loginResult = await this.betLogin({
        loginPass: params.loginPass,
        loginId: params.loginId,
      });

      // 如果登录返回的status为0，则直接返回空
      if (loginResult.data.status === '0') {
        return null;
      }

      // 重新从Redis获取数据，因为betLogin方法中已经存储了数据
      const updatedRedisVal = await redisController.getVal({
        prefix: REDIS_KEY_PREFIX,
        key: redisKey,
      });

      if (updatedRedisVal) {
        try {
          const { tokenCode: storedTokenCode, sessionId: storedSessionId } =
            JSON.parse(updatedRedisVal);
          tokenCode = storedTokenCode;
          sessionId = storedSessionId;
        } catch (error) {
          console.error('解析Redis中的游戏API数据失败:', error);
        }
      }
    }

    // 使用获取到的tokenCode和sessionId调用API
    const result = this.makeRequestUrl('/api/betLobby', {
      loginId: prefixedLoginId,
      view: params.view,
      tokenCode,
      sessionId,
    });

    return result;
  }

  /**
   * 投注列表
   */
  async betList(params: BetListParams): Promise<GameApiResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      ...params,
      loginId: params.loginId ? params.loginId : undefined,
    };
    const result = await this.makeRequest('/api/betList', processedParams);
    return result;
  }

  /**
   * 分页投注列表
   */
  async betListByPage(
    params: BetListByPageParams
  ): Promise<GameBetListResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      ...params,
      loginId: params.loginId ? params.loginId : undefined,
    };

    // 调用API获取原始数据
    const result = await this.makeRequest('/api/betListPage', processedParams);

    // 创建返回对象，初始化为空数组
    const response: GameBetListResponse = {
      code: result.code || 200,
      message: result.message || 'success',
      data: [],
    };

    // 处理返回数据，确保符合GameBetRecord接口规范
    if (result.code === 200 && result.data && Array.isArray(result.data)) {
      response.data = result.data.map((item: any) => {
        // 从receiptContent中提取开奖时间
        let settlementTime = '';
        if (item.receiptContent) {
          const timeMatch = item.receiptContent.match(/\{(\d{4})\}/);
          if (timeMatch && timeMatch[1]) {
            // 构建完整的日期时间，考虑跨年度情况
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1; // 月份从0开始
            const currentDay = now.getDate();

            const month: number = parseInt(timeMatch[1].substring(0, 2), 10);
            const day: number = parseInt(timeMatch[1].substring(2, 4), 10);

            // 确定正确的年份：如果月份小于当前月份，或者月份相同但日期小于当前日期，则应为下一年
            let targetYear = currentYear;
            if (
              month < currentMonth ||
              (month === currentMonth && day < currentDay)
            ) {
              targetYear = currentYear + 1;
            }

            settlementTime = `${targetYear}-${String(month).padStart(
              2,
              '0'
            )}-${String(day).padStart(2, '0')}T00:00:00`;
          }
        }

        // 确保所有字段都有有效值并符合类型要求
        return {
          game_order: item.receiptNo || '',
          consumption_time: item.dateCreated || new Date().toISOString(),
          consumption_amount:
            typeof item.totalBet === 'number' ? item.totalBet : 0,
          settlement_time:
            settlementTime || item.dateCreated || new Date().toISOString(),
          result: item.receiptContent || '',
        };
      });
    }

    return response;
  }

  /**
   * 投注历史
   */
  async betHistory(params: BetHistoryParams): Promise<GameApiResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      ...params,
      loginId: params.loginId ? params.loginId : undefined,
    };
    const result = await this.makeRequest('/api/betListPage', processedParams);
    return result;
  }

  /**
   * 中奖号码
   */
  async winningNumber(params: WinningNumberParams): Promise<GameApiResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      ...params,
      loginId: params.loginId ? params.loginId : undefined,
    };
    const result = await this.makeRequest('/api/winNumber', processedParams);
    return result;
  }

  /**
   * 开奖结果
   */
  // eslint-disable-next-line require-await,@typescript-eslint/require-await
  async drawResult(
    fromDate: string,
    toDate: string
  ): Promise<GameBetListResponse> {
    // const result = await this.makeRequest('/api/result', { date_from: fromDate, date_to: toDate });
    return {
      code: 200,
      message: 'success',
      data: [],
    };
  }

  /**
   * 更新玩家状态/密码
   */
  async updatePlayerStatus(
    params: UpdatePlayerStatusParams
  ): Promise<GameApiResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      ...params,
      loginId: params.loginId ? params.loginId : undefined,
    };
    const result = await this.makeRequest(
      '/api/updatePasswordStatus',
      processedParams
    );
    return result;
  }

  // eslint-disable-next-line require-await,@typescript-eslint/require-await
  async getGames(): Promise<GameResponse> {
    return {
      code: 200,
      message: 'success',
      data: [],
    };
  }
}

export default new GameApiService();
