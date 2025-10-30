import { deleteUseLessObjectKey } from 'billd-utils';
import { literal, Op } from 'sequelize';

import { LIVE_ROOM_MODEL_EXCLUDE } from '@/constant';
import { IList, ILiveRecord } from '@/interface';
import areaModel from '@/model/area.model';
import liveRecordModel from '@/model/liveRecord.model';
import liveRoomModel from '@/model/liveRoom.model';
import userModel from '@/model/user.model';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

class LiveRecordService {
  /** 直播记录是否存在 */
  async isExist(ids: number[]) {
    const res = await liveRecordModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 获取直播记录列表 */
  async getList({
    id,
    client_ip,
    client_env,
    client_app,
    client_app_version,
    live_room_type,
    user_id,
    live_room_id,
    duration,
    danmu,
    view,
    start_time,
    end_time,
    remark,
    childOrderName,
    childOrderBy,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<ILiveRecord>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      live_room_type,
      user_id,
      live_room_id,
      duration,
      danmu,
      view,
      start_time,
      end_time,
      remark,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['client_ip', 'client_app_version', 'remark'],
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
    const childOrderRes: any[] = [];
    if (childOrderName && childOrderBy) {
      childOrderRes.push([liveRoomModel, childOrderName, childOrderBy]);
    }
    const result = await liveRecordModel.findAndCountAll({
      include: [
        {
          model: userModel,
          attributes: {
            exclude: ['password', 'token'],
          },
        },
        {
          model: liveRoomModel,
          attributes: {
            exclude: LIVE_ROOM_MODEL_EXCLUDE,
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
      order: [...orderRes, ...childOrderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
      // 查询liveRecordModel表里user_id等于101的记录，实际liveRecordModel表里user_id等于101的数据有100条
      // 这个查询关联了userModel表，和liveRoomModel表
      // 单纯关联userModel表和liveRoomModel表，不影响实际条数，因为liveRecordModel表的一条记录只会对应一个或者0个userModel表和liveRoomModel表记录
      // 但关联的liveRoomModel表里又关联了areaModel表，而一个liveRoomModel对应多个area记录，
      // 因此出出来的实际数量可能会超过实际的100条，如果需要去重，则需要使用distinct
      distinct: true,
    });
    return handlePaging<ILiveRecord>(result, nowpage, pagesize);
  }

  async statistics1({ live_room_id, user_id, startTime, endTime }) {
    const result = await liveRecordModel.findAll({
      where: {
        ...deleteUseLessObjectKey({ live_room_id, user_id }),
        created_at: {
          [Op.between]: [new Date(startTime), new Date(endTime)],
        },
      },
    });
    return result;
  }

  /** 查找直播记录 */
  async find(id: number) {
    const result = await liveRecordModel.findOne({ where: { id } });
    return result;
  }

  /** 修改直播记录 */
  async updateDuration({ id, duration }: ILiveRecord) {
    const result = await liveRecordModel.update(
      // eslint-disable-next-line
      { duration: literal('`duration` +' + duration) },
      { where: { id }, limit: 1 }
    );

    return result;
  }

  /** 创建直播记录 */
  async create({
    live_id,
    user_id,
    live_room_id,
    live_room_type,
    area_id,
    area_name,
    duration,
    danmu,
    view,
    client_ip,
    client_env,
    client_app,
    client_app_version,
    start_time,
    end_time,
    remark,
  }: ILiveRecord) {
    const result = await liveRecordModel.create({
      live_id,
      user_id,
      live_room_id,
      live_room_type,
      area_id,
      area_name,
      duration,
      danmu,
      view,
      client_ip,
      client_env,
      client_app,
      client_app_version,
      start_time,
      end_time,
      remark,
    });
    return result;
  }

  /** 修改直播记录 */
  async update({
    id,
    live_id,
    user_id,
    live_room_id,
    live_room_type,
    area_id,
    area_name,
    duration,
    danmu,
    view,
    client_ip,
    client_env,
    client_app,
    client_app_version,
    start_time,
    end_time,
    remark,
  }: ILiveRecord) {
    const result = await liveRecordModel.update(
      {
        id,
        live_id,
        user_id,
        live_room_id,
        live_room_type,
        area_id,
        area_name,
        duration,
        danmu,
        view,
        client_ip,
        client_env,
        client_app,
        client_app_version,
        start_time,
        end_time,
        remark,
      },
      { where: { id }, limit: 1 }
    );
    return result;
  }

  /** 删除直播记录 */
  async delete(id: number) {
    const result = await liveRecordModel.destroy({ where: { id }, limit: 1 });
    return result;
  }
}

export default new LiveRecordService();
