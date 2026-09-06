# workflow-kit — 通用 AI 编码工作流模板

把一套成熟的"AI 编码工作流"（Gate 门禁 → 证据驱动 → 独立验证 → 知识沉淀）从具体项目中剥离成可复用的引擎 + 适配器结构。

**零第三方依赖**：纯 Node.js（harness 状态机 + .cjs hooks），复制即用。

## 一、这套工作流是什么

```
入口判断（🟢🟡🔴 分级）→ 输出标记
  ├─ TWEAK  微小改动：直接改 → 验证（check:type）→ 询问沉淀
  └─ FULL/HOTFIX：P0 计划 → P1 开发 → P2 验证收敛 → P3 收尾确认 → P4 知识沉淀
```

五个 Phase 的核心机制：

- **Gate 门禁**：P0 计划未确认前不能改代码（Reasonix 宿主为物理拦截，其他宿主为纪律模式）
- **证据驱动**：每个 Phase 在 `workflow/evidence/<change>/` 留下 P0~P4.md、TASKS.md，Gate 校验证据完整性
- **独立验证**：build → format → lint → typecheck 分层执行，失败由只读的 `p2-verifier` 子 Agent 分析，主 Agent 执行修正，最多 3 轮
- **强制沉淀**：所有工作流完成后必须询问用户是否沉淀经验，写入 compound-engineering 经验库（去重后）
- **断点恢复**：`state.json` 记录进度，会话重开自动恢复

## 二、目录结构

```
workflow-kit/
├── engine/                    # 通用引擎（零依赖、无项目假设）
│   ├── harness.mjs            # Gate 状态机（配置驱动，可 --root/--config 指定）
│   ├── hooks/                 # 运行时拦截（gate-guard / prompt-check / compact-guard ...）
│   └── skills/                # 通用 skills（workflow / task-worker / p2-verifier / ...）
├── config/
│   └── workflow.config.json   # 默认配置（通用值）
├── docs/
│   ├── AGENTS.template.md     # 行为契约模板（含 {{占位符}}）
│   ├── workflow.template.md   # 团队入门文档模板
│   └── ADAPTER.md             # 适配器编写指南
├── adapters/
│   └── example-vue-vite/      # 示例适配器（Vue 3 + Vite + pnpm）
└── install.mjs                # 一键安装器
```

## 三、快速开始（3 步）

```bash
# 1. 在目标项目根目录执行安装器（交互式提问；--yes 用默认值）
node /path/to/workflow-kit/install.mjs --target ./my-project

# 2.（Reasonix 宿主）信任 hooks 并重启
cd my-project && /hooks trust

# 3. 验证安装
node workflow/hooks/verify.cjs
```

之后正常向 Agent 提需求，它自动判断走哪条路。也可用现成适配器配置：

```bash
node install.mjs --config adapters/example-vue-vite/workflow.config.json --target ./my-project
```

## 四、核心设计：引擎 vs 适配器

所有项目差异收敛到 `workflow.config.json`：

| 差异 | 配置项 | 原项目硬编码示例 |
|---|---|---|
| 验证命令 | `verify.full` / `verify.tweak` | `pnpm -s run build:main:dev` |
| 包管理器 | `packageManager` | `pnpm` |
| 路径 | `workflowDir` / `stateFile` / `evidenceDir` / `skillsDir` | `workflow/`、`.reasonix/skills/` |
| 语言 | `language` | 全中文写死 |
| 基础设施文件 | `infraFiles` | `AGENTS.md` / `REASONIX.md` / ... |
| 收敛轮次 | `maxConvergenceRounds` | `3` |
| 压缩上下文摘要 | `coreConstraints` | `🔒 antdv-next≠ant-design-vue ...` |

配置查找顺序：`--config <path>` → `$WORKFLOW_CONFIG` → `<root>/workflow.config.json` → 内置默认值。引擎没有配置文件也能跑（通用默认命令 `build/format/lint/check:type`）。

## 五、物理门禁是可选项

- **Reasonix**：`.reasonix/settings.json` 注册 6 个 hook 事件（SessionStart / UserPromptSubmit / PreToolUse / PostToolUse / PreCompact / SessionEnd），PreToolUse 实现"P0 不过不能改代码"的物理拦截
- **其他宿主**：不注册 hooks，靠 `AGENTS.md` 的"自动触发 → 入口判断 → 输出标记"纪律执行

## 六、从 v4（本项目原版）到 v5（模板）的改造清单

1. `harness.mjs`：硬编码命令/路径 → 配置驱动；新增 `--root` / `--config` / 多语言消息层
2. `hooks/lib.cjs`：新增配置解析；路径、约束摘要、编辑工具清单全部来自配置
3. `gate-guard.cjs`：基础设施文件清单、skills 目录、包管理器提示语来自配置
4. skills：剥离 `antdv-next` / `@decision-core` 等项目专属内容，保留机制（`{{PM}}` 等占位符由安装器替换）
5. 经验库：`compound-engineering/references/` 只保留机制脚手架，不携带任何项目经验数据
6. 新增 `install.mjs`（交互式/非交互式安装）与 `adapters/`（示例适配器）
7. **v5.1（2026-08 同步项目最新更新）**：Phase 0 新增「改动清单简要」强制输出——P0 计划通过前，把逐文件改动点 + 非目标直接输出到对话框，用户不打开证据文件即可审阅（已同步至 AGENTS.template.md / workflow.template.md）
8. **v5.2（多槽 registry 同步）**：引擎与 hooks 同步为多槽 registry（`state.json` 支持多任务共存、`harness:list/switch/drop` 切换、同名旧证据归档 `_archive/`）；`install.mjs` 补全 `list/switch/drop/gc/restore/approve` 脚本；`verify.cjs` 升级为自适应版本（无活跃流程时自动建临时 full 槽，验证 9 项含 settings.json 绑定检测）

## 七、FAQ

**Q：安装到已有项目，会覆盖我的 AGENTS.md 吗？**
不会。`AGENTS.md` 已存在时只提示手动合并（模板在 `docs/AGENTS.template.md`）；`workflow.md` 同理。`package.json` 的 scripts 只追加不覆盖。

**Q：我的项目没有 lint / build 怎么办？**
把 `verify.full` 里对应条目删掉即可。引擎按配置执行，不强制。

**Q：经验库会不会带上原项目的经验？**
不会。引擎里的 compound-engineering 只有机制（索引模板 + 条目模板），`experiences/` 为空。

**Q：如何升级引擎？**
`state.json` 与 `workflow.config.json` 都带 `schemaVersion`，升级时按版本迁移；引擎文件直接替换即可（hooks 与 harness 均向后兼容）。

## 八、License

MIT（如需其他许可，复制后自行替换）。
