/**
 * 测试运行器：用 esbuild 将每个 *.test.ts 打包为 ESM 后由 node 执行。
 * 无需额外测试框架，复用项目既有的 esbuild 依赖。
 *
 * 用法：node scripts/run-tests.mjs   （或 pnpm test）
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esbuild = path.join(root, 'node_modules', '.pnpm', 'node_modules', '.bin', 'esbuild');

if (!existsSync(esbuild)) {
  console.error('未找到 esbuild，请先执行 `pnpm install`。');
  process.exit(1);
}

const tests = ['tests/algorithm.test.ts', 'tests/resultcard.smoke.test.ts'];
let failed = false;

for (const entry of tests) {
  const out = entry.replace(/\.ts$/, '.cjs');
  console.log(`\n>>> 打包 ${entry}`);
  try {
    execFileSync(
      esbuild,
      [
        entry,
        '--bundle',
        '--platform=node',
        '--format=cjs',
        '--jsx=automatic',
        `--outfile=${out}`,
        '--log-level=warning',
      ],
      { cwd: root, stdio: 'inherit' },
    );
  } catch {
    console.error(`打包失败：${entry}`);
    failed = true;
    continue;
  }

  console.log(`>>> 运行 ${out}`);
  try {
    execFileSync('node', [out], { cwd: root, stdio: 'inherit' });
  } catch {
    failed = true;
  }
}

if (failed) {
  console.error('\n存在失败用例 ❌');
  process.exit(1);
}
console.log('\n全部测试套件通过 ✅');
process.exit(0);
