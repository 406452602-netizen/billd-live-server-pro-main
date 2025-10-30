import { deleteUseLessObjectKey, isPureNumber } from 'billd-utils';
import { Op } from 'sequelize';

import { LIVE_ROOM_MODEL_EXCLUDE } from '@/constant';
import { IList } from '@/interface';
import areaModel from '@/model/area.model';
import liveModel from '@/model/live.model';
import liveRecordModel from '@/model/liveRecord.model';
import liveRoomModel from '@/model/liveRoom.model';
import userModel from '@/model/user.model';
import { ILiveRoom } from '@/types/ILiveRoom';
import {
  handleKeyWord,
  handleOrder,
  handlePage,
  handlePaging,
  handleRangTime,
} from '@/utils';

class LiveRoomService {
  /** 直播间是否存在 */
  async isExist(ids: number[]) {
    const res = await liveRoomModel.count({
      where: {
        id: {
          [Op.in]: ids,
        },
      },
    });
    return res === ids.length;
  }

  /** 获取直播间列表 */
  async getList({
    id,
    status,
    is_show,
    is_fake,
    type,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<ILiveRoom>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      status,
      is_show,
      is_fake,
    });
    if (type !== undefined && isPureNumber(`${type}`)) {
      allWhere.type = type;
    }
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['title', 'desc', 'notice_msg', 'system_msg', 'remark'],
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
    const result = await liveRoomModel.findAndCountAll({
      include: [
        {
          model: userModel,
          attributes: {
            exclude: ['password', 'token'],
          },
          through: { attributes: [] },
        },
        {
          model: liveModel,
        },
        {
          model: areaModel,
          through: { attributes: [] },
        },
      ],
      attributes: {
        exclude: LIVE_ROOM_MODEL_EXCLUDE,
      },
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
      distinct: true,
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 获取直播间列表 */
  async getPureList({
    id,
    status,
    is_show,
    is_fake,
    type,
    orderBy,
    orderName,
    nowPage,
    pageSize,
    keyWord,
    rangTimeType,
    rangTimeStart,
    rangTimeEnd,
  }: IList<ILiveRoom>) {
    const { offset, limit, nowpage, pagesize } = handlePage({
      nowPage,
      pageSize,
    });
    const allWhere: any = deleteUseLessObjectKey({
      id,
      status,
      is_show,
      is_fake,
    });
    if (type !== undefined && isPureNumber(`${type}`)) {
      allWhere.type = type;
    }
    const keyWordWhere = handleKeyWord({
      keyWord,
      arr: ['title', 'desc', 'notice_msg', 'system_msg', 'remark'],
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
    const result = await liveRoomModel.findAndCountAll({
      attributes: {
        exclude: LIVE_ROOM_MODEL_EXCLUDE,
      },
      order: [...orderRes],
      limit,
      offset,
      where: {
        ...allWhere,
      },
    });
    return handlePaging(result, nowpage, pagesize);
  }

  /** 查找直播间 */
  async findAllById(ids: number[]) {
    const result = await liveRoomModel.findAll({
      attributes: {
        exclude: LIVE_ROOM_MODEL_EXCLUDE,
      },
      where: { id: ids },
    });
    return result;
  }

  /** 查找所有直播间 */
  async findAll() {
    const result = await liveRoomModel.findAll({
      attributes: {
        exclude: LIVE_ROOM_MODEL_EXCLUDE,
      },
    });
    return result;
  }

  /** 查找直播间 */
  async find(id: number) {
    const result = await liveRoomModel.findOne({
      include: [
        {
          model: userModel,
          attributes: {
            exclude: ['password', 'token'],
          },
          through: {
            attributes: [],
          },
        },
        {
          model: liveModel,
          include: [
            {
              model: liveRecordModel,
            },
          ],
        },
        {
          model: areaModel,
          through: {
            attributes: [],
          },
        },
      ],
      attributes: {
        exclude: LIVE_ROOM_MODEL_EXCLUDE,
      },
      where: { id },
    });
    return result;
  }

  /** 查找直播间 */
  async findPure(id: number) {
    const result = await liveRoomModel.findOne({
      attributes: {
        exclude: LIVE_ROOM_MODEL_EXCLUDE,
      },
      where: { id },
    });
    return result;
  }

  /** 查找直播间key */
  async findKey(id: number) {
    const result = await liveRoomModel.findOne({
      where: { id },
    });
    return result;
  }

  /** 查找直播间key */
  async findKey2(id: number) {
    const result = await liveRoomModel.findOne({
      attributes: LIVE_ROOM_MODEL_EXCLUDE,
      where: { id },
      include: [
        {
          model: userModel,
          attributes: {
            exclude: ['password', 'token'],
          },
        },
        {
          model: areaModel,
          through: {
            attributes: [],
          },
        },
      ],
    });
    return result;
  }

  /** 创建直播间 */
  async create({
    title,
    desc,
    priority,
    key,
    type,
    cover_img,
    keyframe_img,
    bg_img,
    status,
    is_show,
    open_chat,
    tip_tourist_login,
    tip_tourist_login_delay,
    tourist_send_msg,
    keyword_filter_msg,
    keyword_filter_username,
    history_msg_total,
    newuser_send_msg_delay,
    room_pwd,
    is_close,
    is_close_desc,
    send_msg_throttle,
    is_show_signin,
    is_show_phone_live,
    notice_msg,
    system_msg,
    is_show_live_user_nums,
    mock_live_user_nums_min,
    mock_live_user_nums_max,
    mock_live_user_nums_refresh_delay,
    msg_verify,
    is_fake,
    pull_rtmp_url,
    pull_flv_url,
    pull_hls_url,
    pull_webrtc_url,
    pull_cdn_rtmp_url,
    pull_cdn_flv_url,
    pull_cdn_hls_url,
    pull_cdn_webrtc_url,
    push_rtmp_url,
    push_obs_server,
    push_obs_stream_key,
    push_webrtc_url,
    push_srt_url,
    push_cdn_rtmp_url,
    push_cdn_obs_server,
    push_cdn_obs_stream_key,
    push_cdn_webrtc_url,
    push_cdn_srt_url,
    forward_bilibili_url,
    forward_douyu_url,
    forward_huya_url,
    forward_douyin_url,
    forward_kuaishou_url,
    forward_xiaohongshu_url,
    remark,
  }: ILiveRoom) {
    const result = await liveRoomModel.create({
      title,
      desc,
      priority,
      key,
      type,
      cover_img,
      keyframe_img,
      bg_img,
      status,
      is_show,
      open_chat,
      tip_tourist_login,
      tip_tourist_login_delay,
      tourist_send_msg,
      keyword_filter_msg,
      keyword_filter_username,
      history_msg_total,
      newuser_send_msg_delay,
      room_pwd,
      is_close,
      is_close_desc,
      send_msg_throttle,
      is_show_signin,
      is_show_phone_live,
      notice_msg,
      system_msg,
      is_show_live_user_nums,
      mock_live_user_nums_min,
      mock_live_user_nums_max,
      mock_live_user_nums_refresh_delay,
      msg_verify,
      is_fake,
      pull_rtmp_url,
      pull_flv_url,
      pull_hls_url,
      pull_webrtc_url,
      pull_cdn_rtmp_url,
      pull_cdn_flv_url,
      pull_cdn_hls_url,
      pull_cdn_webrtc_url,
      push_rtmp_url,
      push_obs_server,
      push_obs_stream_key,
      push_webrtc_url,
      push_srt_url,
      push_cdn_rtmp_url,
      push_cdn_obs_server,
      push_cdn_obs_stream_key,
      push_cdn_webrtc_url,
      push_cdn_srt_url,
      forward_bilibili_url,
      forward_douyu_url,
      forward_huya_url,
      forward_douyin_url,
      forward_kuaishou_url,
      forward_xiaohongshu_url,
      remark,
    });
    return result;
  }

  /** 修改直播间 */
  async update({
    id,
    title,
    desc,
    priority,
    key,
    type,
    cover_img,
    keyframe_img,
    bg_img,
    status,
    is_show,
    open_chat,
    tip_tourist_login,
    tip_tourist_login_delay,
    tourist_send_msg,
    keyword_filter_msg,
    keyword_filter_username,
    history_msg_total,
    newuser_send_msg_delay,
    room_pwd,
    is_close,
    is_close_desc,
    send_msg_throttle,
    is_show_signin,
    is_show_phone_live,
    notice_msg,
    system_msg,
    is_show_live_user_nums,
    mock_live_user_nums_min,
    mock_live_user_nums_max,
    mock_live_user_nums_refresh_delay,
    msg_verify,
    is_fake,
    pull_rtmp_url,
    pull_flv_url,
    pull_hls_url,
    pull_webrtc_url,
    pull_cdn_rtmp_url,
    pull_cdn_flv_url,
    pull_cdn_hls_url,
    pull_cdn_webrtc_url,
    push_rtmp_url,
    push_obs_server,
    push_obs_stream_key,
    push_webrtc_url,
    push_srt_url,
    push_cdn_rtmp_url,
    push_cdn_obs_server,
    push_cdn_obs_stream_key,
    push_cdn_webrtc_url,
    push_cdn_srt_url,
    forward_bilibili_url,
    forward_douyu_url,
    forward_huya_url,
    forward_douyin_url,
    forward_kuaishou_url,
    forward_xiaohongshu_url,
    remark,
  }: ILiveRoom) {
    const result = await liveRoomModel.update(
      {
        title,
        desc,
        priority,
        key,
        type,
        cover_img,
        keyframe_img,
        bg_img,
        status,
        is_show,
        open_chat,
        tip_tourist_login,
        tip_tourist_login_delay,
        tourist_send_msg,
        keyword_filter_msg,
        keyword_filter_username,
        history_msg_total,
        newuser_send_msg_delay,
        room_pwd,
        is_close,
        is_close_desc,
        send_msg_throttle,
        is_show_signin,
        is_show_phone_live,
        notice_msg,
        system_msg,
        is_show_live_user_nums,
        mock_live_user_nums_min,
        mock_live_user_nums_max,
        mock_live_user_nums_refresh_delay,
        msg_verify,
        is_fake,
        pull_rtmp_url,
        pull_flv_url,
        pull_hls_url,
        pull_webrtc_url,
        pull_cdn_rtmp_url,
        pull_cdn_flv_url,
        pull_cdn_hls_url,
        pull_cdn_webrtc_url,
        push_rtmp_url,
        push_obs_server,
        push_obs_stream_key,
        push_webrtc_url,
        push_srt_url,
        push_cdn_rtmp_url,
        push_cdn_obs_server,
        push_cdn_obs_stream_key,
        push_cdn_webrtc_url,
        push_cdn_srt_url,
        forward_bilibili_url,
        forward_douyu_url,
        forward_huya_url,
        forward_douyin_url,
        forward_kuaishou_url,
        forward_xiaohongshu_url,
        remark,
      },
      { where: { id }, limit: 1 }
    );
    return result;
  }

  /** 删除直播间 */
  async delete(id: number) {
    const result = await liveRoomModel.destroy({
      where: { id },
      limit: 1,
      individualHooks: true,
    });
    return result;
  }
}

export default new LiveRoomService();
