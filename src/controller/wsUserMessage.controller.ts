import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';
import { COMMON_HTTP_CODE, MSG_MAX_LENGTH } from '@/constant';
import { IList, IWsUserContact, IWsUserMessage } from '@/interface';
import { CustomError } from '@/model/customError.model';
import wsMessageService from '@/service/wsMessage.service';
import wsUserContactService from '@/service/wsUserContact.service';
import wsUserMessageService from '@/service/wsUserMessage.service';

class WsMessageController {
  common = {
    update: ({
      id,
      live_record_id,
      username,
      origin_username,
      content_type,
      content,
      origin_content,
      live_room_id,
      user_id,
      client_ip,
      client_app,
      client_app_version,
      client_env,
      msg_type,
      user_agent,
      send_msg_time,
      is_show,
      remark,
    }) =>
      wsMessageService.update({
        id,
        live_record_id,
        username,
        origin_username,
        content_type,
        content,
        origin_content,
        live_room_id,
        user_id,
        client_ip,
        client_app,
        client_app_version,
        client_env,
        msg_type,
        user_agent,
        send_msg_time,
        is_show,
        remark,
      }),
    getLastMessagesByTargetUserId: async (targetUserId: number) => {
      const result = await wsUserMessageService.getLastMessagesByTargetUserId(
        targetUserId
      );
      return result;
    },
    getList: async (data: IList<IWsUserMessage>) => {
      const result = await wsUserMessageService.getList(data);
      return result;
    },
    create: (INFO: IWsUserMessage) => {
      if (INFO.origin_content && INFO.origin_content?.length > MSG_MAX_LENGTH) {
        throw new CustomError({
          msg: `消息长度最大${MSG_MAX_LENGTH}！`,
          httpStatusCode: COMMON_HTTP_CODE.paramsError,
          errorCode: COMMON_HTTP_CODE.paramsError,
        });
      }
      return wsUserMessageService.create(INFO);
    },
    isExistByUserContact: (userId: number, userId2: number) =>
      wsUserContactService.isExistByUserContact(userId, userId2),
    createContact: (data: IWsUserContact) => wsUserContactService.create(data),
  };

  update = async (ctx: ParameterizedContext, next) => {
    const data = ctx.request.body;
    const res = await this.common.update(data);
    successHandler({ ctx, data: res });
    await next();
  };

  getList = async (ctx: ParameterizedContext, next) => {
    const data: IWsUserMessage = ctx.request.query;
    const result = await this.common.getList(data);
    successHandler({ ctx, data: result });
    await next();
  };

  customerServiceList = async (ctx: ParameterizedContext, next) => {
    const data: IWsUserMessage = ctx.request.body;
    let contact = await this.common.isExistByUserContact(
      data.source_user_id!,
      data.target_user_id!
    );
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    if (!contact) {
      contact = await this.common.createContact({
        user_id: data.source_user_id!,
        target_user_id: data.target_user_id!,
        is_show: false,
        status: 1,
        type: 1,
      });
    }
    data.ws_user_contact_id = contact.id;
    const result = await this.common.getList(data);
    successHandler({
      ctx,
      data: {
        list: result,
        contact: contact.id,
      },
    });
    await next();
  };

  getLastMessagesByTargetUserId = async (ctx: ParameterizedContext, next) => {
    const targetUserId = +ctx.params.targetUserId;
    const result = await wsUserMessageService.getLastMessagesByTargetUserId(
      targetUserId
    );
    successHandler({
      ctx,
      data: result,
    });
    await next();
  };
}

export default new WsMessageController();
