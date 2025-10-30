// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IUserBankCard } from '@/interface';

interface UserBankCardModel
  extends Model<
      InferAttributes<UserBankCardModel>,
      InferCreationAttributes<UserBankCardModel>
    >,
    IUserBankCard {}

const model = sequelize.define<UserBankCardModel>(
  'user_bank_card',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
    },
    bank_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
    },
    card_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: null,
    },
    holder_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: null,
    },
    protocol_type: {
      type: DataTypes.STRING(100),
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: null,
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
