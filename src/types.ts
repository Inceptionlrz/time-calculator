/**
 * 期限类型。
 * - calendar: 日历日（连续自然日，含周末/节假日）
 * - natural:  自然日（连续 24 小时为一天，计算语义同日历日）
 * - workday:  工作日（周一至周五，排除法定节假日，调休补班日计入）
 */
export type PeriodType = 'calendar' | 'natural' | 'workday';

/** 计算方向：forward 正向（起始 + N），backward 反向（起始 − N）。 */
export type Direction = 'forward' | 'backward';

/** 推算模式：forward 起始 ± N；remaining 给定起止日反推间隔。 */
export type CalcMode = 'forward' | 'remaining';

/** 地区标识（P1-3 节假日数据集）。 */
export type RegionId = 'cn-mainland' | 'hk';

/** 单一年度的节假日数据。日期均使用本地 'YYYY-MM-DD' 字符串表示。 */
export interface HolidayYear {
  /** 年份 */
  year: number;
  /** 法定休息日（含节假日及连休周末），例如 '2024-02-10' */
  holidays: string[];
  /** 调休补班日（通常为周末上班），例如 '2024-02-04' */
  makeupWorkdays: string[];
}

/**
 * 工作日历配置（P1-2 单休 / 自定义休息日）。
 * restDays 为 Date.getDay() 取值：0=周日 … 6=周六。
 * 双休默认 [0, 6]；单休（仅周日休息、周六上班）为 [0]；可任意自定义。
 */
export interface WorkCalendarConfig {
  /** 每周休息日（getDay 取值集合） */
  restDays: number[];
}

/** 地区注册项（P1-3）。 */
export interface HolidayRegion {
  /** 地区标识 */
  id: RegionId;
  /** 显示名 */
  name: string;
  /** 该地区节假日数据 */
  data: HolidayYear[];
  /** 该地区默认每周休息日 */
  defaultRestDays: number[];
}

/** 计算输入参数。 */
export interface CalculationInput {
  /** 起始日期时间 */
  start: Date;
  /** 期限类型 */
  type: PeriodType;
  /** 期限长度（正整数） */
  length: number;
  /** 计算方向 */
  direction: Direction;
  /** 是否包含起始日当天（勾选则从当天计为第 1 天） */
  includeStartDay: boolean;
  /** 工作日历配置（可选，缺省为双休 [0,6]） */
  config?: WorkCalendarConfig;
}

/** 反向反推输入（P1-1 给定截止日，反推间隔天数）。 */
export interface RemainingInput {
  /** 起点（通常为今天或约定起始日） */
  start: Date;
  /** 截止日 */
  deadline: Date;
  /** 期限类型 */
  type: PeriodType;
  /** 工作日历配置（可选，缺省为双休 [0,6]） */
  config?: WorkCalendarConfig;
}

/** 计算明细。 */
export interface CalculationDetail {
  /** 经过的周末天数（周六/周日） */
  weekendDays: number;
  /** 经过的法定节假日总天数（含周末） */
  holidayDays: number;
  /** 经过的法定节假日中落在工作日（周一至周五）的天数 */
  holidayWeekdays: number;
  /** 经过/计入的调休补班日数量 */
  makeupWorkdays: number;
  /** 实际计入的总天数（日历/自然日为跨度天数；工作日为工作日数；反推时为间隔天数） */
  countedDays: number;
  /** 跳过的非工作日数量（仅工作日模式有意义） */
  skippedOffDays: number;
  /** 途经周末的具体日期列表（'YYYY-MM-DD'） */
  weekendDateList: string[];
  /** 途经法定节假日的具体日期列表（'YYYY-MM-DD'） */
  holidayDateList: string[];
  /** 计入/途经调休补班日的具体日期列表（'YYYY-MM-DD'） */
  makeupDateList: string[];
}

/** 计算结果。 */
export interface CalculationResult {
  /** 截止日期时间 */
  deadline: Date;
  /** 计算明细 */
  detail: CalculationDetail;
}
