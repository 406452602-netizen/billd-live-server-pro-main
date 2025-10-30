import { deleteUseLessObjectKey } from 'billd-utils';
import md5 from 'crypto-js/md5';
import { Op } from 'sequelize';

import { LIVE_ROOM_MODEL_EXCLUDE, REDIS_KEY } from '@/constant';
import redisController from '@/controller/redis.controller';
import { IArea, IList } from '@/interface';
import areaModel from '@/model/area.model';
import areaLiveRoomModel from '@/model/areaLiveRoom.model';
import liveModel from '@/model/live.model';
import liveRoomModel from '@/model/liveRoom.model';
import userModel from '@/model/user.model';
import userLiveRoomModel from '@/model/userLiveRoom.model';
import { ILiveRoom } from '@/types/ILiveRoom';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

async function handleGetRedisCache(key: string) {
  try {
    const cache = await redisController.getVal({
      prefix: REDIS_KEY.db_area,
      key,
    });
    if (cache) {
      const res = JSON.parse(cache)?.value;
      return res;
    }
  } catch (error) {
    console.log(error);
  }
  return null;
}

async function handleSetRedisCache({ key, value, exp }: { key; value; exp? }) {
  try {
    await redisController.setExVal({
      prefix: REDIS_KEY.db_area,
      key,
      exp: exp || 60 * 1,
      value,
    });
  } catch (error) {
    console.log(error);
  }
  return null;
}

async function handleDelRedisCache() {
  try {
    let arr = await redisController.findByPrefix({
      prefix: REDIS_KEY.db_area,
    });
    arr = arr.map((v) => v.replace(REDIS_KEY.db_area, ''));
    console.log(arr);
    const queue: any[] = [];
    arr.forEach((key) => {
      queue.push(
        redisController.del({
          prefix: REDIS_KEY.db_area,
          key,
        })
      );
    });
    await Promise.all(queue);
  } catch (error) {
    console.log(error);
  }
  return null;
}

class AreaService {
  /** 分区是否存在 */
  async isExist(ids: number[]) {
    const rediskey = `isExist_${md5(JSON.stringify(ids)).toString()}`;
    const cache = await handleGetRedisCache(rediskey);
    if (cache) {
      return cache;
    }
    const res = await areaModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    const newdata = res === ids.length;
    await handleSetRedisCache({
      key: rediskey,
      value: newdata,
    });

    return newdata;
  }

  /** 获取分区列表 */
  async getList(data: IList<IArea>) {
    const rediskey = `getList_${md5(JSON.stringify(data)).toString()}`;
    const cache = await handleGetRedisCache(rediskey);
    if (cache) {
      return cache;
    }
    const {
      id,
      p_id,
      name,
      status,
      hot_status,
      priority,
      remark,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    } = data;
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      p_id,
      name,
      status,
      hot_status,
      priority,
      remark,
    });
    const keyWordWhere = handleKeyWord({ keyWord, arr: ['name', 'remark'] });
    if (keyWordWhere) {
      allWhere[Op.or] = keyWordWhere;
    }
    const rangTimeWhere = handleRangTime({
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    if (rangTimeWhere && rangTimeType) {
      allWhere[rangTimeType] = rangTimeWhere;
    }
    const orderRes = handleOrder({ orderName, orderBy });
    const result = await areaModel.findAndCountAll({
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });

    const newdata = handlePaging<IArea>(result, nowpage, pagesize);
    await handleSetRedisCache({
      key: rediskey,
      value: newdata,
    });

    return newdata;
  }

  /** 获取分区直播间列表 */
  getLiveRoomList = async (data) => {
    const rediskey = `getLiveRoomList_${md5(JSON.stringify(data)).toString()}`;
    const cache = await handleGetRedisCache(rediskey);
    if (cache) {
      return cache;
    }
    const { area_id, is_show, status, nowPage, pageSize } = data;
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const childWhere = deleteUseLessObjectKey({
      is_show,
      status,
    });
    const result = await liveRoomModel.findAndCountAll({
      limit,
      offset,
      include: [
        {
          model: areaModel,
          through: {
            attributes: [],
          },
          where: { id: area_id },
        },
        {
          model: liveModel,
        },
        {
          model: userModel,
          attributes: {
            exclude: ['password', 'token'],
          },
          through: {
            attributes: [],
          },
        },
      ],
      attributes: {
        exclude: LIVE_ROOM_MODEL_EXCLUDE,
      },
      where: { ...childWhere },
      distinct: true,
    });
    const newdata = handlePaging(result, nowpage, pagesize);
    await handleSetRedisCache({
      key: rediskey,
      value: newdata,
    });

    return newdata;
  };

  /** 获取分区列表 */
  async getAreaLiveRoomList({
    id,
    p_id,
    is_fake,
    is_show,
    status,
    childNowPage,
    childPageSize,
    childOrderName,
    childOrderBy,
    childKeyWord,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<IArea & ILiveRoom>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    let childOffset;
    let childLimit;
    if (childNowPage && childPageSize) {
      childOffset = (+childNowPage - 1) * +childPageSize;
      childLimit = +childPageSize;
    }
    const allWhere: any = deleteUseLessObjectKey({
      id,
      p_id,
    });
    const keyWordWhere = handleKeyWord({ keyWord, arr: ['name', 'remark'] });
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
    const childWhere = deleteUseLessObjectKey({
      is_fake,
      is_show,
      status,
    });
    if (childKeyWord) {
      childWhere[Op.or] = [
        {
          name: {
            [Op.like]: `%${childKeyWord}%`,
          },
        },
        {
          desc: {
            [Op.like]: `%${childKeyWord}%`,
          },
        },
        {
          remark: {
            [Op.like]: `%${childKeyWord}%`,
          },
        },
      ];
    }
    const orderRes = handleOrder({ orderName, orderBy });
    const childOrderRes: any[] = [];
    if (childOrderName && childOrderBy) {
      childOrderRes.push([liveRoomModel, childOrderName, childOrderBy]);
      // childOrderRes.push([
      //   literal(`${liveRoomModel.tableName}.${childOrderName}`),
      //   childOrderBy,
      // ]);
    }
    const result = await areaModel.findAndCountAll({
      limit,
      offset,
      order: [...orderRes],
      where: { ...allWhere },
    });
    const queue: any[] = [];
    result.rows.forEach((item) => {
      queue.push(
        areaLiveRoomModel.findAll({
          limit: childLimit,
          offset: childOffset,
          include: [
            {
              model: liveRoomModel,
              attributes: {
                exclude: LIVE_ROOM_MODEL_EXCLUDE,
              },
              include: [
                {
                  model: userLiveRoomModel,
                  include: [
                    {
                      model: userModel,
                      attributes: {
                        exclude: ['password', 'token'],
                      },
                    },
                  ],
                  attributes: ['id'],
                },
                {
                  model: liveModel,
                  attributes: ['id'],
                },
              ],
              where: { ...childWhere },
            },
          ],
          attributes: [],
          order: [...childOrderRes],
          where: {
            area_id: item.id,
          },
        })
      );
    });
    const result2 = await Promise.all(queue);
    const result3 = result.rows.map((item, index) => {
      return {
        ...item.get(),
        live_rooms: result2[index].map((vv) => {
          const res = {
            ...vv.live_room.get(),
            user: vv.live_room.user_live_room.user,
          };
          delete res.user_live_room;
          return res;
        }),
      };
    });
    return handlePaging(
      { count: result.count, rows: result3 },
      nowpage,
      pagesize
    );
  }

  /** 获取分区列表(不分页) */
  async getAllList(data: IList<IArea>) {
    const rediskey = `getAllList_${md5(JSON.stringify({ data })).toString()}`;
    const cache = await handleGetRedisCache(rediskey);
    if (cache) {
      return cache;
    }
    const {
      id,
      p_id,
      name,
      status,
      hot_status,
      priority,
      remark,
      orderBy,
      orderName,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    } = data;
    const allWhere: any = deleteUseLessObjectKey({
      id,
      p_id,
      name,
      status,
      hot_status,
      priority,
      remark,
    });
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['name', 'remark'],
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
    const newdata = await areaModel.findAll({
      order: [...orderRes],
      where: {
        ...allWhere,
      },
    });

    const plainObj = newdata.map((v) => v.get());
    await handleSetRedisCache({
      key: rediskey,
      value: plainObj,
    });

    return plainObj;
  }

  /** 查找分区 */
  async find(id: number) {
    const rediskey = `find_${md5(JSON.stringify({ id })).toString()}`;
    const cache = await handleGetRedisCache(rediskey);
    if (cache) {
      return cache;
    }
    const newdata = await areaModel.findOne({
      include: [
        {
          model: liveRoomModel,
          attributes: {
            exclude: LIVE_ROOM_MODEL_EXCLUDE,
          },
        },
      ],
      where: { id },
    });

    await handleSetRedisCache({
      key: rediskey,
      value: newdata,
    });

    return newdata;
  }

  /** 查找分区 */
  async findOneByIdPure(id: number): Promise<IArea> {
    const rediskey = `findOneByIdPure_${md5(
      JSON.stringify({ id })
    ).toString()}`;
    const cache = await handleGetRedisCache(rediskey);
    if (cache) {
      return cache;
    }
    const newdata = await areaModel.findOne({
      where: { id },
    });

    const plainObj = newdata?.get() as IArea;
    await handleSetRedisCache({
      key: rediskey,
      value: plainObj,
    });

    return plainObj;
  }

  /** 查找分区 */
  async findAllByPidPure(p_id: number) {
    const rediskey = `findAllByPidPure_${md5(
      JSON.stringify({ p_id })
    ).toString()}`;
    const cache = await handleGetRedisCache(rediskey);
    if (cache) {
      return cache;
    }
    const newdata = await areaModel.findAll({
      where: { p_id },
    });
    await handleSetRedisCache({
      key: rediskey,
      value: newdata,
    });

    return newdata;
  }

  /** 创建分区 */
  async create({ p_id, name, status, hot_status, priority, remark }: IArea) {
    const result = await areaModel.create({
      p_id,
      name,
      status,
      hot_status,
      priority,
      remark,
    });
    await handleDelRedisCache();
    return result;
  }

  /** 修改分区 */
  async update({
    id,
    p_id,
    name,
    status,
    hot_status,
    priority,
    remark,
  }: IArea) {
    const result = await areaModel.update(
      { p_id, name, status, hot_status, priority, remark },
      { where: { id }, limit: 1 }
    );
    await handleDelRedisCache();
    return result;
  }

  /** 删除分区 */
  async delete(id: number) {
    const result = await areaModel.destroy({ where: { id }, limit: 1 });
    await handleDelRedisCache();
    return result;
  }
}

export default new AreaService();
