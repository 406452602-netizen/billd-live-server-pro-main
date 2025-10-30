import { ParameterizedContext } from 'koa';

import { authJwt } from '@/app/auth/authJwt';
import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE } from '@/constant';
import {
  auditStatusEnum,
  IBank,
  IList,
  IRechargeRecord,
  IUserBankCard,
  IWallet,
  IWithdrawalRecord,
} from '@/interface';
import configModel from '@/model/config.model';
import { CustomError } from '@/model/customError.model';
import bankService from '@/service/bank.service';
import rechargeRecordService from '@/service/rechargeRecord.service';
import userBankCardService from '@/service/userBankCard.service';
import walletService from '@/service/wallet.service';
import withdrawalRecordService from '@/service/withdrawalRecord.service';

class WalletController {
  common = {
    create: ({ user_id, balance }: IWallet) =>
      walletService.create({ user_id, balance }),
    findByUserId: (userId: number) => walletService.findByUserId(userId),
    updateByUserId: ({ user_id, balance }: IWallet) =>
      walletService.updateByUserId({ user_id, balance }),
    changeBalanceByUserId: ({ user_id, balance }: IWallet) =>
      walletService.changeBalanceByUserId({ user_id, balance }),
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const {
      id,
      user_id,
      balance,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    }: IList<IWallet> = ctx.request.query;
    const result = await walletService.getList({
      id,
      user_id,
      balance,
      orderBy,
      orderName,
      nowPage,
      pageSize,
      keyWord,
      rangTimeType,
      rangTimeStart,
      rangTimeEnd,
    });
    successHandler({ ctx, data: result });
    await next();
  };

  find = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await walletService.find(id);
    successHandler({ ctx, data: result });
    await next();
  };

  findMyWallet = async (ctx: ParameterizedContext, next) => {
    const { code, errorCode, userInfo, msg } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const result = await this.common.findByUserId(userInfo.id!);
    successHandler({ ctx, data: result });
    await next();
  };

  changeWallet = async (ctx: ParameterizedContext, next) => {
    const data: any = ctx.request.body;
    const userId = ctx.state.userInfo.id;
    if (data.balance === 0) {
      throw new CustomError({
        msg: '充值金额不能为零',
        httpStatusCode: COMMON_HTTP_CODE,
        errorCode: 10001,
      });
    }
    await rechargeRecordService.create({
      user_id: data.user_id,
      remark: data.remark!,
      status: 1,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
      amount: data.amount!,
      is_admin_change: true,
    });
    await walletService.changeBalanceByUserId({
      user_id: data.user_id,
      balance: data.amount!,
    });
    successHandler({ ctx });
    await next();
  };

  getBankCards = async (ctx: ParameterizedContext, next) => {
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const data: IList<IUserBankCard> = ctx.request.query;
    if (userInfo.id !== 1) {
      data.user_id = userInfo?.id;
    }
    let result;
    if (data) {
      result = await userBankCardService.getList(data);
    } else {
      result = await userBankCardService.getList({
        user_id: userInfo?.id,
        nowPage: 1,
        pageSize: 1000,
        orderBy: 'desc',
        orderName: 'id',
      } as IList<IUserBankCard>);
    }

    successHandler({ ctx, data: result });
    await next();
  };

  getBankCard = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await userBankCardService.find(id);
    successHandler({ ctx, data: result });
    await next();
  };

  getBankList = async (ctx: ParameterizedContext, next) => {
    // @ts-ignore
    const data: IList<IBank> = ctx.request.query;
    let result;
    if (data) {
      result = await bankService.getList(data);
    } else {
      result = await bankService.getList({
        nowPage: 1,
        pageSize: 1000,
        orderBy: 'desc',
        orderName: 'id',
      } as IList<IBank>);
    }
    successHandler({ ctx, data: result });
    await next();
  };

  createUserBankCard = async (ctx: ParameterizedContext, next) => {
    const data: IUserBankCard = ctx.request.body;
    const result = await userBankCardService.create({
      ...data,
      user_id: ctx.state.userInfo.id,
    });
    successHandler({ ctx, data: result });
    await next();
  };

  updateUserBankCard = async (ctx: ParameterizedContext, next) => {
    const data: IUserBankCard = ctx.request.body;
    const result = await userBankCardService.update(data.id!, data);
    successHandler({ ctx, data: result });
    await next();
  };

  deleteUserBankCard = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await userBankCardService.delete(id);
    successHandler({ ctx, data: result });
    await next();
  };

  createBank = async (ctx: ParameterizedContext, next) => {
    const data: IBank = ctx.request.body;
    const result = await bankService.create(data);
    successHandler({ ctx, data: result });
    await next();
  };

  updateBank = async (ctx: ParameterizedContext, next) => {
    const data: IBank = ctx.request.body;
    const result = await bankService.update(data.id!, data);
    successHandler({ ctx, data: result });
    await next();
  };

  deleteBank = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await bankService.delete(id);
    successHandler({ ctx, data: result });
    await next();
  };

  createRechargeRecords = async (ctx: ParameterizedContext, next) => {
    const data: IRechargeRecord = ctx.request.body;
    if (!data.user_id) {
      data.user_id = ctx.state.userInfo.id;
    }
    if (data.status && data.status === auditStatusEnum.APPROVED) {
      walletService.changeBalanceByUserId({
        user_id: data.user_id,
        balance: data.amount!,
      });
    }
    const result = await rechargeRecordService.create(data);
    successHandler({ ctx, data: result });
    await next();
  };

  getRechargeRecords = async (ctx: ParameterizedContext, next) => {
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const data: IList<IRechargeRecord> = ctx.request.query;
    if (!userInfo.is_agent) {
      data.user_id = userInfo.id;
    }
    let result;
    if (data) {
      result = await rechargeRecordService.getList(data);
    } else {
      result = await rechargeRecordService.getList({
        user_id: userInfo?.id,
        nowPage: 1,
        pageSize: 1000,
        orderBy: 'desc',
        orderName: 'id',
      } as IList<IRechargeRecord>);
    }

    successHandler({ ctx, data: result });
    await next();
  };

  getRechargeRecord = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await rechargeRecordService.find(id);
    successHandler({ ctx, data: result });
    await next();
  };

  updateRechargeRecord = async (ctx: ParameterizedContext, next) => {
    const { body } = ctx.request;
    const result = await rechargeRecordService.update(body.id!, body);
    successHandler({ ctx, data: result });
    await next();
  };

  auditRechargeRecords = async (ctx: ParameterizedContext, next) => {
    let data = ctx.request.body;
    const result = await rechargeRecordService.update(data.id!, {
      status: data.status,
      remark: data.remark,
      reviewed_by: ctx.state.userInfo.id,
      reviewed_at: new Date().toISOString(),
    });
    if (result) {
      data = await rechargeRecordService.find(data.id!);
    }
    if (auditStatusEnum.APPROVED === data.status) {
      await walletService.changeBalanceByUserId({
        user_id: data.user_id,
        balance: data.amount!,
      });
    }
    successHandler({ ctx, data: result });
    await next();
  };

  auditWithdrawalRecords = async (ctx: ParameterizedContext, next) => {
    let data = ctx.request.body;
    const result = await withdrawalRecordService.update(data.id!, {
      status: data.status,
      remark: data.remark,
      reviewed_by: ctx.state.userInfo.id,
      reviewed_at: new Date().toISOString(),
    });
    if (result) {
      data = await withdrawalRecordService.find(data.id!);
    }
    if (auditStatusEnum.REJECTED === data.status) {
      await walletService.changeBalanceByUserId({
        user_id: data.user_id,
        balance: data.amount!,
      });
    }
    successHandler({ ctx, data: result });
    await next();
  };

  useRechargeTarget = async (ctx: ParameterizedContext, next) => {
    const { id } = ctx.params;
    configModel.update(
      {
        field_g: id,
      },
      {
        where: { id: 1 },
      }
    );
    successHandler({ ctx });
    await next();
  };

  getUseRechargeTarget = async (ctx: ParameterizedContext, next) => {
    const result = await configModel.findOne({
      where: {
        id: 1,
      },
    });
    const bankCard = await userBankCardService.find(Number(result?.field_g));
    successHandler({ ctx, data: bankCard });
    await next();
  };

  getWithdrawalRecords = async (ctx: ParameterizedContext, next) => {
    const { userInfo, code, msg, errorCode } = await authJwt(ctx);
    if (code !== COMMON_HTTP_CODE.success || !userInfo) {
      throw new CustomError({
        msg,
        httpStatusCode: code,
        errorCode,
      });
    }
    const data: IList<IWithdrawalRecord> = ctx.request.query;
    if (userInfo?.id !== 1) {
      data.user_id = userInfo?.id;
    }
    let result;
    if (data) {
      result = await withdrawalRecordService.getList(data);
    } else {
      result = await withdrawalRecordService.getList({
        user_id: userInfo?.id,
        nowPage: 1,
        pageSize: 1000,
        orderBy: 'desc',
        orderName: 'id',
      });
    }

    successHandler({ ctx, data: result });
    await next();
  };

  getWithdrawalRecord = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const result = await withdrawalRecordService.find(id);
    successHandler({ ctx, data: result });
    await next();
  };

  createWithdrawalRecords = async (ctx: ParameterizedContext, next) => {
    const data: IWithdrawalRecord = ctx.request.body;
    const wallet = await walletService.findByUserId(ctx.state.userInfo.id!);
    if (!wallet) {
      throw new CustomError({
        msg: '错误的用户信息',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    } else if (wallet.balance! < data.amount!) {
      throw new CustomError({
        msg: '余额不足',
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    const result = await withdrawalRecordService.create({
      ...data,
      user_id: ctx.state.userInfo.id!,
    });
    await walletService.changeBalanceByUserId({
      user_id: ctx.state.userInfo.id!,
      balance: -data.amount!,
    });
    successHandler({ ctx, data: result });
    await next();
  };

  update = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const { user_id, balance }: IWallet = ctx.request.body;
    const isExist = await walletService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的直播间！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await walletService.update({
      id,
      user_id,
      balance,
    });
    successHandler({ ctx });
    await next();
  };

  create = async (ctx: ParameterizedContext, next) => {
    const data: IWallet = ctx.request.body;
    await this.common.create(data);
    successHandler({ ctx });
    await next();
  };

  delete = async (ctx: ParameterizedContext, next) => {
    const id = +ctx.params.id;
    const isExist = await walletService.isExist([id]);
    if (!isExist) {
      throw new CustomError({
        msg: `不存在id为${id}的直播间！`,
        httpStatusCode: COMMON_HTTP_CODE.paramsError,
        errorCode: COMMON_HTTP_CODE.paramsError,
      });
    }
    await walletService.delete(id);
    successHandler({ ctx });
    await next();
  };
}

export default new WalletController();
