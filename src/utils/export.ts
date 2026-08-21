import type {
  CalculationDetail,
  CalculationResult,
  CalcMode,
  Direction,
  PeriodType,
} from '../types';
import { formatDateTime, parseDateKey, toDateKey, weekdayName } from './dateUtils';

const TYPE_LABEL: Record<PeriodType, string> = {
  calendar: '日历日',
  natural: '自然日',
  workday: '工作日',
};

/** 复制结果所需的上下文。 */
export interface ResultCopyContext {
  /** 计算结果 */
  result: CalculationResult;
  /** 期限类型 */
  type: PeriodType;
  /** 推算模式（forward 起始±N；remaining 起止反推） */
  mode?: CalcMode;
  /** 正向/反向（forward 模式用） */
  direction?: Direction;
  /** 是否含起始日（forward 模式用） */
  includeStartDay?: boolean;
  /** 期限长度（forward 模式用） */
  length?: number;
  /** 起始日（remaining 模式用于展示起止区间） */
  start?: Date;
  /** 真实今天（用于展示距今剩余天数） */
  today?: Date;
}

/** 将日期列表格式化为可读文本（无则"无"）。 */
function formatDateList(dates: string[]): string {
  return dates.length > 0 ? dates.join('、') : '无';
}

/**
 * 将计算结果格式化为纯文本，便于复制到邮件 / IM。
 * 示例：
 *   截止日：2026-03-10 14:30（星期二）
 *   共 5 个工作日（正向 · 含起始日）
 *   距今剩余：6 天
 *   途经周末：2 天（2026-03-07、2026-03-08）
 *   途经法定节假日：0 天
 *   含调休补班日：0 天
 */
export function formatResultAsText(ctx: ResultCopyContext): string {
  const { result, type } = ctx;
  const deadline = result.deadline;
  const detail: CalculationDetail = result.detail;
  const lines: string[] = [];

  lines.push(`截止日：${formatDateTime(deadline)}（${weekdayName(deadline)}）`);

  if (ctx.mode === 'remaining' && ctx.start) {
    const startKey = formatDateTime(ctx.start).slice(0, 10);
    const endKey = formatDateTime(deadline).slice(0, 10);
    lines.push(
      `起止间隔：${detail.countedDays} 个${TYPE_LABEL[type]}（${startKey} → ${endKey}）`,
    );
  } else {
    const dir = ctx.direction === 'backward' ? '反向' : '正向';
    const inc = ctx.includeStartDay ? '含起始日' : '不含起始日';
    lines.push(
      `共 ${ctx.length ?? detail.countedDays} 个${TYPE_LABEL[type]}（${dir} · ${inc}）`,
    );
  }

  if (ctx.today) {
    const ms =
      parseDateKey(toDateKey(deadline)).getTime() -
      parseDateKey(toDateKey(ctx.today)).getTime();
    const days = Math.round(ms / 86_400_000);
    lines.push(`距今剩余：${days} 天`);
  }

  lines.push(`途经周末：${detail.weekendDays} 天（${formatDateList(detail.weekendDateList)}）`);
  lines.push(
    `途经法定节假日：${detail.holidayDays} 天（${formatDateList(detail.holidayDateList)}）`,
  );
  lines.push(
    `含调休补班日：${detail.makeupWorkdays} 天（${formatDateList(detail.makeupDateList)}）`,
  );

  return lines.join('\n');
}
