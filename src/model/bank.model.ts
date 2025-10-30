// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IBank } from '@/interface';

interface BankModel
  extends Model<InferAttributes<BankModel>, InferCreationAttributes<BankModel>>,
    IBank {}

const model = sequelize.define<BankModel>(
  'bank',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    bank_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: null,
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_domestic: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    protocol_type_list: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
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
