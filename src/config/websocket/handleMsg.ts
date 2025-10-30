import fs from 'fs';
import path from 'path';

import { filterObj, getRandomString } from 'billd-utils';
import { rimrafSync } from 'rimraf';
import { Server, Socket } from 'socket.io';

import { jwtVerify } from '@/app/auth/authJwt';
import { startBlobIsExistSchedule } from '@/config/schedule/blobIsExist';
import {
  getSocketRealIp,
  getSocketUserAgent,
  ioEmit,
  socketEmit,
} from '@/config/websocket';
import liveRedisController from '@/config/websocket/live-redis.controller';
import { MSG_MAX_LENGTH, REDIS_KEY, WEBM_DIR } from '@/constant';
import liveController from '@/controller/live.controller';
import liveRecordController from '@/controller/liveRecord.controller';
import liveRoomController from '@/controller/liveRoom.controller';
import liveViewController from '@/controller/liveView.controller';
import redisController from '@/controller/redis.controller';
import userLiveRoomController from '@/controller/userLiveRoom.controller';
import wsMessageController from '@/controller/wsMessage.controller';
import { LiveRoomTypeEnum } from '@/types/ILiveRoom';
import {
  WsBatchSendOffer,
  WsJoinedType,
  WsJoinType,
  WsKeepRtcLivingType,
  WsLivePkKeyType,
  WsMessageType,
  WsMsgTypeEnum,
  WsMsrBlobType,
  WsOtherJoinType,
  WsRoomLivingType,
  WsRoomNoLiveType,
  WsStartLiveType,
} from '@/types/websocket';
import { strSlice } from '@/utils';
import { chalkERROR, chalkWARN } from '@/utils/chalkTip';
import { mp4PushRtmp, webmToMp4 } from '@/utils/process';

export async function handleWsJoin(args: {
  io: Server;
  socket: Socket;
  roomId: number;
  data: WsJoinType;
}) {
  const { io, socket, data } = args;
  const { roomId } = args;
  const { userInfo } = await jwtVerify(data.user_token || '');
  await redisController.setHashVal({
    key: `${REDIS_KEY.join}${roomId}`,
    value: {
      userInfo: {},
    },
    field: `${String(data.data.cluster_id)}___${String(socket.id)}`,
  });

  const urlParams = new URLSearchParams(
    socket.request.url?.replace('/socket.io/', '')
  );
  if (!data?.data?.duration) {
    console.log('handleWsJoin参数错误');
    return;
  }
  if (!roomId) {
    console.error(chalkERROR('roomId为空'));
    return;
  }
  socket.join(`${roomId}`);
  console.log(chalkWARN(`${socket.id} 进入房间号:${roomId}`));
  const roomsMap = io.of('/').adapter.rooms;
  const socketList = roomsMap.get(`${data.data.live_room_id}`);
  socketEmit<WsJoinedType['data']>({
    socket,
    msgType: WsMsgTypeEnum.joined,
    data: {},
  });
  if (!userInfo?.id) {
    console.error(chalkERROR('userInfo为空'));
    await liveRedisController.joined({
      roomId,
      userId: socket.id,
      exp: data.data.duration + 5,
    });
    socketEmit<WsOtherJoinType['data']>({
      socket,
      msgType: WsMsgTypeEnum.otherJoin,
      roomId,
      data: {
        live_room_id: roomId,
        join_socket_id: socket.id,
        // @ts-ignore
        join_user_info: { id: socket.id, username: socket.id },
        socket_list: socketList ? [...socketList] : [],
      },
    });
    return;
  }
  await liveRedisController.joined({
    roomId,
    userId: userInfo.id,
    exp: data.data.duration + 5,
  });

  const recRes = await liveController.common.findLiveRecordByLiveRoomId(roomId);
  const live_record_id = recRes?.live_record_id;
  if (!live_record_id) return;
  const [affectedCount] = await liveViewController.common.updateDuration({
    live_record_id,
    live_room_id: roomId,
    duration: 0,
    user_id: userInfo.id,
  });
  if (!affectedCount) {
    await liveViewController.common.create({
      live_record_id,
      live_room_id: roomId,
      duration: 0,
      user_id: userInfo.id,
      client_ip: getSocketRealIp(socket),
      client_app: urlParams.get('billd_app') as any,
      client_app_version: urlParams.get('billd_app_ver') as any,
      client_env: urlParams.get('billd_env') as any,
    });
  }
  const view = await liveViewController.common.getCountByLiveRecordId(
    live_record_id
  );
  await liveRecordController.common.update({ id: live_record_id, view });

  socketEmit<WsOtherJoinType['data']>({
    socket,
    msgType: WsMsgTypeEnum.otherJoin,
    roomId,
    data: {
      live_room_id: roomId,
      join_socket_id: socket.id,
      join_user_info: userInfo,
      socket_list: socketList ? [...socketList] : [],
    },
  });
}

export async function handleWsKeepRtcLiving(args: {
  socket: Socket;
  roomId: number;
  data: WsKeepRtcLivingType;
}) {
  const { data } = args;
  const { userInfo } = await jwtVerify(data.user_token || '');

  if (!userInfo) {
    console.error(chalkERROR('userInfo为空'));
    return;
  }
  const liveRes = await liveController.common.findLiveRecordByLiveRoomId(
    Number(data.data.live_room_id)
  );
  if (!liveRes) {
    return;
  }
  await liveRedisController.setRtcLiving({
    data: {
      live_id: liveRes.id!,
      live_record_id: liveRes.live_record_id!,
      live_room_id: data.data.live_room_id,
    },
    exp: data.data.duration + 5,
  });
  await liveRecordController.common.updateDuration({
    id: liveRes.live_record_id!,
    duration: data.data.duration,
  });
}

export function handleWsBatchSendOffer(args: {
  io: Server;
  socket: Socket;
  roomId: number;
  data: WsBatchSendOffer;
}) {
  const { io, socket, roomId, data } = args;
  if (!roomId) {
    console.error(chalkERROR('roomId为空'));
    return;
  }
  const roomsMap = io.of('/').adapter.rooms;
  const socketList = roomsMap.get(`${data.data.roomId}`);

  socketEmit<WsBatchSendOffer['data']>({
    socket,
    msgType: WsMsgTypeEnum.batchSendOffer,
    roomId,
    data: {
      roomId: `${roomId}`,
      socket_list: socketList ? [...socketList] : [],
    },
  });
}

export async function handleWsMessage(args: {
  io: Server;
  socket: Socket;
  data: WsMessageType;
}) {
  const { io, socket, data } = args;
  const urlParams = new URLSearchParams(
    socket.request.url?.replace('/socket.io/', '')
  );
  let userInfo;
  if (data.user_token) {
    const res = await jwtVerify(data.user_token);
    if (!res.userInfo) {
      console.error(chalkERROR('userInfo为空'));
      return;
    }
    userInfo = res.userInfo;
  } else {
    return;
  }
  const liveRoomId = data.data.live_room_id;
  if (!liveRoomId) {
    return;
  }
  const recRes = await liveController.common.findLiveRecordByLiveRoomId(
    liveRoomId
  );
  const live_record_id = recRes?.live_record_id;
  const user_agent = getSocketUserAgent(socket);
  const msgRes = await wsMessageController.common.create({
    msg_type: data.data.msg_type,
    user_id: userInfo.id,
    live_room_id: liveRoomId,
    content: data.data.content?.slice(0, MSG_MAX_LENGTH),
    content_type: data.data.content_type,
    origin_content: data.data.content,
    username: userInfo.username,
    origin_username: userInfo.username,
    user_agent: strSlice(user_agent, 490),
    send_msg_time: data.time,
    live_record_id,
    client_ip: getSocketRealIp(socket),
    client_app: urlParams.get('billd_app') as any,
    client_app_version: urlParams.get('billd_app_ver') as any,
    client_env: urlParams.get('billd_env') as any,
  });
  if (live_record_id) {
    const danmu = await wsMessageController.common.getCountByLiveRecordId(
      live_record_id
    );
    await liveRecordController.common.update({ id: live_record_id, danmu });
  }
  const data2 = filterObj(data, ['user_token', 'request_id']);
  data2.data = { ...msgRes, user: userInfo };
  ioEmit<any>({
    io,
    roomId: liveRoomId,
    msgType: WsMsgTypeEnum.message,
    data: data2,
  });
}

export async function handleWsMsrBlob(args: { data: WsMsrBlobType }) {
  const { data } = args;
  let userInfo;
  if (data.user_token) {
    const res = await jwtVerify(data.user_token);
    if (!res.userInfo) {
      console.error(chalkERROR('userInfo为空'));
      return;
    }
    userInfo = res.userInfo;
  } else {
    return;
  }
  const userId = userInfo.id;
  if (!userId) {
    console.error(chalkERROR('userId为空'));
    return;
  }
  const userLiveRoomInfo = await userLiveRoomController.common.findByUserId(
    userId
  );
  if (!userLiveRoomInfo) {
    console.error(chalkERROR('userLiveRoomInfo为空'));
    return;
  }
  const roomId = userLiveRoomInfo.live_room_id!;
  const roomDir = path.resolve(WEBM_DIR, `roomId_${roomId}`);
  const fileDir = `${roomDir}/file`;
  const fileResDir = `${fileDir}/res`;
  const fileTmpDir = `${fileDir}/tmp`;
  const webmFile = `${fileTmpDir}/${data.data.blob_id}.webm`;
  const mp4File = `${fileResDir}/${data.data.blob_id}.mp4`;
  if (!fs.existsSync(WEBM_DIR)) {
    fs.mkdirSync(WEBM_DIR);
  }
  if (!fs.existsSync(roomDir)) {
    fs.mkdirSync(roomDir);
  }
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir);
  }
  if (!fs.existsSync(fileTmpDir)) {
    fs.mkdirSync(fileTmpDir);
  }
  fs.writeFileSync(webmFile, data.data.blob);
  webmToMp4({
    input: webmFile,
    output: mp4File,
  });
  if (fs.existsSync(webmFile)) {
    rimrafSync(webmFile);
  }
}

export async function handleWsRoomNoLive(args: {
  socket: Socket;
  data: WsRoomNoLiveType;
}) {
  const { socket, data } = args;
  const roomId = data.data.live_room_id;
  socketEmit<WsRoomNoLiveType['data']>({
    roomId,
    socket,
    msgType: WsMsgTypeEnum.roomNoLive,
    data: { live_room_id: roomId },
  });
  await liveController.common.closeLive({ liveRoomId: roomId });
}

export async function handleWsStartLive(args: {
  io: Server;
  socket: Socket;
  data: WsStartLiveType;
}) {
  const { socket, data } = args;
  const urlParams = new URLSearchParams(
    socket.request.url?.replace('/socket.io/', '')
  );
  const { userInfo } = await jwtVerify(data.user_token || '');
  if (!userInfo) {
    console.error(chalkERROR('userInfo为空'));
    return;
  }
  const userId = userInfo.id!;
  const userLiveRoom = await userLiveRoomController.common.findByUserId(userId);
  const roomId = userLiveRoom?.live_room_id;
  if (!roomId) return;
  if (
    data.data.type === LiveRoomTypeEnum.wertc_live ||
    data.data.type === LiveRoomTypeEnum.wertc_meeting_one
  ) {
    const recRes = await liveRecordController.common.create({
      live_room_type: data.data.type,
      user_id: Number(userId),
      live_room_id: Number(roomId),
      duration: 0,
      danmu: 0,
      view: 0,
      start_time: +new Date(),
      remark: '',
      client_ip: getSocketRealIp(socket),
      client_app: urlParams.get('billd_app') as any,
      client_app_version: urlParams.get('billd_app_ver') as any,
      client_env: urlParams.get('billd_env') as any,
    });
    await liveController.common.create({
      live_room_type: data.data.type,
      live_record_id: recRes.id,
      live_room_id: Number(roomId),
      user_id: Number(userId),
    });
    socketEmit<WsRoomLivingType['data']>({
      msgType: WsMsgTypeEnum.roomLiving,
      roomId,
      socket,
      data: { live_room_id: Number(roomId) },
    });
  } else if (data.data.type === LiveRoomTypeEnum.msr) {
    /**
     * 业务设计：
     * 1，客户端开始msr直播，携带delay、max_delay参数
     * 2，客户端每delay毫秒发送一次webm，携带blob_id、delay、max_delay参数。blob_id即当前发送的是第几个webm
     * 3，服务端接收到webm就进行转码，转码成mp4，并且每max_delay毫秒进行一次合并mp4
     * 4，实际的推流命令，里面的文件列表就是转码后的mp4文件列表
     * 5，(max_delay * 2)毫秒后，执行推流命令
     * 具体实现：
     * 1，客户端开始msr直播，携带delay、max_delay参数，假设delay是1000；max_delay是5000
     * 2，服务端收到客户端开始msr直播后，直接生成理论上24小时的推流文件（24小时内所有的mp4文件列表）
     * 3，直接算出来理论上需要多少个webm文件，(1000*60*60*24) / 1000 = 86400，也就是需要86400个webm文件
     * 3，直接算出来理论上需要多少个mp4文件，(1000*60*60*24) / 5000 = 17280，也就是需要17280个mp4文件
     * 4，客户端每1000毫秒发送一次webm，服务端收到后，转码成mp4，存到mp4目录，存放位置为[roomId]/tmpMp4/[blob_id]
     * 5，因为网络等因素影响，服务端不能依赖收到客户端发送的webm再进行业务处理，服务端收到msr直播命令了，就开始定时任务，
     * 每5000毫秒合并一次tmpMp4目录里的所有mp4，生成在[roomId]/resMp4/目录，
     * 服务端每n*4毫秒进行一次合并mp4，正常情况下，每n*4毫秒，能收到4个webm，转码后也就是4个mp4
     * 但是如果各种因素（网络差，转码慢等等）导致每n*4毫秒的时候，
     * 实际的推流文件是每n*4毫秒的mp4文件列表
     */
    const msrDelay = data.data.msrDelay || 1000;
    const msrMaxDelay = data.data.msrMaxDelay || 5000; // 值越大，延迟越高，但抗网络抖动越强
    if (msrDelay > 1000 * 5 || !Number.isInteger(msrDelay / 1000)) {
      console.error(chalkERROR('msrDelay错误！'));
      return;
    }
    // 假设每个webm是1秒钟，转码成mp4需要翻三倍时间，即3秒。因此msrMaxDelay不能小于这个翻倍间隔
    if (msrMaxDelay < msrDelay * 3 || !Number.isInteger(msrMaxDelay / 1000)) {
      console.error(chalkERROR('msrMaxDelay错误！'));
      return;
    }
    const roomDir = path.resolve(WEBM_DIR, `roomId_${roomId}`);
    const fileDir = `${roomDir}/file`;
    const fileResDir = `${fileDir}/res`;
    const txtFile = `${roomDir}/list.txt`;
    console.log('收到主播开始msr直播，删除直播间的webm目录');
    if (fs.existsSync(roomDir)) {
      rimrafSync(roomDir);
    }
    let str = '';
    const allTime = 1000 * 60 * 60 * 24; // 24小时对应的毫秒数
    for (let i = 1; i <= allTime / msrDelay; i += 1) {
      str += `${i !== 1 ? '\n' : ''}file '${fileResDir}/${i}.mp4'`;
    }
    if (!fs.existsSync(WEBM_DIR)) {
      fs.mkdirSync(WEBM_DIR);
    }
    if (!fs.existsSync(roomDir)) {
      fs.mkdirSync(roomDir);
    }
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir);
    }
    if (!fs.existsSync(fileResDir)) {
      fs.mkdirSync(fileResDir);
    }

    fs.writeFileSync(txtFile, str);
    const liveRoomInfoResult = await liveRoomController.common.findKey(roomId);
    const key = liveRoomInfoResult?.key || '';
    setTimeout(() => {
      startBlobIsExistSchedule({
        roomId,
        msrDelay: data.data.msrDelay,
        msrMaxDelay: data.data.msrMaxDelay,
      });
    }, msrMaxDelay / 2);
    setTimeout(() => {
      mp4PushRtmp({
        txt: txtFile,
        rtmpUrl: userLiveRoom.live_room?.push_rtmp_url || '',
        token: key,
      });
    }, msrMaxDelay);
  } else if (
    data.data.type === LiveRoomTypeEnum.pk ||
    data.data.type === LiveRoomTypeEnum.tencentcloud_css_pk
  ) {
    try {
      const pkKey = getRandomString(20);
      await redisController.setExVal({
        prefix: REDIS_KEY.livePkKey,
        exp: 60 * 5,
        value: { key: pkKey },
        key: `${roomId}`,
      });
      socketEmit<WsLivePkKeyType['data']>({
        socket,
        msgType: WsMsgTypeEnum.livePkKey,
        data: {
          live_room_id: roomId,
          key: pkKey,
        },
      });
    } catch (error) {
      console.error('user_pk错误');
      console.error(error);
    }
  }
}

export async function handleWsDisconnect(args: { socket: Socket }) {
  const { socket } = args;
  const { host } = socket.request.headers;
  await redisController.delHashVal({
    key: REDIS_KEY.join,
    field: `${String(host)}___${String(socket.id)}`,
  });
}

export async function handleWsJoinOld(args: {
  io: Server;
  socket: Socket;
  roomId: number;
  data: WsJoinType;
}) {
  const { io, socket, data } = args;
  const urlParams = new URLSearchParams(
    socket.request.url?.replace('/socket.io/', '')
  );
  if (!data?.data?.duration) {
    console.log('handleWsJoin参数错误');
    return;
  }
  const { roomId } = args;
  if (!roomId) {
    console.error(chalkERROR('roomId为空'));
    return;
  }
  socket.join(`${roomId}`);
  console.log(chalkWARN(`${socket.id} 进入房间号:${roomId}`));
  const roomsMap = io.of('/').adapter.rooms;
  const socketList = roomsMap.get(`${data.data.live_room_id}`);
  socketEmit<WsJoinedType['data']>({
    socket,
    msgType: WsMsgTypeEnum.joined,
    data: {},
  });
  const { userInfo } = await jwtVerify(data.user_token || '');
  if (!userInfo?.id) {
    console.error(chalkERROR('userInfo为空'));
    await liveRedisController.joined({
      roomId,
      userId: socket.id,
      exp: data.data.duration + 5,
    });
    socketEmit<WsOtherJoinType['data']>({
      socket,
      msgType: WsMsgTypeEnum.otherJoin,
      roomId,
      data: {
        live_room_id: roomId,
        join_socket_id: socket.id,
        // @ts-ignore
        join_user_info: { id: socket.id, username: socket.id },
        socket_list: socketList ? [...socketList] : [],
      },
    });
    return;
  }
  await liveRedisController.joined({
    roomId,
    userId: userInfo.id,
    exp: data.data.duration + 5,
  });

  const recRes = await liveController.common.findLiveRecordByLiveRoomId(roomId);
  const live_record_id = recRes?.live_record_id;
  if (!live_record_id) return;
  const [affectedCount] = await liveViewController.common.updateDuration({
    live_record_id,
    live_room_id: roomId,
    duration: 0,
    user_id: userInfo.id,
  });
  if (!affectedCount) {
    await liveViewController.common.create({
      live_record_id,
      live_room_id: roomId,
      duration: 0,
      user_id: userInfo.id,
      client_ip: getSocketRealIp(socket),
      client_app: urlParams.get('billd_app') as any,
      client_app_version: urlParams.get('billd_app_ver') as any,
      client_env: urlParams.get('billd_env') as any,
    });
  }
  const view = await liveViewController.common.getCountByLiveRecordId(
    live_record_id
  );
  await liveRecordController.common.update({ id: live_record_id, view });

  socketEmit<WsOtherJoinType['data']>({
    socket,
    msgType: WsMsgTypeEnum.otherJoin,
    roomId,
    data: {
      live_room_id: roomId,
      join_socket_id: socket.id,
      join_user_info: userInfo,
      socket_list: socketList ? [...socketList] : [],
    },
  });
}
