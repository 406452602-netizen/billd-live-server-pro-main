import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
// 从生成的 types 文件导入接口
import { IAdCarousel } from '@/interface';
import { CustomError } from '@/model/customError.model';
import AdCarouselService from '@/service/adCarousel.service';

class AdCarouselController {
  create = async (ctx: ParameterizedContext, next) => {
    const data: IAdCarousel = ctx.request.body;
    const result = await AdCarouselService.create(data);
    successHandler({ ctx, data: result });
    await next();
  };

  find = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await AdCarouselService.find(id);
    if (!result) {
      throw new CustomError({
        msg: `不存在id为${id}的adCarousel记录！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    successHandler({ ctx, data: result });
    await next();
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const data = ctx.request.body;
    const result = await AdCarouselService.getList(data);
    successHandler({ ctx, data: result });
    await next();
  };

  getAllList = async (ctx: ParameterizedContext, next) => {
    const rulest = await AdCarouselService.getAllList();
    successHandler({
      ctx,
      data: rulest,
    });
    await next();
  };

  update = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const data: Partial<IAdCarousel> = ctx.request.body;
    const isUpdated = await AdCarouselService.update(id, data);
    if (!isUpdated) {
      throw new CustomError({
        msg: `更新id为${id}的adCarousel记录失败！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    successHandler({
      ctx,
      data: { message: `id为${id}的adCarousel记录更新成功` },
    });
    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const isDeleted = await AdCarouselService.delete(id);
    if (!isDeleted) {
      throw new CustomError({
        msg: `删除id为${id}的adCarousel记录失败！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    successHandler({
      ctx,
      data: { message: `id为${id}的adCarousel记录删除成功` },
    });
    await next();
  };
}

export default new AdCarouselController();
