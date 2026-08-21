import type { ReactElement } from 'react';
import { useWorkdayCalculator } from './hooks/useWorkdayCalculator';
import { SettingsForm } from './components/SettingsForm';
import { ResultCard } from './components/ResultCard';
import { HolidayEditor } from './components/HolidayEditor';

/** 时间计算器单页应用根组件。 */
export default function App(): ReactElement {
  const calc = useWorkdayCalculator();

  const toggleRestDay = (day: number): void => {
    const next = calc.restDays.includes(day)
      ? calc.restDays.filter((d) => d !== day)
      : [...calc.restDays, day];
    calc.setRestDays(next);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">时间计算器</h1>
          <p className="mt-1 text-sm text-slate-500">
            计算截止日期：支持日历日 / 自然日 / 工作日，自动排除周末与中国法定节假日（含调休）；可切换地区、单休与起止反推。
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-500">参数设置</h2>
            <SettingsForm
              today={calc.today}
              start={calc.start}
              onStartChange={calc.setStart}
              onSetNow={() => calc.setStart(new Date())}
              type={calc.type}
              onTypeChange={calc.setType}
              length={calc.length}
              onLengthChange={calc.setLength}
              direction={calc.direction}
              onDirectionChange={calc.setDirection}
              includeStartDay={calc.includeStartDay}
              onIncludeStartDayChange={calc.setIncludeStartDay}
              mode={calc.mode}
              onModeChange={calc.setMode}
              deadline={calc.deadline}
              onDeadlineChange={calc.setDeadline}
              regionId={calc.regionId}
              onRegionChange={calc.setRegion}
            />
          </section>

          <div className="space-y-6">
            <ResultCard
              result={calc.result}
              error={calc.error}
              type={calc.type}
              direction={calc.direction}
              includeStartDay={calc.includeStartDay}
              length={calc.length}
              today={calc.today}
              mode={calc.mode}
              start={calc.start}
            />
            <HolidayEditor
              holidayData={calc.holidayData}
              onAddHoliday={calc.addHoliday}
              onRemoveHoliday={calc.removeHoliday}
              onAddMakeup={calc.addMakeup}
              onRemoveMakeup={calc.removeMakeup}
              onReset={calc.resetHolidays}
              restDays={calc.restDays}
              onToggleRestDay={toggleRestDay}
            />
          </div>
        </div>

        <footer className="mt-8 text-xs text-slate-400">
          内置节假日数据：中国大陆 2024–2026 为国务院官方安排、2027 为按规律预估；中国香港为常见主要公众假期（仅供参考，以特区政府公布为准）。均可在"节假日 / 调休管理"中手动修正。
        </footer>
      </div>
    </div>
  );
}
