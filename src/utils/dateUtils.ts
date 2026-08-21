import type { HolidayYear, WorkCalendarConfig } from '../types';

/** 默认每周休息日：周日(0)与周六(6)，即双休。 */
export const DEFAULT_REST_DAYS: number[] = [0, 6];

/** 将 Date 格式化为本地 'YYYY-MM-DD'（不受时区偏移影响）。 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 在保留时分秒的前提下，对日期加减整数个自然日（自动处理跨月/跨年）。 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** 将 'YYYY-MM-DD' 解析为本地零点 Date。 */
export function parseDateKey(key: string): Date {
  const parts = key.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = (parts[1] ?? 1) - 1;
  const day = parts[2] ?? 1;
  return new Date(year, month, day);
}

/** 是否为周末（周六或周日）。 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** 是否为法定节假日（休息日），与星期无关。 */
export function isHoliday(date: Date, holidays: Set<string>): boolean {
  return holidays.has(toDateKey(date));
}

/** 是否为调休补班日（周末上班）。 */
export function isMakeupWorkday(date: Date, makeup: Set<string>): boolean {
  return makeup.has(toDateKey(date));
}

/**
 * 判定某天是否计入工作日：
 * - 调休补班日恒为工作日（即使落在周末）
 * - 否则：非法定节假日 且 非休息日（休息日来自可配置 WorkCalendarConfig）
 *
 * @param config 工作日历配置（可选）。缺省使用双休 [0,6]。
 */
export function isWorkday(
  date: Date,
  holidays: Set<string>,
  makeup: Set<string>,
  config?: WorkCalendarConfig,
): boolean {
  if (isMakeupWorkday(date, makeup)) return true;
  if (isHoliday(date, holidays)) return false;
  const restDays = config?.restDays ?? DEFAULT_REST_DAYS;
  return !restDays.includes(date.getDay());
}

/** 两个日期（按本地零点）相差的整天数，result = to − from。 */
export function diffInDays(from: Date, to: Date): number {
  const a = parseDateKey(toDateKey(from)).getTime();
  const b = parseDateKey(toDateKey(to)).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** 格式化为 'YYYY-MM-DD'。 */
export function formatDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 格式化为 'YYYY-MM-DD HH:mm:ss'。 */
export function formatDateTime(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 转为 <input type="datetime-local"> 所需的 'YYYY-MM-DDTHH:mm' 值（本地时区）。 */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 从 'YYYY-MM-DDTHH:mm'（或 'YYYY-MM-DD'）解析为本地 Date。 */
export function fromDateTimeLocalValue(value: string): Date {
  const [datePart, timePart = '00:00'] = value.split('T');
  const dateParts = datePart.split('-').map(Number);
  const timeParts = timePart.split(':').map(Number);
  const year = dateParts[0] ?? 0;
  const month = (dateParts[1] ?? 1) - 1;
  const day = dateParts[2] ?? 1;
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  return new Date(year, month, day, hours, minutes, 0, 0);
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const;

/** 返回中文星期，例如 '星期三'。 */
export function weekdayName(date: Date): string {
  return `星期${WEEKDAY_LABELS[date.getDay()]}`;
}

/** 将年度节假日数据合并为快速查找的 Set。 */
export function buildHolidaySets(data: HolidayYear[]): {
  holidays: Set<string>;
  makeup: Set<string>;
} {
  const holidays = new Set<string>();
  const makeup = new Set<string>();
  for (const year of data) {
    year.holidays.forEach((d) => holidays.add(d));
    year.makeupWorkdays.forEach((d) => makeup.add(d));
  }
  return { holidays, makeup };
}
