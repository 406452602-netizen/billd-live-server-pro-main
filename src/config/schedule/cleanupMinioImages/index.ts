import { scheduleJob } from 'node-schedule';

import { bucketNames, minioClient } from '@/config/minio';
import { redisClient } from '@/config/redis';
import { chalkERROR, chalkINFO } from '@/utils/chalkTip';

// Redis键前缀
const REDIS_PREFIX = 'minio:image:access:';
const ACCESS_TIMEOUT_DAYS = 30;

/**
 * 记录图片访问时间
 * @param objectName 图片文件名
 */
export async function recordImageAccess(objectName: string): Promise<void> {
  try {
    const key = `${REDIS_PREFIX}${objectName}`;
    const now = Date.now();
    // 存储访问时间戳，并设置过期时间为ACCESS_TIMEOUT_DAYS*2天，给清理任务留出缓冲时间
    await redisClient.set(key, now.toString(), {
      EX: ACCESS_TIMEOUT_DAYS * 2 * 24 * 60 * 60,
    });
  } catch (error) {
    console.error('记录图片访问时间失败:', error);
  }
}

/**
 * 清理超过30天未访问的图片
 */
async function cleanupImages(): Promise<void> {
  try {
    const bucketName = bucketNames.default;
    const thresholdTime =
      Date.now() - ACCESS_TIMEOUT_DAYS * 24 * 60 * 60 * 1000;

    // 获取存储桶中的所有对象
    const objectsStream = minioClient.listObjectsV2(bucketName, '', true);
    const objects: string[] = [];

    // 将流转换为Promise
    const collectObjects = new Promise<void>((resolve, reject) => {
      objectsStream.on('data', (obj: any) => {
        objects.push(obj.name);
      });
      objectsStream.on('error', reject);
      objectsStream.on('end', resolve);
    });

    await collectObjects;

    let deletedCount = 0;

    // 遍历所有对象，检查最后访问时间
    // eslint-disable-next-line no-restricted-syntax
    for (const objectName of objects) {
      try {
        const key = `${REDIS_PREFIX}${objectName}`;
        // eslint-disable-next-line no-await-in-loop
        const lastAccessTimeStr = await redisClient.get(key);

        // 如果没有访问记录或者访问时间超过阈值，删除该对象
        if (
          !lastAccessTimeStr ||
          parseInt(lastAccessTimeStr, 10) < thresholdTime
        ) {
          // eslint-disable-next-line no-await-in-loop
          await minioClient.removeObject(bucketName, objectName);
          deletedCount += 1;
          console.log(
            chalkINFO(
              `已删除超过${ACCESS_TIMEOUT_DAYS}天未访问的图片: ${objectName}`
            )
          );
        }
      } catch (error) {
        console.error(`处理图片 ${objectName} 失败:`, error);
      }
    }

    console.log(
      chalkINFO(
        `清理完成，共删除 ${deletedCount} 张超过${ACCESS_TIMEOUT_DAYS}天未访问的图片`
      )
    );
  } catch (error) {
    console.error(chalkERROR('清理MinIO图片失败:'), error);
  }
}

/**
 * 启动MinIO图片清理定时任务
 * 每天凌晨3点执行清理
 */
export function startCleanupMinioImagesSchedule() {
  // 每天凌晨3点执行 (分钟 小时 日 月 周)
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  scheduleJob('0 3 * * *', cleanupImages);

  console.log(chalkINFO(`MinIO图片清理定时任务已启动，每天凌晨3点执行`));
}
