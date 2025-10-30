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
import { ISysTranslationsDict } from '@/types/ILanguage';

// const MD5 = require('crypto-js/md5');

interface SysTranslationsDictModel
  extends Model<
      InferAttributes<SysTranslationsDictModel>,
      InferCreationAttributes<SysTranslationsDictModel>
    >,
    ISysTranslationsDict {}

const model = sequelize.define<SysTranslationsDictModel>(
  'sys_translations_dict',
  {
    lg_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true,
    },
    lg_key: {
      type: DataTypes.STRING(50),
      allowNull: false,
      primaryKey: true,
    },
    dict_value: {
      type: DataTypes.STRING(50),
      allowNull: false,
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
