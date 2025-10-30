import * as Minio from 'minio';

import { MINIO_CONFIG } from '@/secret/secret';
import { chalkINFO, chalkSUCCESS, chalkERROR } from '@/utils/chalkTip';

// 定义存储桶名称
export const bucketNames = {
  default: 'default',
};

// 定义存储桶策略
const bucketPolicies = {
  public: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetBucketLocation', 's3:ListBucket'],
        Resource: [`arn:aws:s3:::${bucketNames.default}`],
      },
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucketNames.default}/*`],
      },
    ],
  },
};

// 创建 MinIO 客户端实例
export const minioClient = new Minio.Client({
  endPoint: 'localhost',
  port: MINIO_CONFIG.docker.port[9000],
  useSSL: false,
  accessKey: MINIO_CONFIG.docker.MINIO_ROOT_USER,
  secretKey: MINIO_CONFIG.docker.MINIO_ROOT_PASSWORD,
});

// 初始化单个存储桶
async function initSingleBucket(key: string, bucketName: string) {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, '');
      if (key === 'logos') {
        await minioClient.setBucketPolicy(
          bucketName,
          JSON.stringify(bucketPolicies.public)
        );
      }
      chalkINFO(`成功创建存储桶 ${bucketName}`);
    }
  } catch (error) {
    console.error(error);
    chalkERROR(`创建存储桶 ${bucketName} 失败:`);
  }
}

// 初始化存储桶
async function initBucket() {
  const bucketEntries = Object.entries(bucketNames);
  const initPromises = bucketEntries.map(([key, bucketName]) =>
    initSingleBucket(key, bucketName)
  );
  await Promise.all(initPromises);
}

// 初始化 MinIO
export const initMinio = async () => {
  console.log(chalkINFO('开始初始化 MinIO...'));
  await initBucket();
  console.log(chalkSUCCESS('MinIO 初始化完成'));
};
