import { deleteUseLessObjectKey } from 'billd-utils';
import { Op, literal } from 'sequelize';

import { IGiftRecord, IList } from '@/interface';
import giftModel from '@/model/giftRecord.model';
import {
  handleGroupPaging,
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

class GiftRecordService {
  /** 礼物记录是否存在 */
  async isExist(ids: number[]) {
    const res = await giftModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 获取礼物记录列表 */
  async getList({
    id,
    is_recv,
    goods_id,
    goods_nums,
    order_id,
    live_room_id,
    send_user_id,
    recv_user_id,
    status,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IGiftRecord>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      is_recv,
      goods_id,
      goods_nums,
      order_id,
      live_room_id,
      send_user_id,
      recv_user_id,
      status,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['goods_snapshot', 'remark'],
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
    const result = await giftModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 获取礼物记录列表 */
  async getGiftGroupList({
    id,
    is_recv,
    goods_id,
    goods_nums,
    order_id,
    live_room_id,
    send_user_id,
    recv_user_id,
    status,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IGiftRecord>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      is_recv,
      goods_id,
      goods_nums,
      order_id,
      live_room_id,
      send_user_id,
      recv_user_id,
      status,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['goods_snapshot', 'remark'],
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
    const result = await giftModel.findAndCountAll({
      attributes: [
        'live_room_id',
        [literal(`count(goods_id)`), 'nums'],
        [literal(`GROUP_CONCAT(DISTINCT goods_id)`), 'goods_id'],
        [
          literal(
            `SUBSTRING_INDEX(GROUP_CONCAT(DISTINCT goods_snapshot, '__fgx__'),'__fgx__',1)`
          ),
          'goods_snapshot',
        ],
      ],
      order: [...orderRes],
      limit,
      offset,
      group: ['goods_id'],
      where: {
        ...allWhere,
      },
      distinct: true,
    });
    return handleGroupPaging(result, nowpage, pagesize);
  }

  /** 查找礼物记录 */
  async find(id: number) {
    const result = await giftModel.findOne({ where: { id } });
    return result;
  }

  /** 创建礼物记录 */
  async create({
    is_recv,
    goods_id,
    goods_nums,
    goods_snapshot,
    order_id,
    live_room_id,
    send_user_id,
    recv_user_id,
    status,
    remark,
  }: IGiftRecord) {
    const result = await giftModel.create({
      is_recv,
      goods_id,
      goods_nums,
      goods_snapshot,
      order_id,
      live_room_id,
      send_user_id,
      recv_user_id,
      status,
      remark,
    });
    return result;
  }

  /** 修改礼物记录 */
  async update({
    id,
    is_recv,
    goods_id,
    goods_nums,
    goods_snapshot,
    order_id,
    live_room_id,
    send_user_id,
    recv_user_id,
    status,
    remark,
  }: IGiftRecord) {
    const result = await giftModel.update(
      {
        is_recv,
        goods_id,
        goods_nums,
        goods_snapshot,
        order_id,
        live_room_id,
        send_user_id,
        recv_user_id,
        status,
        remark,
      },
      { where: { id }, limit: 1 }
    );
    return result;
  }

  /** 删除礼物记录 */
  async delete(id: number) {
    const result = await giftModel.destroy({ where: { id }, limit: 1 });
    return result;
  }
}

export default new GiftRecordService();
