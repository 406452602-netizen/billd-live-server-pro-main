import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

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

/**
 * 新的Game API服务实现
 * 格式为: https://<host>/api.aspx?secret=<secret>&action=create&agent=<agent>&username=<username>
 */
class GameApiNewService implements IGameApi {
  baseUrl: string;

  secret?: string;

  agent?: string;

  constructor() {
    // 从新的配置结构中获取配置
    this.baseUrl =
      GAME_API_CONFIG?.Sportsbook?.url?.replace('/api.aspx', '') || '';
    this.secret = GAME_API_CONFIG?.Sportsbook?.secret;
    this.agent = GAME_API_CONFIG?.Sportsbook?.agent;
  }

  /**
   * 构建请求URL
   */
  private buildRequestUrl(action: string, params: Record<string, any>): string {
    const queryParams = new URLSearchParams();

    // 添加基础参数
    queryParams.append('secret', this.secret || '');
    queryParams.append('action', action);
    queryParams.append('agent', this.agent || '');

    // 添加其他参数
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    return `${this.baseUrl}/api.aspx?${queryParams.toString()}`;
  }

  /**
   * 发送请求并处理XML响应
   */
  private async sendRequest(
    action: string,
    params: Record<string, any>
  ): Promise<GameApiResponse> {
    try {
      const url = this.buildRequestUrl(action, params);

      console.log(`发送游戏API请求: ${url}`);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        responseType: 'text', // 以文本形式接收响应
      });

      // 解析XML响应
      const parser = new XMLParser({
        ignoreAttributes: false,
        parseAttributeValue: true,
        trimValues: true,
      });
      const parsedData = parser.parse(response.data);

      // 处理解析后的数据，确保返回格式一致
      let processedData = parsedData;

      // 特殊处理CDATA内容
      if (parsedData.response?.result?._text) {
        // 提取CDATA中的内容并尝试清理
        let cdataContent = parsedData.response.result._text;
        // 移除可能的反引号和多余空格
        cdataContent = cdataContent.replace(/`/g, '').trim();

        processedData = {
          ...parsedData,
          response: {
            ...parsedData.response,
            result: cdataContent,
          },
        };
      }

      return {
        code: response?.status || 200,
        message: parsedData.response?.errtext || 'success',
        data: processedData,
      };
    } catch (error: any) {
      console.error(`Game API错误 (${action}):`, error.message);
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
    // 添加平台前缀到用户名
    const processedParams = {
      ...params,
      username: params.loginId ? params.loginId : undefined,
    };

    const result = await this.sendRequest('create', processedParams);

    // 检查响应状态
    if (result.data && result.data.response?.errcode === '0') {
      throw new Error(result.data.response?.errtext || '创建玩家失败');
    }
    const updateParams = {
      username: processedParams.username,
      max1: 10000,
      max2: 10000,
      max3: 10000,
      max4: 10000,
      max5: 10000,
      lim1: 10000,
      lim2: 10000,
      lim3: 10000,
      lim4: 10000,
      lim5: 10000,
      com1: 0,
      com2: 0,
      com3: 0,
      com4: 0,
      comtype: 'A',
      suspend: 0,
    };
    await this.sendRequest('update', updateParams);

    return result;
  }

  /**
   * 获取玩家资料
   */
  async getProfile(loginId: string): Promise<GameApiResponse> {
    const params = {
      username: loginId,
    };
    const result = await this.sendRequest('balance', params);
    const parsedData = {
      ...result,
      data: {
        balance: result.data.response.result,
      },
    };
    return parsedData;
  }

  /**
   * 存款
   */
  async deposit(params: DepositParams): Promise<GameApiResponse> {
    const processedParams = {
      username: params.loginId ? params.loginId : undefined,
      serial: params.serial,
      amount: params.amount,
    };
    const result = await this.sendRequest('deposit', processedParams);
    return result;
  }

  /**
   * 取款
   */
  async withdraw(params: WithdrawParams): Promise<GameApiResponse> {
    const processedParams = {
      username: params.loginId ? params.loginId : undefined,
      serial: params.serial,
      amount: params.amount,
    };
    const result = await this.sendRequest('withdraw', processedParams);
    return result;
  }

  /**
   * 投注登录
   */
  async betLogin(params: BetLoginParams): Promise<GameApiResponse> {
    const processedParams = {
      username: params.loginId ? params.loginId : undefined,
      loginPass: params.loginPass,
      host: GAME_API_CONFIG?.Sportsbook?.loginHost,
      lang: 'ZH-CN',
      accType: 'MY',
      fullName: params.fullName || params.loginId,
    };

    const result = await this.sendRequest('login_mobile', processedParams);
    return result;
  }

  /**
   * 投注大厅
   */
  async betLobby(params: {
    loginId: string;
    view: any;
    loginPass?: string;
  }): Promise<string | null> {
    try {
      // 直接调用登录接口获取URL
      const loginResult = await this.betLogin({
        loginId: params.loginId,
        loginPass: params.loginPass,
      });

      if (loginResult.code !== 200 || !loginResult.data) {
        console.error('登录失败:', loginResult.message);
        return null;
      }

      // 从登录结果中获取URL
      if (loginResult.data.response && loginResult.data.response.result) {
        return loginResult.data.response.result;
      }

      console.error('无法从登录结果中获取URL:', loginResult.data);
      return null;
    } catch (error: any) {
      console.error('获取投注大厅失败:', error.message);
      return null;
    }
  }

  /**
   * 投注列表
   */
  async betList(params: BetListParams): Promise<GameApiResponse> {
    const processedParams = {
      username: params.loginId ? params.loginId : undefined,
      fromDate: params.fromDate,
      toDate: params.toDate,
      searchByDrawDate: params.searchByDrawDate,
    };
    const result = await this.sendRequest('betList', processedParams);
    return result;
  }

  /**
   * 分页投注列表
   */
  async betListByPage(
    params: BetListByPageParams
  ): Promise<GameBetListResponse> {
    // 将BetListByPageParams适配为API所需的参数格式
    // 注意：不改变传入参数数据结构，只在内部进行映射转换
    const processedParams = {
      username: params.loginId ? params.loginId : undefined,
      start: params.fromDate, // 使用fromDate作为start参数
      duration: this.calculateDuration(params.fromDate, params.toDate), // 根据fromDate和toDate计算duration
      match_over: params.match_over ? '1' : '0', // 转换boolean为'1'或'0'
    };

    const result = await this.sendRequest('ticket', processedParams);

    // 构建返回对象
    const response: GameBetListResponse = {
      code: result.code || 200,
      message: result.message || 'success',
      data: [],
    };

    // 处理返回数据，适配XML结构
    if (result.code === 200 && result.data) {
      // 处理返回的ticket数据
      const ticketData = result.data.response.result?.ticket;
      if (ticketData) {
        // 如果只有单个ticket，转换为数组
        const tickets = Array.isArray(ticketData) ? ticketData : [ticketData];

        response.data = tickets.map((ticket: any) => ({
          game_order: ticket.id || '',
          consumption_time: ticket.trandate,
          consumption_amount: parseFloat(ticket.b || '0'),
          settlement_time: ticket.workdate,
          result: ticket.res || '',
        }));
      }
    }

    return response;
  }

  /**
   * 根据起始时间和结束时间计算持续时间（秒）
   */
  private calculateDuration(fromDate?: string, toDate?: string): string {
    if (!fromDate || !toDate) {
      return '86400'; // 默认一天（86400秒）
    }

    try {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      const duration = Math.floor((to.getTime() - from.getTime()) / 1000);
      return Math.max(60, duration).toString(); // 至少60秒
    } catch (error) {
      console.error('计算duration失败:', error);
      return '86400'; // 出错时返回默认值
    }
  }

  /**
   * 投注历史
   */
  async betHistory(params: BetHistoryParams): Promise<GameApiResponse> {
    const processedParams = {
      username: params.loginId ? params.loginId : undefined,
      fromDate: params.fromDate,
      toDate: params.toDate,
      currency: params.currency,
      currentIndex: params.currentIndex,
    };
    const result = await this.sendRequest('betHistory', processedParams);
    return result;
  }

  /**
   * 中奖号码
   */
  async winningNumber(params: WinningNumberParams): Promise<GameApiResponse> {
    const processedParams = {
      username: params.loginId ? params.loginId : undefined,
      fromDate: params.fromDate,
      toDate: params.toDate,
      drawType: params.drawType,
    };
    const result = await this.sendRequest('winningNumber', processedParams);
    return result;
  }

  /**
   * 开奖结果
   */
  // eslint-disable-next-line require-await
  async drawResult(
    fromDate: string,
    toDate: string
  ): Promise<GameBetListResponse> {
    // 计算start和duration参数
    const start = fromDate;
    const duration = this.calculateDuration(fromDate, toDate);

    const params = {
      start,
      duration,
      match_over: 1,
    };
    const result = await this.sendRequest('ticket', params);
    const response: GameBetListResponse = {
      code: 200,
      message: 'success',
      data: [],
    };

    // 直接使用sendRequest解析后的对象，不再重复解析XML
    if (result && result.data) {
      const ticketData = result.data.response.result?.ticket;
      const tickets = Array.isArray(ticketData) ? ticketData : [];
      response.data = tickets.map((ticket: any) => {
        let settlementAmount: number | undefined;
        if (ticket.res === 'P') {
          settlementAmount = undefined;
        } else if (ticket.res === 'WA' || ticket.res === 'WH') {
          settlementAmount = Number(ticket.w) + Number(ticket.b);
        } else if (ticket.res === 'D') {
          settlementAmount = 0;
        } else if (ticket.res === 'LH' || ticket.res === 'LA') {
          settlementAmount = 0;
        }

        return {
          game_order: ticket.id || '',
          consumption_time: ticket.bet_time || new Date().toISOString(),
          consumption_amount: parseFloat(ticket.bet_amount || '0'),
          settlement_time: ticket.win_time || new Date().toISOString(),
          settlement_amount: settlementAmount,
          result: ticket.res || '',
        };
      });
    }

    return response;
  }

  /**
   * 更新玩家状态/密码
   */
  async updatePlayerStatus(
    params: UpdatePlayerStatusParams
  ): Promise<GameApiResponse> {
    const processedParams = {
      username: params.loginId ? params.loginId : undefined,
      newStatus: params.newStatus,
      newPass: params.newPass,
    };
    const result = await this.sendRequest(
      'updatePlayerStatus',
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

export default new GameApiNewService();
