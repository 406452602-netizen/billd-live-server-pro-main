import { deleteUseLessObjectKey } from 'billd-utils';
import Sequelize from 'sequelize';

import { IList, IQiniuData } from '@/interface';
import qiniuDataModel from '@/model/qiniuData.model';
import {
  handleKeyWord,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

const { Op, cast, col } = Sequelize;
class QiniuDataService {
  /** 文件是否存在 */
  async isExist(ids: number[]) {
    const res = await qiniuDataModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  async getPrefixList(prefix) {
    const newdata = await qiniuDataModel.findAndCountAll({
      where: {
        prefix,
      },
    });

    const plainObj = {
      count: newdata.count,
      rows: newdata.rows.map((v) => v.get()),
    };

    return plainObj;
  }

  /** 获取文件列表 */
  async getList({
    id,
    user_id,
    prefix,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IQiniuData>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      user_id,
      prefix,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['qiniu_key'],
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
    let orderNameRes = orderName;
    if (orderNameRes === 'qiniu_fsize') {
      // @ts-ignore
      orderNameRes = cast(col(orderNameRes), 'SIGNED');
    }
    // @ts-ignore
    const result = await qiniuDataModel.findAndCountAll({
      order: [[orderNameRes, orderBy]],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 查找文件 */
  async find(id: number) {
    const result = await qiniuDataModel.findOne({ where: { id } });
    return result;
  }

  /** 查找文件 */
  async findByQiniuKey(qiniu_key: string) {
    const result = await qiniuDataModel.findOne({ where: { qiniu_key } });
    return result;
  }

  /** 创建文件 */
  async create({
    user_id,
    prefix,
    bucket,
    qiniu_key,
    qiniu_hash,
    qiniu_fsize,
    qiniu_mimeType,
    qiniu_putTime,
    qiniu_type,
    qiniu_status,
    qiniu_md5,
  }: IQiniuData) {
    const result = await qiniuDataModel.create({
      user_id,
      prefix,
      bucket,
      qiniu_key,
      qiniu_hash,
      qiniu_fsize,
      qiniu_mimeType,
      qiniu_putTime,
      qiniu_type,
      qiniu_status,
      qiniu_md5,
    });
    return result;
  }

  /** 修改文件 */
  async update({
    id,
    user_id,
    prefix,
    bucket,
    qiniu_key,
    qiniu_hash,
    qiniu_fsize,
    qiniu_mimeType,
    qiniu_putTime,
    qiniu_type,
    qiniu_status,
    qiniu_md5,
  }: IQiniuData) {
    const result = await qiniuDataModel.update(
      {
        user_id,
        prefix,
        bucket,
        qiniu_key,
        qiniu_hash,
        qiniu_fsize,
        qiniu_mimeType,
        qiniu_putTime,
        qiniu_type,
        qiniu_status,
        qiniu_md5,
      },
      { where: { id }, limit: 1 }
    );
    return result;
  }

  /** 删除文件 */
  async batchDelete(prefix: IQiniuData['prefix']) {
    const result = await qiniuDataModel.destroy({
      where: { prefix },
    });
    return result;
  }

  /** 删除文件 */
  async delete(id: number) {
    const result = await qiniuDataModel.destroy({ where: { id }, limit: 1 });
    return result;
  }
}

export default new QiniuDataService();
