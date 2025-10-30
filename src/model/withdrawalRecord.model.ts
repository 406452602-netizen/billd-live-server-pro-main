// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IWithdrawalRecord } from '@/interface';

interface WithdrawalRecordModel
  extends Model<
      InferAttributes<WithdrawalRecordModel>,
      InferCreationAttributes<WithdrawalRecordModel>
    >,
    IWithdrawalRecord {}

const model = sequelize.define<WithdrawalRecordModel>(
  'withdrawal_record',
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
      allowNull: false,
      defaultValue: null,
    },
    amount: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: null,
    },
    is_admin_change: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    remark: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '0',
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
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
