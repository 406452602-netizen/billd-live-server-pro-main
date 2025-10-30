// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IWsUserMessage } from '@/interface';

interface WsUserMessageModel
  extends Model<
      InferAttributes<WsUserMessageModel>,
      InferCreationAttributes<WsUserMessageModel>
    >,
    IWsUserMessage {}

const model = sequelize.define<WsUserMessageModel>(
  'ws_user_message',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    source_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    target_user_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    origin_content: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    send_message_time: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: 'CURRENT_TIMESTAMP',
    },
    client_env: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    ws_user_contact_id: {
      type: DataTypes.INTEGER,
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
