import { exec } from 'child_process';

import axios from 'axios';
import { logData } from 'billd-html-webpack-plugin';
import { ParameterizedContext } from 'koa';

import successHandler from '@/app/handler/success-handle';
import { PROJECT_ENV, PROJECT_NAME } from '@/constant';
import { chalkERROR, chalkINFO } from '@/utils/chalkTip';

function execCmd({ key, cmd }: { key: string; cmd: string }) {
  return new Promise<{ key; res }>((resolve) => {
    exec(
      cmd,
      {
        cwd: process.cwd(),
      },
      (error, stdout, stderr) => {
        if (error) {
          // nginx -v时,error是null,stderr是nginx version: nginx/1.23.3
          // if (error || stderr) {
          console.error(chalkERROR(`执行${cmd}出错`));
          console.log('error', error);
          console.log('stdout', stdout);
          console.log('stderr', stderr);
          resolve({
            key,
            res: String(error || stderr)
              .toString()
              .trim(),
          });
        }
        if (stdout || stderr) {
          console.log(chalkINFO(`执行${cmd}成功`));
          console.log('error', error);
          console.log('stdout', stdout);
          console.log('stderr', stderr);
          resolve({ key, res: (stdout || stderr).toString().trim() });
        }
      }
    );
  });
}

const cmdMap = {
  uname: 'uname -a', // 系统信息
  redisVersion: 'redis-server -v', // redis版本
  mysqlVersion: 'mysql -V', // mysql版本
  nginxVersion: 'nginx -v', // nginx版本
  dockerVersion: 'docker -v', // docker版本
  pm2Version: 'pm2 -v', // pm2版本
  nodeVersion: 'node -v', // node版本
  npmVersion: 'npm -v', // npm版本
  pnpmVersion: 'pnpm -v', // pnpm版本
};

class OtherController {
  common = {
    /**
     * 返回值：true：健康；false：不健康
     */
    async healthCheckByFlv(url) {
      let health = false;
      try {
        const res = await axios.head(url, {
          timeout: 1000 * 3,
        });
        health = res.status === 200;
      } catch (error) {
        console.log(error);
      }
      return health;
    },
    /**
     * 返回值：true：健康；false：不健康
     */
    async healthCheckByHls(url) {
      let health = false;
      let retry = 0;
      const retryMax = 3;
      const main = async () => {
        try {
          const res = await axios.head(url, {
            timeout: 1000 * 2,
          });
          health = res.status === 200;
        } catch (error) {
          console.log(error);
          if (retry < retryMax) {
            retry += 1;
            main();
          }
        }
      };
      await main();
      return health;
    },
  };

  getClientIp = async (ctx: ParameterizedContext, next) => {
    const client_ip = ctx?.request?.headers?.['x-real-ip'] || '';
    // throw new Error('dds');
    // throw new CustomError({
    //   msg: `xxxx`,
    // });
    successHandler({
      ctx,
      data: {
        client_ip,
      },
    });
    await next();
  };

  healthCheckByFlv = async (ctx: ParameterizedContext, next) => {
    const { url } = ctx.request.query;
    const health = await this.common.healthCheckByFlv(url);

    successHandler({
      ctx,
      data: {
        health,
      },
    });
    await next();
  };

  healthCheckByHls = async (ctx: ParameterizedContext, next) => {
    const { url } = ctx.request.query;
    const health = await this.common.healthCheckByHls(url);

    successHandler({
      ctx,
      data: {
        health,
      },
    });
    await next();
  };

  getServerInfo = async (ctx: ParameterizedContext, next) => {
    successHandler({
      ctx,
      data: {},
    });
    const server: Record<string, string> = {};
    const cmdArr: Promise<{ key; res }>[] = [];
    Object.keys(cmdMap).forEach((key) => {
      try {
        cmdArr.push(execCmd({ key, cmd: cmdMap[key] }));
      } catch (error) {
        console.log(error);
      }
    });
    try {
      const serverInfo = await Promise.all(cmdArr);
      Object.keys(serverInfo).forEach((index) => {
        const item = serverInfo[+index];
        server[item.key] = item.res;
      });
    } catch (error) {
      console.log(error);
    }
    successHandler({
      ctx,
      data: {
        project_name: PROJECT_NAME,
        project_env: PROJECT_ENV,
        updated_at: new Date().toLocaleString(),
        server,
        billd: logData(),
      },
    });
    await next();
  };
}

export default new OtherController();
