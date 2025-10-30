import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

import { IList, ILoginRecord } from '@/interface';
import loginRecordModel from '@/model/loginRecord.model';
import userModel from '@/model/user.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

class LoginRecordService {
  /** 登录记录是否存在 */
  async isExist(ids: number[]) {
    const res = await loginRecordModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 获取登录记录列表 */
  async getList({
    id,
    user_id,
    client_ip,
    client_env,
    client_app,
    client_app_version,
    type,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<ILoginRecord>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      user_id,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      type,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['user_agent', 'client_ip', 'client_app_version', 'remark'],
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
    const result = await loginRecordModel.findAndCountAll({
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

  /** 查找登录记录 */
  async find(id: number) {
    const result = await loginRecordModel.findOne({ where: { id } });
    return result;
  }

  /** 创建登录记录 */
  async create({
    user_id,
    user_agent,
    type,
    client_ip,
    client_env,
    client_app,
    client_app_version,
    remark,
  }: ILoginRecord, options?: any) {
    const result = await loginRecordModel.create({
      user_id,
      user_agent,
      type,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      remark,
    }, options);
    return result;
  }

  /** 修改登录记录 */
  async update({
    id,
    user_id,
    user_agent,
    type,
    client_ip,
    client_env,
    client_app,
    client_app_version,
    remark,
  }: ILoginRecord) {
    const result = await loginRecordModel.update(
      {
        user_id,
        user_agent,
        type,
        client_ip,
        client_env,
        client_app,
        client_app_version,
        remark,
      },
      { where: { id }, limit: 1 }
    );
    return result;
  }

  /** 删除登录记录 */
  async delete(id: number) {
    const result = await loginRecordModel.destroy({ where: { id }, limit: 1 });
    return result;
  }
}

export default new LoginRecordService();
