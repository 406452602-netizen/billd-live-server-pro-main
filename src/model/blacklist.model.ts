import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IBlacklist } from '@/interface';

interface BlacklistModel
  extends Model<
      InferAttributes<BlacklistModel>,
      InferCreationAttributes<BlacklistModel>
    >,
    IBlacklist {}

const model = sequelize.define<BlacklistModel>(
  'blacklist',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    client_ip: {
      type: DataTypes.STRING(100),
    },
    live_room_id: {
      type: DataTypes.INTEGER,
    },
    user_id: {
      type: DataTypes.INTEGER,
    },
    type: {
      type: DataTypes.INTEGER,
    },
    start_date: {
      type: DataTypes.DATE,
    },
    end_date: {
      type: DataTypes.DATE,
    },
    remark: {
      type: DataTypes.STRING(500),
    },
    msg: {
      type: DataTypes.STRING(500),
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
