import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 仅为类型检查声明 Node 全局 process（运行于 Node 环境，全局已存在）
declare const process: {
  env: Record<string, string | undefined>;
};

// https://vite.dev/config/
// GitHub Pages 项目站点部署在子路径 /<repo>/ 下，需设置 base。
// 生产构建（CI 部署 Pages）使用子路径；本地 dev 仍用根路径，便于开发预览。
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isGitHubPages ? '/time-calculator/' : '/',
  plugins: [react()],
});
