// 定义比赛类型枚举
import { IUser } from '@/types/IUser';

export enum QuizMatchType {
  GROUP_STAGE = 0, // 小组赛
  KNOCKOUT_STAGE, // 淘汰赛
  FINAL, // 决赛
}

export enum QuizMatchStatus {
  notStarted, // 未开始
  inProgress, // 进行中
  completed, // 已结束
}

// 比赛信息
export interface IQuizMatches {
  match_id?: number;
  match_name?: string;
  match_type?: QuizMatchType;
  start_time?: string;
  end_time?: string;
  parent_match_id?: number;
  description?: string;
  season_id?: number;
  live_room_id?: number;
  type_id?: number;
  team_id?: number;
  team_id2?: number;
  team1_odds?: number;
  team2_odds?: number;
  tax_rate?: number;
  status?: number;
  competition_order?: number;
  bureau_number?: number;
  bureau_index?: number;
  win_team_id?: number;
  ancestors?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface IQuizMatchTypes {
  id?: number;
  type_name?: string;
  ancestors?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface IQuizPayouts {
  payout_id?: number;
  vote_id?: string | number;
  payout_amount?: number;
  ancestors?: string;
  payouts_user_id?: number;
  profit_ratio?: number;
  type?: number;
  game_id?: number;
  parent_id?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface IQuizSeasons {
  season_id?: number;
  season_name?: string;
  quiz_match_type?: number;
  season_logo?: string;
  start_date?: string;
  end_date?: string;
  contest_teams?: string;
  ancestors?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface IQuizTeams {
  team_id?: number;
  team_name?: string;
  team_logo?: string;
  type_id?: number;
  ancestors?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface IQuizVotes {
  vote_id?: number;
  user_id?: number;
  match_id?: number;
  vote_index?: number;
  votes_type?: number;
  net_profit_amount?: number;
  odds?: number;
  handicap?: number;
  prize_winner?: number;
  result_amount?: number;
  bureau_index?: number;
  maximum_differential?: number;
  base_score?: number;

  user?: IUser;
  vote_amount?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface IQuizMatchGoals {
  goal_id?: number;
  match_id: number;
  team_id: number;
  goal_time: string;
  goals_num: number;
  bureau_index?: number;
  scorer_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface IQuizMatchVotes {
  id?: number;
  votes_type?: number;
  team1_odds?: number;
  team2_odds?: number;
  team1_fraction?: number;
  team2_fraction?: number;
  is_lock?: boolean;
  match_id?: number;
  reserve_price?: number;
  maximum_differential?: number;
  bureau_index?: number;
  let_score_detail?: object[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface IQuizPayoutsStatistics {
  user_id?: number;
  parent_user_id?: number;
  parent_divided_into?: number;
  lower_level_actual_flow?: number;
  lower_level_flow?: number;
  amount_flow?: number;
  amount_actual_flow?: number;
  lower_level_settlement_flow?: number;
  amount_result?: number;
  ancestors?: string;
  link_identifier?: string;
  statistical_date?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}
