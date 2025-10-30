// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IGameConsumptionRecord } from '@/interface';

interface GameConsumptionRecordModel
  extends Model<
      InferAttributes<GameConsumptionRecordModel>,
      InferCreationAttributes<GameConsumptionRecordModel>
    >,
    IGameConsumptionRecord {}

const model = sequelize.define<GameConsumptionRecordModel>(
  'game_consumption_record',
  {
    game_order: {
      type: DataTypes.STRING(200),
      primaryKey: true,
      allowNull: false,
    },
    game_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    consumption_time: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    consumption_amount: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    settlement_amount: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    result: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    settlement_time: {
      type: DataTypes.DATE,
    },
    has_processed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // 默认未处理
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
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
