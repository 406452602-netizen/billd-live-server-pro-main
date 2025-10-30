import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { ILiveRecord } from '@/interface';

interface LiveRecordModel
  extends Model<
      InferAttributes<LiveRecordModel>,
      InferCreationAttributes<LiveRecordModel>
    >,
    ILiveRecord {}

const model = sequelize.define<LiveRecordModel>(
  'live_record',
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
    live_room_type: {
      type: DataTypes.INTEGER,
    },
    area_id: {
      type: DataTypes.INTEGER,
    },
    area_name: {
      type: DataTypes.STRING(100),
    },
    duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    danmu: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    view: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    live_id: {
      type: DataTypes.INTEGER,
    },
    client_ip: {
      type: DataTypes.STRING(100),
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
    start_time: {
      type: DataTypes.DATE,
    },
    end_time: {
      type: DataTypes.DATE,
    },
    remark: {
      type: DataTypes.STRING(500),
      defaultValue: '',
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
