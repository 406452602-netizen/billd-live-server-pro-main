/**
 * 时区工具类
 * 用于处理不同时区之间的时间转换
 */
export class TimezoneUtil {
  /**
   * 获取两个时区之间的偏移量（分钟）
   * @param fromTimezone 源时区
   * @param toTimezone 目标时区
   * @returns 偏移量（分钟），正数表示目标时区比源时区快
   */
  static getTimezoneOffset(fromTimezone: string, toTimezone: string): number {
    // 这里简化处理，实际项目中可能需要使用专门的时区库
    // 例如：luxon、date-fns-tz 等

    // 示例：处理一些常见时区的偏移量
    const timezoneOffsets: Record<string, number> = {
      UTC: 0,
      'Asia/Shanghai': 8 * 60, // UTC+8
      'Asia/Hong_Kong': 8 * 60, // UTC+8
      'Asia/Tokyo': 9 * 60, // UTC+9
      'America/New_York': -5 * 60, // UTC-5 (夏令时)
      'America/Los_Angeles': -8 * 60, // UTC-8 (夏令时)
      'Europe/London': 0 * 60, // UTC+0 (夏令时)
      'Australia/Sydney': 11 * 60, // UTC+11 (夏令时)
      'Asia/Seoul': 9 * 60, // UTC+9
      'Asia/Singapore': 8 * 60, // UTC+8
    };

    const fromOffset = timezoneOffsets[fromTimezone] || 0;
    const toOffset = timezoneOffsets[toTimezone] || 0;

    return toOffset - fromOffset;
  }

  /**
   * 获取服务器当前的时区
   * @returns 服务器时区
   */
  static getServerTimezone(): string {
    // 默认返回 UTC+8 时区
    // 实际项目中可以通过配置或系统环境变量获取
    return 'Asia/Shanghai';
  }

  /**
   * 调整时间
   * @param time 原始时间字符串
   * @param offsetMinutes 偏移分钟数
   * @param format 时间格式
   * @returns 调整后的时间字符串
   */
  static adjustTime(
    time: string,
    offsetMinutes: number,
    format = 'YYYY-MM-DD HH:mm:ss'
  ): string {
    try {
      // 特别处理UTC格式时间字符串（带Z后缀）
      let processedTime = time;
      if (time.includes('Z')) {
        // 对于UTC时间，我们需要确保正确解析
        processedTime = time;
      }

      const date = new Date(processedTime);

      // 检查日期是否有效
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(date.getTime())) {
        console.warn(`无效的时间字符串: ${time}`);
        return time;
      }

      // 调整时间
      date.setMinutes(date.getMinutes() + offsetMinutes);

      // 根据 format 格式化日期
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return format
        .replace('YYYY', year.toString())
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
    } catch (error) {
      console.error('调整时间失败:', error);
      return time; // 失败时返回原始时间
    }
  }

  /**
   * 格式化时间
   * @param date 日期对象
   * @param format 格式字符串
   * @returns 格式化后的时间字符串
   */
  static formatTime(date: Date, format = 'YYYY-MM-DD HH:mm:ss'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }
}
