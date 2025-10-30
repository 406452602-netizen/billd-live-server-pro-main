import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

// 从生成的 types 文件导入接口
import sequelize from '@/config/mysql';
import { auditStatusEnum, IList, IRechargeRecord } from '@/interface';
import BankModel from '@/model/bank.model';
import RechargeRecordModel from '@/model/rechargeRecord.model';
import UserModel from '@/model/user.model';
import UserBankCardModel from '@/model/userBankCard.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

RechargeRecordModel.belongsTo(UserBankCardModel, {
  foreignKey: 'bank_card_id', // 关联的外键字段
  as: 'bankCard', // 关联的别名
});

RechargeRecordModel.belongsTo(UserModel, {
  foreignKey: 'user_id', // 关联的外键字段
  as: 'user', // 关联的别名
});

class RechargeRecordService {
  /** RechargeRecord 是否存在 */
  async isExist(ids: number[]) {
    const res = await RechargeRecordModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 创建 RechargeRecord */
  async create(data: IRechargeRecord) {
    const result = await RechargeRecordModel.create(data);
    return result;
  }

  /** 查找 RechargeRecord */
  async find(id: number) {
    const result = await RechargeRecordModel.findOne({
      where: { id },
      include: [
        {
          model: UserBankCardModel, // 联查 UserBankCardModel
          as: 'bankCard',
          // 如果有关联键，可通过 `foreignKey` 指定，示例：
          // foreignKey: 'bank_card_id'

          include: [
            {
              model: BankModel,
              foreignKey: 'bank_id',
              as: 'bank',
            },
          ],
        },
        {
          model: UserModel,
          foreignKey: 'user_id',
          as: 'user',
          attributes: ['id', 'username'],
        },
      ],
    });
    return result;
  }

  /** 获取 RechargeRecord 列表 */
  async getList({
    id,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    status,
    user_id,
    is_admin_change,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IRechargeRecord>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    let allWhere;
    if (typeof status === 'string') {
      allWhere = deleteUseLessObjectKey({
        id,
        user_id,
        is_admin_change,
      });
      allWhere[Op.and] = [...(allWhere[Op.and] || [])];
      const statusList = status.split(',');
      allWhere[Op.and].push({
        status: {
          [Op.in]: statusList,
        },
      });
    } else if (status !== undefined) {
      allWhere = deleteUseLessObjectKey({
        id,
        status,
        user_id,
        is_admin_change,
      });
    } else {
      allWhere = deleteUseLessObjectKey({
        id,
        user_id,
        is_admin_change,
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
    const orderRes = handleOrder({ orderName, orderBy });
    const result = await RechargeRecordModel.findAndCountAll({
      order: [
        ...orderRes,
        [
          sequelize.fn(
            'FIELD',
            sequelize.col('recharge_record.status'),
            auditStatusEnum.PENDING
          ),
          'ASC',
        ],
      ],
      limit,
      offset,
      where: {
        ...allWhere,
      },
      include: [
        {
          model: UserBankCardModel, // 联查 UserBankCardModel
          as: 'bankCard',
          // 如果有关联键，可通过 `foreignKey` 指定，示例：
          // foreignKey: 'bank_card_id'

          include: [
            {
              model: BankModel,
              foreignKey: 'bank_id',
              as: 'bank',
            },
          ],
        },
        {
          model: UserModel,
          as: 'user',
          foreignKey: 'user_id',
          attributes: ['username', 'id'],
        },
      ],
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 修改 RechargeRecord */
  async update(id: number, data: Partial<IRechargeRecord>) {
    const updateDate = data;
    if (updateDate.voucher) {
      updateDate.voucher_at = new Date().toISOString();
    }
    const [affectedRows] = await RechargeRecordModel.update(updateDate, {
      where: { id },
      limit: 1,
    });
    return affectedRows > 0;
  }

  /** 删除 RechargeRecord */
  async delete(id: number) {
    const deletedRows = await RechargeRecordModel.destroy({
      where: { id },
      limit: 1,
    });
    return deletedRows > 0;
  }
}

export default new RechargeRecordService();
