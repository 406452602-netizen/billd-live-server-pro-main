import { deleteUseLessObjectKey } from 'billd-utils';
import { Op, cast, col, literal } from 'sequelize';

import { IList, IWallet } from '@/interface';
import userModel from '@/model/user.model';
import walletModel from '@/model/wallet.model';
import { handleOrder, handlePage, handlePaging, handleRangTime } from '@/utils';

class WalletService {
  /** 钱包是否存在 */
  async isExist(ids: number[]) {
    const res = await walletModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 获取钱包列表 */
  async getList({
    id,
    user_id,
    balance,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IWallet>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      user_id,
      balance,
    });
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    if (rangTimeWhere) {
      allWhere[rangTimeType!] = rangTimeWhere;
    }
    const orderRes = handleOrder({ orderName, orderBy });
    orderRes.forEach((item) => {
      if (item[0] === 'balance') {
        // eslint-disable-next-line
        item[0] = cast(col('balance'), 'INTEGER');
      }
    });
    const result = await walletModel.findAndCountAll({
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

  /** 查找钱包 */
  async find(id: number) {
    const result = await walletModel.findOne({ where: { id } });
    return result;
  }

  /** 查找钱包 */
  async findByUserId(user_id: number) {
    const result = await walletModel.findOne({ where: { user_id } });
    return result;
  }

  /** 修改钱包 */
  async updateByUserId({ user_id, balance }: IWallet) {
    const result = await walletModel.update(
      {
        balance,
      },
      { where: { user_id } }
    );
    return result;
  }

  /** 修改钱包 */
  async changeBalanceByUserId({ user_id, balance }: IWallet, options?: any) {
    const result = await walletModel.update(
      {
        balance: literal(
          `\`balance\` ${balance! > 0 ? `+${balance!}` : `${balance!}`}`
        ),
      },
      { where: { user_id }, ...options }
    );
    return result;
  }

  /** 创建钱包 */
  async create({ user_id, balance }: IWallet, options?: any) {
    const result = await walletModel.create({ user_id, balance }, options);
    return result;
  }

  /** 修改钱包 */
  async update({ id, user_id, balance }: IWallet) {
    const result = await walletModel.update(
      { user_id, balance },
      { where: { id }, limit: 1 }
    );
    return result;
  }

  /** 删除钱包 */
  async delete(id: number) {
    const result = await walletModel.destroy({ where: { id }, limit: 1 });
    return result;
  }
}

export default new WalletService();
