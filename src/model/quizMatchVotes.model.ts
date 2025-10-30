// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IQuizMatchVotes } from '@/types/IQuiz';

interface QuizMatchVotesModel
  extends Model<
      InferAttributes<QuizMatchVotesModel>,
      InferCreationAttributes<QuizMatchVotesModel>
    >,
    IQuizMatchVotes {}

const model = sequelize.define<QuizMatchVotesModel>(
  'quiz_matches_votes',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    votes_type: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    team1_odds: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    team2_odds: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    team1_fraction: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    team2_fraction: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    match_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    let_score_detail: {
      type: DataTypes.JSON,
    },
    reserve_price: {
      type: DataTypes.DOUBLE,
    },
    maximum_differential: {
      type: DataTypes.DOUBLE,
    },
    is_lock: {
      type: DataTypes.BOOLEAN,
    },
    bureau_index: {
      type: DataTypes.INTEGER,
    },
  },
  {
    hooks: {
      // https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/other-topics/hooks.md
      // afterValidate(instance: any) {
      //   if (instance.changed('password')) {
      //     // eslint-disable-next-line no-param-reassign
      //     instance.password = MD5(instance.password).toString();
      //   }
      // },
    },
    paranoid: true,
    freezeTableName: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  }
);

initTable({ model, sequelize });

export default model;
