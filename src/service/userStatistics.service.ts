import { QueryTypes } from 'sequelize';

import sequelize from '@/config/mysql/index';
import { IListBase, IPaging, IPagingWithCols } from '@/interface';
import GameConsumptionRecordModel from '@/model/gameConsumptionRecord.model';
import quizVotesModel from '@/model/quizVotes.model';
import userModel from '@/model/user.model';
import { handlePage, handlePaging, handleRangTime } from '@/utils';

/**
 * 用户统计服务
 * 用于统计用户在quiz_votes和gameConsumptionRecord两个表中的总流水和总输赢结果
 */
class UserStatisticsService {
  /**
   * 根据用户ID获取quiz_votes表的统计数据
   * @param userId 用户ID
   * @param rangTimeType 时间范围类型
   * @param rangTimeStart 开始时间
   * @param rangTimeEnd 结束时间
   * @returns quiz_votes表的统计数据
   */
  private async getQuizVotesStatistics(
    userId: number,
    rangTimeType?: string,
    rangTimeStart?: number | string,
    rangTimeEnd?: number | string
  ) {
    const allWhere: any = {
      user_id: String(userId), // quiz_votes表中的user_id是STRING类型
    };

    // 添加时间范围筛选
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });

    if (rangTimeWhere) {
      allWhere[rangTimeType || 'created_at'] = rangTimeWhere;
    }

    const statistics = await quizVotesModel.findOne({
      attributes: [
        [
          sequelize.fn(
            'SUM',
            sequelize.cast(sequelize.col('vote_amount'), 'DOUBLE')
          ),
          'total_flow',
        ], // 总流水
        [
          sequelize.fn('SUM', sequelize.col('net_profit_amount')),
          'total_profit',
        ], // 总输赢结果
      ],
      where: allWhere,
      raw: true, // 返回原始数据类型
    });

    // 处理空值情况，确保返回数字类型
    return {
      total_flow: Number((statistics as any)?.total_flow) || 0,
      total_profit: Number((statistics as any)?.total_profit) || 0,
    };
  }

  /**
   * 根据用户ID获取gameConsumptionRecord表的统计数据
   * @param userId 用户ID
   * @param rangTimeType 时间范围类型
   * @param rangTimeStart 开始时间
   * @param rangTimeEnd 结束时间
   * @returns gameConsumptionRecord表的统计数据
   */
  private async getGameConsumptionStatistics(
    userId: number,
    rangTimeType?: string,
    rangTimeStart?: number | string,
    rangTimeEnd?: number | string
  ) {
    const allWhere: any = {
      user_id: userId, // gameConsumptionRecord表中的user_id是INTEGER类型
    };

    // 添加时间范围筛选
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });

    if (rangTimeWhere) {
      allWhere[rangTimeType || 'created_at'] = rangTimeWhere;
    }

    const statistics = await GameConsumptionRecordModel.findOne({
      attributes: [
        [
          sequelize.fn(
            'SUM',
            sequelize.cast(sequelize.col('consumption_amount'), 'DOUBLE')
          ),
          'total_flow',
        ], // 总流水
        [
          sequelize.fn(
            'SUM',
            sequelize.cast(sequelize.col('settlement_amount'), 'DOUBLE')
          ),
          'total_profit',
        ], // 总输赢结果
      ],
      where: allWhere,
      raw: true, // 返回原始数据类型
    });

    // 处理空值情况，确保返回数字类型
    return {
      total_flow: Number((statistics as any)?.total_flow) || 0,
      total_profit: Number((statistics as any)?.total_profit) || 0,
    };
  }

  /**
   * 根据用户ID统计quiz_votes和gameConsumptionRecord两个表的总流水和总输赢结果
   * @param userId 用户ID
   * @param params 查询参数，包含时间范围等
   * @returns 合并后的统计数据
   */
  async getUserTotalStatistics(userId: number, params?: IListBase) {
    const { rangTimeType, rangTimeStart, rangTimeEnd } = params || {};

    // 并行查询两个表的统计数据
    const [quizStatistics, gameStatistics] = await Promise.all([
      this.getQuizVotesStatistics(
        userId,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd
      ),
      this.getGameConsumptionStatistics(
        userId,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd
      ),
    ]);

    // 合并统计结果
    return {
      quiz: quizStatistics,
      game: gameStatistics,
      total: {
        total_flow: quizStatistics.total_flow + gameStatistics.total_flow,
        total_profit: quizStatistics.total_profit + gameStatistics.total_profit,
      },
    };
  }

  /**
   * 批量获取quiz_votes表的统计数据
   * @param userIds 用户ID列表
   * @param rangTimeType 时间范围类型
   * @param rangTimeStart 开始时间
   * @param rangTimeEnd 结束时间
   * @returns Map<用户ID, 统计数据>
   */
  private async getBatchQuizVotesStatistics(
    userIds: number[],
    rangTimeType?: string,
    rangTimeStart?: number | string,
    rangTimeEnd?: number | string
  ) {
    const allWhere: any = {
      user_id: userIds.map((id) => String(id)), // quiz_votes表中的user_id是STRING类型
    };

    // 添加时间范围筛选
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });

    if (rangTimeWhere) {
      allWhere[rangTimeType || 'created_at'] = rangTimeWhere;
    }

    const statistics = await quizVotesModel.findAll({
      attributes: [
        'user_id',
        [
          sequelize.fn(
            'SUM',
            sequelize.cast(sequelize.col('vote_amount'), 'DOUBLE')
          ),
          'total_flow',
        ],
        [
          sequelize.fn('SUM', sequelize.col('net_profit_amount')),
          'total_profit',
        ],
      ],
      where: allWhere,
      group: ['user_id'],
      raw: true,
    });

    // 构建Map返回，使用Number(user_id)作为key
    const resultMap = new Map<
      number,
      { total_flow: number; total_profit: number }
    >();
    (statistics as any[]).forEach((stat) => {
      resultMap.set(Number(stat.user_id), {
        total_flow: Number(stat.total_flow) || 0,
        total_profit: Number(stat.total_profit) || 0,
      });
    });

    return resultMap;
  }

  /**
   * 批量获取gameConsumptionRecord表的统计数据
   * @param userIds 用户ID列表
   * @param rangTimeType 时间范围类型
   * @param rangTimeStart 开始时间
   * @param rangTimeEnd 结束时间
   * @returns Map<用户ID, 统计数据>
   */
  private async getBatchGameConsumptionStatistics(
    userIds: number[],
    rangTimeType?: string,
    rangTimeStart?: number | string,
    rangTimeEnd?: number | string
  ) {
    const allWhere: any = {
      user_id: userIds, // gameConsumptionRecord表中的user_id是INTEGER类型
    };

    // 添加时间范围筛选
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });

    if (rangTimeWhere) {
      allWhere[rangTimeType || 'created_at'] = rangTimeWhere;
    }

    const statistics = await GameConsumptionRecordModel.findAll({
      attributes: [
        'user_id',
        [
          sequelize.fn(
            'SUM',
            sequelize.cast(sequelize.col('consumption_amount'), 'DOUBLE')
          ),
          'total_flow',
        ],
        [
          sequelize.fn(
            'SUM',
            sequelize.cast(sequelize.col('settlement_amount'), 'DOUBLE')
          ),
          'total_profit',
        ],
      ],
      where: allWhere,
      group: ['user_id'],
      raw: true,
    });

    // 构建Map返回
    const resultMap = new Map<
      number,
      { total_flow: number; total_profit: number }
    >();
    (statistics as any[]).forEach((stat) => {
      resultMap.set(stat.user_id, {
        total_flow: Number(stat.total_flow) || 0,
        total_profit: Number(stat.total_profit) || 0,
      });
    });

    return resultMap;
  }

  /**
   * 根据父级ID批量获取quiz_votes和gameConsumptionRecord两个表的总流水和总输赢结果
   * 使用并行双查询方案 - 在大多数情况下这是效率最高的方案
   * @param params 查询参数，包含分页、时间范围和父级ID等
   * @returns 合并后的统计数据分页结果
   */
  async getUsersTotalStatisticsByPage(
    params?: IListBase & { parent_user_id?: number }
  ): Promise<IPaging<any>> {
    const { rangTimeType, rangTimeStart, rangTimeEnd, parent_user_id } =
      params || {};
    const { nowPage, pageSize } = params || {};

    // 根据父级ID获取用户列表
    const userQuery: any = {};
    if (parent_user_id) {
      userQuery.parent_id = parent_user_id;
    }

    const userIdsResult = await userModel.findAll({
      attributes: ['id'],
      where: userQuery,
      raw: true,
    });

    const userIds = userIdsResult.map((item: any) => item.id);
    const { offset, limit } = handlePage(params || {});

    // 并行执行两个批量聚合查询
    const [quizStatsMap, gameStatsMap] = await Promise.all([
      this.getBatchQuizVotesStatistics(
        userIds,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd
      ),
      this.getBatchGameConsumptionStatistics(
        userIds,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd
      ),
    ]);

    // 处理分页
    const pagedUserIds = userIds.slice(offset, offset + limit);

    // 构建结果数组，使用扁平结构格式
    const rows = pagedUserIds.map((userId) => {
      const quizStats = quizStatsMap.get(userId) || {
        total_flow: 0,
        total_profit: 0,
      };
      const gameStats = gameStatsMap.get(userId) || {
        total_flow: 0,
        total_profit: 0,
      };
      const totalFlow = quizStats.total_flow + gameStats.total_flow;
      const totalProfit = quizStats.total_profit + gameStats.total_profit;

      return {
        user_id: userId,
        quiz_total_flow: quizStats.total_flow,
        quiz_total_profit: quizStats.total_profit,
        game_total_flow: gameStats.total_flow,
        game_total_profit: gameStats.total_profit,
        total_total_flow: totalFlow,
        total_total_profit: totalProfit,
      };
    });

    return handlePaging({ count: userIds.length, rows }, nowPage, pageSize);
  }

  /**
   * 使用单SQL查询实现批量用户统计 - 以user表为主表确保所有会员用户都被统计
   * 支持按游戏分组计算，并返回嵌套结构的结果，确保即使没有记录也显示所有游戏的零值
   * @param params 查询参数，包含分页、时间范围和父级ID等
   * @returns 合并后的统计数据分页结果，按游戏分组返回嵌套结构
   */
  async getUsersTotalStatisticsBySingleQuery(
    params?: IListBase & { parent_user_id?: number }
  ): Promise<IPagingWithCols<any, string[]>> {
    const {
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
      parent_user_id,
      nowPage,
      pageSize,
    } = params || {};
    const { offset, limit } = handlePage(params || {});

    // 获取时间范围筛选条件
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });

    // 构建时间条件对象
    const timeCondition = rangTimeWhere
      ? `AND ${
          rangTimeType || 'created_at'
        } BETWEEN '${rangTimeStart!}' AND '${rangTimeEnd!}'`
      : '';

    // 查询符合条件的用户列表（所有非代理用户，或指定父级ID的用户）
    let userFilterCondition = 'u.is_agent = false and u.is_admin = false';
    if (parent_user_id) {
      userFilterCondition += ` AND u.parent_id = ${parent_user_id}`;
    }

    // 查询所有可用的游戏名称列表
    const gamesListResult: any[] = await sequelize.query(
      'SELECT game_name FROM games WHERE status = 1', // 假设status=1表示可用游戏
      { type: QueryTypes.SELECT }
    );
    const allGameNames = gamesListResult
      .map((game) => game.game_name)
      .filter(Boolean);

    // 构建SQL查询 - 以user表为主表，确保所有会员用户都被统计到
    // 先查询quiz数据
    const quizSql = `
      SELECT u.id                                   as user_id,
             u.username,
             COALESCE(SUM(qv.vote_amount), 0)       as quiz_total_flow,
             COALESCE(SUM(qv.net_profit_amount), 0) as quiz_total_profit
      FROM user u
             LEFT JOIN quiz_votes qv ON u.id = qv.user_id
      WHERE ${userFilterCondition} ${timeCondition}
      GROUP BY u.id, u.username
    `;

    // 查询game数据，按游戏名称分组
    const gameSql = `
      SELECT u.id                                     as user_id,
             g.game_name,
             COALESCE(SUM(gcr.consumption_amount), 0) as game_total_flow,
             COALESCE(SUM(gcr.settlement_amount), 0)  as game_total_profit
      FROM user u
             LEFT JOIN game_consumption_record gcr ON u.id = gcr.user_id
             LEFT JOIN games g ON gcr.game_id = g.game_id
      WHERE ${userFilterCondition} ${timeCondition}
      GROUP BY u.id, g.game_name
    `;

    // 执行查询
    const [quizResults, gameResults]: any[] = await Promise.all([
      sequelize.query(quizSql, { type: QueryTypes.SELECT }),
      sequelize.query(gameSql, { type: QueryTypes.SELECT }),
    ]);

    // 合并结果，构建嵌套结构
    const mergedResults: any[] = [];
    const userMap = new Map();

    // 先处理quiz数据，初始化用户记录，并为每个用户预先填充所有游戏的零值
    quizResults.forEach((quizRow: any) => {
      const userId = quizRow.user_id;

      // 初始化用户记录
      const userRecord = {
        user_id: Number(userId),
        username: quizRow.username,
        quiz: {
          total_flow: Number(
            parseFloat(quizRow.quiz_total_flow || 0).toFixed(2)
          ),
          total_profit: Number(
            parseFloat(quizRow.quiz_total_profit || 0).toFixed(2)
          ),
        },
        game: {},
      };

      // 为每个用户预先填充所有游戏的零值
      allGameNames.forEach((gameName) => {
        userRecord.game[gameName] = {
          total_flow: 0,
          total_profit: 0,
        };
      });

      userMap.set(userId, userRecord);
    });

    // 处理game数据，更新实际有消费记录的游戏数据
    const distinctGameNames = new Set<string>();

    gameResults.forEach((gameRow: any) => {
      const userId = gameRow.user_id;
      const gameName = gameRow.game_name;

      if (gameName && userMap.has(userId)) {
        const userRecord = userMap.get(userId);

        // 更新游戏数据，保留两位小数
        userRecord.game[gameName] = {
          total_flow: Number(
            parseFloat(gameRow.game_total_flow || 0).toFixed(2)
          ),
          total_profit: gameRow.game_total_profit
            ? Number(parseFloat(gameRow.game_total_profit).toFixed(2))
            : 0,
        };

        // 添加到游戏列表（去重）
        distinctGameNames.add(gameName);
      }
    });

    // 转换Map为数组
    userMap.forEach((value) => mergedResults.push(value));

    // 排序
    mergedResults.sort((a, b) => a.user_id - b.user_id);

    // 处理分页
    const pagedResults = mergedResults.slice(offset, offset + limit);

    // 获取分页结果
    const pagingResult = handlePaging(
      { count: mergedResults.length, rows: pagedResults },
      nowPage,
      pageSize
    );

    // 将所有可用游戏列表添加到cols字段中
    return {
      ...pagingResult,
      cols: allGameNames,
    };
  }
}

export default new UserStatisticsService();
