import axios from 'axios';

import {
  BetHistoryParams,
  BetListByPageParams,
  BetListParams,
  BetLoginParams,
  CreatePlayerParams,
  DepositParams,
  GameApiResponse,
  GameBetListResponse,
  GameBetResponse,
  GameResponse,
  IGameApi,
  UpdatePlayerStatusParams,
  WinningNumberParams,
  WithdrawParams,
} from '@/interface/game/IGameApi';
import { GAME_API_CONFIG } from '@/secret/secret';

/**
 * 第三个Game API服务实现
 * 格式为: https://<host>/api/v1
 */
class GameApiThirdService implements IGameApi {
  baseUrl: string;

  merchantID?: string;

  merchantSecretKey?: string;

  constructor() {
    // 从配置中获取第三个游戏平台的配置
    this.baseUrl = GAME_API_CONFIG?.ThirdGame?.url || '';
    this.merchantID = GAME_API_CONFIG?.ThirdGame?.merchantID;
    this.merchantSecretKey = GAME_API_CONFIG?.ThirdGame?.merchantSecretKey;
  }

  /**
   * 发送请求并处理响应
   * ■ 若为GET，请求参数放在queryString
   * ■ 若为POST，需将请求参数放在requestBody (json)
   */
  private async sendRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' = 'GET',
    requestParams: Record<string, any> = {}
  ): Promise<GameApiResponse> {
    try {
      // 构建基础URL
      let url = `${this.baseUrl}${endpoint}`;

      // 添加gameID和merchantID到请求参数
      const processedRequestParams = {
        ...requestParams,
        merchantID: this.merchantID,
        merchantSecretKey: this.merchantSecretKey,
      };

      // 设置请求头
      const headers = {
        'Content-Type': 'application/json',
      };

      const config: any = {
        method,
        headers,
        timeout: 10000,
      };

      // 根据请求方法处理参数
      if (method === 'GET') {
        // 构建查询字符串，过滤掉undefined值
        const queryParams: string[] = [];
        Object.entries(processedRequestParams).forEach(([key, value]) => {
          if (value !== undefined) {
            // 对时间类型进行特殊处理，避免URLSearchParams编码问题
            let paramValue = String(value);

            if (
              typeof value === 'string' &&
              /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
            ) {
              // 替换空格为T，使用标准ISO格式
              paramValue = value.replace(' ', 'T');
            }

            // 对非时间参数进行URL编码，但保留时间格式中的冒号
            const encodedKey = encodeURIComponent(key);
            // 如果是时间格式且包含冒号，保留冒号不编码
            const encodedValue =
              paramValue.includes('T') && paramValue.includes(':')
                ? paramValue // 保留时间格式中的冒号不编码
                : encodeURIComponent(paramValue);

            queryParams.push(`${encodedKey}=${encodedValue}`);
          }
        });
        const queryString = queryParams.join('&');
        if (queryString) {
          url += `?${queryString}`;
        }
      } else {
        // POST/PUT请求将参数放在requestBody
        config.data = processedRequestParams;
      }

      console.log(`发送第三个游戏API请求: ${method} ${url}`);

      const response = await axios({ url, ...config });

      return {
        code: response?.status || 200,
        message: 'success',
        data: response?.data,
      };
    } catch (error: any) {
      console.error(`第三个Game API错误 (${endpoint}):`, error.message);
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
      playerName: params.loginId ? params.loginId : undefined,
    };

    // 使用POST请求创建玩家
    const result = await this.sendRequest('/player', 'POST', processedParams);

    return result;
  }

  /**
   * 获取玩家资料
   */
  async getProfile(loginId: string): Promise<GameApiResponse> {
    const result = await this.sendRequest(`/wallet/amount`, 'GET', {
      playerName: loginId,
    });
    console.log(result);
    const { data } = result;
    data.data.balance = result.data.data.amount;

    return data;
  }

  /**
   * 存款
   */
  async deposit(params: DepositParams): Promise<GameApiResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      ...params,
      playerName: params.loginId ? params.loginId : undefined,
      merchantOrderNo: params.serial || `deposit_${Date.now()}`,
    };

    const result = await this.sendRequest(
      '/wallet/transfer-in',
      'POST',
      processedParams
    );

    return result;
  }

  /**
   * 取款
   */
  async withdraw(params: WithdrawParams): Promise<GameApiResponse> {
    // 为loginId添加平台前缀
    const processedParams = {
      ...params,
      playerName: params.loginId ? params.loginId : undefined,
      merchantOrderNo: params.serial || `deposit_${Date.now()}`,
    };

    const result = await this.sendRequest(
      '/wallet/transfer-out',
      'POST',
      processedParams
    );

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

    const result = await this.sendRequest('/game/link', 'GET', processedParams);

    return result;
  }

  /**
   * 投注大厅
   */
  async betLobby(params: {
    loginId: string;
    view: any;
    loginPass?: string;
    backUrl?: string;
    id?: number;
  }): Promise<string | null> {
    try {
      // 为loginId添加平台前缀
      const processedParams = {
        gameID: params.id,
        lang: 'zh-cn',
        backUrl: params.backUrl,
        playerName: params.loginId,
      };

      const result = await this.sendRequest(
        '/game/link',
        'GET',
        processedParams
      );

      // 如果返回成功且包含链接，则返回链接
      if (result.code === 200) {
        return result.data.data.link;
      }

      return null;
    } catch (error) {
      console.error('获取投注大厅链接失败:', error);
      return null;
    }
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

    const result = await this.sendRequest(
      '/game-records',
      'GET',
      processedParams
    );

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
      pageIndex: params.pageNo,
      pageSize: 1000,
      startTime: params.fromDate,
      endTime: params.toDate,
      playerName: params.loginId ? params.loginId : undefined,
    };

    const result = await this.sendRequest(
      '/game-records',
      'GET',
      processedParams
    );

    // 数据格式转换：将第三方接口返回的数据转换为GameBetListResponse格式
    const response: GameBetListResponse = {
      code: result.code,
      message: result.message || 'success',
      data: [],
    };

    try {
      // 检查第三方接口返回的数据结构 - 注意是两层嵌套的data结构
      if (result.data && result.data.data && result.data.data.items) {
        // 确保items是数组
        const items = Array.isArray(result.data.data.items)
          ? result.data.data.items
          : Object.values(result.data.data.items || {});

        // 转换items数组中的每个元素为GameBetRecord格式
        response.data = items.map((item: any) => ({
          game_order: item.transactionNo || item.betID || '',
          consumption_time: item.betTime || '',
          consumption_amount: item.betAmount || 0,
          settlement_time: item.roundEndTime || '',
          settlement_amount: item.payoutAmount,
          result:
            // eslint-disable-next-line no-nested-ternary
            item.winLossAmount > 0
              ? 'win'
              : item.winLossAmount < 0
              ? 'loss'
              : 'draw',
        }));
      }
    } catch (error) {
      console.error('转换投注记录数据格式时出错:', error);
      // 出错时确保data仍然是数组
      response.data = [];
    }

    // 最终确保data是一个真正的数组，而不是类数组对象
    if (!Array.isArray(response.data)) {
      response.data = Object.values(response.data || {});
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

    const result = await this.sendRequest(
      '/game-records',
      'GET',
      processedParams
    );

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

    const result = await this.sendRequest(
      '/game-record',
      'GET',
      processedParams
    );

    return result;
  }

  /**
   * 开奖结果
   */
  // eslint-disable-next-line require-await,@typescript-eslint/require-await
  async drawResult(fromDate: string, toDate: string): Promise<GameBetListResponse> {
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

    // 使用PUT请求更新玩家状态
    const result = await this.sendRequest('/player', 'PUT', processedParams);

    return result;
  }

  /**
   * 获取游戏列表
   */
  async getGames(): Promise<GameResponse> {
    try {
      // 调用第三方GET /games接口
      const result = await this.sendRequest('/games', 'GET');

      // 格式化返回数据为GameResponse格式
      return {
        code: result.code,
        message: result.message,
        data: result.data?.data || [],
      };
    } catch (error: any) {
      console.error('获取游戏列表失败:', error.message);
      return {
        code: 500,
        message: error.message || 'Internal server error',
        data: [],
      };
    }
  }
}

export default new GameApiThirdService();
