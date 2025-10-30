import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

import { BlacklistTypeEnum, IBlacklist, IList } from '@/interface';
import blacklistModel from '@/model/blacklist.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

class BlackListService {
  /** 黑名单是否存在 */
  async isExist(ids: number[]) {
    const res = await blacklistModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 获取黑名单列表 */
  async getList({
    id,
    user_id,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IBlacklist>) {
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
      arr: ['client_ip', 'msg'],
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
    const result = await blacklistModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 查找黑名单 */
  async find(id: number) {
    const result = await blacklistModel.findOne({ where: { id } });
    return result;
  }

  /** 根据userId查找黑名单 */
  async findAllByUserId(user_id: number) {
    const result = await blacklistModel.findAll({ where: { user_id } });
    return result;
  }

  /** 根据ip查找黑名单 */
  async findAllByClientIp(client_ip: string) {
    const result = await blacklistModel.findAll({ where: { client_ip } });
    return result;
  }

  /** 根据ip查找黑名单 */
  async findAllByType(type: BlacklistTypeEnum) {
    const result = await blacklistModel.findAll({ where: { type } });
    return result;
  }

  async findAllClientIpNotNull() {
    const result = await blacklistModel.findAll({
      attributes: ['client_ip', 'type'],
      // @ts-ignore
      where: {
        client_ip: {
          [Op.not]: null, // IS NOT NULL
        },
        // [Op.not]: {
        //   client_ip: null,
        // },
      },
    });
    return result;
  }

  /** 创建黑名单 */
  async create({
    client_ip,
    live_room_id,
    user_id,
    type,
    start_date,
    end_date,
    msg,
    remark,
  }: IBlacklist) {
    const result = await blacklistModel.create({
      client_ip,
      live_room_id,
      user_id,
      type,
      start_date,
      end_date,
      msg,
      remark,
    });
    return result;
  }

  /** 修改黑名单 */
  async update({
    id,
    client_ip,
    live_room_id,
    user_id,
    type,
    start_date,
    end_date,
    msg,
    remark,
  }: IBlacklist) {
    const result = await blacklistModel.update(
      {
        client_ip,
        live_room_id,
        user_id,
        type,
        start_date,
        end_date,
        msg,
        remark,
      },
      { where: { id }, limit: 1 }
    );
    return result;
  }

  /** 删除黑名单 */
  async deleteAll(data: IBlacklist) {
    const result = await blacklistModel.destroy({
      where: { ...data },
    });
    return result;
  }

  /** 删除黑名单 */
  async delete(id: number) {
    const result = await blacklistModel.destroy({ where: { id }, limit: 1 });
    return result;
  }
}

export default new BlackListService();
