// https://github.com/demopark/sequelize-docs-Zh-CN/blob/master/core-concepts/model-basics.md#%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';

import sequelize from '@/config/mysql';
import { initTable } from '@/init/initDb';
import { IAdCarousel } from '@/interface';

interface AdCarouselModel
  extends Model<
      InferAttributes<AdCarouselModel>,
      InferCreationAttributes<AdCarouselModel>
    >,
    IAdCarousel {}

const model = sequelize.define<AdCarouselModel>(
  'ad_carousel',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    ad_image: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    ad_url: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: null,
    },
    ad_remark: {
      type: DataTypes.STRING(100),
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
