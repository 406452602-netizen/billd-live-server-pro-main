// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IGames } from '@/interface';

interface GamesModel
  extends Model<
      InferAttributes<GamesModel>,
      InferCreationAttributes<GamesModel>
    >,
    IGames {}

const model = sequelize.define<GamesModel>(
  'games',
  {
    game_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    game_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: null,
    },
    developer: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    image: {
      type: DataTypes.STRING(200),
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: '1',
    },
    icon: {
      type: DataTypes.STRING(200),
    },
    is_integration: {
      type: DataTypes.BOOLEAN,
    },
    api_timezone_region: {
      type: DataTypes.STRING(50),
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: 'CURRENT_TIMESTAMP',
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: 'CURRENT_TIMESTAMP',
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
