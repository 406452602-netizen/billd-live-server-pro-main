import nodeChalk from 'chalk';
import nodeEmoji from 'node-emoji';

import { PROJECT_ENV, PROJECT_ENV_ENUM } from '../constant';

export const emoji = nodeEmoji;
export const chalk = nodeChalk;

const disablePrettier = PROJECT_ENV === PROJECT_ENV_ENUM.prod;

export const chalkINFO = (v: string) => {
  if (disablePrettier) {
    return `  INFO     ${v}`;
  }
  const time = new Date().toLocaleString('zh-CN');
  const prefix = `[${time}]  INFO    `;
  return `${chalk.bgBlueBright.black(prefix)} ${chalk.blueBright(v)}`;
};
export const chalkSUCCESS = (v: string) => {
  if (disablePrettier) {
    return `  SUCCESS  ${v}`;
  }
  const time = new Date().toLocaleString('zh-CN');
  const prefix = `[${time}]  SUCCESS `;
  return `${chalk.bgGreenBright.black(prefix)} ${chalk.greenBright(v)}`;
};
export const chalkERROR = (v: string) => {
  if (disablePrettier) {
    return `  ERROR    ${v}`;
  }
  const time = new Date().toLocaleString('zh-CN');
  const prefix = `[${time}]  ERROR   `;
  return `${chalk.bgRedBright.black(prefix)} ${chalk.redBright(v)}`;
};
export const chalkWARN = (v: string) => {
  if (disablePrettier) {
    return `  WARN     ${v}`;
  }
  const time = new Date().toLocaleString('zh-CN');
  const prefix = `[${time}]  WARN    `;
  return `${chalk.bgHex('#FFA500').black(`${prefix}`)} ${chalk.hex('#FFA500')(
    v
  )}`;
};
