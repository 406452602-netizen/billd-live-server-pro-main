import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

// 从生成的 types 文件导入接口
import { IGames, IList } from '@/interface';
import GamesModel from '@/model/games.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

class GamesService {
  /** Games 是否存在 */
  async isExist(ids: number[]) {
    const res = await GamesModel.count({
      where: {
        game_id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 创建 Games */
  async create(data: IGames) {
    // eslint-disable-next-line no-return-await
    return await GamesModel.create(data);
  }

  /** 查找 Games */
  async find(game_id: number) {
    const result = await GamesModel.findOne({ where: { game_id } });
    return result;
  }

  /** 获取 Games 列表 */
  async getList({
    game_id,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IGames>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      game_id,
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
    const result = await GamesModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 修改 Games */
  async update(game_id: number, data: Partial<IGames>) {
    const [affectedRows] = await GamesModel.update(data, {
      where: { game_id },
      limit: 1,
    });
    return affectedRows > 0;
  }

  /** 删除 Games */
  async delete(game_id: number) {
    const deletedRows = await GamesModel.destroy({
      where: { game_id },
      limit: 1,
    });
    return deletedRows > 0;
  }
}

export default new GamesService();
