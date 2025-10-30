// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IQuizPayoutsStatistics } from '@/types/IQuiz';

interface QuizPayoutsStatisticsModel
  extends Model<
      InferAttributes<QuizPayoutsStatisticsModel>,
      InferCreationAttributes<QuizPayoutsStatisticsModel>
    >,
    IQuizPayoutsStatistics {}

const model = sequelize.define<QuizPayoutsStatisticsModel>(
  'quiz_payouts_statistics',
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    parent_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    parent_divided_into: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
    },
    amount_flow: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
    },
    amount_actual_flow: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
    },
    amount_result: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
    },
    ancestors: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    link_identifier: {
      type: DataTypes.STRING(50),
    },
    lower_level_actual_flow: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
    },
    lower_level_flow: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
    },
    lower_level_settlement_flow: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    deleted_at: {
      type: DataTypes.DATE,
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
    freezeTableName: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  }
);

initTable({ model, sequelize });

export default model;
