export interface GameApiResponse {
  code: number;
  message: string;
  data?: any;
}

// 定义统一的投注记录数据结构接口
export interface GameBetRecord {
  game_order: string;
  consumption_time: string; // datetime格式
  consumption_amount: number;
  settlement_time: string; // datetime格式
  settlement_amount?: number | null;
  result: string;
}

export interface Game {
  id: number;
  name: string;
  icon: string;
}

// 定义betListByPage返回的特定响应结构
export interface GameBetListResponse {
  code: number;
  message: string;
  data?: GameBetRecord[];
}

export interface GameBetResponse {
  code: number;
  message: string;
  data?: GameBetRecord;
}

export interface GameResponse {
  code?: number;
  message: string;
  data?: Game[];
}

export interface CreatePlayerParams {
  loginId?: number | string;
  loginPass?: string;
  fullName?: string;
  currency?: string;
}

export interface DepositParams {
  loginId?: number | string;
  amount?: number;
  serial?: string | number;
}

export interface WithdrawParams {
  loginId?: number | string;
  amount?: number;
  serial?: string | number;
}

export interface BetLoginParams {
  loginId?: number | string;
  loginPass?: string;
  fullName?: string;
}

export interface BetListParams {
  loginId?: number | string;
  fromDate?: string;
  toDate?: string;
  searchByDrawDate?: boolean;
}

export interface BetListByPageParams {
  loginId?: number | string;
  pageNo?: number;
  fromDate?: string;
  toDate?: string;
  match_over?: boolean;
  searchByDrawDate?: boolean;
}

export interface BetHistoryParams {
  loginId?: number | string;
  fromDate?: string;
  toDate?: string;
  currency?: string;
  currentIndex?: number;
}

export interface UpdatePlayerStatusParams {
  loginId?: number | string;
  newStatus?: string;
  newPass?: string;
}

export interface WinningNumberParams {
  fromDate?: string;
  toDate?: string;
  drawType?: string;
  loginId?: number | string;
}

export interface IGameApi {
  /**
   * 创建玩家
   */
  createPlayer(params: CreatePlayerParams): Promise<GameApiResponse>;

  /**
   * 获取玩家资料
   */
  getProfile(loginId: string): Promise<GameApiResponse>;

  /**
   * 存款
   */
  deposit(params: DepositParams): Promise<GameApiResponse>;

  /**
   * 取款
   */
  withdraw(params: WithdrawParams): Promise<GameApiResponse>;

  /**
   * 投注登录
   */
  betLogin(params: BetLoginParams): Promise<GameApiResponse>;

  /**
   * 投注大厅
   * view: Default is "" for desktop view, for mobile view is "mobile"
   */
  betLobby(params: {
    loginId: string;
    view: any;
    loginPass?: string;
    backUrl?: string;
    id?: number;
  }): Promise<string | null>;

  /**
   * 投注列表
   */
  betList(params: BetListParams): Promise<GameApiResponse>;

  /**
   * 分页投注列表
   */
  betListByPage(params: BetListByPageParams): Promise<GameBetListResponse>;

  /**
   * 投注历史
   */
  betHistory(params: BetHistoryParams): Promise<GameApiResponse>;

  /**
   * 中奖号码
   */
  winningNumber(params: WinningNumberParams): Promise<GameApiResponse>;

  /**
   * 开奖结果
   * @param fromDate 开始时间 (YYYY-MM-DD HH:mm:ss)
   * @param toDate 结束时间 (YYYY-MM-DD HH:mm:ss)
   */
  drawResult(fromDate: string, toDate: string): Promise<GameBetListResponse>;

  /**
   * 更新玩家状态/密码
   */
  updatePlayerStatus(
    params: UpdatePlayerStatusParams
  ): Promise<GameApiResponse>;

  getGames(): Promise<GameResponse>;
}
