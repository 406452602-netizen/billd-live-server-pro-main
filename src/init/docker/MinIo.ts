import { execSync } from 'child_process';

import { MINIO_CONFIG } from '@/secret/secret';
import { chalkERROR, chalkSUCCESS, chalkWARN, emoji } from '@/utils/chalkTip';

export const dockerRunMinIO = (init = true) => {
  if (!init) return;
  console.log(chalkWARN('开始启动 MinIO'));

  try {
    // 停掉旧的容器
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    execSync(`docker stop ${MINIO_CONFIG.docker.container}`);
  } catch (error) {
    console.log('停掉旧的 MinIO 容器出错');
  }

  try {
    // 删掉旧的容器
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    execSync(`docker rm ${MINIO_CONFIG.docker.container}`);
  } catch (error) {
    console.log('删掉旧的 MinIO 容器出错');
  }

  // 启动新的容器
  try {
    execSync(
      `docker run -d \
      -p ${MINIO_CONFIG.docker.port[9000]}:9000 \
      -p ${MINIO_CONFIG.docker.port[9001]}:9001 \
      --name ${MINIO_CONFIG.docker.container} \
      -e MINIO_ROOT_USER=${MINIO_CONFIG.docker.MINIO_ROOT_USER} \
      -e MINIO_ROOT_PASSWORD=${MINIO_CONFIG.docker.MINIO_ROOT_PASSWORD} \
      -v ${MINIO_CONFIG.docker.volume}/data:/data \
      ${MINIO_CONFIG.docker.image} server /data --console-address ":9001"`
    );
    console.log(chalkSUCCESS(`启动 MinIO 成功！`), emoji.get('✅'));
  } catch (error) {
    console.error(chalkERROR(`启动 MinIO 错误！`));
    console.log(error);
  }
};
