import { deleteUseLessObjectKey } from 'billd-utils';
import { Op, literal, where } from 'sequelize';

import { redisClient } from '@/config/redis';
import { LIVE_ROOM_MODEL_EXCLUDE, THIRD_PLATFORM } from '@/constant';
import { IList } from '@/interface';
import areaModel from '@/model/area.model';
import liveRoomModel from '@/model/liveRoom.model';
import qqUserModel from '@/model/qqUser.model';
import roleModel from '@/model/role.model';
import userModel from '@/model/user.model';
import walletModel from '@/model/wallet.model';
import wechatUserModel from '@/model/wechatUser.model';
import gameApiAdapterService from '@/service/gameApiAdapter.service';
import { IUser } from '@/types/IUser';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';
import { buildPermissionWhere } from '@/utils/permissionUtils';

class UserService {
  /** 用户是否存在 */
  async isExist(ids: number[]) {
    const res = await userModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  async usernameLogin({ username, password }: IUser) {
    const result = await userModel.findOne({
      attributes: {
        exclude: ['password'],
      },
      where: {
        username,
        password,
      },
    });
    return result;
  }

  async idLogin({ id, password }: IUser) {
    const result = await userModel.findOne({
      attributes: {
        exclude: ['password'],
      },
      where: {
        id,
        password,
      },
    });
    return result;
  }

  /** 获取用户列表 */
  async getList(
    {
      id,
      orderBy,
      is_admin,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      parent_user_id,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IUser>,
    userId
  ) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      parent_user_id,
      is_admin,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['username', 'desc'],
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
    const result = await userModel.findAndCountAll({
      attributes: {
        exclude: ['password', 'token'],
      },
      order: [...orderRes],
      limit,
      offset,
      where: buildPermissionWhere(allWhere, userId),
      include: [
        {
          model: walletModel,
          // 指定关联键，确保关联查询准确
          foreignKey: 'user_id',
          as: 'wallet',
          attributes: ['balance'],
        },
      ],
      logging: (sql) => {
        console.log(sql);
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 根据id查找用户（不返回password，但返回token） */
  async findAndToken(id: number) {
    const newdata = await userModel.findOne({
      include: [
        {
          model: roleModel,
          through: { attributes: [] },
        },
      ],
      // attributes: {
      //   exclude: ['password'],
      // },
      where: { id },
    });

    const plainObj = newdata?.get();

    return plainObj;
  }

  async findAll(ids: number[]) {
    const result = await userModel.findAll({
      attributes: {
        exclude: ['password', 'token'],
      },
      where: { id: ids },
    });
    return result;
  }

  /** 根据id查找用户（password和token都不返回） */
  async find(id: number) {
    const result = await userModel.findOne({
      attributes: {
        exclude: ['password', 'token'],
      },
      where: { id },
    });
    return result;
  }

  /** 根据id查找用户密码 */
  async findPwd(id: number) {
    const result = await userModel.findOne({
      where: { id },
      attributes: ['password'],
    });
    return result;
  }

  /** 根据id修改用户密码 */
  async updatePwd({ id, password, token }: IUser) {
    const result = await userModel.update(
      { password, token },
      { where: { id }, limit: 1 }
    );
    return result;
  }

  /** 根据id查找用户（包括其他账号信息） */
  async findAccount(id: number) {
    const result = await userModel.findOne({
      include: [
        {
          model: roleModel,
          through: { attributes: [] },
        },
        {
          model: qqUserModel,
          through: {
            attributes: ['third_platform'],
            where: {
              third_platform: THIRD_PLATFORM.qq,
            },
          },
        },
        {
          model: liveRoomModel,
          attributes: {
            exclude: LIVE_ROOM_MODEL_EXCLUDE,
          },
          through: {
            attributes: [],
          },
          include: [
            {
              model: areaModel,
              through: {
                attributes: [],
              },
            },
          ],
        },
      ],
      attributes: {
        exclude: ['password', 'token'],
      },
      where: { id },
    });
    return result;
  }

  /** 获取用户信息 */
  async getUserInfo(id: number) {
    const newdata = await userModel.findOne({
      include: [
        {
          model: qqUserModel,
          through: {
            attributes: ['third_platform'],
            where: {
              third_platform: THIRD_PLATFORM.qq,
            },
          },
        },
        {
          model: wechatUserModel,
          through: {
            attributes: ['third_platform'],
            where: {
              third_platform: THIRD_PLATFORM.wechat,
            },
          },
        },
        {
          model: liveRoomModel,
          include: [
            {
              model: areaModel,
              through: {
                attributes: [],
              },
            },
          ],
          through: {
            attributes: [],
          },
        },
        {
          model: roleModel,
          through: { attributes: [] },
        },
        {
          model: walletModel,
        },
      ],
      attributes: {
        exclude: ['password', 'token'],
        include: [
          // [
          //   literal(
          //     `(select count(*) from comment where from_user_id = ${id})`
          //   ),
          //   'comment_total',
          // ],
          // [
          //   literal(`(select count(*) from star where to_user_id = ${id})`),
          //   'receive_star_total',
          // ],
        ],
      },
      where: { id },
    });
    const plainObj = newdata?.get();

    return plainObj;
  }

  /** 是否同名，区分大小写。同名则返回同名用户的信息,否则返回null */
  async isSameName(username: string) {
    const result = await userModel.findOne({
      attributes: {
        exclude: ['password', 'token'],
      },
      // @ts-ignore
      where: {
        username: where(literal(`BINARY username`), username),
      },
    });
    return result;
  }

  /** 创建用户 */
  async create(data: IUser, options?: any) {
    // 创建用户记录
    const result = await userModel.create(data, options);
    if (!(data.is_agent || data.is_admin)) {
      try {
        // 为所有游戏创建玩家账户
        // 获取所有可用的游戏列表
        const gamesResult = await gameApiAdapterService.getGamesName({});
        const games = gamesResult.rows || [];

        if (games.length > 0) {
          // 并行为所有游戏创建玩家账户
          const createResults = await Promise.all(
            games.map(async (game: any) => {
              try {
                const gameResult = await gameApiAdapterService.createPlayer(
                  game.game_id,
                  {
                    loginId: result?.id,
                    loginPass: data.password,
                    fullName: data.username,
                  }
                );
                return {
                  game_id: game.game_id,
                  game_name: game.game_name,
                  message: gameResult.message || '创建成功',
                };
              } catch (error) {
                console.error(
                  `游戏 ${!game.game_name} (ID: ${Number(
                    game.game_id
                  )}) 创建玩家失败:`,
                  error
                );
                return {
                  game_id: game.game_id,
                  game_name: game.game_name,
                  success: false,
                  message: error instanceof Error ? error.message : '创建失败',
                };
              }
            })
          );

          // 记录创建结果日志
          console.log(
            `用户 ${data.username!} 在各游戏平台的创建结果:`,
            createResults
          );

          // 检查是否有至少一个游戏创建成功
          const hasSuccess = createResults.some(
            (resultData) => resultData.success
          );
          if (!hasSuccess && games.length > 0) {
            console.error(
              `所有游戏平台创建玩家账户失败，用户名: ${data.username!}`
            );
            // 即使所有游戏创建失败，仍继续创建用户，但记录警告
          }
        } else {
          console.log(
            `没有可用的游戏平台，跳过游戏账户创建，用户名: ${data.username!}`
          );
        }
      } catch (error) {
        console.error(`游戏账户创建过程出错，用户名: ${data.username!}`, error);
        // 即使游戏账户创建过程出错，仍继续创建用户，但记录警告
      }
    }
    // 添加3秒延迟来模拟注释请求时间
    // await new Promise(resolve => setTimeout(resolve, 3000));

    return result;
  }

  async createAgentUser(userData: any) {
    const userAddData = { ...userData };
    userAddData.is_agent = 1;
    const result = await this.create(userAddData);
    return result;
  }

  async updateAgentUser(userId: number, userData: any) {
    const { parent_id } = userData;
    if (parent_id !== undefined) {
      let ancestors = '';
      if (parent_id) {
        const parentUser = await userModel.findByPk(parent_id);
        if (parentUser) {
          const parentAncestors = parentUser.get('ancestors') as string;
          ancestors = parentAncestors
            ? // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              `${parentAncestors},${parent_id}`
            : // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              `${parent_id}`;
        }
      }
      // eslint-disable-next-line no-param-reassign
      userData.ancestors = ancestors;
      // 同时更新该用户所有子用户的 ancestors 字段
      const descendants = await this.getAllDescendantIds(userId);
      // eslint-disable-next-line no-restricted-syntax
      for (const descendantId of descendants) {
        // eslint-disable-next-line no-await-in-loop
        const descendant = await userModel.findByPk(descendantId);
        if (descendant) {
          const newAncestors = `${ancestors},${userId}`;
          // eslint-disable-next-line no-await-in-loop
          await descendant.update({ ancestors: newAncestors });
        }
      }
    }
    return userModel.update(userData, { where: { id: userId } });
  }

  /**
   * 获取指定用户的所有下级用户 ID
   * @param userId 指定用户的 ID
   * @returns 下级用户 ID 数组
   */
  async getAllDescendantIds(userId: number) {
    const currentUser = await userModel.findByPk(userId);
    if (!currentUser) {
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const currentAncestors = `${currentUser.get('ancestors') || ''},${userId}`;

    const descendants = await userModel.findAll({
      attributes: ['id'],
      where: {
        // @ts-ignore
        ancestors: {
          [Op.like]: `${currentAncestors}%`,
        },
        id: {
          [Op.ne]: userId, // 排除当前用户自身
        },
      },
    });
    return descendants.map((user) => user.get('id'));
  }

  /** 根据id修改用户 */
  async update(
    {
      id,
      username,
      password,
      status,
      avatar,
      desc,
      is_agent,
      ancestors,
      token,
      remark,
    }: IUser,
    options?: any
  ) {
    const result = await userModel.update(
      {
        username,
        password,
        status,
        avatar,
        desc,
        token,
        remark,
        is_agent,
        ancestors,
      },
      { where: { id }, limit: 1, ...options }
    );
    return result;
  }

  /** 删除用户 */
  async delete(id: number) {
    const result = await userModel.destroy({ where: { id }, limit: 1 });
    return result;
  }

  /**
   * 查询用户的代理用户信息
   * @param userId 用户id
   * @returns 用户的代理用户信息列表
   */
  async getAgentUsersInfo(userId: number) {
    // 定义Redis键名
    const redisKey = `agent:info:${userId}`;
    const cacheTtl = 1296000; // 缓存半个月

    try {
      // 尝试从Redis获取缓存数据
      const cachedData = await redisClient.get(redisKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // 先查询用户基本信息
      const user = await userModel.findOne({
        where: { id: userId },
        attributes: ['id', 'username', 'ancestors'],
      });

      if (!user || !user.ancestors) {
        return user;
      }

      // 独立查询代理商信息，确保返回数组格式
      const agentUsers = await userModel.findAll({
        where: literal(`FIND_IN_SET(id, :ancestors)`),
        replacements: { ancestors: user.ancestors },
        attributes: [
          'id',
          'username',
          'avatar',
          'desc',
          'is_agent',
          'parent_id',
          'link_identifier',
          'agent_account_for',
          'ancestors',
        ],
      });

      // 构建结果对象，保持与原有结构一致但确保agentUsers是数组
      const result = {
        ...user.toJSON(),
        agentUsers: agentUsers || [],
      };

      // 将结果存入Redis缓存
      await redisClient.setEx(redisKey, cacheTtl, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('获取用户代理信息出错:', error);
      // 出错时降级为直接查询数据库
      const user = await userModel.findOne({
        where: { id: userId },
        attributes: ['id', 'username', 'ancestors'],
      });

      if (!user || !user.ancestors) {
        return user;
      }

      const agentUsers = await userModel.findAll({
        where: literal(`FIND_IN_SET(id, :ancestors)`),
        replacements: { ancestors: user.ancestors },
        attributes: [
          'id',
          'username',
          'avatar',
          'desc',
          'is_agent',
          'parent_id',
          'link_identifier',
          'agent_account_for',
          'ancestors',
        ],
      });

      return {
        ...user.toJSON(),
        agentUsers: agentUsers || [],
      };
    }
  }
}

export default new UserService();
