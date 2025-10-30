import amqp from 'amqplib';

import { RABBITMQ_CONFIG } from '@/secret/secret';
import { chalkSUCCESS } from '@/utils/chalkTip';

class RabbitMQClass {
  connection?: amqp.Connection;

  channel?: amqp.Channel;
}

export const mq = new RabbitMQClass();

export const delRabbitMQQueue = async () => {
  // await mq.channel?.deleteQueue('billd-live-server-dev-order______4300');
  // await mq.channel?.deleteQueue('billd-live-server-dev-sendMsg___');
};

export const connectRabbitMQ = async () => {
  const { url } = RABBITMQ_CONFIG;
  mq.connection = await amqp.connect(url);
  console.log(chalkSUCCESS(`连接${url}服务器的RabbitMQ成功！`));
};

export const createRabbitMQChannel = async () => {
  if (!mq.connection) return;
  mq.channel = await mq.connection.createChannel();
  delRabbitMQQueue();
  console.log(chalkSUCCESS('RabbitMQ创建channel成功！'));
};
