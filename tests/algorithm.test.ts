/**
 * 时间计算器核心算法 + 组件渲染冒烟测试。
 * 使用 esbuild 打包为 Node ESM 后由 node 执行（无额外测试框架依赖）。
 *
 * 运行方式（项目根目录）：
 *   node scripts/run-tests.mjs
 */
import { computeDeadline, computeRemaining, countDaysBetween } from '../src/utils/calculator';
import { formatResultAsText } from '../src/utils/export';
import {
  parseDateKey,
  isWorkday,
  isMakeupWorkday,
  isHoliday,
  isWeekend,
  toDateKey,
} from '../src/utils/dateUtils';
import { defaultHolidayData } from '../src/data/holidays';
import { regions } from '../src/data/regions';
import type { CalculationInput, HolidayYear } from '../src/types';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import App from '../src/App';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, msg: string): void {
  if (cond) {
    passed += 1;
    console.log('  ✓ ' + msg);
  } else {
    failed += 1;
    failures.push(msg);
    console.error('  ✗ ' + msg);
  }
}

/** 将 Date 转成本地 YYYY-MM-DD，便于与预期值比较。 */
function keyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function eqDate(actual: Date, expectedKey: string, msg: string): void {
  const actualKey = keyOf(actual);
  assert(
    actualKey === expectedKey,
    `${msg} -> 截止日应为 ${expectedKey}，实际为 ${actualKey}`,
  );
}

function baseCalc(
  data: HolidayYear[],
  input: Omit<CalculationInput, 'start'> & { start: string },
): ReturnType<typeof computeDeadline> {
  return computeDeadline(
    { ...input, start: parseDateKey(input.start) } as CalculationInput,
    data,
  );
}

console.log('\n=== 1. 工作日正向：2024-10-01(国庆) + 5 个工作日 ===');
{
  const r = baseCalc(defaultHolidayData, {
    start: '2024-10-01',
    type: 'workday',
    length: 5,
    direction: 'forward',
    includeStartDay: true,
  });
  eqDate(r.deadline, '2024-10-12', '工作日 +5（含起始日，10-01 为假期不计入）');
  assert(r.detail.countedDays === 5, `计入工作日数应为 5，实际 ${r.detail.countedDays}`);
  assert(r.detail.skippedOffDays === 7, `跳过非工作日应为 7(10-01..10-07)，实际 ${r.detail.skippedOffDays}`);
  assert(r.detail.makeupWorkdays === 1, `调休补班日应为 1(10-12)，实际 ${r.detail.makeupWorkdays}`);
  assert(r.detail.weekendDays === 2, `周末天数应为 2(10-05/10-06)，实际 ${r.detail.weekendDays}`);
  assert(r.detail.holidayWeekdays === 5, `工作日节假日应为 5，实际 ${r.detail.holidayWeekdays}`);
}

console.log('\n=== 2. 工作日反向：2024-10-08 - 1 个工作日（不含起始日） ===');
{
  const r = baseCalc(defaultHolidayData, {
    start: '2024-10-08',
    type: 'workday',
    length: 1,
    direction: 'backward',
    includeStartDay: false,
  });
  eqDate(r.deadline, '2024-09-30', '反向 -1 工作日（不含起始日）应落到 2024-09-30');
  assert(r.detail.countedDays === 1, `计入工作日数应为 1，实际 ${r.detail.countedDays}`);
  assert(r.detail.skippedOffDays === 7, `跳过非工作日应为 7(10-07..10-01)，实际 ${r.detail.skippedOffDays}`);
}

console.log('\n=== 2b. 工作日反向：含起始日边界对照 ===');
{
  const r = baseCalc(defaultHolidayData, {
    start: '2024-10-08',
    type: 'workday',
    length: 1,
    direction: 'backward',
    includeStartDay: true,
  });
  eqDate(r.deadline, '2024-10-08', '反向 -1 工作日（含起始日）应落在起始日当天 10-08');
}

console.log('\n=== 3. 日历日正向：任意日期 + 3 天（连续计算） ===');
{
  const r1 = baseCalc(defaultHolidayData, {
    start: '2024-01-01',
    type: 'calendar',
    length: 3,
    direction: 'forward',
    includeStartDay: false,
  });
  eqDate(r1.deadline, '2024-01-04', '日历日 +3（不含起始日）应到 2024-01-04');

  const r2 = baseCalc(defaultHolidayData, {
    start: '2024-01-01',
    type: 'calendar',
    length: 3,
    direction: 'forward',
    includeStartDay: true,
  });
  eqDate(r2.deadline, '2024-01-03', '日历日 +3（含起始日）应到 2024-01-03');
}

console.log('\n=== 4. 包含起始日 vs 不包含起始日边界（工作日，length=1） ===');
{
  const inc = baseCalc(defaultHolidayData, {
    start: '2024-10-08',
    type: 'workday',
    length: 1,
    direction: 'forward',
    includeStartDay: true,
  });
  eqDate(inc.deadline, '2024-10-08', '含起始日：10-08 当天即第 1 个工作日');
  const exc = baseCalc(defaultHolidayData, {
    start: '2024-10-08',
    type: 'workday',
    length: 1,
    direction: 'forward',
    includeStartDay: false,
  });
  eqDate(exc.deadline, '2024-10-09', '不含起始日：从次日 10-09 计第 1 个工作日');
}

console.log('\n=== 5. 调休补班日应被算入工作日（周六补班也计入） ===');
{
  const sat = parseDateKey('2024-10-12');
  assert(isMakeupWorkday(sat, new Set(defaultHolidayData.flatMap((y) => y.makeupWorkdays))), '2024-10-12 应被识别为调休补班日');
  assert(isWeekend(sat), '2024-10-12 是周六');
  assert(isWorkday(sat, new Set(defaultHolidayData.flatMap((y) => y.holidays)), new Set(defaultHolidayData.flatMap((y) => y.makeupWorkdays))), '调休补班日应判定为工作日（即便落在周末）');

  const r = baseCalc(defaultHolidayData, {
    start: '2024-10-11',
    type: 'workday',
    length: 2,
    direction: 'forward',
    includeStartDay: true,
  });
  eqDate(r.deadline, '2024-10-12', '跨调休补班周六：+2 工作日应到 2024-10-12');
  assert(r.detail.makeupWorkdays === 1, `应计入 1 个调休补班日，实际 ${r.detail.makeupWorkdays}`);
}

console.log('\n=== 6. 自然日与日历日语义一致 ===');
{
  const nat = baseCalc(defaultHolidayData, {
    start: '2024-03-15',
    type: 'natural',
    length: 10,
    direction: 'forward',
    includeStartDay: false,
  });
  eqDate(nat.deadline, '2024-03-25', '自然日 +10（不含起始日）应到 2024-03-25');
}

console.log('\n=== 7. 非法期限长度应抛错 ===');
{
  for (const bad of [0, -3, 2.5, 1.1] as number[]) {
    let threw = false;
    try {
      computeDeadline(
        { start: parseDateKey('2024-10-08'), type: 'workday', length: bad, direction: 'forward', includeStartDay: true },
        defaultHolidayData,
      );
    } catch {
      threw = true;
    }
    assert(threw, `length=${bad} 应抛出 '期限长度必须为正整数' 异常`);
  }
}

console.log('\n=== 8. 节假日数据完整性校验 ===');
{
  for (const year of defaultHolidayData) {
    const overlap = year.holidays.filter((d) => year.makeupWorkdays.includes(d));
    assert(
      overlap.length === 0,
      `${year.year} 年 holidays 与 makeupWorkdays 不应有重叠（冲突：${overlap.join(',')}）`,
    );
    const nonWeekendMakeup = year.makeupWorkdays.filter((d) => !isWeekend(parseDateKey(d)));
    assert(
      nonWeekendMakeup.length === 0,
      `${year.year} 年调休补班日应全部落在周末（非周末：${nonWeekendMakeup.join(',')}）`,
    );
    const badFmt = [...year.holidays, ...year.makeupWorkdays].filter(
      (d) => !/^\d{4}-\d{2}-\d{2}$/.test(d),
    );
    assert(badFmt.length === 0, `${year.year} 年日期格式应均为 YYYY-MM-DD`);
  }
  const m2024 = new Set(defaultHolidayData.find((y) => y.year === 2024)!.makeupWorkdays);
  assert(m2024.has('2024-09-29'), '2024 国庆调休补班日 2024-09-29 应存在');
  assert(m2024.has('2024-10-12'), '2024 国庆调休补班日 2024-10-12 应存在');
  const h2024 = new Set(defaultHolidayData.find((y) => y.year === 2024)!.holidays);
  assert(h2024.has('2024-10-01') && h2024.has('2024-10-07'), '2024 国庆假期 10-01..10-07 应存在');
}

console.log('\n=== 9. 工作日明细内部一致性（用于核对展示层） ===');
{
  const r = baseCalc(defaultHolidayData, {
    start: '2024-10-01',
    type: 'workday',
    length: 5,
    direction: 'forward',
    includeStartDay: true,
  });
  assert(
    r.detail.weekendDays + r.detail.holidayWeekdays === r.detail.skippedOffDays,
    `工作日明细应自洽：weekendDays(${r.detail.weekendDays}) + holidayWeekdays(${r.detail.holidayWeekdays}) 应等于 skippedOffDays(${r.detail.skippedOffDays})`,
  );
}

console.log('\n=== 10. 组件渲染冒烟测试（renderToString） ===');
{
  let html = '';
  let threw = false;
  try {
    html = renderToString(createElement(App));
  } catch (e) {
    threw = true;
    console.error(e);
  }
  assert(!threw, 'App 组件树应能无异常渲染（useState/useMemo 正常）');
  assert(html.includes('时间计算器'), '渲染结果应包含标题“时间计算器”');
  assert(html.includes('计算结果'), '渲染结果应包含“计算结果”卡片');
  assert(html.includes('节假日 / 调休管理'), '渲染结果应包含“节假日 / 调休管理”面板');
  assert(!html.includes('暂无结果'), '默认状态下应已计算出结果，不应显示“暂无结果”');
}

// ===================== 新增：P0 AC-1 校准 + 边界加固 =====================

console.log('\n=== 11. AC-1 校准：2026-03-04(周三) + 5 工作日 → 2026-03-10（无假期干扰） ===');
{
  const r = baseCalc(defaultHolidayData, {
    start: '2026-03-04',
    type: 'workday',
    length: 5,
    direction: 'forward',
    includeStartDay: true,
  });
  eqDate(r.deadline, '2026-03-10', 'AC-1：2026-03-04 +5 工作日应到 2026-03-10');
  assert(r.detail.weekendDays === 2, `途经周末应为 2(03-07/03-08)，实际 ${r.detail.weekendDays}`);
  assert(r.detail.holidayDays === 0, `途经法定节假日应为 0，实际 ${r.detail.holidayDays}`);
  assert(
    JSON.stringify(r.detail.weekendDateList) === JSON.stringify(['2026-03-07', '2026-03-08']),
    `周末日期列表应为 ['2026-03-07','2026-03-08']，实际 ${JSON.stringify(r.detail.weekendDateList)}`,
  );
  assert(r.detail.holidayDateList.length === 0, '法定节假日日期列表应为空');
}

console.log('\n=== 12. 端午窗口回归：2026-06-17 + 5 工作日 → 2026-06-24（端午假 06-19 被跳过） ===');
{
  const r = baseCalc(defaultHolidayData, {
    start: '2026-06-17',
    type: 'workday',
    length: 5,
    direction: 'forward',
    includeStartDay: true,
  });
  eqDate(r.deadline, '2026-06-24', '端午窗口：2026-06-17 +5 工作日应到 2026-06-24（防止回归）');
  assert(r.detail.holidayDays === 1, `工作日节假日应为 1(06-19)，实际 ${r.detail.holidayDays}`);
  assert(r.detail.weekendDays === 2, `途经周末应为 2(06-20/06-21)，实际 ${r.detail.weekendDays}`);
  assert(
    JSON.stringify(r.detail.holidayDateList) === JSON.stringify(['2026-06-19']),
    `工作日节假日日期列表应为 ['2026-06-19']，实际 ${JSON.stringify(r.detail.holidayDateList)}`,
  );
  assert(
    JSON.stringify(r.detail.weekendDateList) === JSON.stringify(['2026-06-20', '2026-06-21']),
    `周末日期列表应为 ['2026-06-20','2026-06-21']，实际 ${JSON.stringify(r.detail.weekendDateList)}`,
  );
}

console.log('\n=== 13. 边界加固：跨年 + length=1 含/不含起始日 + 非法输入 ===');
{
  // 跨年：2025-12-30 + 3 工作日（跨 2026，且 2026-01-01~01-03 元旦假期为法定假）
  const cross = baseCalc(defaultHolidayData, {
    start: '2025-12-30',
    type: 'workday',
    length: 3,
    direction: 'forward',
    includeStartDay: true,
  });
  eqDate(cross.deadline, '2026-01-04', '跨年 +3 工作日应到 2026-01-04（跳过 2026-01-01~01-03 元旦假期）');
  assert(cross.detail.holidayDays === 2, `跨年应跳过 2 个工作日节假日(01-01/01-02，01-03 为周六计周末)，实际 ${cross.detail.holidayDays}`);

  // length=1 含起始日（起始日为工作日）
  const inc = baseCalc(defaultHolidayData, {
    start: '2026-03-04',
    type: 'workday',
    length: 1,
    direction: 'forward',
    includeStartDay: true,
  });
  eqDate(inc.deadline, '2026-03-04', 'length=1 含起始日：截止日=起始日');

  // length=1 不含起始日
  const exc = baseCalc(defaultHolidayData, {
    start: '2026-03-04',
    type: 'workday',
    length: 1,
    direction: 'forward',
    includeStartDay: false,
  });
  eqDate(exc.deadline, '2026-03-05', 'length=1 不含起始日：截止日=次日');

  // 日历日 length=1 含起始日
  const cal1 = baseCalc(defaultHolidayData, {
    start: '2026-03-04',
    type: 'calendar',
    length: 1,
    direction: 'forward',
    includeStartDay: true,
  });
  eqDate(cal1.deadline, '2026-03-04', '日历日 length=1 含起始日：截止日=起始日');
}

console.log('\n=== 14. 单休 / 自定义工作日历：restDays 影响周六是否计入工作日 ===');
{
  const cfg = { restDays: [0] }; // 仅周日休息（单休，周六上班）
  const single = computeDeadline(
    {
      start: parseDateKey('2024-11-04'),
      type: 'workday',
      length: 6,
      direction: 'forward',
      includeStartDay: true,
      config: cfg,
    },
    defaultHolidayData,
  );
  eqDate(single.deadline, '2024-11-09', '单休(+6)：周六 11-09 计入工作日，截止日 2024-11-09');
  assert(single.detail.weekendDays === 0, `单休下不应跳过周六，weekendDays 应为 0，实际 ${single.detail.weekendDays}`);

  const double = computeDeadline(
    {
      start: parseDateKey('2024-11-04'),
      type: 'workday',
      length: 6,
      direction: 'forward',
      includeStartDay: true,
    },
    defaultHolidayData,
  );
  eqDate(double.deadline, '2024-11-11', '双休(+6)：周六 11-09、周日 11-10 跳过，截止日 2024-11-11');
  assert(double.detail.weekendDays === 2, `双休应跳过 2 个周末，实际 ${double.detail.weekendDays}`);

  // 法定节假日优先级高于单休：即便单休，国庆 10-01~10-07 法定假仍全部排除
  const holidaySkip = computeDeadline(
    {
      start: parseDateKey('2024-10-01'),
      type: 'workday',
      length: 3,
      direction: 'forward',
      includeStartDay: true,
      config: cfg,
    },
    defaultHolidayData,
  );
  eqDate(holidaySkip.deadline, '2024-10-10', '单休下国庆法定假仍被排除（截止日 2024-10-10）');
  assert(holidaySkip.detail.holidayDays === 5, `单休下国庆工作日节假日仍为 5（10-01~04、10-07；10-05/06 为周末计周末），实际 ${holidaySkip.detail.holidayDays}`);
}

console.log('\n=== 15. 地区切换：中国香港节假日数据集 ===');
{
  const hk = regions.hk.data;
  assert(hk.length === 4, `香港数据应覆盖 4 个年度，实际 ${hk.length}`);
  const hkSet = new Set(hk.flatMap((y) => y.holidays));
  assert(hkSet.has('2024-12-25') && hkSet.has('2024-12-26'), '香港应含圣诞节与节礼日');

  // 香港：2024-12-23(周一) + 3 工作日，跳过 12-25/12-26
  const r = computeDeadline(
    {
      start: parseDateKey('2024-12-23'),
      type: 'workday',
      length: 3,
      direction: 'forward',
      includeStartDay: true,
    },
    hk,
  );
  eqDate(r.deadline, '2024-12-27', '香港 +3 工作日应到 2024-12-27（跳过圣诞/节礼）');
}

console.log('\n=== 16. 起止反推（P1-1）：countDaysBetween / computeRemaining ===');
{
  // 日历日：2026-03-04 → 2026-03-10，相差 6 天
  const cal = countDaysBetween(
    { start: parseDateKey('2026-03-04'), deadline: parseDateKey('2026-03-10'), type: 'calendar' },
    defaultHolidayData,
  );
  assert(cal === 6, `日历日反推间隔应为 6 天，实际 ${cal}`);

  // 工作日：2026-03-04 → 2026-03-10 闭区间工作日为 5（03-04/05/06/09/10）
  const wk = countDaysBetween(
    { start: parseDateKey('2026-03-04'), deadline: parseDateKey('2026-03-10'), type: 'workday' },
    defaultHolidayData,
  );
  assert(wk === 5, `工作日反推间隔应为 5 天，实际 ${wk}`);

  const full = computeRemaining(
    { start: parseDateKey('2026-03-04'), deadline: parseDateKey('2026-03-10'), type: 'workday' },
    defaultHolidayData,
  );
  assert(full.detail.weekendDateList.length === 2, `反推明细周末列表应为 2 天，实际 ${full.detail.weekendDateList.length}`);
  assert(
    JSON.stringify(full.detail.weekendDateList) === JSON.stringify(['2026-03-07', '2026-03-08']),
    `反推周末列表应为 ['2026-03-07','2026-03-08']，实际 ${JSON.stringify(full.detail.weekendDateList)}`,
  );
}

console.log('\n=== 17. 复制结果文本生成（P1-5） ===');
{
  const r = baseCalc(defaultHolidayData, {
    start: '2026-03-04',
    type: 'workday',
    length: 5,
    direction: 'forward',
    includeStartDay: true,
  });
  const text = formatResultAsText({
    result: r,
    type: 'workday',
    mode: 'forward',
    direction: 'forward',
    includeStartDay: true,
    length: 5,
    today: parseDateKey('2026-03-04'),
    start: parseDateKey('2026-03-04'),
  });
  assert(text.includes('截止日'), '复制文本应包含「截止日」');
  assert(text.includes('2026-03-10'), '复制文本应包含截止日 2026-03-10');
  assert(text.includes('共 5 个工作日'), '复制文本应包含「共 5 个工作日」');
  assert(text.includes('距今剩余：6 天'), '复制文本应包含距今剩余天数（03-04 → 03-10）');
  assert(text.includes('途经周末：2 天'), '复制文本应包含途经周末明细');
}

console.log('\n==================================================');
console.log(`测试结果：通过 ${passed} / 失败 ${failed}`);
if (failed > 0) {
  console.log('\n失败用例：');
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
} else {
  console.log('全部通过 ✅');
  process.exit(0);
}
