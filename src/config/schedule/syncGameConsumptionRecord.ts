import { redisClient } from '@/config/redis';
import gameApiAdapterService from '@/service/gameApiAdapter.service';
import gameConsumptionRecordService from '@/service/gameConsumptionRecord.service';
import gameTransactionRecordService from '@/service/gameTransactionRecord.service';
import quizService from '@/service/quiz.service';
import userService from '@/service/user.service';
import { TimezoneUtil } from '@/utils/timezone';

// 用户活跃状态的Redis键前缀
const USER_ACTIVE_PREFIX = 'user:active:';

// 游戏分账记录的Redis键前缀
const GAME_SETTLEMENT_PREFIX = 'game:settlement:';

/**
 * 游戏信息类型定义
 */
interface GameInfo {
  game_id: number;
  game_name?: string;
  developer?: string;
  version?: string;
  image?: string;
  status?: number;
  icon?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  config?: unknown;
  configError?: unknown;
}

/**
 * 处理代理商分账逻辑
 */
async function processAgentSettlement(
  gameId: number,
  userId: number,
  userRecord: any,
  userNetProfit: number, // 直接接收用户净收益
  isFromSyncUserGameData = false // 新增参数，区分调用来源
): Promise<number | undefined> {
  try {
    // 平进平出(净收益为0)的情况不计入分账统计和记录
    if (userNetProfit === 0) {
      console.log(
        `用户${userId}游戏${gameId}平进平出，净收益为0，跳过分账处理`
      );
      return 0;
    }

    // 获取用户信息，包含代理商链路
    const user = await userService.getAgentUsersInfo(userId);

    if (!user || !user.agentUsers || !Array.isArray(user.agentUsers)) {
      return 0;
    }

    // 获取用户消费金额
    const userConsumptionAmount = Number(userRecord.consumption_amount || 0);

    // 创建一个已验证过类型的局部变量，避免TypeScript的非空检查错误
    const verifiedAgentUsers = user.agentUsers as Array<any>;

    // 过滤掉会员本身（即查询的userId对应的数据）
    const filteredAgentUsers = verifiedAgentUsers.filter((agent: any) => {
      // 确保agent和agent.id存在，并且不等于当前用户的id
      return agent && agent.id !== undefined && agent.id !== userId;
    });

    // 计算每级代理的实际分成占比（当前代理占比减去下一级代理占比）
    const agentUsersWithProperRatio = filteredAgentUsers.map(
      (agent: any, index: number) => {
        let actualRatio = Number(agent.agent_account_for);
        // 如果不是最后一级代理，需要减去下一级代理的占比
        if (index + 1 < filteredAgentUsers.length) {
          const nextAgent = filteredAgentUsers[index + 1];
          // 使用Number包装确保类型正确，添加精度控制避免浮点数问题
          actualRatio = Number(
            (
              Number(agent.agent_account_for) -
              Number(nextAgent.agent_account_for)
            ).toFixed(6)
          );
        }
        return {
          ...agent,
          actual_account_for: actualRatio,
        };
      }
    );

    // 收集所有分账任务的Promise
    const payoutPromises: Promise<any>[] = [];

    // 为每条记录的每个代理商创建分账任务
    agentUsersWithProperRatio.forEach((userData: any) => {
      const agent = userData;
      if (userData.is_agent) {
        // 代理商获得的金额 = 用户净亏损 * 代理实际分成占比
        // 注意：用户亏损(userNetProfit为负)时代理商才能盈利，所以需要符号反转
        // 添加精度控制，避免浮点数计算导致的无限小数问题
        const agentPayoutAmount = Number(
          (-userNetProfit * userData.actual_account_for).toFixed(6)
        );

        // 创建分账任务并添加到Promise数组，保持原始vote_id以便追踪
        const payoutPromise = quizService
          .createPayoutAndUpdateStatistics(
            {
              vote_id: Number(userRecord.game_order) || 0, // 保持使用原始game_order，确保可追踪
              payout_amount: agentPayoutAmount,
              payouts_user_id: agent.id,
              ancestors: agent.ancestors || '',
              game_id: gameId,
              profit_ratio: agent.actual_account_for,
              parent_id: agent.parent_id || -1,
            },
            {
              parent_divided_into: 0,
              // VBOSS游戏(game_id=1)特殊处理：没有取消订单选项，结算金额必定为空，真实和非真实流水都需要统计
              // 其他游戏按原有逻辑处理
              amount_flow:
                gameId === 1 || isFromSyncUserGameData
                  ? userConsumptionAmount
                  : undefined,
              lower_level_flow:
                gameId === 1 || isFromSyncUserGameData
                  ? userConsumptionAmount
                  : undefined,
              // VBOSS游戏(game_id=1)特殊处理：无论结算金额是否为空，都需要统计真实流水
              // 其他游戏按原有逻辑处理
              amount_actual_flow:
                gameId === 1 ||
                !isFromSyncUserGameData ||
                (userRecord.settlement_amount !== undefined &&
                  userRecord.settlement_amount !== null)
                  ? userConsumptionAmount
                  : undefined,
              lower_level_actual_flow:
                gameId === 1 ||
                !isFromSyncUserGameData ||
                (userRecord.settlement_amount !== undefined &&
                  userRecord.settlement_amount !== null)
                  ? userConsumptionAmount
                  : undefined,
              lower_level_settlement_flow: userNetProfit,
              link_identifier: agent.link_identifier || '', // 确保传递link_identifier
            }
          )
          .catch((error) => {
            console.error(
              `创建代理商${String(agent.id)}分账记录失败，game_order: ${String(
                userRecord.game_order
              )}:`,
              error
            );
          });

        payoutPromises.push(payoutPromise);
      }
    });

    // 等待所有分账任务完成
    if (payoutPromises.length > 0) {
      await Promise.all(payoutPromises);
    }

    return 0;
  } catch (error: unknown) {
    console.error(`处理用户${userId}代理商分账时发生错误:`, error);
    return undefined;
  }
}

/**
 * 处理单个用户的结算逻辑
 * @param userId 用户ID
 * @param userRecordsMap 用户记录映射表
 * @param drawResultMap 开奖结果映射表
 * @returns Promise
 */
async function processUserSettlement(
  userId: number,
  userRecordsMap: Map<number, any[]>,
  drawResultMap: Map<string, number>
): Promise<void> {
  try {
    // 获取用户信息，包含代理商链路
    const user = await userService.getAgentUsersInfo(userId);

    if (!user || !user.agentUsers) {
      return;
    }

    // 查找该用户的所有记录
    const userRecords = userRecordsMap.get(userId) || [];

    // 收集该用户的所有分账任务
    const userPayoutTasks: Promise<number | undefined>[] = [];
    const userRedisTasks: Promise<string | null | void>[] = [];

    // 先收集所有需要查询的Redis键和相关数据
    const redisChecks = userRecords.map(async (userRecord) => {
      if (!userRecord.game_order || !userRecord.game_id) {
        return null;
      }

      const userGameOrder = String(userRecord.game_order);
      const userSettlementAmount = drawResultMap.get(userGameOrder) || 0;

      // 构建结算键
      const settlementKey = `${GAME_SETTLEMENT_PREFIX}processed:${String(
        userId
      )}:${String(userRecord.game_id)}:${String(userGameOrder)}`;

      // 检查是否已经处理过分账
      const settlementProcessed = await redisClient.get(settlementKey);

      // 如果已经处理过，返回null
      if (settlementProcessed) {
        console.log(
          `用户${userId}游戏${String(
            userRecord.game_id
          )}订单${userGameOrder}的分账已处理过，跳过`
        );
        return null;
      }

      return {
        settlementKey,
        userRecord,
        userGameOrder,
        userSettlementAmount,
      };
    });

    // 并行执行所有Redis检查
    const redisResults = await Promise.all(redisChecks);

    // 处理检查结果
    redisResults.forEach((result) => {
      if (!result) return;

      const { settlementKey, userRecord, userSettlementAmount } = result;

      // 计算该记录的净收益并累加到总净盈利
      const userConsumptionAmount = Number(userRecord.consumption_amount || 0);
      const userNetProfit = userSettlementAmount - userConsumptionAmount;

      // 将分账任务添加到用户任务队列，跳过钱包操作
      // processGameSettlementData调用，isFromSyncUserGameData设为false
      // 必定统计actual_flow字段，必定不统计flow字段
      userPayoutTasks.push(
        processAgentSettlement(
          userRecord.game_id,
          userId,
          userRecord,
          userNetProfit,
          false
        )
      );

      // 设置Redis标记，避免重复分账，设置7天过期
      userRedisTasks.push(
        redisClient.set(settlementKey, '1', { EX: 7 * 24 * 60 * 60 })
      );
    });

    // 等待所有Redis操作完成
    await Promise.all(userRedisTasks);

    // 等待所有分账任务完成
    await Promise.all(userPayoutTasks);
  } catch (error) {
    console.error(`处理用户${Number(userId)}代理商分账时发生错误:`, error);
  }
}

/**
 * 获取Redis中活跃的用户信息
 */
async function getActiveUsers() {
  try {
    // 查找所有活跃用户的Redis键
    const userKeys = await redisClient.keys(`${USER_ACTIVE_PREFIX}*`);

    // 如果没有活跃用户，直接返回空数组
    if (userKeys.length === 0) {
      return [];
    }

    // 并行获取所有用户的详细信息
    const userInfoPromises: any[] = userKeys.map((key) => {
      const userInfo = key.split(':');
      // 从键中提取用户ID
      const userId = Number(userInfo[2]);

      // 获取用户名
      const username = userInfo[3];

      // 只返回有效的用户信息
      return username ? { userId, username } : null;
    });

    return userInfoPromises;
  } catch (error: unknown) {
    console.error('获取活跃用户时发生错误:', error);
    return [];
  }
}

/**
 * 同步指定用户的游戏数据
 */
async function syncUserGameData(
  userId: number,
  games: GameInfo[]
): Promise<void> {
  try {
    if (!games || games.length === 0) {
      console.log(`用户${userId}没有可用游戏，跳过同步`);
      return;
    }

    // 使用Promise.all和map替代for...of循环
    await Promise.all(
      games.map(async (game) => {
        try {
          // 获取该游戏最近的消费记录
          const page = 1;

          // 动态计算日期范围，确保查询一年的数据
          const toDate = new Date();
          const fromDate = new Date();
          toDate.setHours(toDate.getHours() + 1);
          fromDate.setHours(fromDate.getHours() - 7);

          // 使用TimezoneUtil.formatTime方法格式化日期为YYYY-MM-DD HH:mm:ss格式
          const formatDate = (date: Date): string => {
            return TimezoneUtil.formatTime(date);
          };

          const params = {
            pageNo: page, // 使用pageNo参数名
            loginId: userId,
            fromDate: formatDate(fromDate),
            toDate: formatDate(toDate),
          };

          // 调用betListByPage接口获取投注记录
          const result = await gameApiAdapterService.betListByPage(
            game.game_id,
            params
          );

          // 增强类型检查，适配正确的返回结构
          if (!result.data) {
            console.log(`游戏${game.game_id}数据获取失败:`, result);
            return;
          }

          const betList = result.data;

          // 使用Promise.all和map替代for...of循环
          await Promise.all(
            betList.map(async (bet) => {
              try {
                // 确保bet是对象类型
                if (typeof bet !== 'object' || bet === null) {
                  console.log('跳过无效的投注记录:', bet);
                  return;
                }

                // 确保gameOrder是字符串类型
                const gameOrderStr = String(bet.game_order);

                if (gameOrderStr) {
                  try {
                    // 构建记录存在的Redis键（用于避免重复保存）
                    const recordKey = `${GAME_SETTLEMENT_PREFIX}record:${userId}:${game.game_id}:${gameOrderStr}`;

                    // 检查Redis中是否已经存在该记录
                    const recordExists = await redisClient.get(recordKey);

                    let shouldProcessSettlement = false;

                    // 如果记录不存在，则保存到数据库并设置Redis标记
                    if (!recordExists) {
                      // 对于有结算金额的记录，直接标记为已处理
                      const isProcessed =
                        bet.settlement_amount !== undefined &&
                        bet.settlement_amount !== null;

                      // 转换数据格式并保存，MySQL会自动处理主键重复的情况
                      await gameConsumptionRecordService.create({
                        user_id: userId,
                        game_id: game.game_id,
                        game_order: gameOrderStr,
                        consumption_time: bet.consumption_time,
                        consumption_amount: bet.consumption_amount,
                        settlement_amount: bet.settlement_amount,
                        settlement_time: bet.settlement_time,
                        result: bet.result,
                        has_processed: isProcessed, // 有结算金额的记录标记为已处理，避免重复处理
                      });

                      // 设置Redis标记，避免重复保存，设置3天过期
                      await redisClient.set(recordKey, '1', {
                        EX: 3 * 24 * 60 * 60,
                      });

                      // 标记为需要处理分账
                      shouldProcessSettlement = true;
                    }

                    // 检查是否需要进行非实际流水统计
                    if (
                      shouldProcessSettlement &&
                      bet.consumption_amount !== undefined &&
                      bet.consumption_amount !== null
                    ) {
                      // 计算净收益
                      const settlementAmount = Number(
                        bet.settlement_amount || 0
                      );
                      const consumptionAmount = Number(
                        bet.consumption_amount || 0
                      );
                      let netProfit = 0;
                      if (settlementAmount || settlementAmount === 0) {
                        netProfit = settlementAmount - consumptionAmount;
                      }

                      // 创建分账任务，与正常结算逻辑保持一致
                      const settlementKey = `${GAME_SETTLEMENT_PREFIX}processed:${String(
                        userId
                      )}:${String(game.game_id)}:${gameOrderStr}`;
                      const settlementProcessed = await redisClient.get(
                        settlementKey
                      );

                      if (!settlementProcessed) {
                        // 添加分账任务
                        // syncUserGameData调用，isFromSyncUserGameData设为true
                        // 必定统计flow字段，根据结算金额是否为空判断是否统计actual_flow字段
                        processAgentSettlement(
                          game.game_id,
                          userId,
                          bet,
                          netProfit,
                          true
                        ).catch((error) => {
                          console.error(
                            `处理用户${userId}代理商分账时发生错误:`,
                            error
                          );
                        });

                        // 设置Redis标记，避免重复分账，设置7天过期
                        await redisClient.set(settlementKey, '1', {
                          EX: 7 * 24 * 60 * 60,
                        });
                      }
                    }
                  } catch (error: unknown) {
                    console.error('保存游戏记录时发生错误:', error);
                    // 继续处理其他记录
                  }
                }
              } catch (error: unknown) {
                console.error('处理单条投注记录时发生错误:', error);
                // 继续处理其他记录
              }
            })
          );
        } catch (error: unknown) {
          console.error(`用户${userId}游戏${game.game_id}数据同步失败:`, error);
        }
      })
    );
  } catch (error: unknown) {
    console.error(`用户${userId}数据同步异常:`, error);
  }
}

/**
 * 同步用户游戏消费记录
 */
async function syncGameConsumptionRecord(): Promise<void> {
  try {
    console.log('开始同步游戏消费记录...');

    // 1. 获取所有支持的游戏列表（只查询一次）
    const gamesResult = await gameApiAdapterService.getGamesName({
      nowPage: 1,
      pageSize: 10,
    });

    if (!gamesResult || !gamesResult.rows || gamesResult.rows.length === 0) {
      console.log('没有可用游戏，跳过同步');
      return;
    }

    const games = gamesResult.rows as GameInfo[];
    console.log(`获取到${games.length}个游戏`);

    // 2. 从Redis获取所有活跃用户信息
    const activeUsers = await getActiveUsers();

    if (activeUsers.length === 0) {
      console.log('暂无活跃用户，跳过同步');
      return;
    }

    console.log(`发现${activeUsers.length}个活跃用户，开始同步数据`);

    // 3. 使用Promise.all和map替代for...of循环
    await Promise.all(
      activeUsers.map(async (user: any) => {
        try {
          // 将游戏列表作为参数传递，避免每个用户都单独查询游戏列表
          await syncUserGameData(user.userId, games);
        } catch (error: unknown) {
          console.error(`用户${Number(user.userId)}数据同步失败:`, error);
        }
      })
    );

    console.log('游戏消费记录同步完成');
  } catch (error: unknown) {
    console.error('同步游戏消费记录时发生错误:', error);
  }
}

/**
 * 处理游戏结算数据
 * 每天凌晨执行一次，查询昨天settlement_time和settlement_amount为空的记录，
 * 并更新结算信息
 */
async function processGameSettlementData(): Promise<void> {
  try {
    console.log('开始处理游戏结算数据...');

    // 查询已经到结算时间且未结算的记录
    // 使用新方法getUnsettledRecordsByDate，它会查询settlement_amount为空且settlement_time在当天或以前的数据
    const unsettledRecords =
      await gameConsumptionRecordService.getUnsettledRecordsByDate(1, 1000);

    if (
      !unsettledRecords ||
      !unsettledRecords.rows ||
      unsettledRecords.rows.length === 0
    ) {
      console.log('没有需要处理的未结算记录');
      return;
    }

    console.log(`发现${unsettledRecords.rows.length}条需要处理的未结算记录`);

    // 构建开奖结果的map，使用订单号作为key
    const drawResultMap = new Map<string, number>();

    // 优化：使用Map存储订单信息，键为订单号，值为游戏ID
    const orderGameMap = new Map<string, number>();
    // 按用户分组记录，每个用户合并处理
    const userRecordsMap = new Map<number, any[]>();
    // 优化：直接创建订单-记录映射，避免重复查找
    const recordMap = new Map<string, any>();
    // 按游戏ID分组订单，跳过gameId=1(VBOSS)的游戏
    const gameOrdersMap = new Map<number, string[]>();
    // 收集所有时间，以便计算最小时间
    const allTimes: Date[] = [];

    // 单次遍历同时完成多项工作，提高效率
    unsettledRecords.rows.forEach((record: any) => {
      // 跳过gameId=1(VBOSS)的游戏
      if (record.game_id === 1) {
        return;
      }

      const userId = record.user_id;
      // 按用户分组
      if (!userRecordsMap.has(userId)) {
        userRecordsMap.set(userId, []);
      }
      userRecordsMap.get(userId)?.push(record);

      // 收集订单信息并创建订单-记录映射
      if (record.game_id && record.game_order) {
        const gameOrder = String(record.game_order);
        orderGameMap.set(gameOrder, record.game_id);
        recordMap.set(gameOrder, record);

        // 按游戏ID分组订单
        if (!gameOrdersMap.has(record.game_id)) {
          gameOrdersMap.set(record.game_id, []);
        }
        gameOrdersMap.get(record.game_id)?.push(gameOrder);

        // 收集时间信息
        if (record.consumption_time) {
          allTimes.push(new Date(record.consumption_time));
        }
      }
    });

    // 计算最小时间作为开始时间，当前时间作为结束时间
    let fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - 24); // 默认查询过去24小时

    if (allTimes.length > 0) {
      // 找到最小时间
      const minTime = new Date(
        Math.min(...allTimes.map((date) => date.getTime()))
      );
      fromDate = new Date(minTime);
    }

    const toDate = new Date();

    // 格式化日期为YYYY-MM-DD HH:mm:ss格式
    const formatFromDate = TimezoneUtil.formatTime(
      fromDate,
      'YYYY-MM-DD HH:mm:ss'
    );
    const formatToDate = TimezoneUtil.formatTime(toDate, 'YYYY-MM-DD HH:mm:ss');

    console.log(`查询时间范围: ${formatFromDate} 到 ${formatToDate}`);

    // 按游戏ID批量查询开奖结果
    const gameResultPromises = Array.from(gameOrdersMap.entries()).map(
      async ([gameId, gameOrders]) => {
        try {
          const result = await gameApiAdapterService.drawResult(
            gameId,
            formatFromDate,
            formatToDate
          );
          return { gameId, result, gameOrders, status: 'fulfilled' };
        } catch (error) {
          console.error(`获取游戏${gameId}开奖结果时发生错误:`, error);
          return {
            gameId,
            result: null,
            gameOrders,
            error,
            status: 'rejected',
          };
        }
      }
    );

    const gameResultsSettled = await Promise.allSettled(gameResultPromises);
    // 提取成功的结果
    const successfulGameResults = gameResultsSettled
      .filter(
        (settledResult): settledResult is PromiseFulfilledResult<any> =>
          settledResult.status === 'fulfilled'
      )
      .map((settledResult) => settledResult.value)
      .filter((gameResult) => gameResult.status === 'fulfilled');

    // 处理所有游戏的开奖结果
    successfulGameResults.forEach(({ result, gameOrders }) => {
      if (!result || !result.data || !Array.isArray(result.data)) {
        return;
      }

      // 将结果数据映射到drawResultMap中
      result.data.forEach((drawResult: any) => {
        if (
          drawResult.game_order &&
          drawResult.settlement_amount !== undefined
        ) {
          const gameOrder = String(drawResult.game_order);
          // 只有当这个订单在需要处理的列表中时才更新
          if (gameOrders.includes(gameOrder)) {
            drawResultMap.set(gameOrder, Number(drawResult.settlement_amount));
          }
        }
      });
    });

    if (drawResultMap.size === 0) {
      console.log('未获取到任何有效的游戏开奖结果，跳过所有处理');
      return;
    }

    console.log(`成功获取了${drawResultMap.size}条有效开奖结果`);

    // 准备批量更新的数据和任务
    const allPromises: Promise<any>[] = [];
    const processedUsers = new Set<number>();

    // 处理所有记录，构建更新任务
    unsettledRecords.rows.forEach((record: any) => {
      try {
        // 跳过gameId=1(VBOSS)的游戏
        if (record.game_id === 1) {
          return;
        }

        if (!record.game_order || !record.game_id) {
          console.log(
            '跳过无效记录，缺少game_order或game_id:',
            record.game_order
          );
          return;
        }

        const gameOrder = String(record.game_order);
        const settlementAmount = drawResultMap.get(gameOrder) || 0;

        // 添加到更新任务
        if (settlementAmount !== undefined) {
          allPromises.push(
            gameConsumptionRecordService
              .update(gameOrder, record.game_id, {
                settlement_amount: settlementAmount,
                result: record.result,
                has_processed: true, // 更新结算金额时标记为已处理，避免重复处理
              })
              .catch((error) => {
                console.error(
                  `更新记录结算信息失败(订单:${gameOrder}):`,
                  error
                );
              })
          );
        }

        // 处理用户相关任务
        const userId = record.user_id;
        if (!processedUsers.has(userId)) {
          processedUsers.add(userId);
          // 直接将用户处理任务添加到allPromises数组
          allPromises.push(
            processUserSettlement(userId, userRecordsMap, drawResultMap)
          );
        }
      } catch (error) {
        console.error(`处理记录时发生错误:`, error);
      }
    });

    // 并行处理所有任务，最大化效率
    if (allPromises.length > 0) {
      await Promise.all(allPromises);
    }

    console.log('游戏结算数据处理完成');
  } catch (error: unknown) {
    console.error('处理游戏结算数据时发生错误:', error);
  }
}

/**
 * 处理VBOSS游戏结算（优化版）
 * 只查询has_processed为false且settlement_time小于当天的game_consumption_record数据
 * 使用has_processed字段标记已处理记录，避免重复处理
 * 有结算金额的记录在创建时已标记为has_processed=true，不会被重复处理
 * 结合game_consumption_record消费金额和game_transaction_record的VBOSS转入转出金额进行分账统计
 */
async function processVBOSSSettlement(): Promise<void> {
  try {
    console.log('开始处理VBOSS游戏结算（优化版）...');

    // 获取当前日期字符串
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // 格式: YYYY-MM-DD

    // 使用新方法查询VBOSS游戏未结算记录
    const unsettledRecordsResult =
      await gameConsumptionRecordService.getVBOSSUnsettledRecords();

    if (
      !unsettledRecordsResult ||
      !unsettledRecordsResult.rows ||
      unsettledRecordsResult.rows.length === 0
    ) {
      console.log('没有需要处理的VBOSS游戏未结算记录');
      return;
    }

    console.log(
      `发现${unsettledRecordsResult.rows.length}条需要处理的VBOSS游戏未结算记录`
    );

    // 按用户分组处理记录
    const userRecordsMap = new Map<number, any[]>();
    const recordsToUpdate: Array<{ game_order: string; game_id: number }> = [];

    unsettledRecordsResult.rows.forEach((record: any) => {
      const userId = record.user_id;
      if (!userRecordsMap.has(userId)) {
        userRecordsMap.set(userId, []);
      }
      userRecordsMap.get(userId)!.push(record);
      // 收集需要更新的记录，使用复合主键信息
      recordsToUpdate.push({
        game_order: record.game_order,
        game_id: record.game_id,
      });
    });

    // 处理每个用户的VBOSS结算
    const userProcessingPromises = Array.from(userRecordsMap.entries()).map(
      async ([userId]) => {
        try {
          // 查询用户的VBOSS余额
          const profileResult = await gameApiAdapterService.getProfile(1, {
            loginId: userId,
          });

          if (
            !profileResult ||
            !profileResult.data ||
            profileResult.data.balance === undefined
          ) {
            console.log(`获取用户${userId}VBOSS余额失败:`, profileResult);
            return;
          }

          const currentBalance = Number(profileResult.data.balance);

          // 查询用户的VBOSS交易记录
          const transactionResult = await gameTransactionRecordService.getList({
            user_id: userId,
            game_id: 1,
            nowPage: 1,
            pageSize: 1000,
          });

          // 计算转入和转出金额
          let totalDeposit = 0;
          let totalWithdrawal = 0;

          if (
            transactionResult &&
            transactionResult.rows &&
            transactionResult.rows.length > 0
          ) {
            transactionResult.rows.forEach((transaction: any) => {
              const amount = Number(transaction.amount || 0);
              if (amount > 0) {
                totalDeposit += amount; // 转入金额
              } else {
                totalWithdrawal += Math.abs(amount); // 转出金额
              }
            });
          }

          // 计算用户净收益 = 当前余额 - (总转入 - 总转出)
          // 净收益为负表示用户亏损，为正表示用户盈利
          const userNetProfit =
            currentBalance - (totalDeposit - totalWithdrawal);

          // 平进平出(净收益为0)的情况不计入分账统计和记录
          if (userNetProfit === 0) {
            console.log(
              `用户${userId}VBOSS游戏平进平出，净收益为0，跳过分账处理`
            );
            return;
          }

          // 计算总消费金额
          // const totalConsumptionAmount = records.reduce(
          //   (sum: number, record: any) => {
          //     return sum + Number(record.consumption_amount || 0);
          //   },
          //   0
          // );

          // 获取用户的代理商链路信息
          const user = await userService.getAgentUsersInfo(userId);

          if (!user || !user.agentUsers) {
            console.log(`用户${userId}未找到代理商链路信息，跳过分账`);
            return;
          }

          // 创建vote_id，包含分账日期、用户ID和时间戳
          const voteId = `${dateStr}-${userId}-${Date.now()}`;

          // 为用户创建单条分账记录
          try {
            await quizService.createPayoutAndUpdateStatistics(
              {
                vote_id: voteId,
                payout_amount: userNetProfit,
                payouts_user_id: userId,
                ancestors: user.ancestors || '',
                profit_ratio: 1,
                parent_id: user.parent_id || -1,
                game_id: 1,
              },
              {
                parent_divided_into: 0,
                // VBOSS游戏分账，所有flow相关字段必须设为undefined
                amount_flow: undefined,
                amount_actual_flow: undefined,
                lower_level_actual_flow: undefined,
                lower_level_flow: undefined,
                lower_level_settlement_flow: userNetProfit,
                link_identifier: user.link_identifier || '',
              }
            );

            console.log(
              `用户${userId}VBOSS分账记录创建成功，净收益: ${userNetProfit}, vote_id: ${voteId}`
            );
          } catch (error) {
            console.error(`创建用户${userId}VBOSS分账记录失败:`, error);
            return; // 发生错误时不中断其他用户的处理
          }

          console.log(
            `用户${userId}VBOSS结算处理完成，净收益: ${userNetProfit}`
          );
        } catch (error) {
          console.error(`处理用户${userId}VBOSS结算时发生错误:`, error);
          // 发生错误时不中断其他用户的处理
        }
      }
    );

    // 等待所有用户处理完成
    await Promise.all(userProcessingPromises);

    // 批量更新记录的has_processed为true，避免重复处理
    // 这种方式比设置consumption_amount为0更好，因为consumption_amount本身有业务含义
    if (recordsToUpdate.length > 0) {
      const updatedCount =
        await gameConsumptionRecordService.batchUpdateVBOSSProcessedStatus(
          recordsToUpdate
        );
      console.log(`已更新${updatedCount}条VBOSS游戏记录，标记为已处理`);
    }

    console.log('VBOSS游戏结算处理完成');
  } catch (error) {
    console.error('处理VBOSS游戏结算时发生错误:', error);
  }
}

/**
 * 启动同步游戏消费记录定时任务
 */
export const startSyncGameConsumptionRecordSchedule = (): NodeJS.Timeout => {
  // 立即执行一次
  syncGameConsumptionRecord();

  // 设置定时器，每60秒执行一次
  const interval = setInterval(() => {
    syncGameConsumptionRecord();
  }, 60 * 1000);

  console.log('同步游戏消费记录定时任务已启动，每30秒执行一次');

  return interval;
};

/**
 * 启动游戏结算数据处理定时任务
 * 每天凌晨执行一次
 */
export const startProcessGameSettlementSchedule = (): NodeJS.Timeout => {
  // 立即执行一次
  processGameSettlementData();

  // 计算距离明天凌晨的时间差
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const delay = tomorrow.getTime() - now.getTime();

  // 先设置一个延时执行，然后每天执行一次
  const timeout = setTimeout(() => {
    // 设置每天执行一次的定时器
    const dailyInterval = setInterval(() => {
      processGameSettlementData();
    }, 24 * 60 * 60 * 1000);

    // 立即执行一次
    processGameSettlementData();

    return dailyInterval;
  }, delay);

  console.log('游戏结算数据处理定时任务已启动，每天凌晨执行一次');

  // 返回一个可取消的定时器ID
  return timeout;
};

/**
 * 启动VBOSS游戏结算定时任务（优化版）
 * 每天11点执行一次，执行优化后的VBOSS分账统计逻辑
 */
export const startVBOSSSettlementSchedule = (): NodeJS.Timeout => {
  try {
    // 立即执行一次优化版的VBOSS结算处理
    console.log('初始化执行VBOSS游戏结算...');
    processVBOSSSettlement().catch((error) => {
      console.error('初始化执行VBOSS游戏结算失败:', error);
    });
  } catch (error) {
    console.error('启动VBOSS游戏结算初始化执行失败:', error);
  }

  // 计算距离今天11点的时间差
  const now = new Date();
  const nextExecution = new Date(now);
  nextExecution.setHours(11, 0, 0, 0);

  // 如果今天的11点已经过了，设置为明天的11点
  if (nextExecution <= now) {
    nextExecution.setDate(nextExecution.getDate() + 1);
  }

  const delay = nextExecution.getTime() - now.getTime();

  // 先设置一个延时执行，然后每天执行一次
  // eslint-disable-next-line consistent-return
  const timeout = setTimeout(() => {
    try {
      // 设置每天执行一次的定时器
      const dailyInterval = setInterval(() => {
        console.log('执行每日VBOSS游戏结算任务...');
        processVBOSSSettlement().catch((error) => {
          console.error('每日VBOSS游戏结算执行失败:', error);
        });
      }, 24 * 60 * 60 * 1000);

      // 立即执行一次
      console.log('首次定时执行VBOSS游戏结算...');
      processVBOSSSettlement().catch((error) => {
        console.error('首次定时执行VBOSS游戏结算失败:', error);
      });

      console.log('VBOSS游戏结算定时任务已启动，每天11点执行一次');

      return dailyInterval;
    } catch (error) {
      console.error('设置VBOSS游戏结算定时任务失败:', error);
    }
  }, delay);

  console.log(
    `VBOSS游戏结算定时任务已设置，将在${nextExecution.toLocaleString()}首次执行`
  );

  // 返回一个可取消的定时器ID
  return timeout;
};
