import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

// 从生成的 types 文件导入接口
import { IInviteAgent, IList } from '@/interface';
import InviteAgentModel from '@/model/inviteAgent.model';
// eslint-disable-next-line import/order
import UserModel from '@/model/user.model';

import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';
import { buildPermissionWhere } from '@/utils/permissionUtils';

InviteAgentModel.belongsTo(UserModel, {
  as: 'to_user',
  foreignKey: 'be_invite_user_id',
});

InviteAgentModel.belongsTo(UserModel, {
  as: 'source_user',
  foreignKey: 'invite_user_id',
});

class InviteAgentService {
  /** InviteAgent 是否存在 */
  async isExist(ids: number[]) {
    const res = await InviteAgentModel.count({
      where: {
        invite_code: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 创建 InviteAgent */
  async create(data: IInviteAgent) {
    const result = await InviteAgentModel.create(data);
    return result;
  }

  /** 查找 InviteAgent */
  async find(invite_code: number, isValid = true) {
    const now = new Date().getTime(); // 获取当前时间
    let allWhere;
    if (isValid) {
      allWhere = {
        invite_code,
        expiration_time: {
          [Op.gt]: now, // 添加 expiration_time 大于当前时间的条件
        },
        is_valid: true,
      };
    } else {
      allWhere = {
        invite_code,
      };
    }

    const result = await InviteAgentModel.findOne({
      where: allWhere,
      include: [
        {
          model: UserModel,
          as: 'to_user',
          attributes: ['id', 'username', 'agent_account_for'],
        },
        {
          model: UserModel,
          as: 'source_user',
          attributes: ['id', 'username', 'agent_account_for'],
        },
      ],
    });
    return result;
  }

  /** 获取 InviteAgent 列表 */
  async getList(
    {
      invite_code,
      is_valid,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IInviteAgent>,
    userId: number
  ) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    let allWhere: any;
    if (is_valid) {
      allWhere = deleteUseLessObjectKey({
        invite_code,
        is_valid,
      });
    } else {
      allWhere = deleteUseLessObjectKey({
        invite_code,
      });
    }

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
    const orderNames = orderName ? `${orderName},is_valid` : 'is_valid';
    const orderBys = orderBy ? `${orderBy},desc` : 'desc';
    const orderRes = handleOrder({
      orderName: orderNames,
      orderBy: orderBys,
    });
    const result = await InviteAgentModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: buildPermissionWhere(allWhere, userId),
      logging: (sql) => {
        console.log('执行的 SQL 语句:', sql);
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 修改 InviteAgent */
  async update(
    invite_code: string,
    data: Partial<IInviteAgent>,
    options?: any
  ) {
    const [affectedRows] = await InviteAgentModel.update(data, {
      where: { invite_code },
      limit: 1,
      ...options,
    });
    return affectedRows > 0;
  }

  /** 删除 InviteAgent */
  async delete(invite_code: number) {
    const deletedRows = await InviteAgentModel.destroy({
      where: { invite_code },
      limit: 1,
    });
    return deletedRows > 0;
  }
}

export default new InviteAgentService();
