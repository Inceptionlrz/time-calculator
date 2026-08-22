// utils/calculator.js —— 计算内核（纯函数，小程序原生）
// 与 Web 版 src/utils/calculator.ts 语义一致。

const {
  addDays,
  diffInDays,
  isHoliday,
  isMakeupWorkday,
  isWeekend,
  isWorkday,
  toDateKey,
  buildHolidaySets,
} = require('./dateUtils');

/** 防止异常输入导致死循环的最大迭代次数。 */
const MAX_ITERATIONS = 100000;

/** 生成一条全零的明细（含空日期列表）。 */
function emptyDetail() {
  return {
    weekendDays: 0,
    holidayDays: 0,
    holidayWeekdays: 0,
    makeupWorkdays: 0,
    countedDays: 0,
    skippedOffDays: 0,
    weekendDateList: [],
    holidayDateList: [],
    makeupDateList: [],
  };
}

/** 将日期列表按时间升序排列（展示用）。 */
function sortDates(list) {
  return [].concat(list).sort();
}

function keyOf(date) {
  return toDateKey(date);
}

/**
 * 核心计算入口：根据期限类型选择连续日或工作日算法。
 * @throws 当期限长度不是正整数时抛出错误。
 */
function computeDeadline(input, holidayData) {
  const { start, type, length, direction, includeStartDay, config } = input;
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('期限长度必须为正整数');
  }
  const { holidays, makeup } = buildHolidaySets(holidayData);
  if (type === 'calendar' || type === 'natural') {
    return computeContinuousDays(start, length, direction, includeStartDay, holidays, makeup);
  }
  return computeWorkdays(start, length, direction, includeStartDay, holidays, makeup, config);
}

/**
 * 日历日 / 自然日：按连续 24 小时推进。
 */
function computeContinuousDays(start, length, direction, includeStartDay, holidays, makeup) {
  const sign = direction === 'forward' ? 1 : -1;
  const dayShift = includeStartDay ? length - 1 : length;
  const deadline = addDays(start, sign * dayShift);
  const from = direction === 'forward' ? start : deadline;
  const to = direction === 'forward' ? deadline : start;
  const detail = emptyDetail();
  let cursor = new Date(from);
  while (cursor.getTime() <= to.getTime()) {
    const key = keyOf(cursor);
    if (isWeekend(cursor)) {
      detail.weekendDays += 1;
      detail.weekendDateList.push(key);
    }
    if (isHoliday(cursor, holidays)) {
      detail.holidayDays += 1;
      if (!isWeekend(cursor)) detail.holidayWeekdays += 1;
      detail.holidayDateList.push(key);
    }
    if (isMakeupWorkday(cursor, makeup)) {
      detail.makeupWorkdays += 1;
      detail.makeupDateList.push(key);
    }
    cursor = addDays(cursor, 1);
  }
  detail.countedDays = length;
  detail.weekendDateList = sortDates(detail.weekendDateList);
  detail.holidayDateList = sortDates(detail.holidayDateList);
  detail.makeupDateList = sortDates(detail.makeupDateList);
  return { deadline, detail };
}

/**
 * 工作日：逐日推进，仅对"工作日"计数，累计到 length 个工作日即为截止日。
 */
function computeWorkdays(start, length, direction, includeStartDay, holidays, makeup, config) {
  const step = direction === 'forward' ? 1 : -1;
  let cursor = includeStartDay ? new Date(start) : addDays(start, step);
  let counted = 0;
  let deadline = new Date(cursor);
  const detail = emptyDetail();
  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    const key = keyOf(cursor);
    if (isWorkday(cursor, holidays, makeup, config)) {
      if (isMakeupWorkday(cursor, makeup)) {
        detail.makeupWorkdays += 1;
        detail.makeupDateList.push(key);
      }
      counted += 1;
      if (counted === length) {
        deadline = new Date(cursor);
        break;
      }
    } else {
      detail.skippedOffDays += 1;
      if (isWeekend(cursor)) {
        detail.weekendDays += 1;
        detail.weekendDateList.push(key);
      } else if (isHoliday(cursor, holidays)) {
        detail.holidayDays += 1;
        detail.holidayWeekdays += 1;
        detail.holidayDateList.push(key);
      }
    }
    cursor = addDays(cursor, step);
  }
  detail.countedDays = counted;
  detail.weekendDateList = sortDates(detail.weekendDateList);
  detail.holidayDateList = sortDates(detail.holidayDateList);
  detail.makeupDateList = sortDates(detail.makeupDateList);
  return { deadline, detail };
}

/**
 * 反向反推：给定起止日与口径，计算两者之间还需多少个工作日 / 日历日。
 */
function computeRemaining(input, holidayData) {
  const { start, deadline, type, config } = input;
  const { holidays, makeup } = buildHolidaySets(holidayData);
  if (type === 'calendar' || type === 'natural') {
    const detail = emptyDetail();
    detail.countedDays = diffInDays(start, deadline);
    const lo = start.getTime() <= deadline.getTime() ? start : deadline;
    const hi = start.getTime() <= deadline.getTime() ? deadline : start;
    let cursor = new Date(lo);
    while (cursor.getTime() <= hi.getTime()) {
      const key = keyOf(cursor);
      if (isWeekend(cursor)) {
        detail.weekendDays += 1;
        detail.weekendDateList.push(key);
      }
      if (isHoliday(cursor, holidays)) {
        detail.holidayDays += 1;
        if (!isWeekend(cursor)) detail.holidayWeekdays += 1;
        detail.holidayDateList.push(key);
      }
      if (isMakeupWorkday(cursor, makeup)) {
        detail.makeupWorkdays += 1;
        detail.makeupDateList.push(key);
      }
      cursor = addDays(cursor, 1);
    }
    detail.weekendDateList = sortDates(detail.weekendDateList);
    detail.holidayDateList = sortDates(detail.holidayDateList);
    detail.makeupDateList = sortDates(detail.makeupDateList);
    return { deadline: new Date(deadline), detail };
  }
  const detail = emptyDetail();
  const lo = start.getTime() <= deadline.getTime() ? start : deadline;
  const hi = start.getTime() <= deadline.getTime() ? deadline : start;
  let cursor = new Date(lo);
  for (let i = 0; i < MAX_ITERATIONS && cursor.getTime() <= hi.getTime(); i += 1) {
    const key = keyOf(cursor);
    if (isWorkday(cursor, holidays, makeup, config)) {
      detail.countedDays += 1;
      if (isMakeupWorkday(cursor, makeup)) {
        detail.makeupWorkdays += 1;
        detail.makeupDateList.push(key);
      }
    } else {
      detail.skippedOffDays += 1;
      if (isWeekend(cursor)) {
        detail.weekendDays += 1;
        detail.weekendDateList.push(key);
      } else if (isHoliday(cursor, holidays)) {
        detail.holidayDays += 1;
        detail.holidayWeekdays += 1;
        detail.holidayDateList.push(key);
      }
    }
    cursor = addDays(cursor, 1);
  }
  detail.weekendDateList = sortDates(detail.weekendDateList);
  detail.holidayDateList = sortDates(detail.holidayDateList);
  detail.makeupDateList = sortDates(detail.makeupDateList);
  return { deadline: new Date(deadline), detail };
}

/** 薄包装：仅返回间隔天数。 */
function countDaysBetween(input, holidayData) {
  return computeRemaining(input, holidayData).detail.countedDays;
}

module.exports = {
  computeDeadline,
  computeRemaining,
  countDaysBetween,
};
