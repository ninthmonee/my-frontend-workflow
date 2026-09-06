# workflow-kit 设计文档

> 本文档说明 `workflow-kit` 的架构决策、状态模型、配置模型与扩展方式。
> 使用指南见 [README.md](../README.md)，适配器编写见 [ADAPTER.md](./ADAPTER.md)。

## 1. 目标

把一套经过真实项目验证的「AI 编码工作流」（入口分级 → Gate 门禁 → 证据驱动 → 验证收敛 → 知识沉淀）做成**栈无关、宿主可选、复制即用**的模板：

- **栈无关**：不假设前端/后端，不假设 pnpm/npm，验证命令全部由 `workflow.config.json` 定义。
- **宿主可选**：Reasonix 宿主启用物理门禁（hooks）；其他宿主走 AGENTS.md 纪律模式。
- **零依赖**：引擎与 hooks 均为纯 Node.js（`node >= 18`），不要求目标项目是 Node 项目。

## 2. 分层架构

```text
┌────────────────────────────────────────────────────────┐
│ 宿主绑定层（可选）：.reasonix/settings.json 注册 6 个 hook │
│   SessionStart / UserPromptSubmit / PreToolUse /        │
│   PostToolUse / PreCompact / SessionEnd                 │
├────────────────────────────────────────────────────────┤
│ 引擎层：engine/harness.mjs（Gate 状态机，配置驱动）        │
│   engine/hooks/*.cjs（拦截/诊断/证据捕获/压缩保护）        │
├────────────────────────────────────────────────────────┤
│ 适配层：workflow.config.json（每个项目一份）              │
│   验证命令 / 路径 / 语言 / 包管理器 / 基础设施文件清单      │
├────────────────────────────────────────────────────────┤
│ 项目事实层：AGENTS.md（行为契约）+ REASONIX.md（项目事实） │
│   skillsDir/（通用机制 skill + 项目领域 skill）           │
├────────────────────────────────────────────────────────┤
│ 运行态（不入库）：state.json / evidence/<change>/          │
└────────────────────────────────────────────────────────┘
```

**核心原则：引擎不含任何具体技术栈命令。** 所有项目差异收敛到 `workflow.config.json` 与 `REASONIX.md`。

## 3. 状态模型：多槽 registry

`state.json` 是**多槽 registry**，同一时刻只有一个 `current` 槽受门禁约束，其余任务自然挂起：

```json
{
  "current": "feat-export",
  "slots": {
    "feat-export": {
      "change": "feat-export",
      "taskType": "full",
      "gates": { "P0": null, "P1": null, "P2": null, "P3": null, "DONE": null }
    },
    "fix-label": {
      "change": "fix-label",
      "taskType": "auto-skip",
      "gates": { "P0": null, "P1": null, "P2": null, "P3": null, "DONE": null }
    }
  }
}
```

规则：

- `harness:start --change <name>` 创建/激活槽位；同名未完结槽报错，同名已完结槽重置重开。
- `harness:switch --change <name>` 切换 current；`harness:drop --change <name>` 删槽（证据保留）。
- `taskType` 决定门禁行为：`full|mandatory|hotfix` 走完整门禁；`auto-skip|user-skip` 编辑放行（危险命令仍拦截）。
- TWEAK 验证通过后 auto-skip/user-skip 槽自动回收（证据保留）。
- 写入 `state.json` 时滚动备份 `state.bak.json` → `state.bak.1.json`，损坏/缺失时自动回退恢复。
- 同名旧证据在 `start`（非 tweak）时归档到 `evidence/_archive/`，避免新旧流程证据串读。

## 4. 配置模型：workflow.config.json

```jsonc
{
  "schemaVersion": 1,
  "language": "zh-CN",
  "packageManager": "pnpm",           // pnpm|npm|yarn|bun
  "workflowDir": "workflow",
  "stateFile": "workflow/harness/state.json",
  "evidenceDir": "workflow/evidence",
  "skillsDir": ".reasonix/skills",
  "infraFiles": ["AGENTS.md", "REASONIX.md", "workflow.md", "scripts/harness.mjs"],
  "maxConvergenceRounds": 3,
  "verify": {
    "lintEnabled": true,
    "full": [
      { "key": "build", "script": "build" },
      { "key": "format", "script": "format" },
      { "key": "lint", "script": "lint" },
      { "key": "typecheck", "script": "check:type" }
    ],
    "tweak": [{ "key": "typecheck", "script": "check:type" }]
  },
  "coreConstraints": "🔒 核心约束: 最小改动 | 不猜 API 先查 skill | 证据优先"
}
```

验证条目两种写法：

- 脚本名：`{ "key": "build", "script": "build" }` → 解析为 `<packageManager> run build`
- 任意命令：`{ "key": "test", "cmd": "go", "args": ["test", "./..."] }`

配置查找顺序：`--config <path>` → `$WORKFLOW_CONFIG` → `<root>/workflow.config.json` → 内置默认值。
引擎缺省配置也能跑（默认 `build/format/lint/check:type`），但真实项目必须写自己的适配配置。

### 后端示例（Go）

```json
{
  "schemaVersion": 1,
  "packageManager": "go",
  "verify": {
    "lintEnabled": false,
    "full": [
      { "key": "build", "cmd": "go", "args": ["build", "./..."] },
      { "key": "vet", "cmd": "go", "args": ["vet", "./..."] },
      { "key": "test", "cmd": "go", "args": ["test", "./..."] }
    ],
    "tweak": [{ "key": "test", "cmd": "go", "args": ["test", "./..."] }]
  }
}
```

## 5. 验证收敛（Phase 2）

- 按 `verify.full` 顺序执行，首失败即停。
- 失败写入 `evidence/<change>/P2-errors.txt`，委派只读 `p2-verifier` 分析，主 Agent 修正后 `--quick` 只重跑上次失败项（`p2FailedKeys`）。
- 最多 `maxConvergenceRounds` 轮；错误暴增按文件回退；超限停止等人工。
- quick 模式防御：`p2FailedKeys` 为空/null 时跑全部，避免 `results=[]` 假通过。

## 6. 门禁（gate-guard）

PreToolUse 拦截所有工具，按 `editTools` 清单与 `taskType` 判定：

1. 编辑目标在 `workflowDir/` 内 → 放行（写证据/修状态）。
2. 编辑目标在 `infraFiles` / `skillsDir/` 内 → 放行（改工作流自身不走流程）。
3. `auto-skip|user-skip` → 编辑放行（危险 bash 仍拦截）。
4. 无 state（未初始化）→ 拦截编辑，提示先 `harness:start`。
5. `full|mandatory|hotfix` 且 P0 未过 → 拦截编辑。
6. bash 危险命令（`rm -rf`、`git push --force`、`git reset --hard` 等）→ 始终拦截。

fail-open 策略：hook 自身异常放行并告警，避免门禁脚本崩溃锁死用户。

## 7. 安装器（install.mjs）

```
node /path/to/workflow-kit/install.mjs --target <dir>          # 交互式
node /path/to/workflow-kit/install.mjs --yes --target <dir>    # 默认值
node /path/to/workflow-kit/install.mjs --config <adapter> --target <dir>
```

安装产物：

1. `scripts/harness.mjs` + `workflow/hooks/*`
2. `workflow.config.json`
3. `package.json` 追加 `harness:*` scripts（不覆盖已有）
4. `.reasonix/settings.json`（Reasonix 宿主）
5. `AGENTS.md` / `workflow.md`（不存在时由模板生成，存在时提示合并）
6. 通用 skills（workflow/task-worker/p2-verifier/pipeline-guard/ponytail-ladder/verification-before-completion/compound-engineering）

## 8. 从 v4（本项目原版）到 v5（模板）的改造

1. 硬编码命令/路径 → `workflow.config.json` 配置驱动。
2. 单槽状态 → 多槽 registry（保留旧格式自动迁移）。
3. 消息层增加 en 文案（可扩展）。
4. 新增 `--root` / `--config`，引擎可在任意位置运行。
5. hooks 路径、约束摘要、基础设施清单全部读配置。
6. skills 剥离项目专属内容，保留机制脚手架。
7. 新增 `install.mjs` 与 `adapters/` 示例。

## 9. 扩展方式

- **新语言栈**：在 `adapters/` 写一份 `workflow.config.json` + `.reasonix.settings.json` + `package.json.scripts.json` + 填充好的 `AGENTS.md` 示例。
- **新宿主**：实现对应 hooks 绑定即可；引擎与配置不变。
- **新语言**：在 harness.mjs / lib.cjs 的 `MESSAGES` 表中增加文案。
- **新验证命令类型**：`verify.full` 里用 `{key, cmd, args}` 任意命令写法，引擎无需改动。

## 10. 已知边界

- 引擎唯一运行时前提是 Node.js（零 npm 依赖）；无 Node 的环境需另做 shell 版（未实现）。
- 物理门禁仅在支持 hooks 的宿主（Reasonix）生效；其他宿主为纪律模式。
- `workflow/evidence/` 与 `workflow/harness/` 均为运行态，建议加入目标项目 `.gitignore`。
