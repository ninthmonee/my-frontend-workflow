# 适配器（Adapter）指南

workflow-kit 把"引擎"与"项目差异"分离。**适配器 = 一份 `workflow.config.json` + 项目专属 skills + 宿主绑定文件**。

## 1. 配置字段参考

| 字段 | 说明 | 示例 |
|---|---|---|
| `schemaVersion` | 配置版本号，引擎升级迁移用 | `1` |
| `language` | 引擎输出语言 | `zh-CN` / `en` |
| `packageManager` | 包管理器，决定 `run` 参数 | `pnpm` / `npm` / `yarn` / `bun` |
| `workflowDir` | 工作流目录（相对项目根） | `workflow` |
| `stateFile` | 状态文件路径 | `workflow/harness/state.json` |
| `evidenceDir` | 证据目录 | `workflow/evidence` |
| `skillsDir` | skill 库目录 | `.reasonix/skills` 或 `.agents/skills` |
| `infraFiles` | 改这些文件不触发工作流 | `["AGENTS.md","REASONIX.md","workflow.md","scripts/harness.mjs"]` |
| `maxConvergenceRounds` | P2 收敛最大轮次 | `3` |
| `verify.full` | FULL 流程验证命令链 | `[{key,script},{key,cmd,args}]` |
| `verify.tweak` | TWEAK 流程验证命令 | `[{key:"typecheck",script:"check:type"}]` |
| `verify.lintEnabled` | 是否默认跑 lint | `true` |
| `coreConstraints` | 注入压缩上下文的项目约束摘要 | 字符串 |

### 验证命令的两种写法

```json
// 写法 A：脚本名（自动拼 packageManager run）
{ "key": "build", "script": "build:main:{env}", "defaultEnv": "dev" }

// 写法 B：任意命令（灵活）
{ "key": "test", "cmd": "npx", "args": ["vitest", "run"] }
```

占位符：`{env}` 会被 `--env` 参数替换（缺省用 `defaultEnv`）。`variants` 支持 `--build` 变体。

## 2. 一个最小适配器长什么样

```json
{
  "schemaVersion": 1,
  "language": "en",
  "packageManager": "npm",
  "workflowDir": ".wf",
  "stateFile": ".wf/harness/state.json",
  "evidenceDir": ".wf/evidence",
  "skillsDir": ".agents/skills",
  "infraFiles": ["AGENTS.md", "README.md", "scripts/harness.mjs"],
  "verify": {
    "lintEnabled": false,
    "full": [
      { "key": "build", "script": "build" },
      { "key": "typecheck", "script": "typecheck" }
    ],
    "tweak": [{ "key": "typecheck", "script": "typecheck" }]
  }
}
```

> 无 lint、无 build 的项目：删掉对应条目即可。引擎按配置执行，缺省值不强制。

## 3. 哪些 skill 进引擎、哪些进适配器

| 进引擎（通用机制） | 进适配器（项目专属） |
|---|---|
| `workflow`、`task-worker`、`p2-verifier` | `project-constraints`（如 iPad 适配、主题规范） |
| `pipeline-guard`、`ponytail-ladder` | 组件库文档（antdv-next、element-plus 等） |
| `verification-before-completion` | 状态管理 / 路由 / 框架最佳实践 |
| `compound-engineering`（机制） | 领域经验库 `references/experiences/` |

## 4. 宿主绑定

- **Reasonix**：`.reasonix/settings.json` 注册 6 个 hook 事件，实现"物理门禁"
- **其他宿主 / 纯 CLI**：不注册 hooks，走 AGENTS.md 纪律模式（自动触发 → 标记 → 自觉执行）

## 5. 新增适配器的步骤

1. 在 `adapters/` 下建目录（如 `example-node-lib/`）
2. 写 `workflow.config.json`（从本项目 `package.json` 抄验证命令）
3. 放 `.reasonix.settings.json`（如用 Reasonix）与 `package.json.scripts.json`（harness 脚本）
4. 放一个填充好的 `AGENTS.md` 示例（用真实技术栈替换 `{{DOMAIN_SKILLS}}`）
5. 跑 `node install.mjs --yes --config adapters/example-node-lib/workflow.config.json --target /tmp/demo` 验证
