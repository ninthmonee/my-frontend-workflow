# REASONIX.md — decision-platform

本文件只记录"仓库事实"（技术栈、目录、通用命令、基础约定）。Agent 行为契约见 [AGENTS.md](./AGENTS.md)。

## 技术栈

- **Vue 3**（Composition API、`<script setup>`、`defineModel`）
- **TypeScript 5.9**（严格模式；monorepo 下通过 Turborepo 执行 typecheck）
- **Vite 6**
- **pnpm 10**（workspace monorepo）
- **Turborepo 2**
- **antdv-next**（Vue 3 原生组件库，非标准 ant-design-vue）
- **Pinia 3**
- **vue-router 4**
- **Tailwind CSS 3.4**
- **ECharts 6**
- **vue-i18n**

## 目录结构

```text
apps/main-app/          — 主应用（微前端宿主）
  src/views/            — 页面级组件
  src/components/       — 应用内组件
  src/router/           — 路由与权限
  src/store/            — Pinia store
  src/api/              — API 模块
packages/
  @core/                — 基础 SDK（shared/design/icons/composables/preferences/ui-kit）
  effects/              — 业务包（access/common-ui/hooks/layouts/plugins/request）
  constants/            — 常量
  icons/                — 图标
  locales/              — i18n
  stores/               — 共享 store
  styles/               — 全局样式
  types/                — 共享类型
  utils/                — 工具函数
internal/               — 构建/规范工具（vite/tailwind/tsconfig/lint/node-utils）
scripts/                — 仓库脚本（harness.mjs 等）
workflow/               — 工作流运行时（evidence/、harness/state.json、hooks/）
.reasonix/skills/        — 项目级 skill 库（含 Vue 技术栈、工作流、调试/设计等全套 skill）
```

## 常用命令

### 开发与构建

| 命令 | 目的 |
|---|---|
| `pnpm dev` | 启动开发（交互式选择包） |
| `pnpm build` | 全量构建（8 GB heap） |
| `pnpm check:type` | typecheck（`turbo run typecheck`；各包通常使用 `vue-tsc`） |
| `pnpm lint` | ESLint + Stylelint |
| `pnpm format` | 格式化（全量） |
| `pnpm check` | 全链路检查（circular-deps → depcheck → typecheck → cspell） |
| `pnpm commit` | 提交（交互式 Conventional Commit） |

### 工作流

| 命令 | 目的 |
|---|---|
| `pnpm -s run harness:start -- --mode full --change <name>` | 启动完整工作流 |
| `/workflow full feat-xxx` | 斜杠命令快捷启动（full/hotfix/tweak） |
| `pnpm -s run harness:gate-reset -- --type full` | 重置 Gate 状态 |

## Watch out for

- **No test infrastructure** — 零个 `*.test.ts` / `*.spec.ts` 文件，无测试运行器。Phase 2 通过 typecheck + build + lint 作为替代验证。
- **No CI/CD** — 无 GitHub Actions workflows、无 PR templates、无 review automation。
- **No pre-commit typecheck** — `check:type` 不绑定 git hooks。但 Phase 2 强制执行 typecheck+build+format+lint。
- **antdv-next**（非 ant-design-vue）— Slot/prop API 可能不同。编辑组件前 MUST 加载 `antdv-next` skill。
- **Skills** 全部在 `.reasonix/skills/` 中，通过 git 管理，团队成员 clone 即用，无需额外安装。
- **MCP servers**：`codegraph`（代码关系检索）、`mcp-vue`（Vue SFC AST 解析）。
- **平台原生优先**：遵循 [Ponytail 决策阶梯](https://github.com/DietrichGebert/ponytail) — 写代码前逐级自问：YAGNI？→ stdlib？→ 浏览器原生（`<input type="date">` 等）？→ 已安装依赖？→ 项目封装？→ 一行？→ 最小实现。详见 AGENTS.md Phase 1 和硬约束部分。
