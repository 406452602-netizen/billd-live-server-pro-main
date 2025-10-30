import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

// 从生成的 types 文件导入接口
import { IList } from '@/interface';
import { IWsUserContact } from '@/interface';
import WsUserContactModel from '@/model/wsUserContact.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

class WsUserContactService {
  /** WsUserContact 是否存在 */
  async isExist(ids: number[]) {
    const res = await WsUserContactModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 创建 WsUserContact */
  async create(data: IWsUserContact) {
    const result = await WsUserContactModel.create(data);
    return result;
  }

  /** 查找 WsUserContact */
  async find(id: number) {
    const result = await WsUserContactModel.findOne({ where: { id } });
    return result;
  }

  async isExistByUserContact(userId: number, userId2: number) {
    const allWhere = {
      [Op.or]: [
        { user_id: userId, target_user_id: userId2, status: 1 },
        { user_id: userId2, target_user_id: userId, status: 1 },
      ],
    };
    const result = await WsUserContactModel.findOne({
      where: {
        [Op.or]: allWhere,
      },
    });
    return result;
  }

  /** 获取 WsUserContact 列表 */
  async getList({
    id,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IWsUserContact>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
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
    const result = await WsUserContactModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 修改 WsUserContact */
  async update(id: number, data: Partial<IWsUserContact>) {
    const [affectedRows] = await WsUserContactModel.update(data, {
      where: { id },
      limit: 1,
    });
    return affectedRows > 0;
  }

  /** 删除 WsUserContact */
  async delete(id: number) {
    const deletedRows = await WsUserContactModel.destroy({
      where: { id },
      limit: 1,
    });
    return deletedRows > 0;
  }
}

export default new WsUserContactService();
