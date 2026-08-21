import type {
  CalculationDetail,
  CalculationInput,
  CalculationResult,
  Direction,
  HolidayYear,
  RemainingInput,
  WorkCalendarConfig,
} from '../types';
import {
  addDays,
  diffInDays,
  isHoliday,
  isMakeupWorkday,
  isWeekend,
  isWorkday,
} from './dateUtils';

/** 防止异常输入导致死循环的最大迭代次数。 */
const MAX_ITERATIONS = 100_000;

/** 生成一条全零的明细（含空日期列表）。 */
function emptyDetail(): CalculationDetail {
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
function sortDates(list: string[]): string[] {
  return [...list].sort();
}

/**
 * 核心计算入口：根据期限类型选择连续日或工作日算法。
 * @throws 当期限长度不是正整数时抛出错误。
 */
export function computeDeadline(
  input: CalculationInput,
  holidayData: HolidayYear[],
): CalculationResult {
  const { start, type, length, direction, includeStartDay, config } = input;
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('期限长度必须为正整数');
  }

  const { holidays, makeup } = buildSets(holidayData);

  if (type === 'calendar' || type === 'natural') {
    return computeContinuousDays(
      start,
      length,
      direction,
      includeStartDay,
      holidays,
      makeup,
    );
  }
  return computeWorkdays(start, length, direction, includeStartDay, holidays, makeup, config);
}

/**
 * 日历日 / 自然日：按连续 24 小时推进。
 * - 包含起始日：起始日记为第 1 天，整体偏移 (length - 1) 天
 * - 不含起始日：从次日计第 1 天，整体偏移 length 天
 * 途经的周末 / 节假日 / 补班日均按"连续风格"分别计入（互不排斥）。
 */
function computeContinuousDays(
  start: Date,
  length: number,
  direction: Direction,
  includeStartDay: boolean,
  holidays: Set<string>,
  makeup: Set<string>,
): CalculationResult {
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
 * - 包含起始日：从起始日当天开始计数（若为工作日即第 1 天）
 * - 不含起始日：从起始日的相邻一天开始计数
 * 途经的非工作日（周末 / 工作日节假日）与调休补班日按"工作日风格"计入：
 * 调休补班日优先级最高（计为工作日），其次周末，再次工作日节假日。
 */
function computeWorkdays(
  start: Date,
  length: number,
  direction: Direction,
  includeStartDay: boolean,
  holidays: Set<string>,
  makeup: Set<string>,
  config?: WorkCalendarConfig,
): CalculationResult {
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
 * 反向反推（P1-1）：给定起止日与口径，计算两者之间还需多少个工作日 / 日历日。
 * - 日历日 / 自然日：返回起止日相差的整天数（deadline − start）。
 * - 工作日：返回闭区间 [min, max] 内的工作日总数（含两端）。
 * 返回的 CalculationResult 中 deadline 即输入截止日，detail 含途经明细。
 */
export function computeRemaining(
  input: RemainingInput,
  holidayData: HolidayYear[],
): CalculationResult {
  const { start, deadline, type, config } = input;
  const { holidays, makeup } = buildSets(holidayData);

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

  // 工作日：统计闭区间内工作日数，并收集途经的非工作日 / 补班日
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

/** 反向反推的薄包装：仅返回间隔天数（PRD P1-1 语义）。 */
export function countDaysBetween(
  input: RemainingInput,
  holidayData: HolidayYear[],
): number {
  return computeRemaining(input, holidayData).detail.countedDays;
}

/** 将年度节假日数据合并为快速查找的 Set。 */
function buildSets(data: HolidayYear[]): { holidays: Set<string>; makeup: Set<string> } {
  const holidays = new Set<string>();
  const makeup = new Set<string>();
  for (const year of data) {
    year.holidays.forEach((d) => holidays.add(d));
    year.makeupWorkdays.forEach((d) => makeup.add(d));
  }
  return { holidays, makeup };
}

/** 将日期格式化为本地 'YYYY-MM-DD'。 */
function keyOf(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
