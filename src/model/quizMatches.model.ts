// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
// import quizMatchesService from '@/service/quizMatches.service';
import { initTable } from '@/init/initDb';
import { IQuizMatches } from '@/types/IQuiz';

// const MD5 = require('crypto-js/md5');

interface QuizMatchesModel
  extends Model<
      InferAttributes<QuizMatchesModel>,
      InferCreationAttributes<QuizMatchesModel>
    >,
    IQuizMatches {}

const model = sequelize.define<QuizMatchesModel>(
  'quiz_matches',
  {
    match_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      defaultValue: null,
    },
    match_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: null,
    },
    description: {
      type: DataTypes.STRING,
    },
    match_type: {
      type: DataTypes.STRING,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null,
    },
    parent_match_id: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    season_id: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
    },
    type_id: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
    },
    team_id: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    team_id2: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    team1_odds: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    team2_odds: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    tax_rate: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    live_room_id: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    win_team_id: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    competition_order: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    bureau_number: {
      type: DataTypes.INTEGER,
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
