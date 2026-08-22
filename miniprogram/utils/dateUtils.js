// utils/dateUtils.js —— 纯函数日期工具（小程序原生，无框架依赖）
// 与 Web 版 src/utils/dateUtils.ts 语义一致。

/** 默认每周休息日：周日(0)与周六(6)，即双休。 */
const DEFAULT_REST_DAYS = [0, 6];

/** 将 Date 格式化为本地 'YYYY-MM-DD'（不受时区偏移影响）。 */
function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 在保留时分秒的前提下，对日期加减整数个自然日（自动处理跨月/跨年）。 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** 将 'YYYY-MM-DD' 解析为本地零点 Date。 */
function parseDateKey(key) {
  const parts = String(key).split('-').map(Number);
  const year = parts[0] || 0;
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  return new Date(year, month, day);
}

/** 是否为周末（周六或周日）。 */
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** 是否为法定节假日（休息日），与星期无关。 */
function isHoliday(date, holidays) {
  return holidays.has(toDateKey(date));
}

/** 是否为调休补班日（周末上班）。 */
function isMakeupWorkday(date, makeup) {
  return makeup.has(toDateKey(date));
}

/**
 * 判定某天是否计入工作日：
 * - 调休补班日恒为工作日（即使落在周末）
 * - 否则：非法定节假日 且 非休息日（休息日来自可配置 WorkCalendarConfig）
 */
function isWorkday(date, holidays, makeup, config) {
  if (isMakeupWorkday(date, makeup)) return true;
  if (isHoliday(date, holidays)) return false;
  const restDays = (config && config.restDays) || DEFAULT_REST_DAYS;
  return !restDays.includes(date.getDay());
}

/** 两个日期（按本地零点）相差的整天数，result = to − from。 */
function diffInDays(from, to) {
  const a = parseDateKey(toDateKey(from)).getTime();
  const b = parseDateKey(toDateKey(to)).getTime();
  return Math.round((b - a) / 86400000);
}

/** 格式化为 'YYYY-MM-DD'。 */
function formatDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 格式化为 'YYYY-MM-DD HH:mm:ss'。 */
function formatDateTime(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/** 返回中文星期，例如 '星期三'。 */
function weekdayName(date) {
  return `星期${WEEKDAY_LABELS[date.getDay()]}`;
}

/** 将年度节假日数据合并为快速查找的 Set。 */
function buildHolidaySets(data) {
  const holidays = new Set();
  const makeup = new Set();
  for (const year of data) {
    (year.holidays || []).forEach((d) => holidays.add(d));
    (year.makeupWorkdays || []).forEach((d) => makeup.add(d));
  }
  return { holidays, makeup };
}

module.exports = {
  DEFAULT_REST_DAYS,
  toDateKey,
  addDays,
  parseDateKey,
  isWeekend,
  isHoliday,
  isMakeupWorkday,
  isWorkday,
  diffInDays,
  formatDate,
  formatDateTime,
  weekdayName,
  buildHolidaySets,
};
