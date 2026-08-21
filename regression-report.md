# 回归测试报告 — ResultCard 工作日分支明细展示修复

**测试角色**：QA 工程师 Edward
**被测修复**：`src/components/ResultCard.tsx` 工作日分支明细
- `result.detail.holidayDays` → `result.detail.holidayWeekdays`
- 文案「节假日」 → 「工作日节假日」

---

## 1. 构建验证（要求 2）
- 命令：`pnpm run build`（`tsc --noEmit && vite build`）
- 结果：✅ 通过（✓ 38 modules transformed，exit code 0）
- 说明：tsconfig 仅包含 `src` 与 `vite.config.ts`，`tests/` 不参与应用构建，无类型错误。

## 2. 算法回归测试（要求 3）
- 脚本：`tests/algorithm.test.ts`（实际文件为 `.ts`，非任务描述的 `.cjs`；按要求以 esbuild 打包为 CJS 后运行，输出 `tests/algorithm.test.cjs`）
- 运行：`node tests/algorithm.test.cjs`
- 结果：✅ **通过 45 / 失败 0**（exit code 0）
- 断言分布：工作日正向/反向/边界 11、调休补班 5、自然日一致性 1、非法长度抛错 4、节假日数据完整性 15、明细自洽 1、组件渲染冒烟 5 + 其他 = 共 45 项，全部通过。

## 3. ResultCard 工作日分支渲染冒烟测试（要求 4）
- 新增脚本：`tests/resultcard.smoke.test.ts`（原算法测试的 section 10 仅渲染 `App` 通用文案，未校验工作日明细字段/文案，故补充针对性冒烟测试）
- 测试方法：`renderToString(ResultCard)`，构造 `holidayDays=7`、`holidayWeekdays=5` 的工作日结果（刻意使二者不同，以区分修复前后），校验渲染文案。
- 运行：`node tests/resultcard.smoke.test.cjs`
- 结果：✅ **通过 8 / 失败 0**（exit code 0）
- 关键校验点：
  1. 渲染无异常；
  2. 出现修正文案「工作日节假日」；
  3. 展示数值为 `holidayWeekdays` 的 5（`工作日节假日 5 天`）；
  4. 不展示 `holidayDays` 的 7（`工作日节假日 7 天` 不存在）—— 证明修复生效；
  5. 含「跳过非工作日 / 共计入工作日 / 含调休补班日」明细行；
  6. 不残留旧文案「，节假日 N 天」。

## 4. 备注
- 任务描述引用的 `tests/algorithm.test.cjs` 实际为 `tests/algorithm.test.ts`；本回归按原脚本打包执行，结果等价于运行该脚本，45 项断言与预期一致。
- 打包产物 `tests/algorithm.test.cjs`、`tests/resultcard.smoke.test.cjs` 为本次回归生成的运行文件。

---

## 判定
PASS
