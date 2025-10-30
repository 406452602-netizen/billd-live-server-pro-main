import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IGameTransactionRecord } from '@/interface';

interface GameTransactionRecordModel
  extends Model<
      InferAttributes<GameTransactionRecordModel>,
      InferCreationAttributes<GameTransactionRecordModel>
    >,
    IGameTransactionRecord {}

const model = sequelize.define<GameTransactionRecordModel>(
  'game_transaction_record',
  {
    amount: {
      type: DataTypes.DOUBLE,
    },
    callback_data: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    external_order_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    game_id: {
      type: DataTypes.STRING(50),
    },
    game_name: {
      type: DataTypes.STRING(100),
    },
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    transaction_time: {
      type: DataTypes.DATE,
    },
    transaction_type: {
      type: DataTypes.INTEGER,
    },
    user_id: {
      type: DataTypes.BIGINT,
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
    paranoid: true,
    freezeTableName: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  }
);

initTable({ model, sequelize });

export default model;
