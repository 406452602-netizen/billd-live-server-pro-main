import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

// 从生成的 types 文件导入接口
import { IAdCarousel, IList } from '@/interface';
import AdCarouselModel from '@/model/adCarousel.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

class AdCarouselService {
  /** AdCarousel 是否存在 */
  async isExist(ids: number[]) {
    const res = await AdCarouselModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 创建 AdCarousel */
  async create(data: IAdCarousel) {
    const result = await AdCarouselModel.create(data);
    return result;
  }

  /** 查找 AdCarousel */
  async find(id: number) {
    const result = await AdCarouselModel.findOne({ where: { id } });
    return result;
  }

  /** 获取 AdCarousel 列表 */
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
  }: IList<IAdCarousel>) {
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
    const result = await AdCarouselModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  async getAllList() {
    const result = await AdCarouselModel.findAll({
      order: [['created_at', 'DESC']],
    });
    return result;
  }

  /** 修改 AdCarousel */
  async update(id: number, data: Partial<IAdCarousel>) {
    const [affectedRows] = await AdCarouselModel.update(data, {
      where: { id },
    });
    return affectedRows > 0;
  }

  /** 删除 AdCarousel */
  async delete(id: number) {
    const deletedRows = await AdCarouselModel.destroy({
      where: { id },
      limit: 1,
    });
    return deletedRows > 0;
  }
}

export default new AdCarouselService();
