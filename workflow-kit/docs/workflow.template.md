# 工作流体系（workflow-kit 模板）

> **适用对象：** 第一次接触这套工作流的团队成员。15~20 分钟读完。
> **完整规范见 [AGENTS.md](./AGENTS.md) · 运行时配置见 [workflow.config.json](./workflow.config.json)**

---

## 1. 这套工作流解决什么问题

| 没有工作流的时候 | 有了之后 |
|---|---|
| 让 AI 改个字段，它顺手重构了整个文件 | P0 计划没通过前，**物理上无法编辑**（hooks 模式） |
| 改完"看起来对"，上线报 type error | build + format + lint + typecheck 自动跑，由独立 verifier 分析错误 |
| 上次踩的坑，这次换个说法又问一遍 | 每次改完主动问你是否沉淀，确认后去重写入经验库 |
| 关了会话再打开，AI 什么都忘了 | 自动恢复，从上次断点继续 |

**一句话：让 AI 写代码从"坐过山车"变成"坐高铁"——又快又稳。**

## 2. 三个核心机制

### 2.1 分级 — 什么走流程，什么直接改

| 你说的话 | Agent 判断 | 走的路径 | 你确认几次 |
|---|---|---|---|
| "按钮颜色改成蓝色" | 🟢 微小：只改 CSS，1-2 行 | **TWEAK** 快速改 + 验证 | 1 次（沉淀确认） |
| "给表格加个排序" | 🟡 一般：单组件内，几行 | **TWEAK** 快速改 + 验证 | 1 次（沉淀确认） |
| "加导出 Excel 功能" | 🔴 复杂：跨文件、新功能 | **FULL** 走完整流程 | 4 次 |
| "线上挂了赶紧修" | 🔥 紧急关键词 | 先问你是不是走 **HOTFIX** | 4 次 |

> **一句话：改样式改文案，Agent 快速改完、验证通过、问你一声是否沉淀。加功能、改架构、动 API——走完整流程。**

### 2.2 阻断 — 怎么保证 Agent 不乱改

```
刷门禁卡（P0 计划通过）
  → 才能进门改代码（P1 开发）
    → 出来过安检（P2 验证）
      → 签字确认（P3）
        → 归档（P4 沉淀）
```

在支持 hooks 的宿主（如 Reasonix）上，"刷卡"是**物理拦截**——P0 没通过时，Agent 调编辑工具会被系统直接拒绝。
在不支持 hooks 的宿主上，降级为 **AGENTS.md 纪律模式**：入口判断 → 输出标记 → 自觉执行，拦截靠 Agent 遵守。
微小改动自动放行（TWEAK 跳过 P0-P3），但验证（{{TWEAK_SCRIPT}}）和沉淀询问一个不少。

### 2.3 自修 — 跑不过怎么办

1. 独立的 **`p2-verifier`** 子 Agent 分析错误（只读，不做修改）
2. verifier 输出修正方案：哪些可自动修、哪些需你来判断
3. 主 Agent 按方案逐一修正 → 重跑
4. 最多试 **3 轮**（`maxConvergenceRounds` 可配）

- **能自动修：** 缺 import、类型标错、空值没判、变量没用
- **不会自动修：** 改业务逻辑、换 API、重构结构 → verifier 直接标记"需人工"，停下来通知你
- **越修越坏：** 错误猛增 → 自动回退到改动前
- **3 轮还不行：** 放弃，通知你来处理

## 3. 上手（安装器已完成时）

```bash
# 1. 在宿主里信任 hooks（只做一次；不支持 hooks 的宿主跳过）
/hooks trust

# 2. 重启宿主桌面端

# 3. 验证一下
node workflow/hooks/verify.cjs
```

之后正常提需求就行，Agent 自动判断该走哪条路。

## 4. 常见问题

**Q1：Agent 怎么知道改什么不该改什么？**
第 1 步会先分析项目代码（检索经验库 + 分析调用链），出计划给你确认。你不同意它就改方向。

**Q2：第 3 步修不好怎么办？**
format 先自动修格式，剩余的失败由独立 `p2-verifier` 分析出方案，主 Agent 执行修正。最多 3 轮，越修越坏自动回退，3 轮不通通知你来处理。

**Q3：会话关了再打开，还记得在哪吗？**
会。状态存在 `{{STATE_FILE}}`，重新打开自动恢复到上次的步骤。

**Q4：微小改动走 TWEAK 有底线吗？**
有——{{TWEAK_SCRIPT}} 必须过。不管改动多小，类型检查不能挂。另外也会问你"是否沉淀经验"。

**Q5：hooks 配置后不生效？**
重启宿主桌面端（`/new` 快捷键不够）。项目 hooks 需执行 `/hooks trust`。

**Q6：想跳过流程直接改怎么办？**
Agent 会提醒你"即便小改动也应走流程"，用最快速度跑完最小步骤。如果你坚持，回复「确认跳过」。

**Q7：所有改动完成后都会问我要不要沉淀？**
是的。三种工作流（FULL/HOTFIX/TWEAK）完成后，Agent 都会主动总结值得沉淀的点并给出推荐理由，由你决定是否写入经验库。

**Q8：需要装什么依赖吗？**
不需要。整个工作流是纯 Node.js（harness.mjs）+ 宿主 hooks（.cjs 脚本），零外部依赖。

## 5. 命令速查

| 干什么 | 怎么敲 |
|---|---|
| 启动工作流 | 直接向 Agent 提需求即可，Agent 自动判断走哪条路 |
| 看当前状态 | `cat {{STATE_FILE}}` |
| 卡住了想重置 | `{{PM}} -s run harness:gate-reset -- --type full` |
| 验证 hooks 是否正常 | `node workflow/hooks/verify.cjs` |
| 手动类型检查 | `{{PM}} -s run {{TWEAK_SCRIPT}}` |
| 撤回某个文件 | `git checkout -- <文件名>` |

## 附录 A. 各 Phase 详细协议

以下为 **FULL 流程** 的 5 个 Phase。HOTFIX 在此基础上追加 Blast radius + Rollback plan。TWEAK 跳过 P0-P3，仅保留验证 + 沉淀询问。

### Phase 0 — 改前准备

1. 加载项目约束 → 检索经验库 → 按需加载领域 skill
2. 任务拆解为可执行的 checklist
3. 输出：**Scope**（改什么 + 不碰什么）+ **Risks**（至少 1 条风险）
4. 你确认后才能开始改代码

**Gate：** Scope 和 Risks 不能有占位符或空值，至少一条具体风险。

### Phase 1 — 开发

1. 按任务清单逐项实现，每步 Ponytail 决策自检
2. 只改需要改的，不动无关代码
3. 改完用 `git diff --name-only` 列出实际改动的文件

**Gate：** 所有任务必须标记为 `[x]`（已完成）或 `[-]`（YAGNI 跳过），禁止残留 `[ ]`（未完成）任务。

### Phase 2 — 验证 ⭐

1. 依次跑验证命令（`workflow.config.json` 中配置）
2. 失败 → **委派独立的 `p2-verifier` 子 Agent** 分析错误（只读），输出修正方案
3. 主 Agent 按方案逐一修正 → 重跑，最多 3 轮
4. verifier 标记为"需人工介入"的 → 停止，通知你

**Gate：** 全部验证命令 exit=0。失败时由独立 verifier 分析，主 Agent 执行修正，最多 3 轮。

### Phase 3 — 收尾自检

完整性校验 → 展示改动清单 → 你最终确认。

**Gate：** pipeline-guard 自检通过 + gate-verify（P0/P1/P2 全部完成）+ 用户确认。

### Phase 4 — 经验沉淀 🔴

**所有工作流统一策略：强制询问。**

1. Agent 总结本次改动中值得沉淀的点，给出推荐理由
2. 等待你明确确认：
   - ✅ "是" → 执行去重检查，写入或更新经验库
   - ❌ "不" → `status: skipped`，正常通过，不影响流程
3. **禁止** Agent 未经你确认自行决定跳过

**Gate：** 用户确认是否沉淀 + 证据完整。

## 附录 B. 关键文件地图

```
workflow/                    ← 安装器生成（目录名可在 workflow.config.json 调整）
├── evidence/<change>/       ← 每次改动的证据目录（P0~P4.md、TASKS.md 等）
├── harness/state.json       ← 流程状态中枢：taskType / gates / change
└── hooks/                   ← 运行时拦截脚本（gate-guard / prompt-check 等）
scripts/harness.mjs          ← Gate 状态机（零外部依赖）
workflow.config.json         ← 项目适配层：验证命令 / 路径 / 语言 / 文案
{{SKILLS_DIR}}/              ← skill 库（通用 + 项目自定义）
```

## 附录 C. 决策阶梯（Ponytail）

Phase 1 开发阶段的决策方法论借鉴了 [Ponytail](https://github.com/DietrichGebert/ponytail) 的"Lazy Senior Developer"理念：**从最简方案开始，命中即停。**

```
① 这真的需要吗？       → 不必要则跳过（YAGNI）
② JS 标准库有吗？      → Date / URL / Intl / Array.from ...
③ 浏览器原生有吗？     → <input type="date"> / <dialog> / URLSearchParams ...
④ 已安装依赖有吗？     → 确认在 package.json
⑤ 项目内已有封装？     → 既有组件 / hooks / 工具
⑥ 能一行搞定？         → 直接写，不做 wrapper / class / 新文件
⑦ 以上都不行           → 最小可行实现，禁止预先抽象
```

**安全底线（不可裁减）：** 输入校验、错误处理、安全防护、无障碍绝不因简化而省略。
