import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
import { IArea, IList } from '@/interface';
import { CustomError } from '@/model/customError.model';
import areaService from '@/service/area.service';
import { ILiveRoom } from '@/types/ILiveRoom';
import { arrayToTree } from '@/utils';

class AreaController {
  common = {
    getList: async (data) => {
      const {
        id,
        name,
        remark,
        priority,
        orderBy,
        orderName,
        nowPage,
        pageSize,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      }: IList<IArea> = data;
      const result = await areaService.getList({
        id,
        name,
        remark,
        priority,
        nowPage,
        pageSize,
        orderBy,
        orderName,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      });
      return result;
    },
    getAreaLiveRoomList: async (data) => {
      const {
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
      }: IList<IArea & ILiveRoom> = data;
      const result = await areaService.getAreaLiveRoomList({
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
        nowPage,
        pageSize,
        orderBy,
        orderName,
        keyWord,
        rangTimeType,
        rangTimeStart,
        rangTimeEnd,
      });
      return result;
    },
    findOneByIdPure: (id: number) => areaService.findOneByIdPure(id),
    isExist: (ids: number[]) => areaService.isExist(ids),
    // isExist: async (ids: number[]) => {
    //   const isExist = await areaService.isExist(ids);
    //   if (!isExist) {
    //     throw new CustomError({
    //       msg: `不存在id为${ids.join()}的分区！`,
    //       httpStatusCode: COMMON_HTTP_CODE.paramsError,
    //       errorCode: COMMON_HTTP_CODE.paramsError,
    //     });
    //   }
    // },
    delete: async (id: number, isRoute?: boolean) => {
      const isExist = await areaService.isExist([id]);
      if (!isExist) {
        if (isRoute) {
          throw new CustomError({
            msg: `不存在id为${id}的分区！`,
            httpStatusCode: COMMON_HTTP_CODE.paramsError,
            errorCode: COMMON_HTTP_CODE.paramsError,
          });
        }
      } else {
        await areaService.delete(id);
      }
    },
    getAllChildrenArea: async (id) => {
      const parent = await areaService.findOneByIdPure(id);
      if (!parent) {
        return [];
      }
      const res: any[] = [];
      async function getSubAreas(areaId) {
        const area = await areaService.findAllByPidPure(areaId);
        if (!area.length) {
          return;
        }
        const queue = area.map(async (v) => {
          await getSubAreas(v.id);
        });

        await Promise.all(queue);

        res.push(...area);
      }
      await getSubAreas(parent.id);
      res.unshift(parent);
      return res;
    },
    getAreaInfo: async (id) => {
      const res: any[] = [];
      async function getParentArea(areaId) {
        const area = await areaService.findOneByIdPure(areaId);
        if (!area) {
          return;
        }
        if (area.p_id) {
          await getParentArea(area.p_id);
        }
        res.push(area);
      }
      await getParentArea(id);
      return arrayToTree({
        arr: res,
        idField: 'id',
        pidField: 'p_id',
        childrenField: 'children',
      });
    },
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const res = await this.common.getList(ctx.query);
    successHandler({
      ctx,
      data: res,
    });
    await next();
  };

  // 获取所有分区（树型）
  getAllAreaByTree = async (ctx: ParameterizedContext, next) => {
    const {
      id,
      name,
      p_id,
      status,
      hot_status,
      priority,
      remark,
      orderBy,
      orderName,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IArea> = ctx.request.query;

    const { rows } = await areaService.getAllList({
      id,
      name,
      p_id,
      status,
      hot_status,
      priority,
      remark,
      orderBy,
      orderName,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    const result = arrayToTree({
      arr: rows,
      idField: 'id',
      pidField: 'p_id',
      childrenField: 'children',
    });
    successHandler({ ctx, data: result });

    await next();
  };

  // 获取所有分区
  getAllArea = async (ctx: ParameterizedContext, next) => {
    const {
      id,
      name,
      p_id,
      status,
      hot_status,
      priority,
      remark,
      orderBy,
      orderName,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IArea> = ctx.request.query;

    const result = await areaService.getAllList({
      id,
      name,
      p_id,
      status,
      hot_status,
      priority,
      remark,
      orderBy,
      orderName,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    successHandler({ ctx, data: result });

    await next();
  };

  getAllChildrenArea = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;

    const res = await this.common.getAllChildrenArea(id);
    successHandler({ ctx, data: res });
    await next();
  };

  getAreaInfo = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const res = await this.common.getAreaInfo(id);
    successHandler({ ctx, data: res });
    await next();
  };

  getLiveRoomList = async (ctx: ParameterizedContext, next) => {
    const { id, is_show, status, nowPage, pageSize }: IList<IArea & ILiveRoom> =
      ctx.request.query;
    if (id === undefined) {
      throw new CustomError({
        msg: `id错误！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const allArea = await this.common.getAllChildrenArea(id);
    const result = await areaService.getLiveRoomList({
      area_id: allArea.map((v) => v.id),
      is_show,
      status,
      nowPage,
      pageSize,
    });
    successHandler({ ctx, data: result });

    await next();
  };

  getAreaLiveRoomList = async (ctx: ParameterizedContext, next) => {
    const result = await this.common.getAreaLiveRoomList(ctx.request.query);
    successHandler({ ctx, data: result });

    await next();
  };

  find = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await areaService.find(id);
    successHandler({ ctx, data: result });

    await next();
  };

  create = async (ctx: ParameterizedContext, next) => {
    const data: IArea = ctx.request.body;
    await areaService.create(data);
    successHandler({ ctx });

    await next();
  };

  update = async (ctx: ParameterizedContext, next) => {
    const data: IArea = ctx.request.body;
    if (data.id === undefined) {
      throw new CustomError({
        msg: `id错误！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const isExist = await areaService.isExist([data.id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${data.id}的分区！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await areaService.update(data);
    successHandler({ ctx });
    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    await this.common.delete(id, true);
    successHandler({ ctx });

    await next();
  };
}

export default new AreaController();
