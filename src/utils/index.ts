// WARN 这个文件不能用路径别名！
import { spawnSync } from 'child_process';
import os from 'os';
import path from 'path';

import { ParameterizedContext } from 'koa';
import { Op } from 'sequelize';

import { COMMON_ERROE_MSG, COMMON_ERROR_CODE } from '../constant';
import { IListBase, IPaging } from '../interface';
import { ILiveRoom, LiveRoomTypeEnum } from '../types/ILiveRoom';
import { UserStatusEnum } from '../types/IUser';

/**
 * getRangTimeDay({ rangTimeStart: 1732528055629, rangTimeEnd: 1732787255629 });
 * 结果：
 * [ '2024/11/25', '2024/11/26', '2024/11/27', '2024/11/28' ]
 */
export function getRangTimeDay({ rangTimeStart, rangTimeEnd }) {
  // 存储所有日期的数组
  const dates: string[] = [];

  // 创建起始和结束日期对象
  const startDate = new Date(rangTimeStart);
  const endDate = new Date(rangTimeEnd);

  // 循环遍历日期
  while (startDate <= endDate) {
    // 将当前日期格式化为 YYYY-MM-DD
    const formattedDate = startDate;
    const date = formattedDate
      .toLocaleString()
      .split(' ')[0]
      .replace(/-/g, '/');
    const arr = date.split('/');
    const year = arr[0];
    const month = arr[1].length < 2 ? `0${arr[1]}` : arr[1];
    const day = arr[2].length < 2 ? `0${arr[2]}` : arr[2];
    dates.push(`${year}/${month}/${day}`);
    // 将日期增加一天
    startDate.setDate(startDate.getDate() + 1);
  }

  return dates;
}

export function getForwardMapUrl(data: { liveRoom: ILiveRoom | null }) {
  const map = {
    [LiveRoomTypeEnum.forward_bilibili]:
      data.liveRoom?.forward_bilibili_url || '',
    [LiveRoomTypeEnum.forward_douyin]: data.liveRoom?.forward_douyin_url || '',
    [LiveRoomTypeEnum.forward_douyu]: data.liveRoom?.forward_douyu_url || '',
    [LiveRoomTypeEnum.forward_huya]: data.liveRoom?.forward_huya_url || '',
    [LiveRoomTypeEnum.forward_kuaishou]:
      data.liveRoom?.forward_kuaishou_url || '',
    [LiveRoomTypeEnum.forward_xiaohongshu]:
      data.liveRoom?.forward_xiaohongshu_url || '',
  };
  return map;
}

/**
 * 比较版本号，返回1代表version1更大，返回2代表version2更大，返回0代表相等
 * 版本号格式：1.3.4.5
 */
export function compareVersions(version1: string, version2: string) {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  // 比较每个部分
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i += 1) {
    const v1Part = v1Parts[i] || 0; // 如果 v1Parts 没有该部分，视为 0
    const v2Part = v2Parts[i] || 0; // 如果 v2Parts 没有该部分，视为 0
    if (v1Part > v2Part) return 1; // version1 更大
    if (v1Part < v2Part) return 2; // version2 更大
  }
  return 0; // 两个版本相等
}

export function handleKeyWord({
  keyWord,
  arr,
}: {
  keyWord?: string;
  arr?: string[];
}) {
  if (keyWord && arr?.length) {
    const keyWordWhere: any[] = [];
    arr.forEach((item) => {
      keyWordWhere.push({
        [item]: {
          [Op.like]: `%${keyWord}%`,
        },
      });
    });
    return keyWordWhere;
  }
  return undefined;
}

export function handleRangTime({
  rangTimeType,
  rangTimeStart,
  rangTimeEnd,
}: IListBase) {
  if (rangTimeType && rangTimeStart && rangTimeEnd) {
    return {
      [Op.gt]: new Date(+rangTimeStart),
      [Op.lt]: new Date(+rangTimeEnd),
    };
  }
  return undefined;
}

export function handlePage({ nowPage, pageSize }: IListBase) {
  let nowpage = Number(nowPage) || 1;
  let pagesize = Number(pageSize) || 20;
  nowpage = nowpage <= 0 ? 1 : nowpage;
  pagesize = pagesize >= 200 ? 200 : pagesize;
  const offset = (+nowpage - 1) * +pagesize;
  const limit = +pagesize;
  return { offset, limit, nowpage, pagesize };
}

export function handleOrder({ orderName, orderBy }: IListBase, model?: any) {
  const res: any[] = [];
  if (orderName && orderBy) {
    const name = orderName.split(',');
    const by = orderBy.split(',');
    name.forEach((item, index) => {
      res.push(model ? [model, item, by[index]] : [item, by[index]]);
    });
  }
  return res;
}

/** 字符串截取 */
export function strSlice(str: string, length: number) {
  let res = '';
  try {
    res = str.slice(0, length);
  } catch (error) {
    console.log(error);
  }
  return res;
}

export function handleCtxRequestHeaders(ctx: ParameterizedContext) {
  const { headers } = ctx.request;
  const body = strSlice(JSON.stringify(ctx.request.body), 2000);
  const query = strSlice(JSON.stringify(ctx.request.query), 2000);
  const user_agent = strSlice(String(headers['user-agent']), 490);
  const real_ip = strSlice(String(headers['x-real-ip']), 90);
  const forwarded_for = strSlice(String(headers['x-forwarded-for']), 490);
  const referer = strSlice(String(headers.referer), 490);
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const path = strSlice(String(headers.path), 490);
  return {
    user_agent,
    real_ip,
    forwarded_for,
    referer,
    path,
    body,
    query,
  };
}

export function judgeUserStatus(status: UserStatusEnum) {
  const res = {
    status,
    errorCode: COMMON_ERROR_CODE.admin_disable,
    msg: COMMON_ERROE_MSG.admin_disable,
  };
  switch (status) {
    case UserStatusEnum.disable:
      res.errorCode = COMMON_ERROR_CODE.admin_disable;
      res.msg = COMMON_ERROE_MSG.admin_disable;
      break;
    default:
      res.errorCode = COMMON_ERROR_CODE.userStatusNoNormal;
      res.msg = COMMON_ERROE_MSG.userStatusNoNormal;
      break;
  }
  return res;
}

export function countdown(data: { seconds: number }) {
  const { seconds } = data;
  let remainingTime = seconds;

  function main() {
    process.stdout.write(`\r${remainingTime}秒后开始初始化推流...`);
    remainingTime -= 1;
  }

  main();
  const intervalId = setInterval(() => {
    // 清空当前行并打印剩余时间
    main();
    if (remainingTime < 0) {
      clearInterval(intervalId);
    }
  }, 1000); // 每秒打印一次
}

/**
 * 获取日期当天的开始时间到结束时间
 */
export function dateStartAndEnd(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const startTime = `${y}/${m}/${d} 00:00:00`;
  const endTime = `${y}/${m}/${d} 23:59:59`;
  return {
    startTime,
    endTime,
  };
}

export function getStars(count: number) {
  return '*'.repeat(count);
}

/**
 * 获取最近一周
 */
export const getLastestWeek = () => {
  const oneDay = 1000 * 60 * 60 * 24;
  const endDate = +new Date();
  const startDate = endDate - oneDay * 7;
  return { startDate, endDate };
};

/**
 * @description 格式化内存大小（要求传入的数字以byte为单位）
 * @param {number} val
 * @param {*} num 显示几位小数，默认2
 * @return {*}
 */
export const formatMemorySize = (val: number, num = 2) => {
  // bit:"比特"或"位",1byte=8bit
  const oneByte = 1;
  const oneKb = oneByte * 1024;
  const oneMb = oneKb * 1024;
  const oneGb = oneMb * 1024;
  const oneTb = oneGb * 1024;
  const format = (v: number) => v.toFixed(num);
  if (val < oneKb) {
    return `${format(val / oneByte)}byte`;
  }
  if (val < oneMb) {
    return `${format(val / oneKb)}kb`;
  }
  if (val < oneGb) {
    return `${format(val / oneMb)}mb`;
  }
  if (val < oneTb) {
    return `${format(val / oneGb)}gb`;
  }
  return `${format(val / oneTb)}tb`;
};

export const generateUniqueInviteCode = () => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const timestamp = Date.now().toString(36); // 将时间戳转换为 36 进制字符串
  let randomStr = '';
  const length = 6; // 随机字符长度
  for (let i = 0; i < length; i += 1) {
    randomStr += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return timestamp + randomStr;
};

/**
 * 获取当前机器的ip地址
 */
export function getIpAddress() {
  const interfaces = os.networkInterfaces();
  const res: string[] = [];
  Object.keys(interfaces).forEach((dev) => {
    const iface = interfaces[dev];
    if (iface) {
      for (let i = 0; i < iface.length; i += 1) {
        const { family, address } = iface[i];
        if (family === 'IPv4') {
          res.push(address);
        }
      }
    }
  });
  return res;
}

/** 延迟执行 */
export const delayByPromise = (delay: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('ok');
    }, delay);
  });
};

export function dockerIsInstalled() {
  const res = spawnSync('docker', ['-v']);
  if (res.status !== 0) {
    return false;
  }
  return true;
}

export const filterObj = (obj: Record<string, any>, keyArr: string[]) => {
  const res: Record<string, any> = {};
  Object.keys(obj).forEach((item) => {
    if (!keyArr.includes(item)) {
      res[item] = obj[item];
    }
  });
  return res;
};
const appDir = process.cwd();
export const resolveApp = (relativePath) => {
  return path.join(appDir, relativePath);
  // return path.join(__dirname, '../../', relativePath);
};

/**
 * @description: 处理free命令返回的内存信息
 * @param {string} str
 * @return {*}
 */
export const handleData = (str: string) => {
  const arr = str.match(/\S+/g)!;

  const mem = 'Mem:';
  const swap = 'Swap:';
  const res: any = [];
  const obj: any = {};

  res.push(arr.splice(0, 6));
  res.push(arr.splice(0, 7));
  res.push(arr.splice(0, arr.length));

  res[0].forEach((key: string, index: number) => {
    res[1][index + 1] && (obj[mem + key] = res[1][index + 1]);
    res[2][index + 1] && (obj[swap + key] = res[2][index + 1]);
  });
  return obj;
};

export const replaceKeyFromValue = (str: string, obj: object) => {
  let res = str;
  Object.keys(obj).forEach((v) => {
    res = res.replace(new RegExp(`{${v}}`, 'ig'), obj[v]);
  });
  return res;
};

export const getFileExt = (name: string) => {
  const arr = name.split('.');
  const ext = arr[arr.length - 1];
  return ext;
};

/** 处理返回的分页数据 */
export const handlePaging = <T>(
  result: any,
  nowPage?: number | string,
  pageSize?: number | string
) => {
  // @ts-ignore
  const obj: IPaging<T> = {};
  obj.nowPage = nowPage ? +nowPage : 1;
  obj.pageSize = pageSize ? +pageSize : result.count;
  obj.hasMore = obj.nowPage * obj.pageSize - result.count < 0;
  obj.total = result.count;
  obj.rows = result.rows;
  return obj;
};

/** 处理返回的分页数据 */
export const handleGroupPaging = <T>(
  result: { count: any[]; rows: any[] },
  nowPage?: number | string,
  pageSize?: number | string
) => {
  // @ts-ignore
  const obj: IPaging<T> = {};
  obj.nowPage = nowPage ? +nowPage : 1;
  obj.pageSize = pageSize ? +pageSize : result.count.length;
  obj.hasMore = obj.nowPage * obj.pageSize - result.count.length < 0;
  obj.total = result.count.length;
  obj.rows = result.rows;
  return obj;
};

/**
 * @param code 验证码
 * @param desc 验证码作用
 * @param exp 有效期，单位：秒，但返回时会转换成分钟
 */
export const emailContentTemplate = ({
  code,
  desc,
  exp,
  subject,
}: {
  code: string;
  desc: string;
  exp: number;
  subject?: string;
}) => {
  const subjectTemp = subject || `【自然博客】验证码：${code}`;
  const content = `【自然博客】验证码：${code}，此验证码用于${desc}，有效期${
    exp / 60
  }分钟，请勿告知他人。`;
  return { subject: subjectTemp, content };
};

/**
 * 树型扁平化
 */
export function flattenTree(tree, childrenField = 'children') {
  const result: any[] = [];

  function recurse(node) {
    const flatNode = { ...node };
    delete flatNode[childrenField];

    result.push(flatNode);
    const child = node[childrenField];
    if (child && Array.isArray(child)) {
      child.forEach((item) => {
        recurse(item);
      });
    }
  }

  recurse(tree);

  return result;
}

/**
 * 扁平化数据转树型
 */
export const arrayToTree = (data: {
  arr: any[];
  idField?: string;
  pidField?: string;
  childrenField?: string;
}) => {
  const {
    arr,
    idField = 'id',
    pidField = 'p_id',
    childrenField = 'children',
  } = data;
  const map: any = {};
  const tree: any = [];

  // 创建节点映射
  arr.forEach((item) => {
    map[item[idField]] = { ...item, [childrenField]: [] };
  });

  // 构建树形结构
  arr.forEach((item) => {
    if (map[item[pidField]]) {
      // 如果父节点存在，添加到父节点的子节点数组中
      map[item[pidField]][childrenField].push(map[item[idField]]);
    } else {
      // 如果父节点不存在，则将其作为顶级节点
      tree.push(map[item[idField]]);
    }
  });

  return tree;
};
