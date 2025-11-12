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
   * 服务器时区缓存
   */
  private static serverTimezoneCache: string | null = null;

  /**
   * 获取服务器当前的时区
   * @returns 服务器时区（IANA时区标识符格式，如"Asia/Shanghai"）
   */
  static getServerTimezone(): string {
    // 检查缓存
    if (this.serverTimezoneCache) {
      return this.serverTimezoneCache;
    }

    try {
      // 首先尝试从环境变量获取时区
      if (process.env.TZ) {
        this.serverTimezoneCache = process.env.TZ;
        return this.serverTimezoneCache;
      }

      // 计算当前时区偏移量（分钟）
      const offsetMinutes = new Date().getTimezoneOffset();

      // 根据偏移量映射到对应的IANA时区标识符
      const ianaTimezone = this.getIanaTimezoneFromOffset(offsetMinutes);

      // 缓存结果
      this.serverTimezoneCache = ianaTimezone;
      return ianaTimezone;
    } catch (error) {
      console.error('获取服务器时区失败:', error);
      // 发生错误时返回默认时区
      this.serverTimezoneCache = 'Asia/Shanghai';
      return this.serverTimezoneCache;
    }
  }

  /**
   * 根据时区偏移量获取对应的IANA时区标识符
   * @param offsetMinutes 时区偏移量（分钟）
   * @returns IANA时区标识符
   */
  private static getIanaTimezoneFromOffset(offsetMinutes: number): string {
    // 使用Map来确保正确的数字键类型，避免Record<number, string>的类型问题
    const offsetToTimezone = new Map<number, string>([
      [480, 'Asia/Shanghai'], // UTC+8
      [0, 'UTC'], // UTC+0
      [540, 'Asia/Tokyo'], // UTC+9
      [-300, 'America/New_York'], // UTC-5
      [-480, 'America/Los_Angeles'], // UTC-8
      [60, 'Europe/London'], // UTC+1
      [660, 'Australia/Sydney'], // UTC+11
      [-360, 'America/Chicago'], // UTC-6
      [-420, 'America/Denver'], // UTC-7
      [180, 'Europe/Berlin'], // UTC+3
      [240, 'Europe/Moscow'], // UTC+4
      [420, 'Asia/Dubai'], // UTC+7
      [360, 'Asia/Bangkok'], // UTC+6
      [300, 'Asia/Kolkata'], // UTC+5
      [120, 'Europe/Paris'], // UTC+2
      [600, 'Pacific/Auckland'], // UTC+10
      [-540, 'America/Anchorage'], // UTC-9
      [-600, 'Pacific/Honolulu'], // UTC-10
    ]);

    // 直接使用原始偏移量值查找，保留正负号的重要性
    // 如果找到对应的时区，则返回；否则返回UTC
    if (offsetToTimezone.has(offsetMinutes)) {
      return offsetToTimezone.get(offsetMinutes)!;
    }

    // 处理特殊情况：秒为单位的偏移量（如果有）
    if (Math.abs(offsetMinutes) > 1440) {
      // 超过一天的分钟数，可能是秒
      const offsetHours = Math.round(offsetMinutes / 60);
      if (offsetToTimezone.has(offsetHours)) {
        return offsetToTimezone.get(offsetHours)!;
      }
    }

    // 如果没有精确匹配，尝试查找最接近的主要时区
    // 例如：对于+8:05等不常见偏移，仍然映射到UTC+8
    const normalizedOffset = Math.round(offsetMinutes / 60) * 60;
    if (offsetToTimezone.has(normalizedOffset)) {
      return offsetToTimezone.get(normalizedOffset)!;
    }

    return 'UTC';
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
