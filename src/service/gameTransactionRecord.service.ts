// 从生成的 types 文件导入接口
import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';
import SnowflakeId from 'snowflake-id';

import { IGameTransactionRecord, IList } from '@/interface';
import GameTransactionRecordModel from '@/model/gameTransactionRecord.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

const snowflake = new SnowflakeId({
  mid: 1, // 机器 ID，范围 0 - 1023
  offset: (2020 - 1970) * 31536000 * 1000, // 起始时间戳偏移量
});

class GameTransactionRecordService {
  /** GameTransactionRecord 是否存在 */
  async isExist(ids: number[]) {
    const res = await GameTransactionRecordModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 创建 GameTransactionRecord */
  async create(data: IGameTransactionRecord, options?: any) {
    const dataInfo = { ...data };
    dataInfo.id = snowflake.generate();
    const result = await GameTransactionRecordModel.create(dataInfo, options);
    return result;
  }

  /** 查找 GameTransactionRecord */
  async find(id: number) {
    const result = await GameTransactionRecordModel.findOne({ where: { id } });
    return result;
  }

  /** 获取 GameTransactionRecord 列表 */
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
    user_id,
  }: IList<IGameTransactionRecord>) {
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
    const result = await GameTransactionRecordModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 修改 GameTransactionRecord */
  async update(id: number, data: Partial<IGameTransactionRecord>) {
    const [affectedRows] = await GameTransactionRecordModel.update(data, {
      where: { id },
      limit: 1,
    });
    return affectedRows > 0;
  }

  /** 删除 GameTransactionRecord */
  async delete(id: number) {
    const deletedRows = await GameTransactionRecordModel.destroy({
      where: { id },
      limit: 1,
    });
    return deletedRows > 0;
  }
}

export default new GameTransactionRecordService();
