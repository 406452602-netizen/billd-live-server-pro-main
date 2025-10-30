import { ParameterizedContext } from 'koa';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
import { IList } from '@/interface';
// import quizVotesModel from '@/model/quizVotes.model';
import { CustomError } from '@/model/customError.model';
import walletModel from '@/model/wallet.model';
import quizService from '@/service/quiz.service';
import quizPayoutsStatisticsService from '@/service/quizPayoutsStatistics.service';
import walletService from '@/service/wallet.service';
import {
  IQuizMatches,
  IQuizMatchGoals,
  IQuizMatchTypes,
  IQuizMatchVotes,
  IQuizSeasons,
  IQuizTeams,
  IQuizVotes,
} from '@/types/IQuiz';
import { IUser } from '@/types/IUser';

class QuizLiveStreamsController {
  // 创建比赛类型
  createMatchType(ctx: ParameterizedContext) {
    const { type_name }: IList<IQuizMatchTypes> = ctx.request.body;
    const user: IUser = ctx.state.userInfo;
    const { ancestors } = user;
    quizService
      .createMatchType({ type_name, ancestors })
      .catch((err) => console.log(err));
    // @ts-ignore
    return successHandler({
      ctx,
    });
  }

  findMatchType = async (ctx: ParameterizedContext, next) => {
    const { id }: IList<IQuizMatchTypes> = ctx.params;
    const result = await quizService.findMatchType(id!);
    successHandler({ ctx, data: result });
    await next();
  };

  updateMatchType = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const { type_name }: IQuizMatchTypes = ctx.request.body;
    const result = await quizService.updateMatchType({ id, type_name });
    successHandler({ ctx, data: result });
    await next();
  };

  getMatchTypeList = async (ctx: ParameterizedContext, next) => {
    const {
      id,
      type_name,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IQuizMatchTypes> = ctx.request.body;
    const result = await quizService.getListMatchTypes({
      id,
      type_name,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    successHandler({ ctx, data: result });
    await next();
  };

  deleteMatchType = async (ctx: ParameterizedContext, next) => {
    const { id }: IList<IQuizMatchTypes> = ctx.params;
    const result = await quizService.deleteMatchType(id!);
    successHandler({ ctx, data: result });
    await next();
  };

  // 创建比赛队伍
  createTeam = async (ctx: ParameterizedContext) => {
    const { body } = ctx.request;
    body.ancestors = ctx.state.userInfo.ancestors;
    const info = await quizService.createTeam(body).catch((err) => {
      console.log(err);
    });
    return successHandler({
      ctx,
      data: info,
    });
  };

  findTeam = async (ctx: ParameterizedContext, next) => {
    const { team_id }: IList<IQuizTeams> = ctx.params;
    const result = await quizService.findTeam(team_id!);
    successHandler({ ctx, data: result });
    await next();
  };

  updateTeam = async (ctx: ParameterizedContext, next) => {
    const team_id = +ctx.params.season_id;
    const { type_id, team_name, team_logo }: IQuizTeams = ctx.request.body;
    const result = await quizService.updateTeam({
      team_id,
      team_name,
      team_logo,
      type_id,
    });
    successHandler({ ctx, data: result });
    await next();
  };

  getTeamList = async (ctx: ParameterizedContext, next) => {
    const { body } = ctx.request;
    const result = await quizService.getTeamList(body);
    return successHandler({
      ctx,
      data: result,
    });
    await next();
  };

  deleteTeam = async (ctx: ParameterizedContext, next) => {
    const { id }: IList<IQuizMatchTypes> = ctx.params;
    const result = await quizService.deleteTeam(id!);
    successHandler({ ctx, data: result });
    await next();
  };

  // 创建赛季比赛
  createQuizSeasons = async (ctx: ParameterizedContext, next) => {
    const { body } = ctx.request;
    body.ancestors = ctx.state.userInfo.ancestors;
    const result = await quizService.createQuizSeasons(body).catch((er) => {
      console.log('err', er);
    });
    return successHandler({
      ctx,
      data: result,
    });
    await next();
  };

  getQuizSeasonsList = async (ctx: ParameterizedContext, next) => {
    const { body } = ctx.request;
    const result = await quizService.getQuizSeasonsList(body);
    return successHandler({
      ctx,
      data: result,
    });
    await next();
  };

  getQuizSeasonsPublicList = async (ctx: ParameterizedContext, next) => {
    const type = +ctx.params.listType;
    const result = await quizService.getQuizSeasonsPublicList(type);
    return successHandler({
      ctx,
      data: result,
    });
    await next();
  };

  findQuizSeasons = async (ctx: ParameterizedContext, next) => {
    const { season_id }: IList<IQuizSeasons> = ctx.params;
    const result = await quizService.findQuizSeasons(season_id!);
    successHandler({ ctx, data: result });
    await next();
  };

  updateQuizSeasons = async (ctx: ParameterizedContext, next) => {
    const season_id = +ctx.params.season_id;
    const {
      season_name,
      start_date,
      end_date,
      contest_teams,
      quiz_match_type,
    }: IQuizSeasons = ctx.request.body;
    const result = await quizService.updateQuizSeasons({
      season_id,
      season_name,
      start_date,
      end_date,
      contest_teams,
      quiz_match_type,
    });
    successHandler({ ctx, data: result });
    await next();
  };

  // 创建比赛
  createQuizMatches = async (ctx: ParameterizedContext, next) => {
    const { body } = ctx.request;
    const submitData = { ...body };
    submitData.start_time = body.rangTime?.[0];
    submitData.end_time = body.rangTime?.[1];
    const result = await quizService.createQuizMatches(submitData);
    return successHandler({
      ctx,
      data: result,
    });
    await next();
  };

  // 查询比赛
  getQuizMatchesList = async (ctx: ParameterizedContext, next) => {
    const { body } = ctx.request;
    const result = await quizService.getQuizMatchesList(body);
    successHandler({
      ctx,
      data: result,
    });
    await next();
  };

  getQuizMatchesRoomList = async (ctx: ParameterizedContext, next) => {
    const result = await quizService.getQuizMatchesRoomList();
    successHandler({
      ctx,
      data: result,
    });
    await next();
  };

  findQuizMatches = async (ctx: ParameterizedContext, next) => {
    const { match_id } = ctx.params;
    const result = await quizService.findQuizMatches(match_id);
    successHandler({ ctx, data: result });
    await next();
  };

  // eslint-disable-next-line consistent-return
  updateQuizMatches = async (ctx: ParameterizedContext, next) => {
    // const match_id = +ctx.params.match_id;
    const { body } = ctx.request;
    const info: IQuizMatches = { ...body };
    // const votesList = await quizVotesModel.findAll({
    //   where: {
    //     match_id: info.match_id,
    //   },
    // });
    // if (votesList.length > 0) {
    //   return successHandler({
    //     ctx,
    //     code: 500,
    //     data: {
    //       message: '该比赛已经开始投票，无法修改',
    //     },
    //   });
    // }
    info.start_time = body.rangTime?.[0];
    info.end_time = body.rangTime?.[1];
    const result = await quizService.updateQuizMatches(info);
    successHandler({ ctx, data: result });
    await next();
  };

  settlementQuizMatches = async (ctx: ParameterizedContext, next) => {
    const { match_id } = ctx.params;
    const result = await quizService.settlementQuizMatches(match_id);

    successHandler({ ctx, data: result });
    await next();
  };

  async createQuizMatchGoal(ctx: ParameterizedContext, next) {
    const goalData: IQuizMatchGoals = ctx.request.body;
    const result = await quizService.createQuizMatchGoal(goalData);
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  // 根据 match_id 查询比赛进球记录
  async getQuizMatchGoalsList(ctx: ParameterizedContext, next) {
    const { body } = ctx.request;
    const result = await quizService.getQuizMatchGoalsList(body);
    ctx.body = {
      code: 200,
      message: '比赛进球记录查询成功',
      data: result,
    };
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async deleteQuizMatchGoal(ctx: ParameterizedContext, next) {
    const { id } = ctx.params;
    const result = await quizService.deleteQuizMatchGoal(id);
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async updateQuizMatchesGoal(ctx: ParameterizedContext, next) {
    const { body } = ctx.request;
    const result = await quizService.updateQuizMatchesGoal(body);
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async getQuizVotesList(ctx: ParameterizedContext, next) {
    const { body } = ctx.request;
    const result = await quizService.getQuizVotesList(body);
    ctx.body = {
      code: 200,
      message: '比赛投票记录查询成功',
      data: result,
    };
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async getQuizVotesStatistics(ctx: ParameterizedContext, next) {
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const data: IList<IQuizVotes> = ctx.request.query;
    data.user_id = userInfo?.id;
    const result = await quizService.getQuizVotesStatistics(data);
    ctx.body = {
      code: 200,
      message: '比赛投票记录查询成功',
      data: result,
    };
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async createQuizVotes(ctx: ParameterizedContext, next) {
    const { body } = ctx.request;

    const wallet: any = await walletService.findByUserId(body.user_id);
    if (!wallet) {
      throw new CustomError({
        msg: '用户钱包不存在',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const remain = wallet.balance - body.vote_amount;
    // @ts-ignore
    if (remain < 0) {
      throw new CustomError({
        msg: '用户余额不足',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await walletModel.update(
      { balance: remain },
      { where: { id: wallet.id }, limit: 1 }
    );
    const result = await quizService.createQuizVotes(body);
    ctx.body = {
      code: 200,
      message: '比赛投票记录创建成功',
      data: result,
    };
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async findQuizVotes(ctx: ParameterizedContext, next) {
    const { vote_id } = ctx.params;
    const result = await quizService.findQuizVotes(vote_id);
    ctx.body = {
      code: 200,
      message: '比赛投票记录查询成功',
      data: result,
    };
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async createQuizMatchVotes(ctx: ParameterizedContext, next) {
    const { body } = ctx.request;
    const result = await quizService.createQuizMatchVotes(body);
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async findQuizMatchVotes(ctx: ParameterizedContext, next) {
    const { match_vote_id } = ctx.params;
    const result = await quizService.findQuizMatchVotes(match_vote_id);
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async updateQuizMatchVotes(ctx: ParameterizedContext, next) {
    const { body } = ctx.request;
    const result = await quizService.updateQuizMatchVotes(body);
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async getQuizMatchVotesList(ctx: ParameterizedContext, next) {
    const { body } = ctx.request;
    const result = await quizService.getQuizMatchVotesList(body);
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async lockQuizMatchVotes(ctx: ParameterizedContext, next) {
    const data: IQuizMatchVotes = ctx.request.body;
    const result = await quizService.lockQuizMatchVotes({
      is_lock: data.is_lock,
      match_id: data.match_id,
    });
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async getQuizPayoutsList(ctx: ParameterizedContext, next) {
    const { body } = ctx.request;
    const result = await quizService.getQuizPayoutsList(
      body,
      (ctx.state.userInfo.id += '')
    );
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async getQuizPayoutsStatistics(ctx: ParameterizedContext, next) {
    const { body } = ctx.request;
    // const result = await quizService.getQuizPayoutsStatistics(
    //   body,
    //   (ctx.state.userInfo.id += '')
    // );
    const result =
      await quizPayoutsStatisticsService.getSubordinatesWithStatisticsByPage(
        body
      );
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }

  async findQuizPayouts(ctx: ParameterizedContext, next) {
    const { payout_id } = ctx.params;
    const result = await quizService.findQuizPayouts(payout_id);
    successHandler({
      ctx,
      data: result,
    });
    await next();
  }
}

export default new QuizLiveStreamsController();
