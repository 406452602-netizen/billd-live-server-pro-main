import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

// 从生成的 types 文件导入接口
import sequelize from '@/config/mysql';
import { auditStatusEnum, IList, IWithdrawalRecord } from '@/interface';
import BankModel from '@/model/bank.model';
import UserModel from '@/model/user.model';
import UserBankCardModel from '@/model/userBankCard.model';
import WithdrawalRecordModel from '@/model/withdrawalRecord.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

WithdrawalRecordModel.belongsTo(UserBankCardModel, {
  foreignKey: 'bank_card_id', // 关联的外键字段
  as: 'bankCard', // 关联的别名
});

WithdrawalRecordModel.belongsTo(UserModel, {
  foreignKey: 'user_id',
  as: 'user',
});

class WithdrawalRecordService {
  /** WithdrawalRecord 是否存在 */
  async isExist(ids: number[]) {
    const res = await WithdrawalRecordModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 创建 WithdrawalRecord */
  async create(data: IWithdrawalRecord) {
    const res = await WithdrawalRecordModel.create(data);
    return res;
  }

  /** 查找 WithdrawalRecord */
  async find(id: number) {
    const res = await WithdrawalRecordModel.findOne({
      where: { id },
      include: [
        {
          model: UserBankCardModel,
          as: 'bankCard',
          include: [
            {
              model: BankModel,
              as: 'bank',
            },
          ],
        },
      ],
    });
    return res;
  }

  /** 获取 WithdrawalRecord 列表 */
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
  }: IList<IWithdrawalRecord>) {
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
    const result = await WithdrawalRecordModel.findAndCountAll({
      order: [
        ...orderRes,
        [
          sequelize.fn(
            'FIELD',
            sequelize.col('withdrawal_record.status'),
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
          include: [
            {
              model: BankModel,
              as: 'bank',
              foreignKey: 'bank_card_id',
            },
          ],
          // 如果有关联键，可通过 `foreignKey` 指定，示例：
          // foreignKey: 'bank_card_id'
        },
        {
          model: UserModel,
          as: 'user',
          foreignKey: 'user_id',
          attributes: ['username', 'id'],
        },
      ],
      logging: (sql) => {
        console.log(sql);
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 修改 WithdrawalRecord */
  async update(id: number, data: Partial<IWithdrawalRecord>) {
    const [affectedRows] = await WithdrawalRecordModel.update(data, {
      where: { id },
      limit: 1,
    });
    return affectedRows > 0;
  }

  /** 删除 WithdrawalRecord */
  async delete(id: number) {
    const deletedRows = await WithdrawalRecordModel.destroy({
      where: { id },
      limit: 1,
    });
    return deletedRows > 0;
  }
}

export default new WithdrawalRecordService();
