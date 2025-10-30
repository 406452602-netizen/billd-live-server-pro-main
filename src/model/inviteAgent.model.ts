// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IInviteAgent } from '@/interface';

interface InviteAgentModel
  extends Model<
      InferAttributes<InviteAgentModel>,
      InferCreationAttributes<InviteAgentModel>
    >,
    IInviteAgent {}

const model = sequelize.define<InviteAgentModel>(
  'invite_agent',
  {
    invite_code: {
      type: DataTypes.STRING(80),
      primaryKey: true,
      allowNull: false,
    },
    invite_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
    },
    agent_account_for: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '0.00',
    },
    is_valid: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: true,
    },
    ancestors: {
      type: DataTypes.STRING,
    },
    invite_class: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    expiration_time: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    be_invite_user_id: {
      type: DataTypes.INTEGER,
    },
    link_identifier: {
      type: DataTypes.STRING(50),
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
