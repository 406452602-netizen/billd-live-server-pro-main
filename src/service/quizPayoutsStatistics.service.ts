import { deleteUseLessObjectKey } from 'billd-utils';
import { Op, QueryTypes, Transaction } from 'sequelize';

// 从生成的 types 文件导入接口
import { IList } from '@/interface';
import QuizPayoutsStatisticsModel from '@/model/quizPayoutsStatistics.model';
import { IQuizPayoutsStatistics } from '@/types/IQuiz';
import { handleOrder, handlePage, handlePaging, handleRangTime } from '@/utils';

class QuizPayoutsStatisticsService {
  /** QuizPayoutsStatistics 是否存在 */
  async isExist(ids: number[]) {
    const res = await QuizPayoutsStatisticsModel.count({
      where: {
        user_id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 创建 QuizPayoutsStatistics */
  async create(data: IQuizPayoutsStatistics, options?: any) {
    const result = await QuizPayoutsStatisticsModel.create(data, options);
    return result;
  }

  /**
   * 分页查询父级下级及其代理链统计数据（带时间范围）
   * @param params 查询参数（含分页、时间范围）
   */
  async getSubordinatesWithStatisticsByPage({
    parent_user_id,
    user_id,
    orderBy = 'DESC',
    orderName = 'amount_flow',
    nowPage = 1,
    pageSize = 10,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IQuizPayoutsStatistics>) {
    // 1. 优先级处理：user_id优先于parent_user_id
    const parentId = user_id ?? parent_user_id;
    const queryField = user_id ? 'id' : 'parent_id'; // 动态查询字段
    if (!parentId) {
      throw new Error('parent_user_id or user_id must be provided');
    }

    // 2. 开始事务
    const transaction =
      (await QuizPayoutsStatisticsModel.sequelize?.transaction()) as Transaction;
    try {
      const { offset, limit, nowpage, pagesize } = handlePage({
        nowPage,
        pageSize,
      });

      // 解析逗号分隔的多排序字段和方向
      const orderNames = orderName?.split(',').map((n) => n.trim()) || [];
      const orderBys =
        orderBy
          ?.split(',')
          .map((o) => o.trim().toUpperCase() as 'ASC' | 'DESC') || [];
      const orderPairs: [string, 'ASC' | 'DESC'][] = orderNames.map(
        (name, index) => [name, orderBys[index] || 'ASC']
      );
      const orderClauses = orderPairs.map(
        ([field, dir]) => `u.${field} ${dir}`
      );
      const orderClause = orderClauses.length
        ? `ORDER BY ${orderClauses.join(', ')}`
        : '';

      // 3. 获取用户列表和基本信息
      // 确保查询字段安全，防止SQL注入
      const safeQueryField = queryField === 'id' ? 'id' : 'parent_id';
      const userQuery = `
        SELECT u.id,
               u.username,
               u.is_agent,
               u.agent_account_for as agent_ratio,
               u.parent_id
        FROM user AS u
        WHERE u.is_agent = true
          and u.\`${safeQueryField}\` = :parentId ${orderClause}
        LIMIT :limit
        OFFSET :offset
      `;
      const userList: any[] =
        (await QuizPayoutsStatisticsModel.sequelize?.query(userQuery, {
          replacements: { parentId, limit, offset },
          type: QueryTypes.SELECT,
          transaction,
        })) || [];

      // 4. 处理时间范围条件 - 只针对 quiz_payouts_statistics 表的 statistical_date 字段
      // 根据需求，时间范围参数只应作用于 statistical_date 字段
      const timeCondition = handleRangTime({
        rangTimeType: 'statistical_date', // 强制使用 statistical_date 字段
        rangTimeStart,
        rangTimeEnd,
      });
      const timeWhere = timeCondition
        ? `AND statistical_date > :startTime AND statistical_date < :endTime`
        : '';
      const timeReplacements = timeCondition
        ? {
            startTime: new Date(rangTimeStart!),
            endTime: new Date(rangTimeEnd!),
          }
        : {};

      // 5. 如果用户列表为空，直接返回
      if (userList.length === 0) {
        await transaction.commit();
        return {
          nowPage: nowpage,
          pageSize: pagesize,
          total: 0,
          totalPage: 0,
          list: [],
        };
      }

      // 6. 批量获取所有用户的下级信息
      const userIds = userList.map((user) => user.id);

      // 批量获取每个用户的会员数量
      const memberCountsQuery = `
        SELECT parent_id, COUNT(*) AS count
        FROM user
        WHERE parent_id IN (:userIds) AND is_agent = false
        GROUP BY parent_id
      `;
      const memberCountsResult: any[] =
        (await QuizPayoutsStatisticsModel.sequelize?.query(memberCountsQuery, {
          replacements: { userIds },
          type: QueryTypes.SELECT,
          transaction,
        })) || [];

      // 将结果转换为Map，便于快速查找
      const memberCountsMap = new Map<number, number>();
      memberCountsResult.forEach((item) => {
        memberCountsMap.set(item.parent_id, item.count);
      });

      // 7. 批量获取所有用户的统计数据
      const allUserStatsQuery = `
        SELECT user_id,
               amount_result,
               parent_divided_into
        FROM quiz_payouts_statistics
        WHERE user_id IN (:userIds)
          ${timeWhere}
      `;
      const allUserStats: any[] =
        (await QuizPayoutsStatisticsModel.sequelize?.query(allUserStatsQuery, {
          replacements: { userIds, ...timeReplacements },
          type: QueryTypes.SELECT,
          transaction,
        })) || [];

      // 将用户统计数据转换为Map
      const userStatsMap = new Map<number, any>();
      allUserStats.forEach((item) => {
        userStatsMap.set(item.user_id, item);
      });

      // 8. 批量获取所有用户的下级统计数据 - 修复查询逻辑，应该查询user_id而不是parent_user_id
      // 说明：当查询直接下级用户的统计数据时，应该使用user_id作为查询条件
      const allLowerLevelStatsQuery = `
        SELECT user_id                          AS ancestor_id,
               SUM(amount_result)               AS total_lower_level_amount_result,
               SUM(lower_level_flow)            AS total_lower_level_flow,
               SUM(lower_level_actual_flow)     AS total_lower_level_actual_flow,
               SUM(lower_level_settlement_flow) AS total_lower_level_total_win_lose
        FROM quiz_payouts_statistics
        WHERE user_id IN (:userIds)
          ${timeWhere}
        GROUP BY ancestor_id
      `;
      const allLowerLevelStats: any[] =
        (await QuizPayoutsStatisticsModel.sequelize?.query(
          allLowerLevelStatsQuery,
          {
            replacements: { userIds, ...timeReplacements },
            type: QueryTypes.SELECT,
            transaction,
          }
        )) || [];

      // 将下级统计数据转换为Map
      const lowerLevelStatsMap = new Map<number, any>();
      allLowerLevelStats.forEach((item) => {
        lowerLevelStatsMap.set(parseInt(item.ancestor_id, 10), item);
      });

      // 9. 处理用户数据
      const processedData = userList.map((user) => {
        const userId = user.id;
        const userStatsData = userStatsMap.get(userId) || {};
        const lowerLevelStatsData = lowerLevelStatsMap.get(userId) || {};
        const member_count = memberCountsMap.get(userId) || 0;

        // 计算统计数据
        const lower_level_amount_result = parseFloat(
          lowerLevelStatsData.total_lower_level_amount_result || '0'
        );
        const lower_level_flow = parseFloat(
          lowerLevelStatsData.total_lower_level_flow || '0'
        );
        const lower_level_actual_flow = parseFloat(
          lowerLevelStatsData.total_lower_level_actual_flow || '0'
        );
        const lower_level_total_win_lose = parseFloat(
          lowerLevelStatsData.total_lower_level_total_win_lose || '0'
        );
        const user_amount_result = parseFloat(
          userStatsData.amount_result || '0'
        );

        // 上级交收 = 当前用户收益 + 下级用户收益
        const parent_settlement =
          user_amount_result + lower_level_amount_result;

        return {
          user_id: userId,
          user_name: user.username,
          member_count,
          parent_settlement,
          user_amount_result,
          parent_divided_into: parseFloat(
            userStatsData.parent_divided_into || '0'
          ),
          lower_level_amount_result,
          lower_level_flow,
          lower_level_actual_flow,
          lower_level_total_win_lose,
          agent_ratio: user.agent_ratio || 0,
          is_agent: user.is_agent || false,
        };
      });

      // 10. 获取总数量
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM user AS u
        WHERE u.is_agent = true
          and u.\`${safeQueryField}\` = :parentId
      `;
      const countResult: any =
        (await QuizPayoutsStatisticsModel.sequelize?.query(countQuery, {
          replacements: { parentId },
          type: QueryTypes.SELECT,
          transaction,
        })) || [{}];
      const total = Number(countResult[0]?.total || 0);

      // 提交事务
      await transaction.commit();

      return handlePaging(
        { rows: processedData, count: total },
        nowpage,
        pagesize
      );
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /** 查找 QuizPayoutsStatistics */
  async find(user_id: number) {
    const result = await QuizPayoutsStatisticsModel.findOne({
      where: { user_id },
    });
    return result;
  }

  async changeAmountStatisticsByUserId({
    parent_divided_into,
    user_id,
    amount_flow,
    amount_actual_flow,
    amount_result,
    lower_level_flow,
    lower_level_settlement_flow,
    lower_level_actual_flow,
    statistical_date,
    parent_user_id,
    ancestors,
    link_identifier,
  }: IQuizPayoutsStatistics) {
    // 参数验证
    if (!user_id) {
      throw new Error('user_id is required');
    }

    // 验证ancestors字段 - 根据模型定义，这是必填字段
    if (!ancestors) {
      throw new Error(`ancestors is required for user_id: ${user_id}`);
    }

    // 验证link_identifier字段 - user_id为1时可以为空，其他用户必须提供
    if (user_id !== 1 && !link_identifier) {
      throw new Error(
        `link_identifier is required for non-admin user: ${user_id}`
      );
    }

    // 如果没有提供statistical_date，则使用当前日期
    const currentDate =
      statistical_date || new Date().toISOString().split('T')[0];

    // 开始事务
    const transaction =
      (await QuizPayoutsStatisticsModel.sequelize?.transaction()) as Transaction;
    try {
      // 使用INSERT ... ON DUPLICATE KEY UPDATE语法实现upsert操作，减少一次查询
      // 这种方式比先查询再插入/更新更高效
      const sql = `
        INSERT INTO quiz_payouts_statistics (user_id,
                                             statistical_date,
                                             parent_user_id,
                                             parent_divided_into,
                                             amount_flow,
                                             amount_actual_flow,
                                             amount_result,
                                             lower_level_flow,
                                             lower_level_settlement_flow,
                                             lower_level_actual_flow,
                                             ancestors,
                                             link_identifier)
        VALUES (:user_id,
                :statistical_date,
                :parent_user_id,
                :parent_divided_into,
                :amount_flow,
                :amount_actual_flow,
                :amount_result,
                :lower_level_flow,
                :lower_level_settlement_flow,
                :lower_level_actual_flow,
                :ancestors,
                :link_identifier) ON DUPLICATE KEY
        UPDATE
          parent_divided_into =
          CASE WHEN :parent_divided_into IS NOT NULL THEN
          \`parent_divided_into\` + :parent_divided_into
          ELSE
          \`parent_divided_into\`
        END
        ,
          amount_flow =
            CASE WHEN :amount_flow IS NOT NULL THEN
              \`amount_flow\` + :amount_flow
            ELSE
              \`amount_flow\`
        END
        ,
          amount_actual_flow =
            CASE WHEN :amount_actual_flow IS NOT NULL THEN
              \`amount_actual_flow\` + :amount_actual_flow
            ELSE
              \`amount_actual_flow\`
        END
        ,
          amount_result =
            CASE WHEN :amount_result IS NOT NULL THEN
              \`amount_result\` + :amount_result
            ELSE
              \`amount_result\`
        END
        ,
          lower_level_flow =
            CASE WHEN :lower_level_flow IS NOT NULL THEN
              \`lower_level_flow\` + :lower_level_flow
            ELSE
              \`lower_level_flow\`
        END
        ,
          lower_level_settlement_flow =
            CASE WHEN :lower_level_settlement_flow IS NOT NULL THEN
              \`lower_level_settlement_flow\` + :lower_level_settlement_flow
            ELSE
              \`lower_level_settlement_flow\`
        END
        ,
          lower_level_actual_flow =
            CASE WHEN :lower_level_actual_flow IS NOT NULL THEN
              \`lower_level_actual_flow\` + :lower_level_actual_flow
            ELSE
              \`lower_level_actual_flow\`
        END
        ,
          updated_at = NOW()
      `;

      const replacements = {
        user_id,
        statistical_date: currentDate,
        parent_user_id,
        parent_divided_into: parent_divided_into || 0,
        amount_flow: amount_flow || 0,
        amount_actual_flow: amount_actual_flow || 0,
        amount_result: amount_result || 0,
        lower_level_flow: lower_level_flow || 0,
        lower_level_settlement_flow: lower_level_settlement_flow || 0,
        lower_level_actual_flow: lower_level_actual_flow || 0,
        ancestors,
        link_identifier,
      };

      const result = await QuizPayoutsStatisticsModel.sequelize?.query(sql, {
        replacements,
        type: QueryTypes.INSERT,
        transaction,
      });

      // 提交事务
      await transaction.commit();

      // 检查影响行数
      // result[1]表示受影响的行数（如果是更新）或插入的行数
      // 如果是插入，我们需要返回记录对象以保持与原始方法相同的返回格式
      if (result && result[1] === 0) {
        // 如果是插入，查询插入的记录
        const newRecord = await QuizPayoutsStatisticsModel.findOne({
          where: {
            user_id,
            statistical_date: currentDate,
          },
        });
        return [1, [newRecord]];
      }

      // 如果是更新，返回受影响的行数
      return [result ? result[1] : 0];
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /** 获取 QuizPayoutsStatistics 列表 */
  async getList({
    user_id,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IQuizPayoutsStatistics>) {
    // 开始事务
    const transaction =
      (await QuizPayoutsStatisticsModel.sequelize?.transaction()) as Transaction;
    try {
      const { offset, limit, nowpage, pagesize } = handlePage({
        nowPage,
        pageSize,
      });
      const allWhere: any = deleteUseLessObjectKey({
        user_id,
      });

      // 改进关键词搜索 - 基于表结构实际字段进行优化
      if (keyWord) {
        // 根据quiz_payouts_statistics表实际字段调整关键词搜索逻辑
        // 搜索用户ID相关的记录，不搜索不存在的字段
        allWhere[Op.or] = [
          { user_id: { [Op.like]: `%${keyWord}%` } },
          { parent_user_id: { [Op.like]: `%${keyWord}%` } },
          { link_identifier: { [Op.like]: `%${keyWord}%` } },
        ];
      }

      // 优化时间范围处理 - 确保使用正确的字段名
      if (rangTimeType && (rangTimeStart || rangTimeEnd)) {
        // 确保时间字段存在于表结构中
        const validTimeFields = [
          'created_at',
          'updated_at',
          'deleted_at',
          'statistical_date',
        ];
        if (validTimeFields.includes(rangTimeType)) {
          const timeCondition = handleRangTime({
            rangTimeType,
            rangTimeStart,
            rangTimeEnd,
          });
          if (timeCondition) {
            allWhere[rangTimeType] = timeCondition;
          }
        }
      }

      // 处理排序逻辑
      const orderRes = handleOrder({
        orderName,
        orderBy,
      });

      // 过滤排序字段，只允许表中实际存在的字段进行排序
      const validOrderFields = [
        'user_id',
        'parent_user_id',
        'amount_flow',
        'amount_actual_flow',
        'amount_result',
        'lower_level_flow',
        'created_at',
        'updated_at',
      ];

      // 过滤无效的排序字段
      const filteredOrderRes = orderRes.filter((orderItem) => {
        const fieldName = Array.isArray(orderItem)
          ? orderItem[orderItem.length - 2]
          : orderItem[0];
        return validOrderFields.includes(fieldName);
      });

      // 排除不必要的字段，提高查询效率
      const attributes = [
        'user_id',
        'parent_user_id',
        'parent_divided_into',
        'amount_flow',
        'amount_actual_flow',
        'amount_result',
        'lower_level_flow',
        'lower_level_settlement_flow',
        'lower_level_actual_flow',
        'ancestors',
        'link_identifier',
        'created_at',
        'updated_at',
      ];

      const result = await QuizPayoutsStatisticsModel.findAndCountAll({
        order: [...filteredOrderRes],
        limit,
        offset,
        where: {
          ...allWhere,
        },
        attributes,
        transaction,
      });

      // 提交事务
      await transaction.commit();

      return handlePaging(result, nowpage, pagesize);
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /** 修改 QuizPayoutsStatistics */
  async update(user_id: number, data: Partial<IQuizPayoutsStatistics>) {
    // 开始事务
    const transaction =
      (await QuizPayoutsStatisticsModel.sequelize?.transaction()) as Transaction;
    try {
      // 验证数据完整性
      if (!user_id) {
        throw new Error('user_id is required');
      }

      // 删除无效字段
      const validData = deleteUseLessObjectKey({ ...data });

      // 执行更新操作
      const [affectedRows] = await QuizPayoutsStatisticsModel.update(
        validData,
        {
          where: { user_id },
          limit: 1,
          transaction,
        }
      );

      // 提交事务
      await transaction.commit();

      return affectedRows > 0;
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }

  /** 删除 QuizPayoutsStatistics */
  async delete(user_id: number) {
    // 开始事务
    const transaction =
      (await QuizPayoutsStatisticsModel.sequelize?.transaction()) as Transaction;
    try {
      // 验证数据完整性
      if (!user_id) {
        throw new Error('user_id is required');
      }

      // 执行删除操作
      const deletedRows = await QuizPayoutsStatisticsModel.destroy({
        where: { user_id },
        limit: 1,
        transaction,
      });

      // 提交事务
      await transaction.commit();

      return deletedRows > 0;
    } catch (error) {
      // 回滚事务
      await transaction.rollback();
      throw error;
    }
  }
}

export default new QuizPayoutsStatisticsService();
