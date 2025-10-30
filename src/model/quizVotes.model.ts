// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
// import quizVotesService from '@/service/quizVotes.service';
import { initTable } from '@/init/initDb';
import { IQuizVotes } from '@/types/IQuiz';

// const MD5 = require('crypto-js/md5');

interface QuizVotesModel
  extends Model<
      InferAttributes<QuizVotesModel>,
      InferCreationAttributes<QuizVotesModel>
    >,
    IQuizVotes {}

const model = sequelize.define<QuizVotesModel>(
  'quiz_votes',
  {
    vote_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      defaultValue: null,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
    },
    match_id: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
    },
    net_profit_amount: {
      type: DataTypes.DOUBLE,
    },
    vote_index: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
    },
    vote_amount: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
    },
    votes_type: {
      type: DataTypes.STRING,
    },
    base_score: {
      type: DataTypes.INTEGER,
    },
    bureau_index: {
      type: DataTypes.INTEGER,
    },
    maximum_differential: {
      type: DataTypes.INTEGER,
    },
    odds: {
      type: DataTypes.DOUBLE,
    },
    handicap: {
      type: DataTypes.STRING,
    },
    prize_winner: {
      type: DataTypes.INTEGER,
    },
    result_amount: {
      type: DataTypes.DOUBLE,
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
    // timestamps: false, // 将createdAt和updatedAt时间戳添加到模型中。默认为true。
    /**
     * 如果freezeTableName为true，sequelize将不会尝试更改DAO名称以获取表名。
     * 否则，dao名称将是复数的。默认为false。
     */
    freezeTableName: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  }
);

initTable({ model, sequelize });

export default model;
