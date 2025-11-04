import { startCancelExpiredRechargeOrderSchedule } from '@/config/schedule/cancelExpiredOrder/cancelExpiredRechargeOrder';
import { startExpireInviteCodeSchedule } from '@/config/schedule/expireInviteCode/expireInviteCode';
import { startLiveRoomIsLiveSchedule } from '@/config/schedule/liveRoomIsLive/';
import { startCleanupMinioImagesSchedule } from '@/config/schedule/cleanupMinioImages';
import {
  startSyncGameConsumptionRecordSchedule,
  startProcessGameSettlementSchedule,
  startVBOSSSettlementSchedule,
} from '@/config/schedule/syncGameConsumptionRecord';
import { startVerifyStreamSchedule } from '@/config/schedule/verifyStream';

export const initSchedule = () => {
  startVerifyStreamSchedule();
  startLiveRoomIsLiveSchedule();
  startCancelExpiredRechargeOrderSchedule();
  startSyncGameConsumptionRecordSchedule();
  startProcessGameSettlementSchedule();
  startVBOSSSettlementSchedule();
  startExpireInviteCodeSchedule();
  startCleanupMinioImagesSchedule();
};
