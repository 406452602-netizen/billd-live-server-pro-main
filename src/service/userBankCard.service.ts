import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

// 从生成的 types 文件导入接口
import { IList, IUserBankCard } from '@/interface';
import BankModel from '@/model/bank.model';
import UserBankCardModel from '@/model/userBankCard.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

UserBankCardModel.belongsTo(BankModel, {
  foreignKey: 'bank_id',
  as: 'bank',
});

class UserBankCardService {
  /** UserBankCard 是否存在 */
  async isExist(ids: number[]) {
    const res = await UserBankCardModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 创建 UserBankCard */
  async create(data: IUserBankCard) {
    const result = await UserBankCardModel.create(data);
    return result;
  }

  /** 查找 UserBankCard */
  async find(id: number) {
    const result = await UserBankCardModel.findOne({
      where: { id },
      include: [{ model: BankModel, as: 'bank' }],
    });
    return result;
  }

  /** 获取 UserBankCard 列表 */
  async getList({
    id,
    orderBy,
    user_id,
    orderName,
    nowPage,
    pageSize,
    bank_type,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IUserBankCard>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      user_id,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['name', 'desc'], // 可根据实际表结构调整
    });
    if (keyWordWhere) {
      allWhere[Op.or] = keyWordWhere;
    }
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    if (rangTimeWhere) {
      allWhere[rangTimeType!] = rangTimeWhere;
    }
    const orderRes = handleOrder({ orderName, orderBy });

    const childWhere: any = {};
    if (bank_type) {
      childWhere.type = bank_type;
    }
    const result = await UserBankCardModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
      include: [
        {
          model: BankModel,
          as: 'bank',
          where: childWhere,
          required: true, // 设置为 false 实现左连接
        },
      ],
      logging: (info) => {
        console.log(info);
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 修改 UserBankCard */
  async update(id: number, data: Partial<IUserBankCard>) {
    const [affectedRows] = await UserBankCardModel.update(data, {
      where: { id },
      limit: 1,
    });
    return affectedRows > 0;
  }

  /** 删除 UserBankCard */
  async delete(id: number) {
    const deletedRows = await UserBankCardModel.destroy({
      where: { id },
      limit: 1,
    });
    return deletedRows > 0;
  }
}

export default new UserBankCardService();
