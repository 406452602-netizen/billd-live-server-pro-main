import Router from 'koa-router';

import quizController from '@/controller/quiz.controller';

const quizRouter = new Router({ prefix: '/quiz' });

// 比赛类型
quizRouter.post('/matchTypes/create', quizController.createMatchType);

quizRouter.post('/matchTypes/list', quizController.getMatchTypeList);

quizRouter.get('/matchTypes/:id', quizController.findMatchType);

quizRouter.put('/matchTypes/update/:id', quizController.updateMatchType);

quizRouter.delete('/matchTypes/delete/:id', quizController.deleteMatchType);

// 比赛队伍
quizRouter.post('/team/list', quizController.getTeamList);

quizRouter.post('/team/create', quizController.createTeam);

quizRouter.get('/team/:team_id', quizController.findTeam);

quizRouter.put('/team/update/:season_id', quizController.updateTeam);

quizRouter.delete('/team/delete/:id', quizController.deleteTeam);

// 比赛赛季
quizRouter.post('/seasons/create', quizController.createQuizSeasons);

quizRouter.post('/seasons/list', quizController.getQuizSeasonsList);

quizRouter.get(
  '/seasons/publicList/:listType',
  quizController.getQuizSeasonsPublicList
);

quizRouter.put('/seasons/update/:season_id', quizController.updateQuizSeasons);

quizRouter.get('/seasons/:season_id', quizController.findQuizSeasons);

// 比赛
quizRouter.post('/matches/create', quizController.createQuizMatches);
quizRouter.post('/matches/list', quizController.getQuizMatchesList);

quizRouter.get('/matches/room/list', quizController.getQuizMatchesRoomList);
quizRouter.get('/matches/:match_id', quizController.findQuizMatches);
quizRouter.put('/matches/update/:match_id', quizController.updateQuizMatches);
quizRouter.post(
  '/matches/settlement/:match_id',
  quizController.settlementQuizMatches
);

quizRouter.post('/matchGoals/create', quizController.createQuizMatchGoal);
quizRouter.post('/matchGoals/list', quizController.getQuizMatchGoalsList);
quizRouter.delete('/matchGoals/delete/:id', quizController.deleteQuizMatchGoal);
quizRouter.put('/matchGoals/update', quizController.updateQuizMatchesGoal);

// 比赛投票
quizRouter.post('/votes/list', quizController.getQuizVotesList);
quizRouter.post('/votes/create', quizController.createQuizVotes);
quizRouter.get('/votes/:vote_id', quizController.findQuizVotes);
quizRouter.get('/votes/statistics', quizController.getQuizVotesStatistics);

quizRouter.put('/matchVotes/lock', quizController.lockQuizMatchVotes);
quizRouter.post('/matchVotes/list', quizController.getQuizMatchVotesList);
quizRouter.post('/matchVotes/create', quizController.createQuizMatchVotes);
quizRouter.get('/matchVotes/:match_vote_id', quizController.findQuizMatchVotes);
quizRouter.put(
  '/matchVotes/update/:match_vote_id',
  quizController.updateQuizMatchVotes
);

quizRouter.post('/payouts/list', quizController.getQuizPayoutsList);
quizRouter.post('/payouts/statistics', quizController.getQuizPayoutsStatistics);
quizRouter.get('/payouts/:payout_id', quizController.findQuizPayouts);

export default quizRouter;
