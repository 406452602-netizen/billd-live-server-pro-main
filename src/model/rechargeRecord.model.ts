// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IRechargeRecord } from '@/interface';

interface RechargeRecordModel
  extends Model<
      InferAttributes<RechargeRecordModel>,
      InferCreationAttributes<RechargeRecordModel>
    >,
    IRechargeRecord {}

const model = sequelize.define<RechargeRecordModel>(
  'recharge_record',
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
    bank_card_id: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    amount: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
    },
    is_admin_change: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    remark: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      defaultValue: null,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      defaultValue: null,
    },
    protocol_type: {
      type: DataTypes.STRING,
    },
    bank_type: {
      type: DataTypes.INTEGER,
    },
    voucher: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: '1',
    },
    voucher_at: {
      type: DataTypes.DATE,
    },
    created_at: {
      type: DataTypes.DATE,
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
