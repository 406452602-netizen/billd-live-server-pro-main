import { createClient } from 'redis';

import { REDIS_CONFIG } from '@/secret/secret';
import { chalkERROR, chalkINFO, chalkSUCCESS } from '@/utils/chalkTip';

export const redisClient = createClient({
  database: REDIS_CONFIG.database,
  socket: {
    port: REDIS_CONFIG.socket.port,
    host: REDIS_CONFIG.socket.host,
    tls: false,
  },
  username: REDIS_CONFIG.username,
  password: REDIS_CONFIG.password,
});

redisClient.on('error', (err) => {
  console.error(chalkERROR('redisClient 错误'));
  console.log(err);
  process.exit(1);
});

export const connectRedis = async () => {
  console.log(
    chalkINFO(
      `开始连接${REDIS_CONFIG.socket.host}:${REDIS_CONFIG.socket.port}服务器的redis数据库...`
    )
  );

  await redisClient.connect();

  console.log(
    chalkSUCCESS(
      `连接${REDIS_CONFIG.socket.host}:${REDIS_CONFIG.socket.port}服务器的redis数据库成功!`
    )
  );
  return redisClient;
};
