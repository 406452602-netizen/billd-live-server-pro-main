import { subClient } from '@/config/redis/subscribe';
import liveRedisController from '@/config/websocket/live-redis.controller';
import { REDIS_CHANNEL, REDIS_KEY } from '@/constant';
import liveController from '@/controller/live.controller';
import liveRecordController from '@/controller/liveRecord.controller';
import logController from '@/controller/log.controller';
import orderController from '@/controller/order.controller';
import srsController from '@/controller/srs.controller';
import tencentcloudCssController from '@/controller/tencentcloudCss.controller';
import { REDIS_CONFIG } from '@/secret/secret';
import { chalkINFO } from '@/utils/chalkTip';

export const handleRedisSubscribe = () => {
  // 订阅过期事件
  subClient.subscribe(
    `__keyevent@${REDIS_CONFIG.database}__:expired`,
    async (expiredKey) => {
      function handleKey(key: string) {
        const res = expiredKey.replace(key, '');
        // console.log(
        //   chalkINFO(`redis key过期：${key.replace(REDIS_KEY_PREFIX, '')}`),
        //   res
        // );
        return res;
      }
      try {
        // tencentcloudCssPublishing过期
        if (expiredKey.indexOf(REDIS_KEY.tencentcloudCssPublishing) === 0) {
          const key = handleKey(REDIS_KEY.tencentcloudCssPublishing);
          const keyArr = key.split('___');
          const live_room_id = Number(keyArr[0]);
          const live_record_id = Number(keyArr[1]);
          const live_id = Number(keyArr[2]);
          if (!live_room_id || !live_record_id || !live_id) {
            return;
          }
          const islive = await tencentcloudCssController.common.isLive(
            live_room_id
          );
          if (islive) {
            await liveRedisController.setTencentcloudCssPublishing({
              data: {
                live_id,
                live_record_id,
                live_room_id,
              },
              exp: 5,
            });
            await liveRecordController.common.updateDuration({
              id: live_record_id,
              duration: 5,
            });
          } else {
            await tencentcloudCssController.common.closeLive({
              live_room_id,
            });
          }
        }

        // srsPublishing过期
        if (expiredKey.indexOf(REDIS_KEY.srsPublishing) === 0) {
          const key = handleKey(REDIS_KEY.srsPublishing);
          const keyArr = key.split('___');
          const live_room_id = Number(keyArr[0]);
          const live_record_id = Number(keyArr[1]);
          const live_id = Number(keyArr[2]);
          if (!live_room_id || !live_record_id || !live_id) {
            return;
          }
          const islive = await srsController.common.isLive(live_room_id);
          if (islive) {
            await liveRedisController.setSrsPublishing({
              data: {
                live_id,
                live_record_id,
                live_room_id,
              },
              exp: 5,
            });
            await liveRecordController.common.updateDuration({
              id: live_record_id,
              duration: 5,
            });
          } else {
            await tencentcloudCssController.common.closeLive({
              live_room_id,
            });
          }
        }

        // rtcLiving过期
        if (expiredKey.indexOf(REDIS_KEY.rtcLiving) === 0) {
          const key = handleKey(REDIS_KEY.rtcLiving);
          // key: `${data.data.live_room_id}___${data.data.live_record_id}___${data.data.live_id}`,
          const keyArr = key.split('___');
          const live_room_id = Number(keyArr[0]);
          const live_record_id = Number(keyArr[1]);
          const live_id = Number(keyArr[2]);
          if (!live_room_id || !live_record_id || !live_id) {
            return;
          }
          await liveController.common.update({
            id: live_id,
            remark: 'rtcLiving过期',
          });
          await liveController.common.delete(live_id);
          await liveRecordController.common.update({
            id: live_record_id,
            // @ts-ignore
            end_time: +new Date(),
          });
        }

        // 订单过期
        if (expiredKey.indexOf(REDIS_KEY.order) === 0) {
          const key = handleKey(REDIS_KEY.order);
          await orderController.common.getPayStatus(key, true);
        }
      } catch (error) {
        console.log(error);
      }
    }
  );

  // 订阅频道
  subClient.subscribe(REDIS_CHANNEL.writeDbLog, async (message, channel) => {
    console.log(chalkINFO(`订阅${channel}`));
    try {
      const data = JSON.parse(message);
      await logController.common.create(data);
    } catch (error) {
      console.log(error);
    }
  });
};
