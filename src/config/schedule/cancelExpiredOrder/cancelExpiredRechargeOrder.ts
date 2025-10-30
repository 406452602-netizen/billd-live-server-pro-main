import { scheduleJob } from 'node-schedule';
import { Op } from 'sequelize';

import { auditStatusEnum } from '@/interface';
import rechargeRecordModel from '@/model/rechargeRecord.model';
import { chalkINFO } from '@/utils/chalkTip';
import { TimezoneUtil } from '@/utils/timezone';

/**
 * 取消超时未支付的充值订单
 * 每5分钟执行一次，取消创建时间超过30分钟且未支付的订单
 */
export function startCancelExpiredRechargeOrderSchedule() {
  // 每5分钟执行一次 (分钟 小时 日 月 周)
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  scheduleJob('*/5 * * * *', async () => {
    try {
      const expiredTime = new Date();
      expiredTime.setMinutes(expiredTime.getMinutes() - 60); // 60分钟超时阈值

      // 更新超时订单状态
      const [updatedCount] = await rechargeRecordModel.update(
        {
          status: auditStatusEnum.CANCELED,
          updated_at: TimezoneUtil.formatTime(new Date()),
        },
        {
          where: {
            status: auditStatusEnum.PENDING_SUBMIT, // 未支付状态
            created_at: {
              [Op.lt]: expiredTime,
            },
          },
        }
      );

      if (updatedCount > 0) {
        console.log(chalkINFO(`已取消 ${updatedCount} 个超时未支付的充值订单`));
      }
    } catch (error) {
      console.error(error);
      console.log(chalkINFO(`取消超时充值订单失败`));
    }
  });

  console.log(chalkINFO(`订单超时取消定时任务已启动`));
}
