# AGENTS.md — Agent 行为契约

> DevFlow 为唯一流程真相。本文件定义 Agent 的行为规则：什么必须做、什么禁止做、各 Phase 怎么执行。
> 项目事实见 [REASONIX.md](./REASONIX.md)。团队讲解见 [DEVFLOW_WORKFLOW_SHARE.md](./DEVFLOW_WORKFLOW_SHARE.md)。

---

## 🔴 自动触发（MUST — 最高优先级）

收到用户消息时，MUST 先判断是否触发工作流。

**不触发（直接回答）：** 纯问答、读代码、分析架构。

**触发（代码变更请求）：** 执行入口判断。判断前先扫描紧急关键词，命中则问"是否走 hotfix？"：
`紧急` `赶紧` `线上` `马上` `修 bug` `hotfix` `崩溃` `报错` `挂了` `不行了` `回滚` `立刻`

**入口判断（先质后量）：** 按分级标准判定 🟢🟡🔴 → **输出标记**（`⚠️ [AUTO-SKIP]` / `⚠️ [MANDATORY]`）→ 走对应路径。🟡 默认走 TWEAK，用户说"走流程"则转 FULL。禁止未输出标记直接写代码。

> ⚠️ SessionStart 后 MUST 先读取 `.devflow/harness/state.json` 检查是否有活跃流程。若 `taskType` 为 full/mandatory/hotfix 且 `gates.DONE` 未 passed → **继续当前流程**，不需要重复入口判断。若 `gates.DONE` 已 passed → 新变更请求需重新 `/devflow start`。

---

## 角色边界

| Agent 做 | Agent 禁止 |
|---|---|
| Phase 内执行（检索/实现/验证/自检/沉淀） | 代替用户做 P0/P1/P3 确认 |
| 输出可核验证据（命令输出、diff、文件列表） | 未获确认时写入 `gateReady` / `userConfirmed` |
| 最小改动、不猜 API、不顺手优化 | 跳过入口判断直接写代码 |
| 思考流与回复用户使用中文，仅专业术语保留英文 | 对用户输出全英文或中英混杂 |

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
DevFlow 强制规则要求即使是小改动也需要走完流程以保障质量。
我会以最快速度执行：改前检索 → 最小改动 → check:type → 问你是否沉淀。
如仍要完全跳过，请回复「确认跳过」。
```

| 标记 | 触发 | Agent 最小步骤 |
|---|---|---|
| `⚠️ [AUTO-SKIP]` | 🟢 自动判定 或 🟡 默认路径 | 入口判断 → compound-engineering 轻量检索 → 改代码 → `harness:tweak` → 输出 `[TWEAK:DONE]` |
| `⚠️ [SKIPPED]` | 用户确认跳过 | 同上 |
| `⚠️ [SKIPPED-UNCONFIRMED]` | 用户坚持但未确认 | 同上 + 记录上下文 |

**TWEAK 路径与 FULL 路径的差异：** TWEAK 不加载 `project-constraints`、不加载领域 skill、不做任务拆解、不填 P0 槽位。仅做 compound-engineering 轻量检索（有结果则用，无结果跳过）。

---

## Phase 执行协议

Gate 命令由 WF-*.toml 自动执行，Agent 不手动推进 Gate。Agent 负责 Phase 内工作。

**每个 Phase 进入时 MUST 输出进度摘要 + 证据文件索引：**

```
📊 进度: ✅ Phase 0 → ✅ Phase 1 → 🔵 Phase 2 → ⏳ Phase 3 → ⏳ Phase 4
📁 证据: P0=evidence/<change>/P0.md  P1=evidence/<change>/P1.md  TASKS=evidence/<change>/TASKS.md
📋 任务: 2/4 done（读取 TASKS.md 获取最新状态）
```

### Phase 0 — 改前准备

**进入时输出标记：** `[PHASE:0] 开始改前准备`

1. 加载 `project-constraints`（同 session 已加载则跳过）
2. `compound-engineering` **必须执行改前检索**（每次需求不同，不可跳过）
3. 根据需求涉及的领域按需加载对应 skill（见路由表）。**仅加载需求中用到的**——例如用户没提到 Table/Modal 则不加载 antdv-next
4. **任务拆解**：将需求拆为可落地的具体任务，写入 `.devflow/evidence/<change>/TASKS.md`。
   - 使用 `- [ ] N.M` checkbox 格式，按依赖顺序排列
   - 用 `## N.` 二级标题分组（如 Setup / Core / Integration）
   - 每项必须包含：`files`（涉及文件）、`verify`（可验证的完成标准）、`mapsTo`（追溯到 P0 Scope/Risks 条目）
   - 拆不出来或不确定 → MUST ask 用户澄清
5. 生成 P0 证据，三个必填槽位：
   - **Scope**：涉及文件/目录 + 非目标（明确不做的事）
   - **Risks**：至少 1 条具体风险
   - **hotfix 额外**：Blast radius + Rollback note
   - **Tasks**（可选）：步骤 4 拆解的任务清单
6. **任一 Scope/Risks 槽位无法确定 → MUST ask 用户补齐**，不得留空或写"待定"
7. 展示证据给用户审阅，用户确认后继续
8. **Gate 通过时输出标记：** `[GATE:P0] ✅`

### Phase 1 — 开发

**进入时输出标记：** `[PHASE:1] 开始开发`

1. **读取 `.devflow/evidence/<change>/TASKS.md` 并逐项执行**：每完成一项将 `- [ ]` 改为 `- [x]`，进行中的加注释 `<!-- in_progress -->`。每完成一项输出 `📋 TASKS: 2/4 done`
2. 判断复杂度：≤3 文件直接开发，否则委派 `devflow-worker`
3. 最小改动、不猜 API、确认无同类封装
4. 生成 P1 证据，两个必填槽位：
   - **Changed files**：实际改动文件列表（按目录归类）。使用 `git diff --name-only` 获取准确文件列表，避免遗漏。
   - **Non-goals respected**：确认未做非目标范围内的事
   - **hotfix 额外**：Risk mitigation + Rollback: ready/NA
5. 展示证据给用户审阅，用户确认后继续
6. **Gate 通过时输出标记：** `[GATE:P1] ✅`

### Phase 2 — 验证 + 收敛 Loop

**进入时输出标记：** `[PHASE:2] 开始验证 (build → lint → typecheck)`

1. `harness:p2` 分层执行：build → lint → typecheck，首失败即停
2. 通过 → 收敛，**输出标记：** `[GATE:P2] ✅`
3. 失败 → 读 **`P2-errors.txt`**（位于 `evidence/{change}/` 下，非完整日志）→ 修正代码 → `harness:p2 --quick` 重试
4. 最多 3 轮。每轮输出：`[LOOP:2/N] 修正第 N 轮 (errors: X → Y)`
5. 错误暴增（>1.5x）→ `[REGRESSION]` → 按文件回退：`git checkout -- <file>` 仅回退出问题的文件，不动其他文件
6. 3 轮不通 → `[STUCK]` → `git checkout -- .` 丢弃 working tree 修改，通知用户
7. 自动修正成功 → **输出标记：** `[GATE:P2] ✅ ⚡auto-fixed (N rounds)`

**可修（示例）：**
- 缺失 import 语句
- TypeScript 类型标注不匹配（`string` → `number`）
- 空值访问（`x.y` 中 x 可能为 null/undefined，补 `?.` 或判空守卫）
- 未使用变量/导入

**禁止：** 修改业务逻辑分支条件、替换组件/API/库、重构函数/文件结构、删除功能代码。

**不确定的判断标准：** 以下情况直接停下，不要尝试修正——
- 错误信息看不懂
- 需要修改 ≥2 个函数的签名才能修
- 改动会影响其他模块的调用方
- 错误涉及运行时行为而非编译时类型

### Phase 3 — 收尾自检

**进入时输出标记：** `[PHASE:3] 开始收尾自检`

1. `pipeline-guard` 自检（检查 Phase 0-2 证据完整性，skill 路径: `.agents/skills/pipeline-guard/`）
2. `harness:gate-verify` 校验 P0/P1/P2 完整性
3. **用户必须确认**（已解决/未解决）。
4. **Gate 通过时输出标记：** `[GATE:P3] ✅`

### Phase 4 — 知识沉淀

**进入时输出标记：** `[PHASE:4] 开始知识沉淀`

1. 确认已解决后（P3 已确认 → 跳过二次提问）
2. 去重检查：与已有经验对比（维度：现象描述 / 技术栈 / 领域 / 根因分类 / 解法模式）。5 维中 4-5 维匹配 → 更新旧条目；2-3 维匹配 → 旧条目下补充小节；0-1 维匹配 → 新增条目
3. 同步更新 INDEX.md。**hotfix 优先沉淀 fix type，severity=high**
4. **Gate 通过时输出标记：** `[GATE:DONE] ✅`

---

## 领域 Skill 路由

涉及以下技术时 MUST 先加载对应 skill 查文档，禁止凭记忆猜测。

| 任务涉及 | 加载 skill |
|---|---|
| antdv-next 组件（Table/Modal/Form 等） | **antdv-next** |
| Vue 3 Composition API / `<script setup>` | vue-best-practices |
| Vue Router / 导航守卫 | vue-router-best-practices |
| Pinia store | pinia |
| VueUse composable | vueuse-functions |
| Vite 构建配置 | vite |
| TypeScript 高级类型 | typescript-advanced-types |
| UI 视觉审查 / 响应式 | web-design-guidelines |
| Bug 调试 / 根因分析 | systematic-debugging |

---

## 硬约束

- **最小改动**：只做任务要求的改动，禁止顺手优化、顺手重构
- **不猜 API**：不确定的用法先查 skill 文档
- **不复刻轮子**：先搜项目内已有封装
- **证据优先**：聊天输出 ≤6 行摘要，长日志/长 diff 写本地证据文件
- **退出机制**：API 不确定、连续 3 次编辑失败 → 停止，问用户

## 故障恢复速查

| 症状 | 处理 |
|---|---|
| 直接写代码没声明标记 | ⛔ 回退 → 先做入口判断并输出标记 |
| typecheck exit≠0 声称通过 | ⛔ 回退 → 逐条确认错误来源 |
| 跳过路径未跑 check:type | ⛔ 跳过也必须跑 |
| 状态文件脏了 | `pnpm -s run harness:gate-reset -- --type full` |
| 改坏了想回退 | `git checkout -- <file>` 按文件回退；`git checkout -- .` 全量丢弃 |

## 跨会话恢复

SessionStart 时 MUST 自主读取 `.devflow/harness/state.json` 检查是否有活跃流程。

若 `state.json` 存在活跃流程（`taskType` 为 full/mandatory/hotfix 且 `gates.DONE` 未 passed）：
1. 输出恢复提示："📊 检测到未完成的 DevFlow 流程 [{change}]，当前 Phase {N}。是否继续？"
2. 用户确认后直接恢复到对应 Phase，**不需要重新 `/devflow start`**
3. 若用户选择放弃当前流程，执行 `harness:gate-reset` 清理状态

若 `state.json` 不存在或无活跃流程：正常响应，收到代码变更请求时执行入口判断。
