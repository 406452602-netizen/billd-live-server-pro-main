import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

// 从生成的 types 文件导入接口
import { IGameConsumptionRecord, IList } from '@/interface';
import GameConsumptionRecordModel from '@/model/gameConsumptionRecord.model';
import GamesModel from '@/model/games.model';
import UserModel from '@/model/user.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';
import { buildPermissionWhere } from '@/utils/permissionUtils';

GameConsumptionRecordModel.belongsTo(GamesModel, {
  as: 'game',
  foreignKey: 'game_id',
  targetKey: 'game_id',
});

// 建立与UserModel的关联
GameConsumptionRecordModel.belongsTo(UserModel, {
  as: 'user',
  foreignKey: 'user_id',
  targetKey: 'id',
});

class GameConsumptionRecordService {
  /** GameConsumptionRecord 是否存在 */
  async isExist(gameOrder: string, gameId: number) {
    const res = await GameConsumptionRecordModel.count({
      where: {
        game_order: gameOrder,
        game_id: gameId,
      },
    });
    return res > 0;
  }

  /** 创建 GameConsumptionRecord */
  async create(data: IGameConsumptionRecord, options?: any) {
    const result = await GameConsumptionRecordModel.create(data, options);
    return result;
  }

  /** 查找 GameConsumptionRecord */
  async find(gameOrder: string, gameId: number) {
    const result = await GameConsumptionRecordModel.findOne({
      where: {
        game_order: gameOrder,
        game_id: gameId,
      },
    });
    return result;
  }

  /** 获取 GameConsumptionRecord 列表 */
  async getList({
    game_order,
    game_id,
    orderBy,
    game_ids,
    user_id,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IGameConsumptionRecord>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      game_order,
      game_id,
      user_id,
    });

    // 如果game_ids有值，则添加in查询条件
    if (game_ids && Array.isArray(game_ids) && game_ids.length > 0) {
      allWhere.game_id = { [Op.in]: game_ids };
    }
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['game_order', 'result'], // 可根据实际表结构调整
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
    const result = await GameConsumptionRecordModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
      include: [
        {
          model: GamesModel,
          as: 'game',
          attributes: ['game_name'],
          foreignKey: 'game_id',
        },
      ],
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 修改 GameConsumptionRecord */
  async update(
    gameOrder: string,
    gameId: number,
    data: Partial<IGameConsumptionRecord>
  ) {
    const [affectedRows] = await GameConsumptionRecordModel.update(data, {
      where: {
        game_order: gameOrder,
        game_id: gameId,
      },
      limit: 1,
    });
    return affectedRows > 0;
  }

  /** 删除 GameConsumptionRecord */
  async delete(gameOrder: string, gameId: number) {
    const deletedRows = await GameConsumptionRecordModel.destroy({
      where: {
        game_order: gameOrder,
        game_id: gameId,
      },
      limit: 1,
    });
    return deletedRows > 0;
  }

  /**
   * 获取未结算的记录（settlement_amount为空且结算日期在当天或以前）
   * @param gameId 游戏ID
   * @param nowPage 当前页码
   * @param pageSize 每页条数
   */
  async getUnsettledRecordsByDate(nowPage = 1, pageSize = 1000) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });

    const whereCondition = {
      settlement_amount: { [Op.is]: null }, // 使用Op.is来查询NULL值
      settlement_time: {
        [Op.lte]: new Date(), // 结算日期在当天或以前
      },
    };

    const result = await GameConsumptionRecordModel.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      include: [
        {
          model: GamesModel,
          as: 'game',
          attributes: ['game_name'],
          foreignKey: 'game_id',
        },
      ],
    });

    return handlePaging(result, nowpage, pagesize);
  }

  /**
   * 获取VBOSS游戏未结算的记录（has_processed为false且settlement_time小于当天）
   * @param nowPage 当前页码
   * @param pageSize 每页条数
   */
  async getVBOSSUnsettledRecords(nowPage = 1, pageSize = 1000) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });

    // 今天的日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereCondition = {
      game_id: 1, // VBOSS游戏ID
      has_processed: false, // 未处理
      settlement_time: {
        [Op.lt]: today, // settlement_time小于当天
      },
    };

    const result = await GameConsumptionRecordModel.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      include: [
        {
          model: GamesModel,
          as: 'game',
          attributes: ['game_name'],
          foreignKey: 'game_id',
        },
        {
          model: UserModel,
          as: 'user',
          attributes: ['username'],
          foreignKey: 'user_id',
        },
      ],
    });

    return handlePaging(result, nowpage, pagesize);
  }

  /**
   * 批量更新VBOSS游戏记录的has_processed为true
   * @param records 需要更新的记录数组，每条记录包含game_order和game_id
   */
  async batchUpdateVBOSSProcessedStatus(
    records: Array<{ game_order: string; game_id: number }>
  ) {
    // 构建批量更新的条件
    const updates = records.map((record) => ({
      update: { has_processed: true },
      where: {
        game_order: record.game_order,
        game_id: record.game_id,
      },
    }));

    // 执行批量更新
    let totalAffectedRows = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const update of updates) {
      // eslint-disable-next-line no-await-in-loop
      const [affectedRows] = await GameConsumptionRecordModel.update(
        update.update,
        { where: update.where }
      );
      totalAffectedRows += affectedRows;
    }

    return totalAffectedRows;
  }

  /**
   * 代理商查询旗下用户的游戏消费记录
   * @param query 查询参数，包含userId（代理商ID）、分页、关键词等
   */
  async getAgentUserRecords(
    query: IList<IGameConsumptionRecord>,
    userId: number
  ) {
    const {
      user_id,
      game_order,
      game_id,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    } = query;

    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });

    const allWhere: any = deleteUseLessObjectKey({
      game_order,
      user_id,
      game_id,
    });

    // 添加关键词搜索
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['game_order', 'result'],
    });
    if (keyWordWhere) {
      allWhere[Op.or] = keyWordWhere;
    }

    // 添加时间范围筛选
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    if (rangTimeWhere) {
      allWhere[rangTimeType!] = rangTimeWhere;
    }

    // 构建权限查询条件
    const permissionWhere = buildPermissionWhere({}, userId);
    // 处理排序
    const orderRes = handleOrder({ orderName, orderBy });

    // 查询数据，关联用户和游戏信息
    const result = await GameConsumptionRecordModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
      include: [
        {
          model: GamesModel,
          as: 'game',
          attributes: ['game_name'],
          foreignKey: 'game_id',
        },
        {
          model: UserModel,
          as: 'user',
          attributes: ['username', 'id'],
          foreignKey: 'user_id',
          where: permissionWhere, // 添加权限过滤条件
        },
      ],
    });

    return handlePaging(result, nowpage, pagesize);
  }
}

export default new GameConsumptionRecordService();
