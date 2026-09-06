# 工作流设计文档（v4）

> 本文档详细解释**这套工作流为什么这样设计、每个机制解决什么问题、各部件如何协作、目标/收益/代价是什么**。
> 面向想理解、维护、改造或移植这套体系的同学。
>
> 文档定位：
> - [让AI写代码又快又稳-AI编码工作流方法论.md](./让AI写代码又快又稳-AI编码工作流方法论.md) — **方法论层，建议先读**（为什么这么做，与技术栈解耦）
> - **本文档** — 设计思路（为什么这么做）+ 实现机制（具体怎么落地，含仓库内的组件与命令细节）

---

## 目录

1. [问题与目标](#1-问题与目标)
2. [总体架构](#2-总体架构)
3. [核心数据模型](#3-核心数据模型)
4. [执行流程](#4-执行流程)
5. [运行时拦截（hooks）](#5-运行时拦截hooks)
6. [命令族参考](#6-命令族参考)
7. [好处（收益）](#7-好处收益)
8. [代价（成本与权衡）](#8-代价成本与权衡)
9. [关键设计决策](#9-关键设计决策)
10. [演进历史](#10-演进历史)
11. [已知边界与后续方向](#11-已知边界与后续方向)
12. [附录 A：术语表](#附录-a术语表)
13. [附录 B：Skill 说明表](#附录-bskill-说明表)

---

## 1. 问题与目标

### 1.1 背景：AI 编码代理在真实项目中的五类事故

| 事故 | 典型表现 | 后果 |
|---|---|---|
| 乱改 | 让改一个字段，顺手重构整个文件 | 代码审查成本飙升，引入无关风险 |
| 假通过 | 说"typecheck 过了"，实际没跑或报错被忽略 | 上线后才发现编译/类型错误 |
| 不可恢复 | 会话一关，改到哪一步全忘了 | 重复劳动，或带着半成品提交 |
| 经验流失 | 上次踩的坑，换个说法又问一遍 | 同类错误反复发生 |
| 无边界 | Agent 无法判断该改什么、不该改什么 | 越界修改、破坏既有约定 |

### 1.2 设计目标

一句话：**让 AI 写代码从"坐过山车"变成"坐高铁"——又快又稳。**

五条可验证的设计目标：

1. **物理门禁**：P0 计划未通过前，Agent 调编辑工具被系统直接拒绝（hook exit 2），不是"建议别改"。
2. **证据优先**：每个 Phase 有落盘证据，Gate 推进前自动校验证据完整性，无法"空手过门"。
3. **人机确认点**：计划（P0）、改动（P1）、验收（P3）、沉淀（P4）四个决策点必须由人确认；Agent 禁止代替用户确认。
4. **最小改动**：Ponytail 决策阶梯强制"最简方案命中即停"，禁止预先抽象与顺手优化。
5. **零依赖、可恢复**：纯 Node.js 实现（零 npm 依赖）；状态自动备份、损坏自愈、断点续跑。

### 1.3 成功标准（怎么算"工作流生效"）

- 一次 FULL 流程走完后，`workflow/evidence/<change>/` 下有完整的 P0~P4.md + TASKS.md，且 Gate 全部 ✅。
- P0 未过时，对源码文件的任何 `edit_file`/`write_file` 都被拦截（可复现验证）。
- 会话中断后重开，Agent 能从 `state.json` 恢复到正确 Phase。
- 任意改动（含 TWEAK）完成后，check:type 通过且有沉淀询问记录。

### 1.4 非目标（明确不做）

- 不做代码审查替代品（不替代人 review）。
- 不做 CI/CD 或发布系统。
- 不做跨宿主强一致（物理门禁只在支持 hooks 的宿主生效）。
- 不做自动写业务逻辑（业务决策仍由人确认）。

---

## 2. 总体架构

### 2.1 分层架构图

```
┌──────────────────────────────────────────────────────────────┐
│ 宿主绑定层：.reasonix/settings.json                            │
│   SessionStart / UserPromptSubmit / PreToolUse /              │
│   PostToolUse / PreCompact / SessionEnd                       │
│   → 调 workflow/hooks/*.cjs（每个 hook 3000ms/2000ms 超时）    │
├──────────────────────────────────────────────────────────────┤
│ 契约层（文本，Agent 读取执行）                                  │
│   AGENTS.md      — Agent 行为契约（分级/门禁/Phase/跳过/沉淀）  │
│   workflow.md    — 团队入门（人读）                             │
│   REASONIX.md    — 项目事实（技术栈/命令/目录/约定）            │
├──────────────────────────────────────────────────────────────┤
│ 状态机层：scripts/harness.mjs（纯 Node，零依赖）                │
│   Gate 状态机 + 多槽 registry + 证据校验 + 验证收敛 + 归档/GC   │
│   对外命令：start/p0/tasks/p1/p2/p3/p4/skip/tweak/gate/        │
│            approve/gate-reset/gate-verify/restore/gc/         │
│            switch/list/drop/test                               │
├──────────────────────────────────────────────────────────────┤
│ 证据层：workflow/evidence/<change>/（运行态，不入库）           │
│   P0.md P1.md P2.md P2-errors.txt P3.md P4.md TASKS.md        │
│   TWEAK.md（TWEAK 路径） / SKIP.md（跳过路径）                 │
├──────────────────────────────────────────────────────────────┤
│ 知识层：.reasonix/skills/                                      │
│   compound-engineering — 经验沉淀（5 维去重 + INDEX）           │
│   workflow / task-worker / p2-verifier / pipeline-guard 等     │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 组件职责表

| 组件 | 职责 | 不负责 |
|---|---|---|
| `AGENTS.md` | 定义 Agent 什么时候必须走流程、每个 Phase 做什么、禁止做什么 | 不定义具体技术栈命令 |
| `REASONIX.md` | 记录仓库事实：技术栈、目录、命令、约定 | 不定义流程规则 |
| `scripts/harness.mjs` | 状态机的唯一事实来源：建槽/写证据/推进 Gate/跑验证/归档/GC | 不含任何业务知识 |
| `workflow/hooks/*.cjs` | 运行时拦截：门禁、诊断、跳过拦截、证据捕获、压缩保护 | 不直接修改业务代码 |
| `workflow/evidence/` | 每次改动的审计证据 | 不参与运行判定（由 harness 校验） |
| `.reasonix/skills/` | 领域知识与子 Agent 能力（antdv-next、pinia、p2-verifier…） | 不含流程状态 |

> 各 skill 的定位与作用见 [附录 B](#附录-bskill-说明表)。

### 2.3 运行时数据流

```
用户消息
  → UserPromptSubmit hook: prompt-check（跳过关键词拦截）
  → Agent 读 AGENTS.md 入口判断 → 输出标记 → harness:start 建槽
  → 每次工具调用 → PreToolUse hook: gate-guard（门禁判定）
  → bash 跑验证命令 → PostToolUse hook: evidence-collector（错误捕获）
  → harness:p2 执行 build→format→lint→typecheck → 写 P2.md/P2-errors.txt
  → harness:gate --phase <p> → 校验证据 → 写 state.json gates
  → 会话压缩 → PreCompact hook: compact-guard（注入工作流上下文）
  → 会话结束 → SessionEnd hook: session-end（完成确认/未完成提醒）
```

### 2.4 为什么这样分层

核心原则：**机制与事实分离**。

- harness/hooks 是"机制"——不包含任何具体项目的技术栈知识，可以原样复用。
- REASONIX.md + 领域 skill 是"事实"——每个项目不同，独立维护。
- 证据文件是"审计"——独立于代码和状态，任何时刻可回看。

这样做的直接收益：机制可以升级/移植而不影响项目事实；项目换技术栈只需改 REASONIX 与 skill，机制不动。

---

## 3. 核心数据模型

### 3.1 state.json：多槽 registry

路径：`workflow/harness/state.json`（运行态，gitignore）。

```jsonc
{
  "current": "feat-export",          // 当前受门禁约束的槽位
  "slots": {
    "feat-export": {
      "change": "feat-export",       // 变更名 = 证据目录名
      "taskType": "full",            // full|mandatory|hotfix|auto-skip|user-skip
      "gates": {                     // 每项为 ISO 时间戳或 null
        "P0": "2026-07-08T10:00:00.000Z",
        "P1": null, "P2": null, "P3": null, "DONE": null
      },
      "lastRunId": "…",              // 兼容旧字段，新流程不再依赖
      "p2FailedKeys": null,          // P2 快速重试：上次失败的检查 key 列表
      "p2ConvergenceRound": 0        // P2 收敛轮次
    },
    "fix-label": { "change": "fix-label", "taskType": "auto-skip", "gates": { … } }
  }
}
```

字段说明：

| 字段 | 含义 | 谁写入 |
|---|---|---|
| `current` | 当前活跃槽；门禁只跟随它 | `start`/`switch`/`drop`/`removeSlotById` |
| `taskType` | 门禁强度：`full`/`mandatory`/`hotfix` 走完整门禁；`auto-skip`/`user-skip` 编辑放行 | `start`（按 mode 映射）/`gate-reset` |
| `gates` | 五门状态，ISO 时间戳表示已通过 | `gate` |
| `p2FailedKeys` | 上次 P2 失败的检查 key（build/format/lint/typecheck） | `p2` |
| `p2ConvergenceRound` | 已用收敛轮次（≥3 停止自动修正） | `p2` |

迁移与自愈规则：

- **旧单槽格式** `{taskType, gates, change}` 首次读取自动迁移为 registry。
- **空对象** → 空 registry（不虚构 `__default__` 幽灵槽）。
- **current 失效** → 自动修复为第一个槽。
- **写入滚动备份**：有效主备份先滚动为 `state.bak.1.json`，再写新 `state.bak.json`。
- **损坏/缺失自愈**：`state.bak.json` → `state.bak.1.json` 链式回退；无备份才提示人工。

### 3.2 证据文件与校验规则

证据目录：`workflow/evidence/<change>/`。每个 Phase 的产物与 Gate 校验规则：

| 文件 | 生成者 | 关键字段 | Gate 校验 |
|---|---|---|---|
| `P0.md` | Agent 填模板（`harness:p0` 生成骨架） | Scope（allowedFiles/nonGoals）、Risks（≥1 条）、`gateReady` | `gateReady: YES` + Scope/Risks 无占位符（`MUST ask`/`填不出`/`TODO`/`待定`/`<填`） |
| `TASKS.md` | Agent 拆解（`harness:tasks` 生成骨架） | `- [ ] N.M` checkbox + files/verify/mapsTo | 至少一条 checkbox + 无残留 `[ ]` + 无 `<任务描述>` 占位符 |
| `P1.md` | `harness:p1`（自动填 Changed Files） | Changed Files、Key Decisions、`gateReady` | `gateReady: YES` + TASKS 全 `[x]`/`[-]` |
| `P2.md` | `harness:p2` 自动生成 | `allPassed`、退出码、错误摘要 | `allPassed: true` |
| `P2-errors.txt` | `harness:p2` 失败时生成 | 过滤后的错误行（≤200 字符/行） | 供 p2-verifier 只读分析 |
| `P3.md` | Agent 填模板（`harness:p3` 生成骨架） | `verifyPassed`、`userConfirmed` | 两者均为 `YES` |
| `P4.md` | Agent 填模板（`harness:p4` 生成骨架） | `knowledgeDone`、`status`、`compoundEngineeringPath` | `knowledgeDone: YES` + `status: written/skipped`；written 时 path 非 TODO |
| `TWEAK.md` | `harness:tweak` 自动生成 | Changed Files、check:type 退出码 | 不参与 Gate（TWEAK 无门） |
| `SKIP.md` | `harness:skip` | Marker、Reason | 记录跳过上下文，不参与 Gate |

模板文件存在时不覆盖（`--overwrite` 才覆盖）——防止 Agent 误重跑丢失已填内容。

### 3.3 锁与并发

- `workflow/harness/.harness.lock`：O_EXCL 创建，写入 PID；进程退出时删除。
- 锁文件 mtime 超过 **10 秒**视为僵死，可抢占重试（最多 3 次）。
- 作用：防止两个 harness 进程并发写 state.json（例如 Agent 并行跑两个命令）。

---

## 4. 执行流程

### 4.1 入口判断决策树

```
收到业务代码修改请求
  │
  ├─ 扫描紧急关键词（紧急/线上/崩溃/hotfix/回滚…）
  │     └─ 命中 → 问用户是否走 HOTFIX
  │
  ├─ 先看"质"：改了什么？
  │     ├─ 新增/删除路由、store、API、共享类型 → 🔴
  │     ├─ 改组件 props/events 契约、API 签名、共享类型 → 🔴
  │     ├─ 涉及权限/认证/核心业务流程 → 🔴
  │     ├─ 新增完整功能模块 → 🔴
  │     └─ 否则看"量"
  │
  ├─ 再看"量"：改多少？
  │     ├─ ≤3 行且 ≤2 文件 → 🟢 TWEAK
  │     ├─ 4~20 行 / 3~5 文件 / 单组件内 → 🟡 TWEAK（默认）/ FULL（用户说"走流程"）
  │     └─ >20 行 / >5 文件 / ≥2 模块 → 🔴 强制 FULL
  │
  └─ 输出标记（必须，未输出禁止写代码）
        ⚠️ [AUTO-SKIP]（🟢🟡 默认路径）
        ⚠️ [MANDATORY]（🔴 强制 FULL）
```

不确定时升一级；用户声明优先。

### 4.2 FULL 流程（逐步时序）

**Phase 0 — 改前准备**

| # | 谁 | 动作 |
|---|---|---|
| 1 | Agent | 加载 `project-constraints`（同 session 已加载可跳过） |
| 2 | Agent | `compound-engineering` 执行改前检索（每次需求必做，不可跳过） |
| 3 | Agent | 按需加载领域 skill（只加载需求涉及的，如 antdv-next） |
| 4 | Agent | 任务拆解 → `harness:tasks` 生成 TASKS.md 骨架 → 填入具体任务 |
| 5 | Agent | `harness:p0` 生成 P0.md 骨架 → 填 Scope + Risks（至少 1 条具体风险） |
| 6 | Agent | **输出「改动清单简要」到对话框**（逐文件一句话 + 非目标），请求用户确认 |
| 7 | Agent | 用户确认后 `harness:gate --phase P0`（自动校验 P0.md + TASKS.md） |

**Phase 1 — 开发**

| # | 谁 | 动作 |
|---|---|---|
| 1 | Agent | 读 TASKS.md 逐项执行；每项 Ponytail 阶梯自检（7 级，命中即停） |
| 2 | Agent | 每完成一项 `- [ ]` → `- [x]`，输出 `📋 TASKS: 2/4 done` |
| 3 | Agent | `harness:p1` 生成 P1.md（自动 `git diff` 填充 Changed Files） |
| 4 | Agent | 确认 Non-goals 未触及 → 用户审阅确认 |
| 5 | Agent | `harness:gate --phase P1`（校验 P1.md + TASKS 无残留） |

**Phase 2 — 验证 + 收敛 Loop**（详见 4.7）

**Phase 3 — 收尾自检**

| # | 谁 | 动作 |
|---|---|---|
| 1 | Agent | `pipeline-guard` 自检（Phase 0-2 证据完整性） |
| 2 | Agent | `harness:gate-verify`（P0/P1/P2 全部完成） |
| 3 | Agent | 用 ask 工具发起交互式确认三问：改动正确？问题解决？需求实现？ |
| 4 | Agent | 用户确认已解决 → `harness:gate --phase P3`；未解决 → 回退 Phase 1 |

**Phase 4 — 知识沉淀**

| # | 谁 | 动作 |
|---|---|---|
| 1 | Agent | 总结值得沉淀的点 + 给出推荐理由 |
| 2 | Agent | ask 用户是否沉淀（所有路径统一强制询问，禁止自行跳过） |
| 3 | Agent | 是 → compound-engineering 5 维去重 → 写入 + 更新 INDEX；否 → `status: skipped` |
| 4 | Agent | `harness:gate --phase DONE`（校验 P4.md） |

### 4.3 HOTFIX 流程（与 FULL 的差异）

- `harness:start --mode hotfix` → `taskType: mandatory`（走完整门禁）。
- Phase 0 额外必填：**Blast radius**（爆炸半径）+ **Rollback note**（回滚说明）。
- Phase 1 额外：**Risk mitigation** + Rollback ready/NA。
- Phase 3 额外：验证 Rollback plan。
- 其余同 FULL。

### 4.4 TWEAK 流程（逐步时序）

```
入口判断 → ⚠️ [AUTO-SKIP]
  → harness:start --mode tweak --change <name>   （taskType: auto-skip）
  → compound-engineering 轻量检索（有结果用，无结果跳过）
  → 直接改代码（gate-guard 对 auto-skip 槽放行编辑）
  → harness:tweak
       ├─ 自动 git diff 收集 Changed Files
       ├─ 跑 pnpm -s run check:type
       ├─ 写 TWEAK.md（含退出码）
       └─ check:type 通过 → 自动回收 auto-skip/user-skip 槽位
  → ask 用户是否沉淀（强制）
  → 输出 [TWEAK:DONE]
```

TWEAK 底线：check:type 必须过；沉淀询问必须有；**危险 bash 命令仍被拦截**（跳过流程不豁免危险操作）。

### 4.5 跳过协议（SKIPPED）

用户要求跳过时，Agent 输出固定话术后走最快路径：

```
工作流强制规则要求即使是小改动也需要走完流程以保障质量。
我会以最快速度执行：改前检索 → 最小改动 → check:type → 问你是否沉淀。
如仍要完全跳过，请回复「确认跳过」。
```

- 用户回复「确认跳过」→ `⚠️ [SKIPPED]`，`harness:skip` 写 SKIP.md 记录上下文。
- 用户坚持但未确认 → `⚠️ [SKIPPED-UNCONFIRMED]` + 记录上下文。
- `prompt-check` hook 拦截"不走流程/直接改/跳过流程"等关键词，但放行「确认跳过」。

### 4.6 多任务切换流程

```
开启任务 B：harness:start --change feat-b   （current → feat-b，feat-a 自然挂起）
查看全部：  harness:list                    （▶ 标记当前槽 + 各槽 Gate 图标）
切回 A：    git stash（如工作区有未提交改动）
            harness:switch --change feat-a  （current → feat-a，门禁跟随）
            git stash pop
放弃任务：  harness:drop --change feat-b    （仅删状态，evidence 保留）
```

约束：切换前必须 stash 上一任务的未提交改动，避免两个任务改动混在工作区。

### 4.7 P2 验证收敛循环（详细）

```
harness:p2 [--id <runId>] [--build main|full|<script>] [--lint] [--quick]
```

1. **分层执行**：`pnpm -s run build` → `pnpm -s run format` → `pnpm -s run lint` → `pnpm -s run check:type`。`--lint` 控制是否跑 format+lint（默认跑）。
2. **首失败即停**：某层 exit≠0 立即停止，后续层不跑。
3. **失败处理**：
   - 写 `P2.md`（`allPassed: false` + 失败层错误摘要）和 `P2-errors.txt`。
   - 委派只读 `p2-verifier` 子 Agent 分析错误 → 输出修正方案（可自动修 / 需人工）。
   - 主 Agent 按方案修正 → `harness:p2 --quick` 只重跑 `p2FailedKeys` 记录的失败项。
4. **收敛上限**：`p2ConvergenceRound` 累计 >3 → 拒绝继续，提示人工处理。
5. **回归回退**：错误数 >1.5x → 按文件 `git checkout -- <file>` 回退，不动其他文件。
6. **彻底失败**：3 轮不通 → `git checkout -- .` 丢弃 working tree 修改，通知用户。
7. **防假通过**：quick 模式下 `p2FailedKeys` 为空/null 时跑全部（避免"跳过全部→空结果→全通过"）。

### 4.8 知识沉淀流程

```
Phase 4 进入 → Agent 总结沉淀点 + 推荐理由
  → ask 用户（不中断工作流）
      ├─ 是 → compound-engineering：
      │        5 维去重（领域/场景/方案/关键词/时间窗）
      │        → 写入 references/<domain>.md + 更新 INDEX.md
      └─ 否 → P4.md status: skipped
  → harness:gate --phase DONE
```

禁止 Agent 未经确认自行跳过；用户确认"是"才写库。

---

## 5. 运行时拦截（hooks）

`.reasonix/settings.json` 绑定 6 个事件，命令统一走 `node-shim.sh`（自动发现 nvm/全局 node）。

| 事件 | 脚本 | 触发时机 | 行为 |
|---|---|---|---|
| SessionStart | session-init.cjs | 会话构建 | 诊断 cwd 与 state 损坏，异常写 stderr；不注入上下文 |
| UserPromptSubmit | prompt-check.cjs | 用户提交消息 | 有活跃 full/mandatory 且消息含跳过关键词 → exit 2 |
| PreToolUse | gate-guard.cjs | 每次工具调用前 | 门禁判定（见矩阵）；危险 bash 无条件拦截 |
| PostToolUse | evidence-collector.cjs | 每次工具调用后 | bash 含 check:type/lint 且输出有错误 → 写 `last-check-errors.txt` |
| PreCompact | compact-guard.cjs | 上下文压缩前 | stdout 输出工作流摘要（Gate/Phase/待办/核心约束），作为压缩指导注入 |
| SessionEnd | session-end.cjs | 会话结束 | 完成确认；DONE 时清理 `last-check-errors.txt` |

### 5.1 gate-guard 判定矩阵（PreToolUse）

按顺序判定，命中即 exit：

| 顺序 | 条件 | 结果 |
|---|---|---|
| 1 | 编辑目标在 `workflow/` 内 | 放行（写证据/修状态） |
| 2 | `taskType ∈ auto-skip/user-skip`（仅编辑工具） | 放行 |
| 3 | 编辑目标 ∈ 基础设施文件（AGENTS.md/REASONIX.md/workflow.md/scripts/harness.mjs） | 放行（改工作流自身不走流程） |
| 4 | 编辑目标在 `.reasonix/skills/` 内 | 放行 |
| 5 | 无 state（未初始化）且编辑源码 | exit 2（提示先 harness:start） |
| 6 | `taskType ∉ full/mandatory/hotfix` | 放行（兜底：未知类型不拦截） |
| 7 | active 类型且 P0 未过 | exit 2（提示先完成 Phase 0） |
| 8 | bash 命令命中危险模式（`rm -rf`、`push --force`、`reset --hard`、`find -delete`、`chmod 777`…） | exit 2（任何 taskType 都不豁免） |

### 5.2 fail-open 策略

hook 自身异常（代码 bug、lib 缺失、stdin 非法 JSON）→ **放行并显著告警**。理由：门禁脚本崩溃不能把用户锁死；但状态类判定（损坏无备份等）仍按语义拦截。

---

## 6. 命令族参考

`package.json` 中 19 个 `harness:*` 脚本全部等价于 `node scripts/harness.mjs <cmd>`。

| 命令 | 参数 | 行为 |
|---|---|---|
| `harness:start` | `--mode full\|hotfix\|tweak --change <name>` | 建槽/激活；同名未完结报错；同名旧证据归档 |
| `harness:p0` | `[--id] [--check] [--overwrite]` | 生成 P0.md 骨架 / `--check` 校验 |
| `harness:tasks` | `[--id] [--overwrite] [--check]` | 生成 TASKS.md 骨架 / 校验 |
| `harness:p1` | `[--id] [--check] [--overwrite]` | 生成 P1.md（自动填 Changed Files） |
| `harness:p2` | `[--id] [--build] [--lint] [--quick]` | 分层验证 + 收敛轮次 + 证据 |
| `harness:p3` | `[--id] [--check] [--overwrite]` | 生成 P3.md 骨架 |
| `harness:p4` | `[--id] [--check] [--overwrite]` | 生成 P4.md 骨架 |
| `harness:skip` | `[--id] [--marker] [--reason]` | 写 SKIP.md |
| `harness:tweak` | `[--id]` | 跑 check:type + 写 TWEAK.md + 通过后回收槽 |
| `harness:gate` | `--phase p0\|p1\|p2\|p3\|done` | 校验证据 → 写 gates 时间戳 |
| `harness:approve` | `--phase p0\|p1\|p3\|p4 [--status written\|skipped]` | 翻转证据 TODO 字段为 YES |
| `harness:gate-reset` | `--type full\|mandatory\|auto-skip\|user-skip [--id]` | 重置当前/指定槽门禁 |
| `harness:gate-verify` | `[--id]` | 校验 P0/P1/P2 均完成 |
| `harness:restore` | — | 从备份显式恢复 state.json |
| `harness:gc` | `[--dry-run]` | 归档无 P0.md/TWEAK.md 的非活跃证据目录到 `_archive/` |
| `harness:switch` | `--change <name>` | 切换 current 槽 |
| `harness:list` | — | 列出全部槽位与 Gate 进度 |
| `harness:drop` | `--change <name>` | 删槽（证据保留） |
| `harness:test` | — | `node --test workflow/tests/*.test.mjs`（41 条回归测试） |

典型命令序列（FULL）：`start` → `p0`+`tasks` → `gate P0` → `p1` → `gate P1` → `p2`（失败则 `p2 --quick`）→ `gate P2` → `p3` → `gate P3` → `p4` → `gate DONE`。

---

## 7. 好处（收益）

### 7.1 对开发者个人

- **少返工**：P0 计划确认后才动手，方向错了在改代码前就被拦下。
- **少背锅**：证据链完整（P0~P4），"为什么这么改"有据可查。
- **少重复**：经验库去重沉淀，同类坑只踩一次。
- **断点续跑**：会话关掉再打开，状态自动恢复，不用从头解释需求。

### 7.2 对团队

- **统一纪律**：所有 Agent 走同一套流程，行为可预期。
- **可审计**：每次改动有独立证据目录，code review 时可对照 P0 Scope 检查是否越界。
- **知识资产化**：经验库随使用持续增长，新人/新 Agent 可检索复用。

### 7.3 对代码质量

- **验证真实发生**：build→format→lint→typecheck 自动执行，结果落盘，无法"假装通过"。
- **错误分类处理**：p2-verifier 区分"可自动修"与"需人工"，避免 Agent 在业务逻辑上瞎改。
- **回退有纪律**：错误暴增按文件回退，3 轮不通全量回退，不留半成品。

### 7.4 可量化 vs 不可量化

| 可量化 | 不可量化（但真实存在） |
|---|---|
| check:type 通过率 100%（Gate 强制） | 团队对 AI 产出的信任度 |
| 每次改动有 P0~P4 证据（100% 覆盖） | "改对了方向"的概率提升 |
| P2 最多 3 轮自动收敛 | 沟通成本下降（计划先确认） |

---

## 8. 代价（成本与权衡）

### 8.1 时间成本

| 项目 | 估算 |
|---|---|
| FULL 确认次数 | 4 次（P0/P1/P3/P4） |
| 每次确认的人工审阅 | 1~5 分钟（P0 改动清单简要已尽量压缩） |
| Phase 2 验证时长 | 取决于项目 build 时长（vben 全量 build 较重） |
| TWEAK 额外开销 | check:type + 沉淀询问（数分钟） |

**结论**：微小改动走 TWEAK 的额外开销很低；复杂改动的开销主要花在"先对齐再动手"，这是有意为之——把风险前置到最便宜的阶段。

### 8.2 存储成本

- 每次改动一个证据目录（几 KB~几十 KB）；长期积累需要 `harness:gc` 归档或手动清理。
- 证据目录与 harness 状态均 gitignore，不进仓库。

### 8.3 复杂度成本

- 多槽 registry、备份滚动、锁、GC 归档——比"一个 JSON 存当前状态"复杂得多。
- 复杂度由 41 条 node:test 回归测试锁定（gate 校验、gate-guard 矩阵、状态模型纯函数）。

### 8.4 宿主依赖

- 物理门禁只在 Reasonix（支持 hooks 的宿主）生效；其他宿主退化为"纪律模式"（靠 AGENTS.md 自觉）。
- hooks 依赖项目根目录启动宿主；cwd 不对时门禁脚本可能读到错误路径。

### 8.5 误拦截 / 误放行风险

| 风险 | 缓解 |
|---|---|
| 误拦截合法编辑（P0 未过但用户真想改） | 先走 P0 或走 TWEAK；基础设施文件与 workflow/ 内放行 |
| 误拦截合法 bash（危险模式误匹配） | 模式列表保守（`rm -rf`、`--force` 等明确危险操作） |
| 误放行（SKIP 类型下编辑无门禁） | TWEAK 仍强制 check:type + 沉淀询问；危险 bash 不豁免 |
| fail-open 时门禁短暂失效 | 有显著 stderr 告警；状态判定仍拦截 |

### 8.6 不适合这套工作流的场景

- 一次性脚本/临时实验（走流程反而拖慢）。
- 纯问答、读代码、分析架构（不触发工作流）。
- 修改工作流自身文件（AGENTS.md/workflow/ 等，豁免）。
- 非 git 项目（证据的 Changed Files 依赖 git diff，会退化为空列表）。

---

## 9. 关键设计决策

| 决策 | 理由 | 代价 |
|---|---|---|
| 物理门禁（hook exit 2）而非纯纪律 | "建议别改"对 LLM 无效，物理拦截才可靠 | 依赖宿主 hooks；其他宿主退化 |
| 证据文件驱动 Gate | 可审计、可恢复、防"空口通过" | 每 Phase 多一次文件写入 |
| 纯 Node 零依赖 | 无供应链风险，跨平台 | 要求 Node 运行时 |
| 多槽 registry | 真实工作多任务并行是常态 | 状态模型复杂度上升（测试锁定） |
| fail-open | 门禁脚本崩溃不能锁死用户 | 极端情况下门禁短暂失效（有告警） |
| 危险 bash 无条件拦截 | TWEAK 也不豁免危险操作 | 用户需确认后重试 |
| 验证首失败即停 | 快速反馈，避免错误级联 | 一轮只暴露一个错误 |
| 同名旧证据归档而非删除 | 保留审计可恢复 | 磁盘随时间增长（gc 缓解） |
| 中文协议 + 英文术语 | 团队沟通成本低 | 非中文团队需翻译层（kit 预留 language） |
| 4 次人机确认 | 关键决策必须人拍板 | 流程"重"，对微小改动不友好（已用 TWEAK 缓解） |

---

## 10. 演进历史

- **v4.0**：目录全面重命名（`workflow/`、hooks 路径、settings.json、文档引用）；skills 精简；去除 devflow 残留。
- **多槽改造**：单槽 state → 多槽 registry；`start/switch/list/drop` 命令族；旧格式自动迁移。
- **Gate 证据校验补强**：`gate` 推进前自动校验对应 Phase 产物。
- **TWEAK 槽自动回收**：验证通过后 auto-skip/user-skip 槽自动移除。
- **本次检查修复**：补 `harness:start` 脚本缺失；修 `harness:test` 目录形式；P2 默认 build 脚本适配真实项目；gate-guard 在 SKIP 路径下仍拦截危险命令；`patchCurrent` 防空名幽灵槽；quick 模式防空 failedKeys 假通过。

---

## 11. 已知边界与后续方向

- **宿主耦合**：物理门禁依赖 Reasonix hooks；其他宿主只有纪律模式。
- **验证命令固定 pnpm**：`p2`/`tweak` 通过 pnpm 执行；跨栈通用化在 `workflow-kit/` 用 `workflow.config.json` 解决（本项目保持原样）。
- **经验库去重依赖 Agent 执行**：compound-engineering 无程序级强制。
- **Node 版本**：engines 要求 `^22.18.0 || ^24.0.0`；本机已升级 v24.20.0。
- **后续方向**：SessionStart 注入状态摘要（additionalContext）；evidence 自动压缩/归档策略；跨宿主 hook 适配层。

---

## 附录 A：术语表

| 术语 | 含义 |
|---|---|
| Gate | 门禁：P0~P4 + DONE 五个关卡，通过后写入时间戳 |
| Phase | 工作流阶段：0 准备 / 1 开发 / 2 验证 / 3 收尾 / 4 沉淀 |
| 槽位（slot） | registry 中一个任务的独立状态单元 |
| registry | 多槽状态中枢 `state.json` |
| evidence | 证据目录/文件，Gate 校验的对象 |
| TWEAK | 微小改动快速路径（跳过 P0-P3） |
| HOTFIX | 紧急修复路径（= FULL + 爆炸半径/回滚） |
| auto-skip / user-skip | 跳过类型槽：编辑放行，危险命令仍拦 |
| p2-verifier | Phase 2 只读分析子 Agent |
| Ponytail 阶梯 | 7 级"最简方案命中即停"决策法 |
| fail-open | hook 自身异常时放行并告警 |

## 附录 B：Skill 说明表

> Skill 是项目级 playbook（位于 `.reasonix/skills/`），Agent 在流程中按需加载。本文档正文提到的每个 skill 在此统一说明"是什么 + 作用"。

### C.1 流程机制类（工作流自身的执行单元）

| Skill | 是什么 | 作用 |
|---|---|---|
| `project-constraints` | 项目全局护栏：本仓库的硬性规则与约定（技术栈、目录、禁用项） | 每次改代码前 **MUST 加载**；选择 UI/数据模式、新建文件前也必须查它，防止 Agent 违反项目约定 |
| `compound-engineering` | 经验库机制：改前检索 + 改后沉淀的完整流程 | Phase 0 改前检索历史经验；Phase 4 用户确认后按 5 维去重写入经验库并更新 INDEX，让"踩过的坑"可复用 |
| `pipeline-guard` | Phase 3 收尾自检 playbook | 验证 Phase 0-2 证据完整性、执行 Phase 3 自检、检查 Phase 4 沉淀；有遗漏就报告未完成，防止"假收尾" |
| `ponytail-ladder` | Ponytail 决策阶梯（7 级自检） | Phase 1 写代码前强制自问"YAGNI？→ stdlib？→ 浏览器原生？→ 已装依赖？→ 项目封装？→ 一行？→ 最小实现"，命中最简方案即停 |
| `task-worker` | 子 Agent Worker（🧬 subagent） | 接收主 Agent 委派，专注实现内部逻辑（读文件 → 改代码 → 跑 typecheck → 返回证据），不参与流程决策，隔离复杂任务的上下文消耗 |
| `p2-verifier` | Phase 2 收敛 verifier（🧬 subagent，只读） | 读取 `P2-errors.txt` 独立分析错误，输出修正方案（可自动修/需人工）给主 Agent 执行；只读不改码，保证判断独立 |
| `verification-before-completion` | 完成前验证 playbook | 在声称"完成/修复/通过"之前，强制跑验证命令并确认输出——证据先于断言，堵"口头通过" |
| `workflow` | 工作流控制台（斜杠命令 `/workflow`） | 快捷启动/切换/查看/放弃工作流：`/workflow full feat-x` → `harness:start`，`list/switch/drop` 映射到对应命令 |

### C.2 前端领域类（本项目技术栈专用）

| Skill | 是什么 | 作用 |
|---|---|---|
| `antdv-next` | antdv-next（Vue 3 原生组件库）文档 skill | 编辑 Table/Modal/Form 等组件前 **MUST 加载**，查 props/events/slots/主题 token，避免凭记忆猜 API（antdv-next ≠ ant-design-vue） |
| `vue-best-practices` | Vue 3 最佳实践 | Vue 任务 MUST 使用：强制 Composition API + `<script setup>` + TypeScript；覆盖 SSR/Volar/vue-tsc |
| `vue` | Vue 3 核心 API 参考 | 写 SFC、`defineProps/defineEmits/defineModel`、watchers、`Transition/Teleport/Suspense/KeepAlive` 时查用法 |
| `vue-router-best-practices` | Vue Router 4 模式 | 路由、导航守卫、路由参数、路由组件生命周期交互 |
| `pinia` | Pinia 状态管理官方参考 | 定义 store、state/getters/actions、store 模式 |
| `vueuse-functions` | VueUse composables 参考 | 有现成 composable 时优先复用，不重复造轮子 |
| `vite` | Vite 构建配置参考 | 改 `vite.config.ts`、插件、SSR、构建库时查文档 |
| `web-design-guidelines` | Web 界面规范审查 | 检查 UI 的可用性/无障碍/视觉规范，回答"review my UI / 可访问性"类需求 |

### C.3 语言与调试类

| Skill | 是什么 | 作用 |
|---|---|---|
| `typescript-advanced-types` | TypeScript 高级类型参考 | 泛型、条件类型、映射类型、模板字面量类型、utility types；写复杂类型逻辑或复用类型工具时查 |
| `systematic-debugging` | 系统化调试方法 | 遇到 bug/测试失败/意外行为时，先按方法定位根因再提修复，禁止瞎猜 |

### C.4 加载时机速查

| 时机 | 加载 |
|---|---|
| 任何任务开始前 | `project-constraints`（MUST） |
| Phase 0 检索 / Phase 4 沉淀 | `compound-engineering` |
| Phase 1 复杂任务委派 | `task-worker` |
| Phase 2 验证失败分析 | `p2-verifier` |
| Phase 3 收尾自检 | `pipeline-guard` |
| 写代码前（每项任务） | `ponytail-ladder`（可选显式加载，已集成 Phase 1） |
| 声称完成前 | `verification-before-completion` |
| 涉及 antdv-next 组件 | `antdv-next`（MUST） |
| 涉及 Vue/Router/Pinia/Vite | 对应领域 skill |
| 遇到 bug | `systematic-debugging` |
