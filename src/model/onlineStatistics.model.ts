import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IOnlineStatistics } from '@/interface';

interface OnlineStatisticsModel
  extends Model<
      InferAttributes<OnlineStatisticsModel>,
      InferCreationAttributes<OnlineStatisticsModel>
    >,
    IOnlineStatistics {}

const model = sequelize.define<OnlineStatisticsModel>(
  'online_statistics',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    live_room_id: {
      type: DataTypes.INTEGER,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    user_agent: {
      type: DataTypes.STRING(500),
    },
    client_ip: {
      type: DataTypes.STRING(300),
      defaultValue: '',
    },
    client_env: {
      type: DataTypes.STRING(100),
    },
    client_app: {
      type: DataTypes.STRING(100),
    },
    client_app_version: {
      type: DataTypes.STRING(100),
    },
    online_time: {
      type: DataTypes.DATE,
    },
    offline_time: {
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
