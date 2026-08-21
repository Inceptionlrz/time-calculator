/**
 * ResultCard 工作日分支渲染冒烟测试（回归展示层 Bug 修复）。
 *
 * 修复点：工作日分支明细中，
 *   result.detail.holidayDays -> result.detail.holidayWeekdays
 *   文案「节假日」->「工作日节假日」
 *
 * 运行方式（项目根目录）：
 *   node_modules/.pnpm/esbuild@0.21.5/node_modules/esbuild/bin/esbuild \
 *     tests/resultcard.smoke.test.ts --bundle --platform=node --format=cjs \
 *     --jsx=automatic --outfile=tests/resultcard.smoke.test.cjs
 *   node tests/resultcard.smoke.test.cjs
 */
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { ResultCard } from '../src/components/ResultCard';
import type { CalculationResult } from '../src/types';

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

// 构造一个工作日计算结果，刻意让 holidayDays 与 holidayWeekdays 不同，
// 以验证工作日分支展示的是 holidayWeekdays（修复后），而非 holidayDays（修复前）。
const workdayResult: CalculationResult = {
  deadline: new Date(2024, 9, 12, 18, 0, 0), // 2024-10-12 18:00
  detail: {
    weekendDays: 2,
    holidayDays: 7, // 法定节假日总数（含周末），故意设成与 holidayWeekdays 不同
    holidayWeekdays: 5, // 落在工作日（周一至周五）的节假日数
    makeupWorkdays: 1,
    countedDays: 5,
    skippedOffDays: 7,
    weekendDateList: ['2024-10-05', '2024-10-06'],
    holidayDateList: ['2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04', '2024-10-07'],
    makeupDateList: ['2024-10-12'],
  },
};

const html = renderToString(
  createElement(ResultCard, {
    result: workdayResult,
    error: null,
    type: 'workday',
    direction: 'forward',
    includeStartDay: true,
    length: 5,
  }),
);

console.log('\n=== ResultCard 工作日分支渲染冒烟测试 ===');
{
  assert(typeof html === 'string' && html.length > 0, 'ResultCard 应能正常渲染为 HTML');

  // React renderToString 会在相邻文本/表达式间插入 <!-- --> 水合标记，先剥离再做文案断言
  const text = html.replace(/<!--[^]*?-->/g, '');

  // 关键修复点1：文案由「节假日」改为「工作日节假日」
  assert(text.includes('工作日节假日'), '工作日分支明细应包含修正后的文案「工作日节假日」');

  // 关键修复点2：工作日分支应展示 holidayWeekdays 的值（5），而非 holidayDays 的值（7）
  assert(
    text.includes('工作日节假日 5 天'),
    '工作日分支应展示 holidayWeekdays 数值 5（实际渲染："工作日节假日 5 天"）',
  );
  assert(
    !text.includes('工作日节假日 7 天'),
    '工作日分支不应展示 holidayDays 数值 7（旧 Bug：误用 holidayDays）',
  );

  // 工作日本应展示「跳过非工作日」分支
  assert(text.includes('跳过非工作日'), '工作日分支应包含「跳过非工作日」明细行');
  assert(text.includes('共计入工作日'), '工作日分支应包含「共计入工作日」明细行');
  assert(text.includes('含调休补班日'), '工作日分支应包含「含调休补班日」明细行');

  // 新增：复制按钮与可折叠明细列表
  assert(text.includes('复制结果'), '结果卡片应包含「复制结果」按钮');
  assert(text.includes('途经周末'), '结果卡片应包含「途经周末」可折叠明细');
  assert(text.includes('2024-10-05'), '可折叠周末列表应渲染具体日期 2024-10-05');
  assert(text.includes('2024-10-12'), '可折叠补班列表应渲染具体日期 2024-10-12');

  // 反向确认：未修复前的旧文案「（其中周末 ... 天，节假日 ... 天）」不应出现
  assert(
    !/, 节假日 \d+ 天/.test(text),
    '工作日分支不应残留旧文案「，节假日 N 天」',
  );
}

console.log('\n==================================================');
console.log(`ResultCard 渲染测试结果：通过 ${passed} / 失败 ${failed}`);
if (failed > 0) {
  console.log('\n失败用例：');
  failures.forEach((f) => console.log('  - ' + f));
  process.exit(1);
} else {
  console.log('全部通过 ✅');
  process.exit(0);
}
