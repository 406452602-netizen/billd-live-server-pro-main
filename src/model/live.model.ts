import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { ILive } from '@/interface';

interface LiveModel
  extends Model<InferAttributes<LiveModel>, InferCreationAttributes<LiveModel>>,
    ILive {}

const model = sequelize.define<LiveModel>(
  'live',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    live_record_id: {
      type: DataTypes.INTEGER,
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
    flag_id: {
      type: DataTypes.STRING(100),
      defaultValue: '',
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
