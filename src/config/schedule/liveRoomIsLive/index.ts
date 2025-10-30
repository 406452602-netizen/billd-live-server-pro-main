import nodeSchedule from 'node-schedule';

import { SCHEDULE_TYPE } from '@/constant';
import liveController from '@/controller/live.controller';
import otherController from '@/controller/other.controller';
import srsController from '@/controller/srs.controller';
import { initUser } from '@/init/initUser';
import { LiveRoomTypeEnum } from '@/types/ILiveRoom';
import { chalkINFO } from '@/utils/chalkTip';
import { tencentcloudCssUtils } from '@/utils/tencentcloud-css';

const initLiveRoomId: number[] = [];
Object.keys(initUser).forEach((iten) => {
  const live_room_id = initUser[iten]?.live_room?.id;
  if (live_room_id) {
    initLiveRoomId.push(live_room_id);
  }
});

export const tencentcloudCssMain = async () => {
  try {
    const nowTime = +new Date();
    const threeMinutesAgo = nowTime - 1000 * 60 * 3;
    const res1 = await liveController.common.findAllByLessthanRangTimeEnd({
      live_room_type: LiveRoomTypeEnum.tencentcloud_css,
      rangTimeEnd: threeMinutesAgo,
    });
    const queue: Promise<any>[] = [];
    res1.forEach((item) => {
      const { id, live_room_id } = item;
      if (id && live_room_id) {
        const cdnPullUrl = tencentcloudCssUtils.getPullUrl({
          liveRoomId: live_room_id,
        });
        queue.push(
          new Promise((res) => {
            otherController.common
              .healthCheckByHls(cdnPullUrl.hls)
              .then((v) => {
                res({ id, health: v });
              })
              .catch(() => {
                res({ id, health: false });
              });
          })
        );
      }
    });
    const queueRes = await Promise.all(queue);
    const ids = queueRes.filter((v) => v.health === false).map((v) => v.id);
    if (ids.length) {
      await liveController.common.updateByIds({ remark: '不健康' }, ids);
      await liveController.common.deleteByIds(ids);
    }
    console.log(chalkINFO('定时任务删除cdn直播记录'), ids);
  } catch (error) {
    console.log(error);
  }
};

export const srsMain = async () => {
  try {
    const nowTime = +new Date();
    const threeMinutesAgo = nowTime - 1000 * 60 * 3;
    const res1 = await liveController.common.findAllByLessthanRangTimeEnd({
      live_room_type: LiveRoomTypeEnum.srs,
      rangTimeEnd: threeMinutesAgo,
    });
    const queue: Promise<any>[] = [];
    res1.forEach((item) => {
      const { id, live_room_id } = item;
      if (id && live_room_id) {
        const srsPullUrl = srsController.common.getPullUrl({
          liveRoomId: live_room_id,
        });
        queue.push(
          new Promise((res) => {
            otherController.common
              .healthCheckByHls(srsPullUrl.hls)
              .then((v) => {
                res({ id, health: v });
              })
              .catch(() => {
                res({ id, health: false });
              });
          })
        );
      }
    });
    const queueRes = await Promise.all(queue);
    const ids = queueRes.filter((v) => v.health === false).map((v) => v.id);
    if (ids.length) {
      await liveController.common.updateByIds({ remark: '不健康' }, ids);
      await liveController.common.deleteByIds(ids);
    }
    console.log(chalkINFO('定时任务删除srs直播记录'), ids);
  } catch (error) {
    console.log(error);
  }
};

const rule = new nodeSchedule.RecurrenceRule();

const allHour = 24;
const allMinute = 60;
const allSecond = 60;
const allHourArr: number[] = [];
const allMinuteArr: number[] = [];
const allSecondArr: number[] = [];

for (let i = 0; i < allHour; i += 1) {
  allHourArr.push(i);
}
for (let i = 0; i < allMinute; i += 1) {
  allMinuteArr.push(i);
}
for (let i = 0; i < allSecond; i += 1) {
  allSecondArr.push(i);
}

// 每1小时执行
// rule.hour = allHourArr.filter((v) => v % 1 === 0);
// rule.minute = 0;
// rule.second = 0;

// 每30分钟执行
// rule.minute = allMinuteArr.filter((v) => v % 30 === 0);
// rule.second = 0;

// 每3分钟执行
rule.minute = allMinuteArr.filter((v) => v % 3 === 0);
rule.second = 0;

// 每5秒执行
// rule.minute = allMinuteArr.filter((v) => v % 1 === 0);
// rule.second = allSecondArr.filter((v) => v % 5 === 0);

export const startLiveRoomIsLiveSchedule = () => {
  // if (PROJECT_ENV === 'prod') {
  nodeSchedule.scheduleJob(SCHEDULE_TYPE.liveRoomIsLive, rule, () => {
    console.log(chalkINFO(`执行${SCHEDULE_TYPE.liveRoomIsLive}定时任务`));
    srsMain();
    tencentcloudCssMain();
  });
  // }
};
