import { scheduleJob } from 'node-schedule';
import { Op } from 'sequelize';

import inviteAgentModel from '@/model/inviteAgent.model';
import { chalkINFO } from '@/utils/chalkTip';
import { TimezoneUtil } from '@/utils/timezone';

/**
 * 过期让邀请码无效的定时任务
 * 每天执行一次，将过期的邀请码的is_valid字段设置为false
 */
export function startExpireInviteCodeSchedule() {
  // 每天凌晨执行一次 (分钟 小时 日 月 周)
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  scheduleJob('0 0 * * *', async () => {
    try {
      const nowTime = new Date();

      // 更新过期邀请码的状态
      const [updatedCount] = await inviteAgentModel.update(
        {
          is_valid: false,
          updated_at: TimezoneUtil.formatTime(nowTime),
        },
        {
          where: {
            is_valid: false, // 当前有效
            expiration_time: {
              [Op.gt]: new Date(nowTime).toISOString(),
            },
          },
        }
      );

      if (updatedCount > 0) {
        console.log(chalkINFO(`已将 ${updatedCount} 个过期邀请码设置为无效`));
      }
    } catch (error) {
      console.error(error);
      console.log(chalkINFO(`过期邀请码处理失败`));
    }
  });

  console.log(chalkINFO(`过期邀请码处理定时任务已启动，每天凌晨执行一次`));
}
