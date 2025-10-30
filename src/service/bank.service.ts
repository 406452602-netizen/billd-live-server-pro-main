import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

// 从生成的 types 文件导入接口
import { IBank, IList } from '@/interface';
import BankModel from '@/model/bank.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

class BankService {
  /** Bank 是否存在 */
  async isExist(ids: number[]) {
    const res = await BankModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 创建 Bank */
  async create(data: IBank) {
    const result = await BankModel.create(data);
    return result;
  }

  /** 查找 Bank */
  async find(id: number) {
    const result = await BankModel.findOne({ where: { id } });
    return result;
  }

  /** 获取 Bank 列表 */
  async getList({
    id,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    type,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IBank>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      type,
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
    const result = await BankModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 修改 Bank */
  async update(id: number, data: Partial<IBank>) {
    const [affectedRows] = await BankModel.update(data, {
      where: { id },
      limit: 1,
    });
    return affectedRows > 0;
  }

  /** 删除 Bank */
  async delete(id: number) {
    const deletedRows = await BankModel.destroy({ where: { id }, limit: 1 });
    return deletedRows > 0;
  }
}

export default new BankService();
