# AGENTS.md — Agent 行为契约（workflow-kit 模板）

> 工作流为唯一流程真相。本文件定义 Agent 的行为规则：什么必须做、什么禁止做、各 Phase 怎么执行。
> 项目事实见 [REASONIX.md](./REASONIX.md)（如存在）。
> 本模板由 workflow-kit 生成：运行时差异（验证命令、路径、语言）由 [workflow.config.json](./workflow.config.json) 控制。

---

## 🔴 自动触发（MUST — 最高优先级）

收到用户消息时，MUST 先判断是否触发工作流。

**不触发（直接回答）：** 纯问答、读代码、分析架构。

**不触发（工作流基础设施）：** 修改以下工作流自身文件，不触发工作流——改工作流的代码不需要走工作流：
`AGENTS.md` `REASONIX.md` `workflow.md` `workflow/` `{{SKILLS_DIR}}/` `scripts/harness.mjs` `workflow.config.json`

**触发（代码变更请求）：** 除上述两类外的业务代码修改请求（按项目技术栈，如 `.ts` `.vue` `.css` 等），执行入口判断。判断前先扫描紧急关键词，命中则问"是否走 hotfix？"：
`紧急` `赶紧` `线上` `马上` `修 bug` `hotfix` `崩溃` `报错` `挂了` `不行了` `回滚` `立刻`

**入口判断（先质后量）：** 按分级标准判定 🟢🟡🔴 → **输出标记**（`⚠️ [AUTO-SKIP]` / `⚠️ [MANDATORY]`）→ 走对应路径。🟡 默认走 TWEAK，用户说"走流程"则转 FULL。禁止未输出标记直接写代码。

> ⚠️ SessionStart 后 MUST 先读取 `{{STATE_FILE}}` 检查是否有活跃流程。若 `taskType` 为 full/mandatory/hotfix 且 `gates.DONE` 未 passed → **继续当前流程**，不需要重复入口判断。若 `gates.DONE` 已 passed → 新变更请求需重新 `{{PM}} -s run harness:start`。

---

## 角色边界

| Agent 做 | Agent 禁止 |
|---|---|
| Phase 内执行（检索/实现/验证/自检/沉淀） | 代替用户做 P0/P1/P3 确认 |
| 输出可核验证据（命令输出、diff、文件列表） | 未获确认时写入 `gateReady` / `userConfirmed` |
| 最小改动、不猜 API、不顺手优化 | 跳过入口判断直接写代码 |

---

## 入口判断与分级

**判断顺序：先看"质"（改了什么），再看"量"（改了多少）。** 命中任一 🔴 条件即强制 FULL。

| 级别 | 判定条件 | 路径 | 标记 |
|---|---|---|---|
| 🟢 微小 | 纯样式/文案/调参/简单修复（改取值逻辑/补空值兜底/修正判空条件等，不改业务流程），基于需求描述估计 ≤3 行，≤2 文件 | TWEAK | `⚠️ [AUTO-SKIP]` |
| 🟡 一般 | 基于需求描述估计 4~20 行，3~5 文件，单组件/单函数内修改，不命中 🔴 条件 | TWEAK（默认），用户说"走流程"则转 FULL | `⚠️ [AUTO-SKIP]` |
| 🔴 复杂 | 满足**任一**：<br>• >20 行 或 >5 文件 或 ≥2 模块<br>• 新增/删除路由、store、API 调用、共享类型<br>• 修改组件 props/events 契约、共享类型定义、API 签名<br>• 涉及权限、认证、核心业务流程<br>• **新增完整功能模块**（即使文件数不多） | 强制 FULL | `⚠️ [MANDATORY]` |

不确定时升一级。用户声明优先。

---

## 跳过协议

用户要求跳过时，Agent 输出：

```
工作流强制规则要求即使是小改动也需要走完流程以保障质量。
我会以最快速度执行：改前检索 → 最小改动 → check:type → 问你是否沉淀。
如仍要完全跳过，请回复「确认跳过」。
```

| 标记 | 触发 | Agent 最小步骤 |
|---|---|---|
| `⚠️ [AUTO-SKIP]` | 🟢 自动判定 或 🟡 默认路径 | 入口判断 → `harness:start --mode tweak` 初始化 → compound-engineering 轻量检索 → 改代码 → `harness:tweak` → 询问是否沉淀 → 输出 `[TWEAK:DONE]` |
| `⚠️ [SKIPPED]` | 用户确认跳过 | 同上 |
| `⚠️ [SKIPPED-UNCONFIRMED]` | 用户坚持但未确认 | 同上 + 记录上下文 |

**TWEAK 路径与 FULL 路径的差异：** TWEAK 不加载 project-constraints、不加载领域 skill、不做任务拆解、不填 P0 槽位。仅做 compound-engineering 轻量检索（有结果则用，无结果跳过）。check:type 通过后必须询问是否沉淀经验（全部工作流统一强制询问 + 给出推荐理由 + 等待用户确认）。

---

## Phase 执行协议

Gate 状态由 `harness:gate` 写入 `{{STATE_FILE}}`，Agent 按 Phase 协议逐阶段推进。

**每个 Phase 进入时 MUST 输出进度摘要 + 证据文件索引：**

```
📊 进度: ✅ Phase 0 → ✅ Phase 1 → 🔵 Phase 2 → ⏳ Phase 3 → ⏳ Phase 4
📁 证据: P0={{EVIDENCE_DIR}}/<change>/P0.md  P1={{EVIDENCE_DIR}}/<change>/P1.md  TASKS={{EVIDENCE_DIR}}/<change>/TASKS.md
📋 任务: 2/4 done（读取 TASKS.md 获取最新状态）
```

### 同一 Session 内多次启动工作流（重要）

`harness:start` 会调用 `gate-reset` 清空 `{{STATE_FILE}}`，但 Agent 的会话上下文不会自动清空。同 session 内第二次及后续启动工作流时，Agent MUST 遵守：

- 将每次 `harness:start` 视为全新工作流的起点，按 Phase 执行协议从头推进，**不可因"刚走过一轮"而跳过步骤**
- Phase 0 所有步骤不可跳过（步骤 1 在确认 project-constraints 仍在上下文时可跳过加载，否则必须重载）
- **严禁**用上一轮工作流的 Phase 3「已解决」结论来跳过新一轮的任何 Gate 或确认步骤
- 每次 `harness:start` 使用独立的 `--change` 名称，证据目录 `{{EVIDENCE_DIR}}/<change>/` 互不干扰

### Phase 0 — 改前准备

**进入时输出标记：** `[PHASE:0] 开始改前准备`

1. 加载 `project-constraints`（如项目定义了该 skill）。同 session 首次加载后可跳过；若为同 session 内非首次启动工作流，Agent MUST 先自检核心约束是否仍在上下文中。若不确定 → 必须重新加载。
2. `compound-engineering` **必须执行改前检索**（每次需求不同，不可跳过）
3. 根据需求涉及的领域按需加载对应 skill（见领域 Skill 路由表）。**仅加载需求中用到的**
4. **任务拆解**：将需求拆为可落地的具体任务，写入 `{{EVIDENCE_DIR}}/<change>/TASKS.md`。
   - 使用 `- [ ] N.M` checkbox 格式，按依赖顺序排列
   - 用 `## N.` 二级标题分组（如 Setup / Core / Integration）
   - 每项必须包含：`files`（涉及文件）、`verify`（可验证的完成标准）、`mapsTo`（追溯到 P0 Scope/Risks 条目）
   - 拆不出来或不确定 → MUST ask 用户澄清
5. 生成 P0 证据，三个必填槽位：
   - **Scope**：涉及文件/目录 + 非目标（明确不做的事）
   - **Risks**：至少 1 条具体风险
   - **hotfix 额外**：Blast radius + Rollback note
6. **任一 Scope/Risks 槽位无法确定 → MUST ask 用户补齐**，不得留空或写"待定"
7. **输出「改动清单简要」到对话框（MUST，每次工作流均不可省略）**：将 P0 改动整理为简洁清单，**直接输出在对话中**，让用户不打开证据文件即可审阅改动范围，格式：
   - 逐文件一项：`` - `文件路径` — 改动点一句话摘要 ``
   - 末尾一行：「非目标：…」（明确不做的事）
   - 清单后附简短说明（根因/关键决策），随后请求用户确认
8. 展示证据给用户审阅（改动清单简要已输出时，证据文件可仅引用路径），用户确认后继续
9. **Gate 通过时输出标记：** `[GATE:P0] ✅`

**Gate：** Scope 和 Risks 不能有占位符或空值，至少一条具体风险。

### Phase 1 — 开发

**进入时输出标记：** `[PHASE:1] 开始开发`

1. **读取 `{{EVIDENCE_DIR}}/<change>/TASKS.md` 并逐项执行**：每完成一项将 `- [ ]` 改为 `- [x]`，进行中的加注释 `<!-- in_progress -->`。每完成一项输出 `📋 TASKS: 2/4 done`
2. **决策阶梯（Ponytail）**：每项任务动手前，从第一级开始自问，命中最简方案即停：
   ① **这真的需要吗？** → 不必要则跳过（YAGNI），在 TASKS.md 标注 `[-] 已跳过（YAGNI）`
   ② **标准库有吗？** → `Date`、`URL`、`Array.from`、`Intl` 等，优先用 stdlib
   ③ **浏览器原生有吗？** → `<input type="date">`、`<dialog>`、`URLSearchParams`、`localStorage` 等
   ④ **已安装依赖有吗？** → 确认已安装就用
   ⑤ **项目内已有封装？** → 既有组件/hooks/工具
   ⑥ **能一行搞定？** → 直接写，不做 wrapper、不做 class
   ⑦ **以上都不行** → 写最小可行实现，禁止预先抽象
3. 判断复杂度：≤3 文件直接开发，否则委派 `task-worker`（如宿主支持子 Agent）
4. 最小改动、不猜 API、确认无同类封装
5. 生成 P1 证据（`harness:p1` 自动填充 Changed Files；Agent 确认 Non-goals 未触及）。
   - **hotfix 额外**：Risk mitigation + Rollback: ready/NA
6. 展示证据给用户审阅，用户确认后继续
7. **Gate 通过时输出标记：** `[GATE:P1] ✅`

**Gate：** 所有任务必须标记为 `[x]`（已完成）或 `[-]`（YAGNI 跳过），禁止残留 `[ ]`（未完成）的任务。

### Phase 2 — 验证 + 收敛 Loop

**进入时输出标记：** `[PHASE:2] 开始验证 (build → format → lint → typecheck)`

1. `harness:p2` 分层执行（验证命令见 `workflow.config.json`）：build → format → lint → typecheck，首失败即停
2. 通过 → 收敛，**输出标记：** `[GATE:P2] ✅`
3. 失败 → 委派 **`p2-verifier`** 子 Agent（只读），传入 `P2-errors.txt` 路径，由 verifier 独立分析错误并输出修正方案
4. 主 Agent 读 verifier 方案：可修项 → 逐一执行修改；需人工项 → 停止，通知用户
5. 修改完成后 `harness:p2 --quick` 重试
6. 最多 3 轮。每轮输出：`[LOOP:2/N] 修正第 N 轮 (errors: X → Y)`
7. 错误暴增（>1.5x）→ `[REGRESSION]` → 按文件回退：`git checkout -- <file>` 仅回退出问题的文件，不动其他文件
8. 3 轮不通 → `[STUCK]` → 回退 working tree 修改，通知用户
9. 自动修正成功 → **输出标记：** `[GATE:P2] ✅ ⚡auto-fixed (N rounds)`

**Gate：** build + format + lint + typecheck 全部 exit=0。首失败即停，最多 3 轮修正。可修/不可修判断由 `p2-verifier` 子 Agent 执行，详见其 skill 定义。

### Phase 3 — 收尾自检

**进入时输出标记：** `[PHASE:3] 开始收尾自检`

1. `pipeline-guard` 自检（检查 Phase 0-2 证据完整性）
2. `harness:gate-verify` 校验 P0/P1/P2 完整性
3. **用户确认问题解决**：Agent MUST 使用 ask 工具发起交互式确认（不中断工作流），确认以下三点：
   - ✅ 改动是否正确？
   - ✅ 问题是否已解决？
   - ✅ 需求功能是否已实现 / 是否已满足需求？
4. **分支处理**：
   - 用户确认「已解决」→ 继续步骤 5
   - 用户确认「未解决」→ 记录具体问题，🔁 回退 Phase 1 修复，修复完成后重新走 Phase 2 → Phase 3
5. **Gate 通过时输出标记：** `[GATE:P3] ✅`

**Gate：** pipeline-guard 自检通过 + gate-verify（P0/P1/P2 全部完成）+ 用户确认「已解决」。

### Phase 4 — 知识沉淀

**进入时输出标记：** `[PHASE:4] 开始知识沉淀`

**前提：** Phase 3 用户已确认「问题已解决」。若 Phase 3 用户确认「未解决」→ 不应进入 Phase 4，回退 Phase 1 修复。

所有工作流（HOTFIX/TWEAK/FULL）统一强制询问：Agent MUST 总结值得沉淀的点并给出推荐理由，使用 `ask` 工具发起交互式询问（不中断工作流），等待用户明确确认。用户说"是" → 按 `compound-engineering` skill 的去重规则执行去重 + 写入 + 更新 INDEX.md；用户说"不" → `status: skipped`。**禁止** Agent 未经确认自行跳过。

**Gate：** 用户确认是否沉淀 + 证据完整。`[GATE:DONE] ✅`

---

## 领域 Skill 路由

涉及以下技术时 MUST 先加载对应 skill 查文档，禁止凭记忆猜测。

> 安装器只装入**通用 skill**。下面的路由表按项目技术栈填写（参考 `adapters/example-*/` 或团队自定义 skill）。

| 任务涉及 | 加载 skill |
|---|---|
| {{DOMAIN_SKILLS}} | |

## 硬约束

- **Ponytail 决策阶梯**：Phase 1 步骤 2 已详述，每条改动前必须走完 7 级自检
- **证据优先**：聊天输出 ≤6 行摘要，长日志/长 diff 写本地证据文件
- **退出机制**：API 不确定、连续 3 次编辑失败 → 停止，问用户

## 故障恢复速查

| 症状 | 处理 |
|---|---|
| 直接写代码没声明标记 | ⛔ 回退 → 先做入口判断并输出标记 |
| typecheck exit≠0 声称通过 | ⛔ 回退 → 逐条确认错误来源 |
| 跳过路径未跑 check:type | ⛔ 跳过也必须跑 |
| 状态文件脏了 | `{{PM}} -s run harness:gate-reset -- --type full` |
| 改坏了想回退 | `git checkout -- <file>` 按文件回退；全量丢弃需谨慎 |
