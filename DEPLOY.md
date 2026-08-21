# 部署指南（GitHub 仓库 + GitHub Pages）

本项目的源码已在本仓库整理完毕（分支 `main`，含 `.github/workflows/deploy.yml` 自动部署工作流）。

由于构建/推送发生在隔离沙箱环境中、无法直接访问 GitHub，以下步骤请在**你的本地机器**上完成。整个过程约 3 分钟。

## 一、前置条件

- 已安装 [Git](https://git-scm.com/)
- 已安装 [Node.js](https://nodejs.org/)（v18+）
- 已安装 [pnpm](https://pnpm.io/)：`npm install -g pnpm`
- 拥有一个 GitHub 账号

## 二、在 GitHub 创建仓库

1. 打开 https://github.com/new
2. Repository name 填：`time-calculator`
3. 选择 **Public**（私有仓库也能用 Pages，但公开更简单）
4. **不要**勾选 "Initialize this repository with a README"（本地已有完整代码）
5. 点击 **Create repository**

## 三、关联并推送代码

在本项目根目录（`time-calculator/`，即包含 `package.json` 的目录）执行：

```bash
# 关联远程仓库（把 <你的用户名> 替换为实际 GitHub 用户名）
git remote add origin https://github.com/<你的用户名>/time-calculator.git

# 推送到 main 分支
git push -u origin main
```

> 若提示认证，使用你的 GitHub 用户名 + Personal Access Token（token 需勾选 `repo` 与 `workflow` 权限），或使用 SSH 方式：
> `git remote set-url origin git@github.com:<你的用户名>/time-calculator.git`

## 四、启用 GitHub Pages

推送成功后，GitHub Actions 会自动构建并部署，但需先开启 Pages 源：

1. 进入仓库 **Settings → Pages**
2. **Source** 选择 **GitHub Actions**
3. 保存

随后到 **Actions** 标签页，等待名为 **Deploy to GitHub Pages** 的工作流运行完成（约 1–2 分钟）。

## 五、访问站点

部署完成后，静态页面地址为：

```
https://<你的用户名>.github.io/time-calculator/
```

## 六、本地预览 / 开发

```bash
pnpm install      # 安装依赖
pnpm dev          # 本地开发，默认 http://localhost:5173
pnpm build        # 类型检查 + 生产构建（输出 dist/）
pnpm preview      # 预览生产构建
```

## 七、注意事项

- 仓库内 `.gitignore` 已忽略 `node_modules/` 与 `dist/`，仅提交源码，由 CI 负责构建。
- `vite.config.ts` 中已根据 `GITHUB_PAGES` 环境变量自动设置 `base` 为 `/time-calculator/`，本地开发不受影响。
- 若后续迁移仓库名，请同步修改 `vite.config.ts` 的 `base` 与 `deploy.yml` 无需改动。
