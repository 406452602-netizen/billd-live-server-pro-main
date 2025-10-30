import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IArea, StatusEnum, SwitchEnum } from '@/interface';

interface AreaModel
  extends Model<InferAttributes<AreaModel>, InferCreationAttributes<AreaModel>>,
    IArea {}

const model = sequelize.define<AreaModel>(
  'area',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },
    p_id: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: StatusEnum.normal,
    },
    hot_status: {
      type: DataTypes.INTEGER,
      defaultValue: SwitchEnum.no,
    },
    name: {
      type: DataTypes.STRING(50),
      defaultValue: '',
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    remark: {
      type: DataTypes.STRING(200),
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
