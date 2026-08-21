import type { ReactElement } from 'react';
import { useState } from 'react';
import type { CalcMode, CalculationResult, Direction, PeriodType } from '../types';
import { diffInDays, formatDateTime, weekdayName } from '../utils/dateUtils';
import { formatResultAsText } from '../utils/export';

interface ResultCardProps {
  result: CalculationResult | null;
  error: string | null;
  type: PeriodType;
  direction: Direction;
  includeStartDay: boolean;
  length: number;
  /** 真实今天（用于倒计时），缺省取当前时间 */
  today?: Date;
  /** 推算模式，缺省 forward */
  mode?: CalcMode;
  /** 起始日（remaining 模式用于复制文本） */
  start?: Date;
}

const TYPE_LABEL: Record<PeriodType, string> = {
  calendar: '日历日',
  natural: '自然日',
  workday: '工作日',
};

/** 将文本写入剪贴板（兼容非安全上下文）。 */
function copyText(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      resolve();
    } catch (e) {
      reject(e instanceof Error ? e : new Error('复制失败'));
    }
  });
}

/** 渲染一组可折叠的日期列表。 */
function DateListBlock(props: {
  title: string;
  count: number;
  dates: string[];
}): ReactElement | null {
  const { title, count, dates } = props;
  if (count <= 0) return null;
  return (
    <details className="rounded-lg bg-slate-50 px-3 py-2">
      <summary className="cursor-pointer text-sm text-slate-600">
        {title}：<span className="font-semibold text-slate-800">{count}</span> 天
        <span className="ml-1 text-xs text-slate-400">（点击展开）</span>
      </summary>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {dates.map((d) => (
          <span
            key={d}
            className="rounded bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200"
          >
            {d}
          </span>
        ))}
      </div>
    </details>
  );
}

/** 计算结果卡片：展示截止日期时间、剩余天数、计算明细与复制按钮。 */
export function ResultCard(props: ResultCardProps): ReactElement {
  const {
    result,
    error,
    type,
    direction,
    includeStartDay,
    length,
    today,
    mode = 'forward',
    start,
  } = props;
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (): void => {
    if (!result) return;
    const text = formatResultAsText({
      result,
      type,
      mode,
      direction,
      includeStartDay,
      length,
      today,
      start,
    });
    void copyText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setCopied(false);
      });
  };

  const remainingDays =
    result && today ? diffInDays(today, result.deadline) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">计算结果</h2>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!result}
          className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          {copied ? '已复制 ✓' : '复制结果'}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : result ? (
        <div className="space-y-4">
          <div>
            <div className="text-xs text-slate-400">
              {TYPE_LABEL[type]} ·{' '}
              {mode === 'remaining'
                ? '起止反推'
                : direction === 'forward'
                  ? '正向'
                  : '反向'}
              {mode !== 'remaining' &&
                ` · ${includeStartDay ? '含起始日' : '不含起始日'} · ${length} 天`}
            </div>
            <div className="mt-1 text-2xl font-bold text-slate-800">
              {formatDateTime(result.deadline)}
            </div>
            <div className="text-sm text-slate-500">
              {weekdayName(result.deadline)}
            </div>
          </div>

          {remainingDays !== null && (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                remainingDays < 0
                  ? 'bg-red-50 text-red-600'
                  : remainingDays === 0
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {remainingDays < 0
                ? `已过期 ${Math.abs(remainingDays)} 天（${remainingDays}）`
                : remainingDays === 0
                  ? '就是今天'
                  : `距今天还有 ${remainingDays} 天`}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 text-xs font-medium text-slate-500">计算明细</div>
            {type === 'workday' ? (
              <ul className="mb-3 space-y-1 text-sm text-slate-600">
                <li>
                  共计入工作日：
                  <span className="font-semibold text-slate-800">
                    {result.detail.countedDays}
                  </span>{' '}
                  天
                </li>
                <li>
                  跳过非工作日：
                  <span className="font-semibold text-slate-800">
                    {result.detail.skippedOffDays}
                  </span>{' '}
                  天（其中周末 {result.detail.weekendDays} 天，工作日节假日{' '}
                  {result.detail.holidayWeekdays} 天）
                </li>
                <li>
                  含调休补班日：
                  <span className="font-semibold text-slate-800">
                    {result.detail.makeupWorkdays}
                  </span>{' '}
                  天
                </li>
              </ul>
            ) : (
              <ul className="mb-3 space-y-1 text-sm text-slate-600">
                <li>
                  区间跨度：
                  <span className="font-semibold text-slate-800">
                    {result.detail.countedDays}
                  </span>{' '}
                  天
                </li>
                <li>
                  经过周末：
                  <span className="font-semibold text-slate-800">
                    {result.detail.weekendDays}
                  </span>{' '}
                  天
                </li>
                <li>
                  经过法定节假日：
                  <span className="font-semibold text-slate-800">
                    {result.detail.holidayDays}
                  </span>{' '}
                  天（其中工作日节假日 {result.detail.holidayWeekdays} 天）
                </li>
                <li>
                  区间含调休补班日：
                  <span className="font-semibold text-slate-800">
                    {result.detail.makeupWorkdays}
                  </span>{' '}
                  天
                </li>
              </ul>
            )}

            <div className="space-y-2">
              <DateListBlock
                title="途经周末"
                count={result.detail.weekendDays}
                dates={result.detail.weekendDateList}
              />
              <DateListBlock
                title="途经法定节假日"
                count={result.detail.holidayDays}
                dates={result.detail.holidayDateList}
              />
              <DateListBlock
                title="计入调休补班日"
                count={result.detail.makeupWorkdays}
                dates={result.detail.makeupDateList}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">暂无结果</p>
      )}
    </div>
  );
}
