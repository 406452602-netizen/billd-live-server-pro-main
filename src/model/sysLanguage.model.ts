// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
// import userService from '@/service/user.service';
import { initTable } from '@/init/initDb';
import { ISysLanguage } from '@/types/ILanguage';

// const MD5 = require('crypto-js/md5');

interface SysLanguageModel
  extends Model<
      InferAttributes<SysLanguageModel>,
      InferCreationAttributes<SysLanguageModel>
    >,
    ISysLanguage {}

const model = sequelize.define<SysLanguageModel>(
  'sys_language',
  {
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true,
    },
    label: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    desc: {
      type: DataTypes.STRING(50),
    },
  },
  {
    freezeTableName: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  }
);

initTable({ model, sequelize });

export default model;
