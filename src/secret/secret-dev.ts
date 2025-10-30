import { REDIS_DATABASE } from '../spec-config';

// jwt 秘钥
export const JWT_SECRET = 'your_secure_jwt_secret_key';

// 服务器 ip 地址
export const IP_URL = {
  tencent: '192.168.2.8',
  ali: '192.168.2.8',
};

// ip 白名单
export const IP_WHITE_LIST = [IP_URL.tencent, IP_URL.ali];

// qq 登录 APP Key
export const QQ_CLIENT_SECRET = 'your_actual_qq_client_secret';
// qq 登录回调地址
export const QQ_REDIRECT_URI = `http://192.168.2.8:3000/qq-callback`;

// wechat 登录 APP Key
export const WECHAT_SECRET = 'your_actual_wechat_secret';
// wechat 登录回调地址
export const WECHAT_REDIRECT_URI = 'http://192.168.2.8:3000/wechat-callback';

// 七牛云秘钥
export const QINIU_ACCESSKEY = 'your_actual_qiniu_access_key';
// 七牛云秘钥
export const QINIU_SECRETKEY = 'your_actual_qiniu_secret_key';

// 游戏 API 配置 - 分为原始实现和新实现以提高可读性
export const GAME_API_CONFIG = {
  // 原始游戏 API 实现配置
  VBOSS: {
    url: 'https://stagingvcm.vboss88.com/vcm',
    apiUser: 'apimyyon',
    apiPass: '333888',
    user: 'yon',
    pass: '333888',
  },
  // 新游戏 API 实现配置
  Sportsbook: {
    url: 'https://apiuat.apple855.com',
    secret: 'vae55c6q',
    agent: 'a3taf',
    loginHost: 'sportuat.apple855.com',
  },
  // 第三个游戏 API 实现配置
  ThirdGame: {
    url: 'https://vendor-uat.888stars.xyz/v1',
    merchantID: '183796',
    merchantSecretKey: '4061fb181e18490',
  },
};

// 腾讯云 SecretId
export const TENCENTCLOUD_SECRETID = 'your_actual_tencent_cloud_secret_id';
// 腾讯云 SecretKey
export const TENCENTCLOUD_SECRETKEY = 'your_actual_tencent_cloud_secret_key';
export const TENCENTCLOUD_CSS = {
  // 推流域名，使用腾讯云直播提供的默认推流域名或自有已备案且 CNAME 配置成功的推流域名
  PushDomain: `your_actual_push_domain`,
  // 拉流域名
  PullDomain: `your_actual_pull_domain`,
  // 直播的应用名称，默认为 live，可自定义
  AppName: 'live',
  // 鉴权 Key，https://console.cloud.tencent.com/live/domainmanage/detail/185429.push.tlivecloud.com?tab=pushConfig
  Key: 'your_actual_auth_key',
  // 直播回调密钥，https://console.cloud.tencent.com/live/config/callback
  CbKey: 'your_actual_callback_key',
};
// 腾讯云即时通讯 IM 秘钥
export const TENCENTCLOUD_CHAT_SDK_SECRETKEY =
  'your_actual_tencent_chat_sdk_secret_key';

// MINIO 配置
export const MINIO_CONFIG = {
  docker: {
    container: 'minio-server',
    port: { 9000: 9000, 9001: 9001 },
    MINIO_ROOT_USER: 'minioadmin',
    MINIO_ROOT_PASSWORD: 'minioadmin',
    volume: `${process.cwd()}/docker-volumes/minio`,
    image: 'minio/minio',
  },
};

// Mysql 配置
export const MYSQL_CONFIG = {
  docker: {
    container: 'mysql-local',
    image: 'mysql:8.0',
    port: { 3306: 3306 },
    MYSQL_ROOT_PASSWORD: '123456',
    volume: `${process.cwd()}/docker-volumes/mysql`,
  },
  database: 'data',
  host: '192.168.1.15',
  port: 3306,
  username: 'henry',
  password: '123456',
};

// Redis 配置
export const REDIS_CONFIG = {
  docker: {
    container: 'redis-local',
    image: 'redis:7.0',
    port: { 6379: 6379 },
    volume: `${process.cwd()}/docker-volumes/redis`,
  },
  database: REDIS_DATABASE.live,
  socket: {
    port: 6379,
    host: '192.168.1.15',
  },
  username: '',
  password: '',
};

// SRS 配置
export const SRS_CONFIG = {
  docker: {
    // docker 启动 srs 时的容器名字
    container: 'srs-local',
    // docker 镜像名，https://ossrs.net/lts/zh-cn/docs/v5/doc/getting-started
    image: 'registry.cn-hangzhou.aliyuncs.com/ossrs/srs:5',
    port: {
      1935: 1935,
      8080: 8080,
      1985: 1985,
      8000: 8000,
    },
    volume: `${process.cwd()}/docker-volumes/srs`,
  },
  // CANDIDATE 填你的本机 ip 地址
  CANDIDATE: `192.168.1.15`,
  // 推流域名
  PushDomain: '192.168.1.15',
  // 拉流域名
  PullDomain: '192.168.1.15:8080',
  AppName: 'ONE',
  httpApi: 'http://192.168.1.15:1985',
};

// RabbitMQ 配置
export const RABBITMQ_CONFIG = {
  docker: {
    // docker 启动 rabbitmq 时的容器名字
    container: 'rabbitmq-local',
    // docker 镜像名，https://www.rabbitmq.com/download.html
    image: 'rabbitmq:3.11-management',
    port: { 5672: 5672, 15672: 15672 },
  },
  url: 'amqp://192.168.1.15:5672',
};

// 支付宝当面付 - 自然博客直播
export const ALIPAY_LIVE_CONFIG = {
  appId: 'your_actual_alipay_app_id',
  privateKey: 'your_actual_alipay_private_key',
  alipayPublicKey: 'your_actual_alipay_public_key',
  gateway: 'https://openapi.alipay.com/gateway.do',
};
