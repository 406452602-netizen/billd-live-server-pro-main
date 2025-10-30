// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IQuizMatchGoals } from '@/types/IQuiz';

interface QuizMatchGoalsModel
  extends Model<
      InferAttributes<QuizMatchGoalsModel>,
      InferCreationAttributes<QuizMatchGoalsModel>
    >,
    IQuizMatchGoals {}

const model = sequelize.define<QuizMatchGoalsModel>(
  'quiz_match_goals',
  {
    goal_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    match_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
    },
    team_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
    },
    goal_time: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    goals_num: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: '1',
    },
    bureau_index: {
      type: DataTypes.INTEGER,
    },
    scorer_name: {
      type: DataTypes.STRING(255),
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
