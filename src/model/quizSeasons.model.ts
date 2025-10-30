// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
// import quizSeasonsService from '@/service/quizSeasons.service';
import { initTable } from '@/init/initDb';
import { IQuizSeasons } from '@/types/IQuiz';

// const MD5 = require('crypto-js/md5');

interface QuizSeasonsModel
  extends Model<
      InferAttributes<QuizSeasonsModel>,
      InferCreationAttributes<QuizSeasonsModel>
    >,
    IQuizSeasons {}

const model = sequelize.define<QuizSeasonsModel>(
  'quiz_seasons',
  {
    season_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    season_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    quiz_match_type: {
      type: DataTypes.INTEGER,
    },
    start_date: {
      type: DataTypes.DATE,
    },
    end_date: {
      type: DataTypes.DATE,
    },
    contest_teams: {
      type: DataTypes.STRING(500),
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
    deleted_at: {
      type: DataTypes.DATE,
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
