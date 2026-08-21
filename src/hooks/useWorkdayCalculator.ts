import { useCallback, useMemo, useState } from 'react';
import type {
  CalcMode,
  CalculationResult,
  Direction,
  HolidayYear,
  PeriodType,
  RegionId,
} from '../types';
import { computeDeadline, computeRemaining } from '../utils/calculator';
import { regions, defaultRegionId } from '../data/regions';

type HolidayKind = 'holiday' | 'makeup';

/** 在节假日数据中新增/删除某天（按日期年份归并到对应年度）。 */
function updateHolidayList(
  data: HolidayYear[],
  date: string,
  kind: HolidayKind,
  action: 'add' | 'remove',
): HolidayYear[] {
  const year = Number(date.split('-')[0]);
  const exists = data.some((entry) => entry.year === year);

  if (!exists) {
    if (action === 'add') {
      const created: HolidayYear = {
        year,
        holidays: kind === 'holiday' ? [date] : [],
        makeupWorkdays: kind === 'makeup' ? [date] : [],
      };
      return [...data, created].sort((a, b) => a.year - b.year);
    }
    return data;
  }

  return data.map((entry) => {
    if (entry.year !== year) return entry;
    if (kind === 'holiday') {
      const set = new Set(entry.holidays);
      if (action === 'add') set.add(date);
      else set.delete(date);
      return { ...entry, holidays: Array.from(set).sort() };
    }
    const set = new Set(entry.makeupWorkdays);
    if (action === 'add') set.add(date);
    else set.delete(date);
    return { ...entry, makeupWorkdays: Array.from(set).sort() };
  });
}

/** useWorkdayCalculator 对外暴露的状态与方法。 */
export interface UseWorkdayCalculator {
  /** 真实今天（设备本地日期，用于倒计时） */
  today: Date;
  start: Date;
  setStart: (date: Date) => void;
  type: PeriodType;
  setType: (type: PeriodType) => void;
  length: number;
  setLength: (length: number) => void;
  direction: Direction;
  setDirection: (direction: Direction) => void;
  includeStartDay: boolean;
  setIncludeStartDay: (value: boolean) => void;
  /** 推算模式：forward 起始±N；remaining 起止反推 */
  mode: CalcMode;
  setMode: (mode: CalcMode) => void;
  /** 反推模式下的截止日 */
  deadline: Date;
  setDeadline: (date: Date) => void;
  /** 当前地区 */
  regionId: RegionId;
  setRegion: (id: RegionId) => void;
  /** 每周休息日（getDay 取值） */
  restDays: number[];
  setRestDays: (days: number[]) => void;
  holidayData: HolidayYear[];
  addHoliday: (date: string) => void;
  removeHoliday: (date: string) => void;
  addMakeup: (date: string) => void;
  removeMakeup: (date: string) => void;
  resetHolidays: () => void;
  result: CalculationResult | null;
  error: string | null;
}

/**
 * 时间计算器状态管理 Hook：
 * 维护输入参数与可编辑的节假日数据，并通过 useMemo 实时计算截止日期。
 */
export function useWorkdayCalculator(): UseWorkdayCalculator {
  const [today] = useState<Date>(() => new Date());
  const [start, setStart] = useState<Date>(() => new Date());
  const [type, setType] = useState<PeriodType>('workday');
  const [length, setLengthState] = useState<number>(5);
  const [direction, setDirection] = useState<Direction>('forward');
  const [includeStartDay, setIncludeStartDay] = useState<boolean>(true);
  const [mode, setModeState] = useState<CalcMode>('forward');
  const [deadline, setDeadline] = useState<Date>(() => new Date());
  const [regionId, setRegionId] = useState<RegionId>(defaultRegionId);
  const [restDays, setRestDays] = useState<number[]>(
    () => regions[defaultRegionId].defaultRestDays,
  );
  const [holidayData, setHolidayData] = useState<HolidayYear[]>(
    () => regions[defaultRegionId].data,
  );

  const setLength = useCallback((value: number): void => {
    if (!Number.isFinite(value) || value <= 0) {
      setLengthState(1);
      return;
    }
    setLengthState(Math.floor(value));
  }, []);

  const setMode = useCallback((m: CalcMode): void => setModeState(m), []);

  const setRegion = useCallback((id: RegionId): void => {
    setRegionId(id);
    setHolidayData(regions[id].data);
    setRestDays(regions[id].defaultRestDays);
  }, []);

  const addHoliday = useCallback((date: string): void => {
    setHolidayData((prev) => updateHolidayList(prev, date, 'holiday', 'add'));
  }, []);
  const removeHoliday = useCallback((date: string): void => {
    setHolidayData((prev) => updateHolidayList(prev, date, 'holiday', 'remove'));
  }, []);
  const addMakeup = useCallback((date: string): void => {
    setHolidayData((prev) => updateHolidayList(prev, date, 'makeup', 'add'));
  }, []);
  const removeMakeup = useCallback((date: string): void => {
    setHolidayData((prev) => updateHolidayList(prev, date, 'makeup', 'remove'));
  }, []);
  const resetHolidays = useCallback((): void => {
    setHolidayData(regions[regionId].data);
  }, [regionId]);

  const { result, error } = useMemo(() => {
    try {
      const config = { restDays };
      if (mode === 'remaining') {
        const computed = computeRemaining(
          { start, deadline, type, config },
          holidayData,
        );
        return { result: computed, error: null as string | null };
      }
      const computed = computeDeadline(
        { start, type, length, direction, includeStartDay, config },
        holidayData,
      );
      return { result: computed, error: null as string | null };
    } catch (e) {
      const message = e instanceof Error ? e.message : '计算出错';
      return { result: null, error: message };
    }
  }, [start, type, length, direction, includeStartDay, mode, deadline, restDays, holidayData]);

  return {
    today,
    start,
    setStart,
    type,
    setType,
    length,
    setLength,
    direction,
    setDirection,
    includeStartDay,
    setIncludeStartDay,
    mode,
    setMode,
    deadline,
    setDeadline,
    regionId,
    setRegion,
    restDays,
    setRestDays,
    holidayData,
    addHoliday,
    removeHoliday,
    addMakeup,
    removeMakeup,
    resetHolidays,
    result,
    error,
  };
}
