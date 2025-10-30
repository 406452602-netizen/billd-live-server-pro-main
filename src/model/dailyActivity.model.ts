import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IDailyActivity } from '@/interface';

interface IDailyActivityModel
  extends Model<
      InferAttributes<IDailyActivityModel>,
      InferCreationAttributes<IDailyActivityModel>
    >,
    IDailyActivity {}

const model = sequelize.define<IDailyActivityModel>(
  'daily_activity',
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
    client_ip: {
      type: DataTypes.STRING(100),
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
    version: {
      type: DataTypes.STRING(100),
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
