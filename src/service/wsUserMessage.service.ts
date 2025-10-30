import { deleteUseLessObjectKey } from 'billd-utils';
import { Op } from 'sequelize';

import { IList, IWsUserMessage } from '@/interface';
import userModel from '@/model/user.model';
import wsUserMessageModel from '@/model/wsUserMessage.model';
import { handleOrder, handleRangTime } from '@/utils';

wsUserMessageModel.belongsTo(userModel, {
  foreignKey: 'source_user_id',
  as: 'sourceUser',
});

wsUserMessageModel.belongsTo(userModel, {
  foreignKey: 'target_user_id',
  as: 'targetUser',
});

class WsUserMessageService {
  /** 获取消息列表 */
  async getList(info: IList<IWsUserMessage>) {
    const allWhere: any = deleteUseLessObjectKey({
      id: info.id,
      ws_user_contact_id: info.ws_user_contact_id,
    });
    const rangTimeWhere = handleRangTime({
      rangTimeType: info.rangTimeType,
      rangTimeStart: info.rangTimeStart,
      rangTimeEnd: info.rangTimeEnd,
    });
    if (rangTimeWhere) {
      allWhere[info.rangTimeType!] = rangTimeWhere;
    }
    const orderRes = handleOrder({
      orderName: info.orderName,
      orderBy: info.orderBy,
    });
    const userWhere = deleteUseLessObjectKey({});

    const result = await wsUserMessageModel.findAll({
      include: [
        {
          model: userModel,
          foreignKey: 'source_user_id',
          as: 'sourceUser',
          where: {
            ...userWhere,
          },
        },
        {
          model: userModel,
          foreignKey: 'target_user_id',
          as: 'targetUser',
          where: {
            ...userWhere,
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

  /**
   * 获取每个目标用户的最后一条聊天记录
   * @param userId - 目标用户 ID
   * @returns 包含最后一条聊天内容、时间、用户名称和头像的数组
   */
  async getLastMessagesByTargetUserId(userId: number) {
    // 子查询，找出每个目标用户的最后一条消息的 ID
    const subQuery = await wsUserMessageModel.findAll({
      attributes: [
        [
          wsUserMessageModel.sequelize!.fn(
            'MAX',
            wsUserMessageModel.sequelize!.col('id')
          ),
          'maxId',
        ],
        'target_user_id',
      ],
      where: {
        target_user_id: userId,
      },
      group: ['source_user_id'],
      logging: (sql) => {
        console.log(sql);
      },
    });

    const maxIds = subQuery.map((item) => item.get('maxId'));

    const whereDetail = {
      id: {
        [Op.in]: maxIds,
      },
    };
    // 查询最后一条消息的详细信息，包括用户名称和头像
    const result = await wsUserMessageModel.findAll({
      where: whereDetail,
      include: [
        {
          model: userModel,
          as: 'sourceUser',
          attributes: ['username', 'avatar', 'id'],
        },
      ],
      attributes: ['content', 'send_message_time', 'ws_user_contact_id'],
    });

    return result;
  }

  async update(info: IWsUserMessage) {
    const result = await wsUserMessageModel.update(info, {
      where: { id: info.id! },
      limit: 1,
    });
    return result;
  }

  async create(info: IWsUserMessage) {
    const result = await wsUserMessageModel.create(info);
    return result;
  }
}

export default new WsUserMessageService();
