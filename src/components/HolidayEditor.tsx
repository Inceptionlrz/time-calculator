import type { ReactElement } from 'react';
import { useState } from 'react';
import type { HolidayYear } from '../types';

interface HolidayEditorProps {
  holidayData: HolidayYear[];
  onAddHoliday: (date: string) => void;
  onRemoveHoliday: (date: string) => void;
  onAddMakeup: (date: string) => void;
  onRemoveMakeup: (date: string) => void;
  onReset: () => void;
  /** 每周休息日（getDay 取值集合） */
  restDays: number[];
  /** 切换某星期是否休息 */
  onToggleRestDay: (day: number) => void;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 星期选择行：getDay 取值 1=一 … 6=六，0=日。 */
const WEEKDAY_OPTIONS: { day: number; label: string }[] = [
  { day: 1, label: '周一' },
  { day: 2, label: '周二' },
  { day: 3, label: '周三' },
  { day: 4, label: '周四' },
  { day: 5, label: '周五' },
  { day: 6, label: '周六' },
  { day: 0, label: '周日' },
];

/** 节假日 / 调休管理：查看内置数据，手动新增或删除节假日与调休补班日。 */
export function HolidayEditor(props: HolidayEditorProps): ReactElement {
  const {
    holidayData,
    onAddHoliday,
    onRemoveHoliday,
    onAddMakeup,
    onRemoveMakeup,
    onReset,
    restDays,
    onToggleRestDay,
  } = props;
  const [newDate, setNewDate] = useState<string>('');
  const [newKind, setNewKind] = useState<'holiday' | 'makeup'>('holiday');

  const handleAdd = (): void => {
    if (!DATE_PATTERN.test(newDate)) return;
    if (newKind === 'holiday') onAddHoliday(newDate);
    else onAddMakeup(newDate);
    setNewDate('');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-500">节假日 / 调休管理</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-indigo-600"
        >
          恢复内置数据
        </button>
      </div>

      <div className="mb-4 rounded-lg bg-slate-50 p-3">
        <div className="mb-2 text-xs font-medium text-slate-500">
          自定义工作日历（休息日）
        </div>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_OPTIONS.map((opt) => {
            const checked = restDays.includes(opt.day);
            return (
              <label
                key={opt.day}
                className={`flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-sm ${
                  checked
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleRestDay(opt.day)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
                />
                {opt.label}
                <span className="text-xs text-slate-400">{checked ? '休' : '班'}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          取消勾选「周六」即单休模式（周六上班）。法定节假日仍按地区规则排除。
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <select
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as 'holiday' | 'makeup')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        >
          <option value="holiday">法定节假日（休息）</option>
          <option value="makeup">调休补班（上班）</option>
        </select>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg bg-indigo-500 px-3 py-2 text-sm text-white hover:bg-indigo-600"
        >
          添加
        </button>
      </div>

      <div className="max-h-80 space-y-4 overflow-y-auto">
        {holidayData.map((year) => (
          <div key={year.year}>
            <div className="mb-1 text-xs font-medium text-slate-400">
              {year.year} 年
            </div>
            <div className="flex flex-wrap gap-1.5">
              {year.holidays.map((d) => (
                <span
                  key={`h-${d}`}
                  className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600"
                >
                  {d}
                  <button
                    type="button"
                    onClick={() => onRemoveHoliday(d)}
                    className="text-rose-400 hover:text-rose-700"
                    aria-label={`删除节假日 ${d}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {year.makeupWorkdays.map((d) => (
                <span
                  key={`m-${d}`}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                >
                  补{d}
                  <button
                    type="button"
                    onClick={() => onRemoveMakeup(d)}
                    className="text-amber-500 hover:text-amber-800"
                    aria-label={`删除补班日 ${d}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {year.holidays.length === 0 && year.makeupWorkdays.length === 0 && (
                <span className="text-xs text-slate-300">（无）</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
