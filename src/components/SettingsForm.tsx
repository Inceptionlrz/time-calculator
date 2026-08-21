import type { ReactElement } from 'react';
import type { CalcMode, Direction, PeriodType, RegionId } from '../types';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../utils/dateUtils';
import { regionList } from '../data/regions';

interface SettingsFormProps {
  today: Date;
  start: Date;
  onStartChange: (date: Date) => void;
  onSetNow: () => void;
  type: PeriodType;
  onTypeChange: (type: PeriodType) => void;
  length: number;
  onLengthChange: (length: number) => void;
  direction: Direction;
  onDirectionChange: (direction: Direction) => void;
  includeStartDay: boolean;
  onIncludeStartDayChange: (value: boolean) => void;
  mode: CalcMode;
  onModeChange: (mode: CalcMode) => void;
  deadline: Date;
  onDeadlineChange: (date: Date) => void;
  regionId: RegionId;
  onRegionChange: (id: RegionId) => void;
}

const PERIOD_OPTIONS: { value: PeriodType; label: string; hint: string }[] = [
  { value: 'calendar', label: '日历日', hint: '连续自然日（含周末/节假日）' },
  { value: 'natural', label: '自然日', hint: '连续 24 小时为一天（同日历日）' },
  { value: 'workday', label: '工作日', hint: '周一至周五，排除法定节假日' },
];

/** 参数设置表单：推算模式、地区、起始时间、期限类型、方向、长度、是否含起始日。 */
export function SettingsForm(props: SettingsFormProps): ReactElement {
  const {
    today,
    start,
    onStartChange,
    onSetNow,
    type,
    onTypeChange,
    length,
    onLengthChange,
    direction,
    onDirectionChange,
    includeStartDay,
    onIncludeStartDayChange,
    mode,
    onModeChange,
    deadline,
    onDeadlineChange,
    regionId,
    onRegionChange,
  } = props;

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          地区 / 节假日规则
        </label>
        <select
          value={regionId}
          onChange={(e) => onRegionChange(e.target.value as RegionId)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          {regionList.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          推算模式
        </label>
        <div className="inline-flex w-full overflow-hidden rounded-lg border border-slate-300">
          <button
            type="button"
            onClick={() => onModeChange('forward')}
            className={`flex-1 px-3 py-2 text-sm ${
              mode === 'forward'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            起始 ± N 天
          </button>
          <button
            type="button"
            onClick={() => onModeChange('remaining')}
            className={`flex-1 border-l border-slate-300 px-3 py-2 text-sm ${
              mode === 'remaining'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            起止反推间隔
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {mode === 'forward'
            ? '从起始日正向 / 反向推算 N 天后的截止日。'
            : '输入起始日与截止日，反推两者之间相距多少工作日 / 日历日。'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {mode === 'remaining' ? '起始日期' : '起始日期时间'}
        </label>
        <div className="flex gap-2">
          <input
            type="datetime-local"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={toDateTimeLocalValue(start)}
            onChange={(e) => onStartChange(fromDateTimeLocalValue(e.target.value))}
          />
          <button
            type="button"
            onClick={onSetNow}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            现在
          </button>
        </div>
      </div>

      {mode === 'remaining' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            截止日期
          </label>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={toDateTimeLocalValue(deadline)}
            onChange={(e) => onDeadlineChange(fromDateTimeLocalValue(e.target.value))}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          期限类型
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTypeChange(opt.value)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                type === opt.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="mt-0.5 text-xs text-slate-400">{opt.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {mode === 'forward' && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              方向
            </label>
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => onDirectionChange('forward')}
                className={`px-4 py-2 text-sm ${
                  direction === 'forward'
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                正向（起始 + N）
              </button>
              <button
                type="button"
                onClick={() => onDirectionChange('backward')}
                className={`border-l border-slate-300 px-4 py-2 text-sm ${
                  direction === 'backward'
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                反向（起始 − N）
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              期限长度（正整数）
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={length}
              onChange={(e) => onLengthChange(Number(e.target.value))}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeStartDay}
              onChange={(e) => onIncludeStartDayChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
            />
            包含起始日当天（勾选则从当天计为第 1 天）
          </label>
        </>
      )}

      <p className="text-xs text-slate-400">
        真实今天：{toDateTimeLocalValue(today).slice(0, 10)}
      </p>
    </div>
  );
}
