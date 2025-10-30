import { deleteUseLessObjectKey } from 'billd-utils';
// eslint-disable-next-line import/order
import { Op, Transaction } from 'sequelize';

// eslint-disable-next-line import/no-extraneous-dependencies
import SnowflakeId from 'snowflake-id';

import sequelize from '@/config/mysql';
import { DEFAULT_ROLE_INFO, MATCH_LIST_TYPE, QuizVoteType } from '@/constant';
import { IList, IWallet, VoteResult } from '@/interface';
import liveRoomModel from '@/model/liveRoom.model';
import quizMatchGoalsModel from '@/model/quizMatchGoals.model';
import quizMatchTypesModel from '@/model/quizMatchTypes.model';
import quizMatchVotesModel from '@/model/quizMatchVotes.model';
import quizMatchesModel from '@/model/quizMatches.model';
import quizPayoutsModel from '@/model/quizPayouts.model';
import quizSeasonsModel from '@/model/quizSeasons.model';
import quizTeamsModel from '@/model/quizTeams.model';
import quizVotesModel from '@/model/quizVotes.model';
import userModel from '@/model/user.model';
import userRoleModel from '@/model/userRole.model';
// eslint-disable-next-line import/order
import walletModel from '@/model/wallet.model';

// import quizLiveStreamsModel from '@/model/quizLiveStreams.model';
// import quizMatchTypesModel from '@/model/quizMatchTypes.model';
// import quizVotesModel from '@/model/quizVotes.model';

import quizPayoutsStatisticsService from '@/service/quizPayoutsStatistics.service';
import {
  IQuizMatches,
  IQuizMatchGoals,
  IQuizMatchTypes,
  IQuizMatchVotes,
  IQuizPayouts,
  IQuizPayoutsStatistics,
  IQuizSeasons,
  IQuizTeams,
  IQuizVotes,
  QuizMatchStatus,
} from '@/types/IQuiz';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';
import { buildPermissionWhere } from '@/utils/permissionUtils';

quizSeasonsModel.hasMany(quizMatchesModel, {
  as: 'match',
  foreignKey: 'season_id',
});

quizMatchesModel.belongsTo(quizTeamsModel, {
  as: 'team1',
  foreignKey: 'team_id',
});
quizMatchesModel.belongsTo(quizTeamsModel, {
  as: 'team2',
  foreignKey: 'team_id2',
});
quizMatchesModel.belongsTo(quizTeamsModel, {
  as: 'winTeam',
  foreignKey: 'win_team_id',
});
quizMatchesModel.belongsTo(liveRoomModel, {
  as: 'liveRoom',
  foreignKey: 'live_room_id',
});

quizMatchesModel.belongsTo(quizSeasonsModel, {
  as: 'seasons',
  foreignKey: 'season_id',
});
quizMatchesModel.hasMany(quizMatchVotesModel, {
  as: 'matchVotes',
  foreignKey: 'match_id',
});

// 定义 quizMatchesModel 和 quizMatchGoalsModel 的关联关系
quizMatchesModel.hasMany(quizMatchGoalsModel, {
  as: 'team1Goals',
  foreignKey: 'match_id',
  sourceKey: 'match_id',
  scope: {
    team_id: sequelize.col('match.team_id'),
  },
});

quizMatchesModel.hasMany(quizMatchGoalsModel, {
  as: 'team2Goals',
  foreignKey: 'match_id',
  sourceKey: 'match_id',
  scope: {
    team_id: sequelize.col('match.team_id2'),
  },
});

quizVotesModel.belongsTo(quizMatchesModel, {
  as: 'match',
  foreignKey: 'match_id',
  targetKey: 'match_id',
});

quizVotesModel.belongsTo(userModel, {
  as: 'user',
  foreignKey: 'user_id',
});

quizVotesModel.hasMany(quizPayoutsModel, {
  as: 'payouts',
  foreignKey: 'vote_id',
});

quizVotesModel.belongsTo(userModel, {
  as: 'parentUser', // 新的关联别名
  foreignKey: 'user_id',
  targetKey: 'parent_id', // 关联 userModel 的 parent_id 字段
});

const snowflake = new SnowflakeId({
  mid: 1, // 机器 ID，范围 0 - 1023
  offset: (2020 - 1970) * 31536000 * 1000, // 起始时间戳偏移量
});

// 前置定义关联关系
userModel.hasMany(quizPayoutsModel, {
  foreignKey: 'payouts_user_id',
  as: 'quizPayouts',
});

userModel.hasMany(userRoleModel, { foreignKey: 'user_id' });

userModel.hasMany(userModel, {
  foreignKey: 'parent_id',
  as: 'child_user', // 子用户关联
});
userModel.belongsTo(userModel, {
  foreignKey: 'parent_id',
  as: 'parent_user', // 父用户关联
});

quizPayoutsModel.belongsTo(userModel, {
  as: 'user',
  foreignKey: 'payouts_user_id',
});

class QuizService {
  // 创建比赛类型
  async createMatchType({ type_name }: IQuizMatchTypes) {
    const count = await quizMatchTypesModel.create({ type_name });
    return count;
  }

  // 获取所有比赛类型
  async getMatchTypesAll() {
    const result = await quizMatchTypesModel.findAll();
    return result;
  }

  async updateMatchType({ id, type_name }: IQuizMatchTypes) {
    const result = await quizMatchTypesModel.update(
      { type_name },
      { where: { id } }
    );
    return result;
  }

  async findMatchType(id: number) {
    const result = await quizMatchTypesModel.findOne({ where: { id } });
    return result;
  }

  async getListMatchTypes({
    type_name,
    id,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IQuizMatchTypes>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      type_name,
      id,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['name', 'desc'], // 可根据实际表结构调整
    });
    if (keyWordWhere) {
      allWhere[Op.or] = keyWordWhere;
    }
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    if (rangTimeWhere) {
      allWhere[rangTimeType!] = rangTimeWhere;
    }
    const orderRes = handleOrder({ orderName, orderBy });
    const result = await quizMatchTypesModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: allWhere,
    });

    return handlePaging(result, nowpage, pagesize);
  }

  // 删除比赛类型
  async deleteMatchType(id: number) {
    const deletedRows = await quizMatchTypesModel.destroy({
      where: { id },
      limit: 1,
    });
    return deletedRows > 0;
  }

  // 创建比赛队伍
  async createTeam(data: IQuizTeams) {
    const count = await quizTeamsModel.create(data);
    return count;
  }

  // 获取队伍列表
  async getTeamList({
    team_name,
    type_id,
    team_id,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IQuizTeams>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      team_name,
      type_id,
      team_id,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['name', 'desc'], // 可根据实际表结构调整
    });
    if (keyWordWhere) {
      allWhere[Op.or] = keyWordWhere;
    }
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    if (rangTimeWhere) {
      allWhere[rangTimeType!] = rangTimeWhere;
    }
    const orderRes = handleOrder({ orderName, orderBy });
    const result = await quizTeamsModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: allWhere,
    });
    return handlePaging(result, nowpage, pagesize);
  }

  async findTeam(team_id: number | number[] | string) {
    let result;
    if (typeof team_id === 'number') {
      // 单个 team_id 查询
      result = await quizTeamsModel.findOne({ where: { team_id } });
    } else if (typeof team_id === 'string') {
      const teams = team_id.split(',');
      if (teams.length > 1) {
        result = await quizTeamsModel.findAll({
          where: { team_id: { [Op.in]: teams } },
        });
      } else {
        result = await quizTeamsModel.findOne({
          where: { team_id },
        });
      }
    } else {
      result = await quizMatchesModel.findAll({
        where: { team_id: { [Op.in]: team_id } },
      });
    }
    return result;
  }

  async updateTeam({ team_id, team_name, team_logo, type_id }: IQuizTeams) {
    const result = await quizTeamsModel.update(
      { team_name, team_logo, type_id },
      { where: { team_id } }
    );
    return result;
  }

  // 删除比赛队伍
  async deleteTeam(team_id: number) {
    const deletedRows = await quizTeamsModel.destroy({
      where: { team_id },
      limit: 1,
    });
    return deletedRows > 0;
  }

  // 创建赛季比赛
  async createQuizSeasons({
    season_name,
    start_date,
    end_date,
    quiz_match_type,
    contest_teams,
  }: IQuizSeasons) {
    const count = await quizSeasonsModel.create({
      season_name,
      start_date,
      quiz_match_type,
      end_date,
      contest_teams,
    });
    return count;
  }

  // 查询赛季比赛列表
  async getQuizSeasonsList({
    season_name,
    start_date,
    end_date,
    quiz_match_type,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
    isNotEnded = false,
  }: IList<IQuizSeasons & { isNotEnded?: boolean }>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      season_name,
      start_date,
      end_date,
      quiz_match_type,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['season_name'], // 可根据实际表结构调整
    });
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });

    let timeRangeCondition;
    if (rangTimeWhere) {
      const keyRange = [
        { start_date: rangTimeWhere },
        { end_date: rangTimeWhere },
      ];
      timeRangeCondition = {
        [Op.or]: keyRange,
      };
    }
    if (keyWordWhere) {
      allWhere[Op.and] = [
        ...(allWhere[Op.and] || []),
        {
          [Op.or]: keyWordWhere,
        },
      ];
    }
    if (timeRangeCondition) {
      allWhere[Op.and] = [...(allWhere[Op.and] || [])];
      allWhere[Op.and].push(timeRangeCondition);
    }

    // 如果需要查询未结束的赛季，则添加 end_date > 当前时间的条件
    if (isNotEnded) {
      const now = new Date();
      allWhere[Op.and] = [...(allWhere[Op.and] || [])];
      allWhere[Op.and].push({
        end_date: {
          [Op.gt]: now,
        },
      });
    }

    const orderRes = handleOrder({ orderName, orderBy });
    const result = await quizSeasonsModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: allWhere,
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /**
   * 获取未结束的赛季列表
   * @param type 比赛类型筛选条件
   * @returns 未结束的赛季列表，包含关联的比赛信息
   */
  async getQuizSeasonsPublicList(type: number): Promise<IQuizSeasons[]> {
    const orderRes: any[] = handleOrder({
      orderName: 'created_at',
      orderBy: 'desc',
    });
    const now = new Date(); // 获取当前时间
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    let matchWhere: any = {};
    switch (type) {
      case MATCH_LIST_TYPE.TODAY.id:
        matchWhere = {
          start_time: {
            [Op.gte]: startOfToday,
            [Op.lt]: startOfTomorrow,
          },
          status: {
            [Op.not]: QuizMatchStatus.completed,
          },
        };
        break;
      case MATCH_LIST_TYPE.ROLLING_BALL.id:
        matchWhere = {
          status: QuizMatchStatus.inProgress, // 假设 QuizMatchStatus.inProgress 表示比赛正在进行
        };
        break;
      case MATCH_LIST_TYPE.MORNING_SESSION.id:
        matchWhere = {
          start_time: {
            [Op.gte]: startOfTomorrow,
          },
        };
        break;
      default:
        break;
    }

    const result = await quizSeasonsModel.findAll({
      order: [...orderRes],
      where: {
        // 筛选出 end_date 大于当前时间的赛季
        end_date: { [Op.gt]: now },
      },
      // 关联查询比赛信息
      include: [
        {
          model: quizMatchesModel,
          as: 'match',
          foreignKey: 'season_id',
          required: false, // 设置为 false 实现左连接
          where: matchWhere,
          include: [
            {
              model: quizTeamsModel,
              // 假设关联字段为 team_id
              as: 'team1',
              foreignKey: 'team_id',
            },
            {
              model: quizTeamsModel,
              // 假设关联字段为 team_id2
              as: 'team2',
              foreignKey: 'team_id2',
            },
            {
              model: quizMatchVotesModel,
              // 假设关联字段为 win_team_id
              as: 'matchVotes',
              foreignKey: 'match_id',
              required: false, // 设置为 false 实现左连接
            },
          ],
        },
      ],
      logging: (sql) => {
        console.log(sql);
      },
    });
    return result;
  }

  async findQuizSeasons(season_id: number) {
    const result = await quizSeasonsModel.findOne({ where: { season_id } });
    return result;
  }

  async updateQuizSeasons({
    season_id,
    season_name,
    start_date,
    end_date,
    contest_teams,
    quiz_match_type,
  }: IQuizSeasons) {
    const result = await quizSeasonsModel.update(
      { season_name, start_date, end_date, quiz_match_type, contest_teams },
      { where: { season_id } }
    );
    return result;
  }

  // 删除赛季比赛
  async deleteQuizSeasons(season_id: number) {
    const deletedRows = await quizSeasonsModel.destroy({
      where: { season_id },
      limit: 1,
    });
    return deletedRows > 0;
  }

  // 创建比赛
  async createQuizMatches(info: IQuizMatches) {
    const count = await quizMatchesModel.create(info);
    return count;
  }

  async getQuizMatchesRoomList() {
    const orderRes: any[] = handleOrder({
      orderName: 'created_at',
      orderBy: 'desc',
    });

    const result = await quizMatchesModel.findAll({
      order: [...orderRes],
      where: {
        status: { [Op.in]: [0, 1] },
      },
      // 联查 quiz_teams 表
      include: [
        {
          model: quizTeamsModel,
          // 假设关联字段为 team_id
          as: 'team1',
          foreignKey: 'team_id',
        },
        {
          model: quizTeamsModel,
          // 假设关联字段为 team_id2
          as: 'team2',
          foreignKey: 'team_id2',
        },
        {
          model: quizTeamsModel,
          // 假设关联字段为 win_team_id
          as: 'winTeam',
          foreignKey: 'win_team_id',
        },
        {
          model: liveRoomModel,
          // 假设关联字段为 win_team_id
          as: 'liveRoom',
          foreignKey: 'live_room_id',
        },
      ],
    });
    return result;
  }

  async getQuizMatchesList({
    match_name,
    match_type,
    start_time,
    end_time,
    parent_match_id,
    season_id,
    type_id,
    team_id,
    team_id2,
    win_team_id,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IQuizMatches>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      match_name,
      match_type,
      start_time,
      end_time,
      parent_match_id,
      season_id,
      type_id,
      team_id,
      team_id2,
      win_team_id,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['match_name'], // 可根据实际表结构调整
    });

    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });

    let timeRangeCondition;
    if (rangTimeWhere) {
      const keyRange = [
        // 修正为表中的实际字段名
        { start_time: rangTimeWhere },
        { end_time: rangTimeWhere },
      ];
      timeRangeCondition = {
        [Op.or]: keyRange,
      };
    }
    if (keyWordWhere) {
      allWhere[Op.and] = [
        ...(allWhere[Op.and] || []),
        {
          [Op.or]: keyWordWhere,
        },
      ];
    }
    if (timeRangeCondition) {
      allWhere[Op.and] = [...(allWhere[Op.and] || [])];
      allWhere[Op.and].push(timeRangeCondition);
    }
    const orderRes = handleOrder({ orderName, orderBy });
    const result = await quizMatchesModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
      // 联查 quiz_teams 表
      include: [
        {
          model: quizTeamsModel,
          // 假设关联字段为 team_id
          as: 'team1',
          foreignKey: 'team_id',
        },
        {
          model: quizTeamsModel,
          // 假设关联字段为 team_id2
          as: 'team2',
          foreignKey: 'team_id2',
        },
        {
          model: quizTeamsModel,
          // 假设关联字段为 win_team_id
          as: 'winTeam',
          foreignKey: 'win_team_id',
        },
        {
          model: liveRoomModel,
          // 假设关联字段为 win_team_id
          as: 'liveRoom',
          foreignKey: 'live_room_id',
        },
        {
          model: quizSeasonsModel,
          as: 'seasons',
          foreignKey: 'season_id',
        },
      ],
    });
    return handlePaging(result, nowpage, pagesize);
  }

  async findQuizMatches(match_id: number | number[]) {
    let result;
    if (typeof match_id === 'number' || Number(match_id) > 0) {
      // 单个 team_id 查询
      result = await quizMatchesModel.findOne({
        where: { match_id },
        include: [
          {
            model: quizTeamsModel,
            // 假设关联字段为 team_id
            as: 'team1',
            foreignKey: 'team_id',
          },
          {
            model: quizTeamsModel,
            // 假设关联字段为 team_id2
            as: 'team2',
            foreignKey: 'team_id2',
          },
          {
            model: quizTeamsModel,
            // 假设关联字段为 win_team_id
            as: 'winTeam',
            foreignKey: 'win_team_id',
          },
          {
            model: quizMatchVotesModel,
            // 假设关联字段为 win_team_id
            as: 'matchVotes',
            foreignKey: 'match_id',
            separate: true,
          },
        ],
      });
    } else {
      result = await quizMatchesModel.findAll({
        where: { match_id: { [Op.in]: match_id } },
        include: [
          {
            model: quizTeamsModel,
            // 假设关联字段为 team_id
            as: 'team1',
            foreignKey: 'team_id',
          },
          {
            model: quizTeamsModel,
            // 假设关联字段为 team_id2
            as: 'team2',
            foreignKey: 'team_id2',
          },
          {
            model: quizTeamsModel,
            // 假设关联字段为 win_team_id
            as: 'winTeam',
            foreignKey: 'win_team_id',
          },
          {
            model: quizMatchVotesModel,
            // 假设关联字段为 win_team_id
            as: 'matchVotes',
            foreignKey: 'match_id',
            separate: true,
          },
        ],
      });
    }

    result.team1_odds = Number(result.team1_odds);
    result.team2_odds = Number(result.team2_odds);
    result.tax_rate = Number(result.tax_rate);
    // 多个 team_id 查询
    return result;
  }

  async updateQuizMatches({
    match_id,
    match_name,
    match_type,
    start_time,
    end_time,
    parent_match_id,
    team1_odds,
    team2_odds,
    status,
    season_id,
    type_id,
    description,
    team_id,
    team_id2,
    tax_rate,
    live_room_id,
    win_team_id,
    bureau_index,
  }: IQuizMatches) {
    const result = await quizMatchesModel.update(
      {
        match_name,
        match_type,
        start_time,
        description,
        end_time,
        parent_match_id,
        season_id,
        type_id,
        team_id,
        team_id2,
        team1_odds,
        team2_odds,
        status,
        tax_rate,
        live_room_id,
        win_team_id,
        bureau_index,
      },
      { where: { match_id } }
    );
    return result;
  }

  async settlementQuizMatches(matchId) {
    // 开启事务，确保操作的原子性
    // @ts-ignore
    const transaction: Transaction | null =
      await quizMatchesModel.sequelize?.transaction();
    try {
      // 查询比赛信息，关联查询quiz_matches_votes表
      const match: IQuizMatches | any = await quizMatchesModel.findOne({
        where: { match_id: matchId },
        include: [
          {
            model: quizMatchVotesModel,
            as: 'matchVotes',
            foreignKey: 'match_id',
            attributes: ['let_score_detail'],
            separate: true,
          },
        ],
        transaction,
      });
      if (!match) {
        throw new Error('未找到对应的比赛信息');
      }

      // 查询比赛进球信息
      const goalStats = await quizMatchGoalsModel.findAll({
        attributes: [
          'team_id',
          'bureau_index',
          [sequelize.fn('SUM', sequelize.col('goals_num')), 'total_goals'],
        ],
        where: { match_id: matchId },
        group: ['team_id', 'bureau_index'],
        transaction,
      });

      // 统计两队进球数
      const team1Id: number | undefined = match.team_id;
      const team2Id: number | undefined = match.team_id2;
      let team1Goal = 0;
      let team2Goal = 0;
      const team1BureauGoal = {};
      const team2BureauGoal = {};
      goalStats.forEach((stat) => {
        const teamId = stat.get('team_id');
        const totalGoals = stat.get('total_goals') as number;
        const bureau_index = stat.get('bureau_index') as number;
        if (teamId === team1Id) {
          team1Goal += totalGoals;
          team1BureauGoal[bureau_index] = totalGoals;
        } else if (teamId === team2Id) {
          team2Goal += totalGoals;
          team2BureauGoal[bureau_index] = totalGoals;
        }
      });

      // 查询该比赛的所有投票记录
      const votes: IQuizVotes[] = await quizVotesModel.findAll({
        where: { match_id: matchId },
        include: [
          {
            model: userModel,
            as: 'user',
            attributes: ['id', 'ancestors', 'parent_id'], // 只查询指定字段
            foreignKey: 'user_id',
          },
        ],
        transaction,
      });

      // 用于存储每个用户应返还的总金额
      const userReturnAmountMap: Record<number, number> = {};
      // 用于记录每个用户中代理与管理员的分成与亏损占比信息
      const userAgentInfoMap: Record<
        number,
        {
          agentUserId: any;
          agentAccountFor: number;
          ancestors: any;
          parentId: number;
          link_identifier: string;
        }[]
      > = {};

      // 按进球数判断胜负
      const team1Win = team1Goal > team2Goal;
      const team2Win = team2Goal > team1Goal;

      let hasAgent = false;
      // 遍历投票记录进行结算统计
      // eslint-disable-next-line no-restricted-syntax
      for (const vote of votes) {
        const {
          user_id,
          vote_index,
          bureau_index,
          votes_type,
          odds,
          vote_amount,
          handicap,
          base_score,
          maximum_differential,
          user,
        } = vote;
        // 判断是否存在代理
        hasAgent = false;
        if (user?.ancestors) {
          hasAgent = true;
          if (
            !Object.prototype.hasOwnProperty.call(userAgentInfoMap, user_id!)
          ) {
            const agentUserIdList = user.ancestors.split(',');
            // eslint-disable-next-line no-await-in-loop
            const agentUserList = await userModel.findAll({
              attributes: [
                'id',
                'agent_account_for',
                'ancestors',
                'parent_id',
                'link_identifier',
              ],
              where: {
                id: {
                  [Op.in]: agentUserIdList,
                },
              },
              include: [
                {
                  model: userRoleModel, // 假设 userRoleModel 已正确导入
                  attributes: ['role_id'],
                  where: {
                    // 这里可以根据实际需求修改 role_id 的查询条件，示例中查询 role_id 为 1 的用户
                    role_id: {
                      [Op.in]: [
                        DEFAULT_ROLE_INFO.SUPER_ADMIN.id,
                        DEFAULT_ROLE_INFO.ADMIN.id,
                      ],
                    },
                  },
                  required: true, // 使用 INNER JOIN
                },
              ],
              logging: (sql) => {
                console.log('执行的 SQL 语句:', sql);
              },
            });

            let agentFor;
            let nextAgentFor;
            for (let i = 0; i < agentUserList.length; i += 1) {
              if (i === 0) {
                userAgentInfoMap[user_id!] = [];
              }
              // 用于计算每个用户中代理与管理员的分成与亏损占比信息
              agentFor = agentUserList[i].agent_account_for;
              if (i + 1 >= agentUserList.length) {
                nextAgentFor = 0;
              } else {
                nextAgentFor = agentUserList[i + 1].agent_account_for;
              }

              userAgentInfoMap[user_id!].push({
                agentUserId: agentUserList[i].id,
                agentAccountFor: Number((agentFor - nextAgentFor).toFixed(2)),
                ancestors: agentUserList[i].ancestors,
                parentId: agentUserList[i].parent_id!,
                link_identifier: agentUserList[i].link_identifier!,
              });
            }
          }
        }

        let isCorrect: number;
        let isTeam1Win = false;
        let isTeam2Win = false;

        switch (votes_type) {
          // 判断输赢
          case QuizVoteType.winLoss:
            isTeam1Win = team1Win;
            isTeam2Win = team2Win;
            break;
          // 判断让球后胜负
          case QuizVoteType.letBall:
            if (vote_index === 1) {
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
              isTeam1Win = team1Goal + handicap > team2Goal;
            } else {
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
              isTeam2Win = team2Goal + handicap > team1Goal;
            }
            break;
          // 判断总进球/分数
          case QuizVoteType.gameNumber:
            if (vote_index === 1) {
              // @ts-ignore
              isTeam1Win = team1Goal + team2Goal > handicap;
            } else {
              // @ts-ignore
              isTeam2Win = team1Goal + team2Goal < handicap;
            }
            break;
          // 判断总局胜负：计算赢得的局数，考虑让局
          case QuizVoteType.overGameLetBall: {
            // 计算每局的胜负，然后统计总胜局数
            let team1WinCount = 0;
            let team2WinCount = 0;

            // 获取并处理let_score_detail数据，直接构建让球/让分映射
            const bureauLetScoreMap = new Map<
              number,
              { team1_fraction: number; team2_fraction: number }
            >();
            if (
              match?.matchVotes &&
              match.matchVotes.let_score_detail &&
              Array.isArray(match.matchVotes.let_score_detail)
            ) {
              match.matchVotes.let_score_detail.forEach((item) => {
                const bureauIndex = Number(item.bureau_index) || 0;
                if (bureauIndex > 0) {
                  // 只处理有效的局数
                  bureauLetScoreMap.set(bureauIndex, {
                    team1_fraction: Number(item.team1_fraction) || 0,
                    team2_fraction: Number(item.team2_fraction) || 0,
                  });
                }
              });
            }

            // 获取所有存在的局数索引并去重
            const allBureauIndexes = new Set<number>();
            Object.keys(team1BureauGoal).forEach((key) =>
              allBureauIndexes.add(Number(key))
            );
            Object.keys(team2BureauGoal).forEach((key) =>
              allBureauIndexes.add(Number(key))
            );

            // 遍历所有局数，判断每局的胜负，直接计数而不存储局数
            allBureauIndexes.forEach((bureauIndex) => {
              const team1Goals = Number(team1BureauGoal[bureauIndex]) || 0;
              const team2Goals = Number(team2BureauGoal[bureauIndex]) || 0;

              // 获取该局的让球/让分数据并应用
              const letScore = bureauLetScoreMap.get(bureauIndex);
              const adjustedTeam1Goals =
                team1Goals + (letScore?.team1_fraction || 0);
              const adjustedTeam2Goals =
                team2Goals + (letScore?.team2_fraction || 0);

              // 判断这一局的胜负并直接计数
              if (adjustedTeam1Goals > adjustedTeam2Goals) {
                team1WinCount += 1;
              } else if (adjustedTeam2Goals > adjustedTeam1Goals) {
                team2WinCount += 1;
              }
              // 平局不计入胜局
            });

            const handicapNum = Number(handicap) || 0;

            // 应用让局：正数给队伍1，负数给队伍2
            if (handicapNum > 0) {
              // 让局给队伍1
              team1WinCount += handicapNum;
            } else if (handicapNum < 0) {
              // 让局给队伍2
              team2WinCount += Math.abs(handicapNum);
            }

            // 判断最终胜负
            if (team1WinCount > team2WinCount) {
              // 队伍1赢得更多局
              isTeam1Win = true;
              isTeam2Win = false;
            } else if (team2WinCount > team1WinCount) {
              // 队伍2赢得更多局
              isTeam1Win = false;
              isTeam2Win = true;
            } else {
              // 让局后平局
              isTeam1Win = false;
              isTeam2Win = false;
            }
            break;
          }
          // 判断单局让球胜负：计算指定局的让球
          case QuizVoteType.bureauLetBall: {
            if (bureau_index !== undefined) {
              const team1BureauGoals =
                Number(team1BureauGoal[bureau_index]) || 0;
              const team2BureauGoals =
                Number(team2BureauGoal[bureau_index]) || 0;
              const handicapNum = Number(handicap) || 0;

              if (vote_index === 1) {
                isTeam1Win = team1BureauGoals + handicapNum > team2BureauGoals;
                isTeam2Win = team2BureauGoals > team1BureauGoals + handicapNum;
              } else {
                isTeam2Win = team2BureauGoals + handicapNum > team1BureauGoals;
                isTeam1Win = team1BureauGoals > team2BureauGoals + handicapNum;
              }
            } else {
              // 如果没有指定局数，按平局处理
              isTeam1Win = false;
              isTeam2Win = false;
            }
            break;
          }
          // 倍率购买：让分影响胜负，底分影响金额计算
          case QuizVoteType.oddPurchase: {
            let team1Goals: number;
            let team2Goals: number;
            const maxDiff = Number(maximum_differential) || 0; // 最大分差
            const handicapNum = Number(handicap) || 0; // 让分数值

            // 判断是否有局数
            if (bureau_index !== undefined) {
              // 有局数，只计算指定局
              team1Goals = Number(team1BureauGoal[bureau_index]) || 0;
              team2Goals = Number(team2BureauGoal[bureau_index]) || 0;
            } else {
              // 没有局数，计算总和
              team1Goals = Object.values(team1BureauGoal).reduce(
                (sum: number, goals) => sum + Number(goals),
                0
              );
              team2Goals = Object.values(team2BureauGoal).reduce(
                (sum: number, goals) => sum + Number(goals),
                0
              );
            }

            // 计算让分调整后的比分
            let adjustedTeam1Goals = team1Goals;
            let adjustedTeam2Goals = team2Goals;

            // 应用让分：正让分给队伍1，负让分给队伍2
            if (handicapNum !== 0) {
              if (vote_index === 1) {
                // 投队伍1，给队伍1加让分
                adjustedTeam1Goals = team1Goals + handicapNum;
              } else {
                // 投队伍2，给队伍2加让分
                adjustedTeam2Goals = team2Goals + handicapNum;
              }
            }

            // 计算让分后的分差
            const adjustedDiff = adjustedTeam1Goals - adjustedTeam2Goals;
            const actualDiff = team1Goals - team2Goals;

            // 检查是否超过最大分差限制（基于实际比分）

            // oddPurchase的胜负判断基于让分调整后的比分
            if (maxDiff > 0 && Math.abs(actualDiff) > maxDiff) {
              // 超过最大分差，按平局处理
              isTeam1Win = false;
              isTeam2Win = false;
            } else if (adjustedDiff > 0) {
              // 让分后队伍1赢
              isTeam1Win = true;
              isTeam2Win = false;
            } else if (adjustedDiff < 0) {
              // 让分后队伍2赢
              isTeam1Win = false;
              isTeam2Win = true;
            } else {
              // 让分后平局
              isTeam1Win = false;
              isTeam2Win = false;
            }
            break;
          }
          default:
            break;
        }
        // 判断投票是主场队伍还是客场队伍
        if (vote_index === 1) {
          if (isTeam1Win) {
            isCorrect = VoteResult.win;
          } else if (isTeam2Win) {
            isCorrect = VoteResult.lose;
          } else {
            isCorrect = VoteResult.draw;
          }
        } else if (isTeam2Win) {
          isCorrect = VoteResult.win;
        } else if (isTeam1Win) {
          isCorrect = VoteResult.lose;
        } else {
          isCorrect = VoteResult.draw;
        }

        // 判断投票是否投中
        // 给投票用户净利润/代理商需要获取和扣除的金额
        let prizeWinner = 0;
        // 给投票用户结算的金额
        let returnAmount = 0;

        // 统一金额计算逻辑
        const taxRate = Number(match.tax_rate) || 0; // 使用比赛的实际税率

        // oddPurchase类型直接使用votes表中的odds作为赔率
        // 其他类型使用match中的赔率（但match中的赔率已废弃，这里需要处理）
        const oddsNum = Number(odds);

        // 统一金额计算
        switch (isCorrect) {
          case VoteResult.win:
            if (votes_type === QuizVoteType.oddPurchase) {
              // oddPurchase：让分影响胜负，底分+实际分差计算金额
              let team1Goals: number;
              let team2Goals: number;

              if (bureau_index !== undefined) {
                team1Goals = Number(team1BureauGoal[bureau_index]) || 0;
                team2Goals = Number(team2BureauGoal[bureau_index]) || 0;
              } else {
                team1Goals = team1Goal;
                team2Goals = team2Goal;
              }

              // 金额计算基于实际分差 + 底分，不受让分影响
              const actualScoreDiff = Math.abs(team1Goals - team2Goals);
              const finalMultiplier =
                (actualScoreDiff + Number(base_score)) * oddsNum;

              const winAmount = Number(vote_amount) * finalMultiplier;
              prizeWinner = winAmount - winAmount * taxRate;
            } else {
              // 其他类型：标准赔率计算
              prizeWinner = Number(
                (Number(vote_amount) * (oddsNum - 1)).toFixed(2)
              );
            }
            returnAmount = Number(vote_amount) + Number(prizeWinner);
            break;
          case VoteResult.lose:
            // 输：扣除全部投注金额
            prizeWinner = -Number(vote_amount);
            returnAmount = 0;
            break;
          case VoteResult.draw:
            // 平：退还全部投注金额
            prizeWinner = 0;
            returnAmount = Number(vote_amount);
            break;
          default:
            break;
        }

        // 累加用户应返还的总金额
        userReturnAmountMap[user_id!] =
          (userReturnAmountMap[user_id!] || 0) + returnAmount;

        // 处理代理分账
        if (isCorrect === VoteResult.win || isCorrect === VoteResult.lose) {
          const actualPrize = prizeWinner;

          if (hasAgent) {
            let parentDividedInto = 0;
            for (
              let index = 0;
              index < userAgentInfoMap[user_id!].length;
              index += 1
            ) {
              const item = userAgentInfoMap[user_id!][index];
              const agentAmount =
                isCorrect === VoteResult.win
                  ? -(actualPrize * item.agentAccountFor).toFixed(2)
                  : Number(
                      (Math.abs(actualPrize) * item.agentAccountFor).toFixed(2)
                    );

              // eslint-disable-next-line no-await-in-loop
              await this.createPayoutAndUpdateStatistics(
                {
                  vote_id: vote.vote_id,
                  payout_amount: agentAmount,
                  payouts_user_id: item.agentUserId,
                  type: 1,
                  ancestors: item.ancestors,
                  profit_ratio: item.agentAccountFor,
                  parent_id: item.parentId,
                },
                {
                  parent_divided_into: parentDividedInto,
                  amount_flow: vote_amount,
                  amount_actual_flow: vote_amount,
                  lower_level_actual_flow: vote_amount,
                  lower_level_flow: vote_amount,
                  lower_level_settlement_flow: prizeWinner,
                  link_identifier: item.link_identifier, // 为非admin用户添加link_identifier
                }
              );
              parentDividedInto += agentAmount;
            }
          } else {
            // eslint-disable-next-line no-await-in-loop
            await this.createPayoutAndUpdateStatistics(
              {
                vote_id: vote.vote_id,
                payout_amount: Math.abs(actualPrize),
                payouts_user_id: 1,
                ancestors: '1',
                profit_ratio: 1,
                parent_id: -1,
              },
              {
                amount_flow: vote_amount,
                amount_actual_flow: vote_amount,
                lower_level_actual_flow: vote_amount,
                lower_level_flow: vote_amount,
                lower_level_settlement_flow: prizeWinner,
              }
            );
          }
        } else if (isCorrect === VoteResult.draw) {
          // 平局退还金额，不记账
          userReturnAmountMap[user_id!] =
            (userReturnAmountMap[user_id!] || 0) + Number(vote_amount);

          if (hasAgent) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of userAgentInfoMap[user_id!]) {
              // eslint-disable-next-line no-await-in-loop
              await this.createPayoutAndUpdateStatistics(
                {
                  vote_id: vote.vote_id,
                  payouts_user_id: item.agentUserId,
                  ancestors: item.ancestors,
                  profit_ratio: item.agentAccountFor,
                  parent_id: item.parentId,
                  payout_amount: 0,
                },
                {
                  amount_flow: vote_amount,
                  amount_actual_flow: vote_amount,
                  lower_level_actual_flow: vote_amount,
                  lower_level_flow: vote_amount,
                  lower_level_settlement_flow: 0,
                  link_identifier: item.link_identifier, // 为非admin用户添加link_identifier
                }
              );
            }
          } else {
            // eslint-disable-next-line no-await-in-loop
            await this.createPayoutAndUpdateStatistics(
              {
                vote_id: vote.vote_id,
                payouts_user_id: 1,
                ancestors: '1',
                profit_ratio: 1,
                parent_id: -1,
                payout_amount: 0,
              },
              {
                amount_flow: vote_amount,
                amount_actual_flow: 0,
                lower_level_actual_flow: 0,
                lower_level_flow: vote_amount,
                lower_level_settlement_flow: 0,
              }
            );
          }
        }

        // 更新投票记录
        quizVotesModel.update(
          {
            prize_winner: isCorrect,
            result_amount: returnAmount,
            net_profit_amount: prizeWinner,
          },
          { where: { vote_id: vote.vote_id }, transaction }
        );
      }

      // 批量更新用户钱包余额
      // @ts-ignore
      const updatePromises: Promise<[number, IWallet[]]>[] = Object.entries(
        userReturnAmountMap
      ).map(([userId, amount]) => {
        return walletModel.increment('balance', {
          by: amount,
          where: { user_id: parseInt(userId, 10) },
          transaction,
        });
      });
      await Promise.all(updatePromises);

      if (team1Win) {
        // 更新比赛表的结算状态
        await quizMatchesModel.update(
          { status: QuizMatchStatus.completed, win_team_id: team1Id },
          { where: { match_id: matchId }, transaction }
        );
      } else if (team2Win) {
        // 更新比赛表的结算状态
        await quizMatchesModel
          .update(
            { status: QuizMatchStatus.completed, win_team_id: team2Id },
            { where: { match_id: matchId }, transaction }
          )
          .catch((error) => {
            console.log(error);
          });
      } else {
        // 更新比赛表的结算状态
        await quizMatchesModel.update(
          { status: QuizMatchStatus.completed },
          { where: { match_id: matchId }, transaction }
        );
      }

      // 提交事务
      await transaction?.commit();
      return true;
    } catch (error) {
      // 发生错误，回滚事务
      await transaction?.rollback();
      throw error;
    }
  }

  async createQuizMatchGoal(info: IQuizMatchGoals) {
    const count = await quizMatchGoalsModel.create(info);
    return count;
  }

  async getQuizMatchGoalsList({
    match_id,
    team_id,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    bureau_index,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IQuizMatchGoals>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      match_id,
      team_id,
      bureau_index,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['match_id'], // 可根据实际表结构调整
    });
    const rangTimeWhere = {};
    if (rangTimeStart) {
      rangTimeWhere[Op.gt] = new Date(rangTimeStart);
    }
    if (rangTimeEnd) {
      rangTimeWhere[Op.lt] = new Date(rangTimeEnd);
    }
    if (keyWordWhere) {
      allWhere[Op.and] = [
        ...(allWhere[Op.and] || []),
        {
          [Op.or]: keyWordWhere,
        },
      ];
    }
    if (Object.keys(rangTimeWhere).length > 0) {
      allWhere[rangTimeType!] = rangTimeWhere;
    }
    const orderRes = handleOrder({ orderName, orderBy });
    const result = await quizMatchGoalsModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
      logging: (sql) => {
        console.log(sql);
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  async deleteQuizMatchGoal(goal_id: number) {
    const result = await quizMatchGoalsModel.destroy({
      where: {
        goal_id,
      },
    });
    return result;
  }

  async updateQuizMatchesGoal(info: IQuizMatchGoals) {
    const result = await quizMatchGoalsModel.update(info, {
      where: {
        goal_id: info.goal_id,
      },
    });
    return result;
  }

  async getQuizVotesList({
    user_id,
    match_id,
    vote_index,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IQuizVotes>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      match_id,
      vote_index,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['match_id'], // 可根据实际表结构调整
    });
    const rangTimeWhere = {};
    let isRangTime = false;
    if (rangTimeStart) {
      rangTimeWhere[Op.gt] = new Date(rangTimeStart);
      isRangTime = true;
    }
    if (rangTimeEnd) {
      rangTimeWhere[Op.lt] = new Date(rangTimeEnd);
      isRangTime = true;
    }
    if (user_id) {
      allWhere[Op.and] = [{ user_id }];
    }

    if (keyWordWhere) {
      allWhere[Op.and] = [
        ...(allWhere[Op.and] || []),
        {
          [Op.or]: keyWordWhere,
        },
      ];
    }
    if (isRangTime) {
      const rangTimeWhereNew = {};
      rangTimeWhereNew[rangTimeType!] = rangTimeWhere;
      allWhere[Op.and] = [...(allWhere[Op.and] || []), rangTimeWhereNew];
    }
    const orderRes = handleOrder({ orderName, orderBy });
    const result = await quizVotesModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
      include: [
        {
          model: quizMatchesModel,
          // 假设关联字段为 team_id
          as: 'match',
          foreignKey: 'match_id',
          include: [
            {
              model: quizTeamsModel,
              // 假设关联字段为 team_id
              as: 'team1',
              foreignKey: 'team_id',
            },
            {
              model: quizTeamsModel,
              // 假设关联字段为 team_id
              as: 'team2',
              foreignKey: 'team_id2',
            },
          ],
          attributes: [
            'match_name',
            'win_team_id',
            'team_id2',
            'team_id',
            'status',
            //         [
            //           sequelize.literal(`
            //   (select sum(goals_num)
            //    from quiz_match_goals
            //    where quiz_match_goals.deleted_at is Null and quiz_match_goals.match_id = \`match\`.match_id and quiz_match_goals.team_id = \`match\`.team_id)
            // `),
            //           'team1_goals',
            //         ],
            //         [
            //           sequelize.literal(`
            //   (select sum(goals_num)
            //    from quiz_match_goals
            //    where quiz_match_goals.deleted_at is Null and quiz_match_goals.match_id = \`match\`.match_id and quiz_match_goals.team_id = \`match\`.team_id2)
            // `),
            //           'team2_goals',
            //         ],
            [
              sequelize.literal(`
      (select sum(goals_num)
       from quiz_match_goals
       where quiz_match_goals.deleted_at is Null and quiz_match_goals.match_id = \`match\`.match_id and quiz_match_goals.team_id = \`match\`.team_id and quiz_match_goals.bureau_index = quiz_votes.bureau_index)
    `),
              'team1_goals',
            ],
            [
              sequelize.literal(`
      (select sum(goals_num)
       from quiz_match_goals
       where quiz_match_goals.deleted_at is Null and quiz_match_goals.match_id = \`match\`.match_id and quiz_match_goals.team_id = \`match\`.team_id2 and quiz_match_goals.bureau_index = quiz_votes.bureau_index)
    `),
              'team2_goals',
            ],
          ],
        },
      ],
      logging: (sql) => {
        console.log(sql);
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  async getQuizVotesStatistics(data) {
    const rangTimeWhere = {};
    let isRangTime = false;
    const allWhere: any = deleteUseLessObjectKey({
      user_id: data.user_id,
    });
    if (data.rangTimeStart) {
      const date = new Date(Number(data.rangTimeStart));
      rangTimeWhere[Op.gt] = date;
      isRangTime = true;
    }
    if (data.rangTimeEnd) {
      const date = new Date(Number(data.rangTimeEnd));
      rangTimeWhere[Op.lt] = date;
      isRangTime = true;
    }
    if (isRangTime) {
      const rangTimeWhereNew = {
        created_at: rangTimeWhere,
      };
      allWhere[Op.and] = [...(allWhere[Op.and] || []), rangTimeWhereNew];
    }

    const statistics = await quizVotesModel.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('vote_amount')), 'total_amount'], // 总流水
        [sequelize.fn('COUNT', 1), 'total_count'], // 总单数
        [
          sequelize.fn('SUM', sequelize.col('net_profit_amount')),
          'total_profit',
        ], // 总盈利
      ],
      where: allWhere,
      logging: (sql) => {
        console.log(sql);
      },
      raw: true, // 返回原始数据类型，避免Sequelize实例包装
    });

    // 处理空值情况，确保返回数字类型
    return statistics;
  }

  async createQuizVotes(info: IQuizVotes) {
    const generatedId = snowflake.generate();
    // 将生成的 ID 赋值给 info 对象
    const newInfo = { ...info, vote_id: generatedId };
    const count = await quizVotesModel.create(newInfo);
    return count;
  }

  async findQuizVotes(vote_id: number) {
    const result = await quizVotesModel
      .findOne({
        where: { vote_id },
        include: [
          {
            model: userModel,
            as: 'user',
            attributes: ['username', 'id'],
            foreignKey: 'user_id',
          },
          {
            model: quizPayoutsModel,
            as: 'payouts',
            foreignKey: 'vote_id',
            include: [
              {
                model: userModel,
                as: 'user',
                attributes: ['username', 'id'],
                foreignKey: 'payouts_user_id',
              },
            ],
          },
          {
            model: quizMatchesModel,
            as: 'match',
            foreignKey: 'match_id',
            include: [
              {
                model: quizTeamsModel,
                // 假设关联字段为 team_id
                as: 'team1',
                foreignKey: 'team_id',
              },
              {
                model: quizTeamsModel,
                // 假设关联字段为 team_id
                as: 'team2',
                foreignKey: 'team_id2',
              },
            ],
            attributes: [
              'match_name',
              'win_team_id',
              'team_id2',
              'team_id',
              'status',
              [
                sequelize.literal(`
      (select sum(goals_num)
       from quiz_match_goals
       where quiz_match_goals.match_id = \`match\`.match_id and quiz_match_goals.team_id = \`match\`.team_id)
    `),
                'team1_goals',
              ],
              [
                sequelize.literal(`
      (select sum(goals_num)
       from quiz_match_goals
       where quiz_match_goals.match_id = \`match\`.match_id and quiz_match_goals.team_id = \`match\`.team_id2)
    `),
                'team2_goals',
              ],
            ],
          },
          {
            // 使用新定义的关联
            model: userModel,
            as: 'parentUser',
            attributes: ['username', 'id', 'agent_account_for'],
            foreignKey: 'user_id',
          },
        ],
        logging: (sql) => {
          console.log('sql', sql);
        },
      })
      .catch((err) => {
        console.log(err);
      });
    return result;
  }

  async createQuizMatchVotes(info: IQuizMatchVotes) {
    const newInfo = { ...info };
    if (newInfo.id) {
      newInfo.id = undefined;
    }
    const count = await quizMatchVotesModel.create(newInfo);
    return count;
  }

  async getQuizMatchVotesList({
    match_id,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IQuizMatchVotes>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      match_id,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['match_id'], // 可根据实际表结构调整
    });
    const rangTimeWhere = {};
    if (rangTimeStart) {
      rangTimeWhere[Op.gt] = new Date(rangTimeStart);
    }
    if (rangTimeEnd) {
      rangTimeWhere[Op.lt] = new Date(rangTimeEnd);
    }
    if (match_id) {
      allWhere[Op.and] = [{ match_id }];
    }

    if (keyWordWhere) {
      allWhere[Op.and] = [
        ...(allWhere[Op.and] || []),
        {
          [Op.or]: keyWordWhere,
        },
      ];
    }
    if (Object.keys(rangTimeWhere).length > 0) {
      allWhere[rangTimeType!] = rangTimeWhere;
    }
    const orderRes = handleOrder({ orderName, orderBy });

    const result = await quizMatchVotesModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });

    return handlePaging(result, nowpage, pagesize);
  }

  async findQuizMatchVotes(id) {
    const result = await quizMatchVotesModel.findOne({ where: { id } });
    return result;
  }

  async lockQuizMatchVotes(info: IQuizMatchVotes) {
    const count = await quizMatchVotesModel.update(
      { is_lock: info.is_lock },
      {
        where: { match_id: info.match_id },
      }
    );
    return count;
  }

  async updateQuizMatchVotes(info: IQuizMatchVotes) {
    const count = await quizMatchVotesModel.update(info, {
      where: { id: info.id },
    });
    return count;
  }

  async getQuizPayoutsList(
    {
      vote_id,
      payouts_user_id,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      orderBy,
      orderName,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IQuizPayouts>,
    userId
  ) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      vote_id,
      payouts_user_id,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['vote_id'], // 可根据实际表结构调整
    });
    const rangTimeWhere = {};
    if (rangTimeStart) {
      rangTimeWhere[Op.gt] = new Date(rangTimeStart);
    }
    if (rangTimeEnd) {
      rangTimeWhere[Op.lt] = new Date(rangTimeEnd);
    }
    if (keyWordWhere) {
      allWhere[Op.and] = [
        ...(allWhere[Op.and] || []),
        {
          [Op.or]: keyWordWhere,
        },
      ];
    }
    if (Object.keys(rangTimeWhere).length > 0) {
      allWhere[rangTimeType!] = rangTimeWhere;
    }
    const orderRes = handleOrder({ orderName, orderBy });
    const result = await quizPayoutsModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: buildPermissionWhere(allWhere, userId),
      include: [
        {
          model: userModel,
          as: 'user',
          attributes: ['username', 'avatar', 'agent_account_for'],
          foreignKey: 'payouts_user_id',
        },
      ],
    });
    return handlePaging(result, nowpage, pagesize);
  }

  async getQuizPayoutsStatistics(
    {
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      parent_id,
      payouts_user_id,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IQuizPayouts>,
    userId: any
  ) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id: payouts_user_id,
      parent_id,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['username'], // 可根据实际表结构调整
    });
    const rangTimeWhere = {};
    if (rangTimeStart) {
      rangTimeWhere[Op.gt] = new Date(rangTimeStart);
    }
    if (rangTimeEnd) {
      rangTimeWhere[Op.lt] = new Date(rangTimeEnd);
    }
    if (keyWordWhere) {
      allWhere[Op.and] = [
        ...(allWhere[Op.and] || []),
        {
          [Op.or]: keyWordWhere,
        },
      ];
    }
    if (Object.keys(rangTimeWhere).length > 0) {
      allWhere[rangTimeType!] = rangTimeWhere;
    }
    const userPayoutAmountSubquery = sequelize.literal(`
      (select sum(payout_amount)
       from quiz_payouts
       where user.parent_id = payouts_user_id
         and vote_id in (select vote_id
                         from quiz_payouts
                         where user.id = payouts_user_id))
    `);

    const agentPayoutAmountSubquery = sequelize.literal(`
      (select sum(payout_amount)
       from quiz_payouts
       where user.id = payouts_user_id)
    `);

    const agentVipVoteCountSubquery = sequelize.literal(`
      (select count(1)
       from quiz_votes
       where child_user.id = quiz_votes.user_id
         and child_user.is_agent != true)
    `);

    const agentVipVoteBetSubquery = sequelize.literal(`
      (select sum(vote_amount)
       from quiz_votes
       where child_user.id = quiz_votes.user_id
         and child_user.is_agent != true)
    `);

    const agentVipVoteBetEffectiveSubquery = sequelize.literal(`
      (select sum(vote_amount)
       from quiz_votes
       where child_user.id = quiz_votes.user_id
         and child_user.is_agent != true
         and prize_winner != 2)
    `);

    const permissionWhere = buildPermissionWhere(allWhere, userId);

    // @ts-ignore
    const { count, rows } = await userModel
      .findAndCountAll({
        attributes: [
          'id',
          'username',
          'agent_account_for',
          'is_agent',
          [userPayoutAmountSubquery, 'user_payout_amount'],
          [agentPayoutAmountSubquery, 'agent_payout_amount'],
          [agentVipVoteCountSubquery, 'agent_vip_vote_count'],
          [agentVipVoteBetSubquery, 'agent_vip_vote_bet'],
          [agentVipVoteBetEffectiveSubquery, 'agent_vip_vote_bet_effective'],
        ],
        include: [
          {
            model: userModel,
            as: 'child_user',
            attributes: [],
            required: false,
          },
        ],
        where: permissionWhere,
        limit,
        offset,
        subQuery: false,
        logging: (sql) => {
          console.log(sql);
        },
      })
      .catch((err) => {
        console.log(err);
      });

    return {
      list: rows.map((row) => row.get({ plain: true })),
      total: count,
      nowPage: nowpage,
      pageSize: pagesize,
    };
  }

  async findQuizPayouts(payout_id: number) {
    const result = await quizPayoutsModel.findOne({
      where: { payout_id },
      include: [
        {
          model: userModel,
          as: 'user',
          foreignKey: 'payouts_user_id',
        },
      ],
    });
    return result;
  }

  /**
   * 创建分账记录并更新统计数据（事务联动）
   * @param payoutData 分账数据
   * @param statisticsOptions 统计数据的可选配置（自动从payoutData提取user_id和amount_result字段）
   */
  async createPayoutAndUpdateStatistics(
    payoutData: Omit<IQuizPayouts, 'created_at' | 'updated_at' | 'deleted_at'>,
    statisticsOptions?: Partial<
      Omit<
        IQuizPayoutsStatistics,
        'user_id' | 'amount_result' | 'created_at' | 'updated_at' | 'deleted_at'
      >
    >
  ) {
    // 使用事务确保两个操作的联动性
    // const result = await sequelize.transaction(async (transaction) => {
    //   // 1. 创建分账记录
    //   await quizPayoutsModel.create(payoutData, { transaction });
    //
    //   // 2. 构建统计数据 - 自动从分账数据中提取公共字段
    //   const statisticsData: IQuizPayoutsStatistics = {
    //     user_id: payoutData.payouts_user_id,
    //     amount_result: Number(payoutData.payout_amount),
    //     ...statisticsOptions,
    //   };
    //
    //   // 3. 更新统计数据
    //   await quizPayoutsStatisticsService.changeAmountStatisticsByUserId(
    //     statisticsData
    //   );
    // });

    let result: any = null;

    // 构建基础统计数据 - 确保所有必需参数都有值
    const baseStatisticsData: IQuizPayoutsStatistics = {
      user_id: payoutData.payouts_user_id,
      amount_result: Number(payoutData.payout_amount) || 0, // 确保不会是NaN
      ancestors: payoutData.ancestors, // 确保ancestors有值
      parent_user_id: payoutData.parent_id || -1, // 当parent_id为null时，设置为-1
      link_identifier: statisticsOptions?.link_identifier || '', // 确保link_identifier有值
      ...statisticsOptions,
    };

    // 1. 创建分账记录
    if (payoutData.payout_amount || payoutData.payout_amount === 0) {
      await quizPayoutsModel.create(payoutData);

      // 有真实结算金额的情况 - 使用传入的flow参数
      const statisticsData = {
        ...baseStatisticsData,
        amount_flow: statisticsOptions?.amount_flow,
        lower_level_flow: statisticsOptions?.lower_level_flow,
      };

      result =
        await quizPayoutsStatisticsService.changeAmountStatisticsByUserId(
          statisticsData
        );
    } else {
      // 没有真实结算金额的情况 - 只记录非真实金额流水的数据
      const statisticsData = {
        ...baseStatisticsData,
        // 确保金额相关字段为0，不影响真实统计数据
        amount_actual_flow: 0,
        lower_level_settlement_flow: 0,
        lower_level_actual_flow: 0,
      };

      // 仍然调用方法记录非金额相关数据，但金额相关字段都为0
      result =
        await quizPayoutsStatisticsService.changeAmountStatisticsByUserId(
          statisticsData
        );
    }

    return result;
  }
}

// @ts-ignore
export default new QuizService();
