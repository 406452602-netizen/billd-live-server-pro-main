// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
// import quizTeamsService from '@/service/quizTeams.service';
import { initTable } from '@/init/initDb';
import { IQuizTeams } from '@/types/IQuiz';

// const MD5 = require('crypto-js/md5');

interface QuizTeamsModel
  extends Model<
      InferAttributes<QuizTeamsModel>,
      InferCreationAttributes<QuizTeamsModel>
    >,
    IQuizTeams {}

const model = sequelize.define<QuizTeamsModel>(
  'quiz_teams',
  {
    team_id: {
      type: DataTypes.STRING,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      defaultValue: null,
    },
    team_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: null,
    },
    team_logo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    type_id: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
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
