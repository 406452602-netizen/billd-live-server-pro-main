import { Op, Sequelize } from 'sequelize';

import { IUser } from '@/types/IUser';

/**
 * 构建带权限控制的查询条件
 * @param currentUserId 当前用户 ID
 * @param originalWhere 原始查询条件
 * @param transaction 数据库事务
 * @returns 带权限控制的查询条件
 */
export function buildPermissionWhere(
  originalWhere: Record<string, any>,
  userId: number
) {
  return {
    ...originalWhere,
    [Op.and]: [Sequelize.literal(`FIND_IN_SET(${userId}, ancestors)`)],
  };
}

export function getAncestors(userInfo: IUser, ancestors: string) {
  return `${ancestors},${userInfo.id!}`;
}
