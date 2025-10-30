import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

import { IGlobalMsg, IList } from '@/interface';
import globalMsgModel from '@/model/globalMsg.model';
import userModel from '@/model/user.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

class GlobalMsgService {
  /** 全局消息是否存在 */
  async isExist(ids: number[]) {
    const res = await globalMsgModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 获取全局消息列表 */
  async getList({
    id,
    user_id,
    client_ip,
    type,
    show,
    priority,
    title,
    content,
    remark,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IGlobalMsg>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      user_id,
      client_ip,
      type,
      show,
      priority,
      title,
      content,
      remark,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['title', 'content', 'client_ip', 'remark'],
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
    const result = await globalMsgModel.findAndCountAll({
      include: [
        {
          model: userModel,
          attributes: {
            exclude: ['password', 'token'],
          },
        },
      ],
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
      distinct: true,
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 获取全局消息列表 */
  async getAll({
    id,
    user_id,
    client_ip,
    type,
    show,
    priority,
    title,
    content,
    remark,
    orderBy,
    orderName,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IGlobalMsg>) {
    const allWhere: any = deleteUseLessObjectKey({
      id,
      user_id,
      client_ip,
      type,
      show,
      priority,
      title,
      content,
      remark,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['title', 'content', 'client_ip', 'remark'],
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
    const result = await globalMsgModel.findAll({
      include: [
        {
          model: userModel,
          attributes: {
            exclude: ['password', 'token'],
          },
        },
      ],
      order: [...orderRes],
      where: {
        ...allWhere,
      },
    });
    return result;
  }

  /** 获取全局消息列表 */
  async getAllPure({
    id,
    user_id,
    client_ip,
    type,
    show,
    priority,
    title,
    content,
    remark,
    orderBy,
    orderName,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IGlobalMsg>) {
    const allWhere: any = deleteUseLessObjectKey({
      id,
      user_id,
      client_ip,
      type,
      show,
      priority,
      title,
      content,
      remark,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['title', 'content', 'client_ip', 'remark'],
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
    const result = await globalMsgModel.findAll({
      order: [...orderRes],
      where: {
        ...allWhere,
      },
    });
    return result;
  }

  /** 查找全局消息 */
  async find(id: number) {
    const result = await globalMsgModel.findOne({ where: { id } });
    return result;
  }

  /** 创建全局消息 */
  async create({
    user_id,
    client_ip,
    type,
    show,
    priority,
    title,
    content,
    remark,
  }: IGlobalMsg) {
    const result = await globalMsgModel.create({
      user_id,
      client_ip,
      type,
      show,
      priority,
      title,
      content,
      remark,
    });
    return result;
  }

  /** 修改全局消息 */
  async update({
    id,
    user_id,
    client_ip,
    type,
    show,
    priority,
    title,
    content,
    remark,
  }: IGlobalMsg) {
    const result = await globalMsgModel.update(
      { user_id, client_ip, type, show, priority, title, content, remark },
      { where: { id }, limit: 1 }
    );
    return result;
  }

  /** 删除全局消息 */
  async delete(id: number) {
    const result = await globalMsgModel.destroy({ where: { id }, limit: 1 });
    return result;
  }
}

export default new GlobalMsgService();
