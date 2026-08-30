# 工作流体系 v4.0

> **适用对象：** 第一次接触这套工作流的团队成员。15~20 分钟读完。
> **想了解 Phase 详细协议？** → [附录 A](#附录-a-各-phase-详细协议) · 完整规范见 [AGENTS.md](./AGENTS.md) · [REASONIX.md](./REASONIX.md)

---

## 1. 你有过这种体验吗？

| 没有工作流的时候 | 有了之后 |
|---|---|
| 让 AI 改个字段，它顺手重构了整个文件 | P0 计划没通过前，**物理上无法编辑** |
| 改完"看起来对"，上线报 type error | build + format + lint + typecheck 自动跑，由独立 verifier 分析错误 |
| 上次踩的坑，这次换个说法又问一遍 | 每次改完主动问你是否沉淀，确认后去重写入经验库 |
| 关了会话再打开，AI 什么都忘了 | 自动恢复，从上次断点继续 |

**一句话：让 AI 写代码从"坐过山车"变成"坐高铁"——又快又稳。**

---

## 2. 跟我走一遍

下面花 5 分钟，用一个真实例子看完整个流程。

### 🎬 场景：给订单列表加导出 Excel 功能

```
🧑 你：  "给订单列表加导出Excel功能"

🤖 Agent：判断为复杂需求 → 自动走完整流程

   ═══════ 第 1 步 · 出计划 ═══════
   加载经验库 → 分析你项目里订单列表的代码
   → 拆成 3 个任务：
      ① 加导出 API  ② 加前端按钮  ③ 接数据流
   → 评估风险：大数据量可能 OOM
   → 生成计划书，展示给你看

🧑 你：  看完计划，觉得 ok → 点确认               ← 第 1 次确认

   ═══════ 第 2 步 · 写代码 ═══════
   按任务清单逐个实现
   每步自检：能用项目里已有的就不引入新库
   → 改完 3 个文件 → 贴出 diff 给你看

🧑 你：  检查改动，没问题 → 点确认                 ← 第 2 次确认

   ═══════ 第 3 步 · 自动验证 ═══════
   自动跑 build → format → lint → typecheck
   → format 自动修好缩进和引号风格
   → typecheck 报错：少了个 import
   → 独立 verifier 分析 → 输出「缺 import，可直接补」
   → 主 Agent 按方案补上 → 重跑 → ✅ 通过

🧑 你：  （不用操作，喝茶等着）

   ═══════ 第 4 步 · 收尾检查 ═══════
   完整性校验 → 展示改动清单：
   "改了 3 个文件，计划全部完成，验证全部通过"

🧑 你：  最后扫一眼 → 点确认                       ← 第 3 次确认

   ═══════ 第 5 步 · 经验沉淀 ═══════
   Agent："这次改动涉及大数据量导出 OOM 风险的应对，
           值得沉淀。要写入经验库吗？"
   → 总结值得沉淀的点 + 给出推荐理由

🧑 你：  觉得有道理 → 点确认                       ← 第 4 次确认
   → Agent 自动去重 → 写入经验库
```

### 总结

| | 你要做什么 | Agent 替你做什么 | 保护机制 |
|---|---|---|---|
| 第 1 步 出计划 | 确认计划 | 检索经验 + 拆任务 + 评估风险 | 🔒 计划不过，代码改不了 |
| 第 2 步 写代码 | 确认改动 | 最小改动，Ponytail 自检 | ✅ 任务不全做完不让过 |
| 第 3 步 验证 | **不用管** | 自动 format + 独立 verifier 分析 + 主 Agent 执行修正 | ✅ 不通过不让过 |
| 第 4 步 检查 | 最终确认 | 完整性校验 | 🛡️ 证据不全不让过 |
| 第 5 步 沉淀 | 确认是否沉淀 | 总结沉淀点 + 推荐理由，由你决定 | 💡 不沉淀也能过，你来决定 |

**全程 4 次确认 + Agent 干所有脏活累活。大约 2 分钟。**

---

## 3. 你需要知道的 3 个机制

### 3.1 分级 — 什么走流程，什么直接改

| 你说的话 | Agent 判断 | 走的路径 | 你确认几次 |
|---|---|---|---|
| "按钮颜色改成蓝色" | 🟢 微小：只改 CSS，1-2 行 | **TWEAK** 快速改 + 验证 | 1 次（沉淀确认） |
| "给表格加个排序" | 🟡 一般：单组件内，几行 | **TWEAK** 快速改 + 验证 | 1 次（沉淀确认） |
| "加导出 Excel 功能" | 🔴 复杂：跨文件、新功能 | **FULL** 走完整流程 | 4 次 |
| "线上挂了赶紧修" | 🔥 紧急关键词 | 先问你是不是走 **HOTFIX** | 4 次 |

> **一句话：改样式改文案，Agent 快速改完、验证通过、问你一声是否沉淀。加功能、改架构、动 API——走完整流程。**

### 3.2 阻断 — 怎么保证 Agent 不乱改

想象一个门禁系统：

```
刷门禁卡（P0 计划通过）
  → 才能进门改代码（P1 开发）
    → 出来过安检（P2 验证）
      → 签字确认（P3）
        → 归档（P4 沉淀）
```

"刷卡"是**物理拦截**——P0 没通过时，Agent 调编辑工具会被系统直接拒绝。不是"建议别改"，是**根本改不了**。

那改一行 CSS 也要走门禁吗？不用——微小改动自动放行（TWEAK 跳过 P0-P3），但验证（check:type）和沉淀询问一个不少。

### 3.3 自修 — 跑不过怎么办

第 3 步验证（build → format → lint → typecheck）是自动跑的。format 会自动修复格式问题。如果还没通过：

1. 独立的 **`p2-verifier`** 子 Agent 分析错误（只读，不做修改）
2. verifier 输出修正方案：哪些可自动修、哪些需你来判断
3. 主 Agent 按方案逐一修正 → 重跑
4. 最多试 **3 轮**

- **能自动修：** 缺 import、类型标错、空值没判、变量没用
- **不会自动修：** 改业务逻辑、换 API、重构结构 → verifier 直接标记"需人工"，停下来通知你
- **越修越坏：** 错误猛增 → 自动回退到改动前
- **3 轮还不行：** 放弃，通知你来处理

---

## 4. 上手

```bash
# 1. 在 Reasonix 里信任 hooks（只做一次）
/hooks trust

# 2. 重启 Reasonix 桌面端

# 3. 验证一下
node workflow/hooks/verify.cjs
```

好了。之后正常提需求就行，Agent 自动判断该走哪条路。

---

## 5. 常见问题

**Q1：Agent 怎么知道改什么不该改什么？**
第 1 步会先分析项目代码（检索经验库 + 分析调用链），出计划给你确认。你不同意它就改方向。

**Q2：第 3 步修不好怎么办？**
format 先自动修格式，剩余的失败由独立 `p2-verifier` 分析出方案，主 Agent 执行修正。最多 3 轮，越修越坏自动回退，3 轮不通通知你来处理。

**Q3：会话关了再打开，还记得在哪吗？**
会。状态存着，重新打开自动恢复到上次的步骤。

**Q4：微小改动走 TWEAK 有底线吗？**
有——check:type 必须过。不管改动多小，类型检查不能挂。另外也会问你"是否沉淀经验"。

**Q5：hooks 配置后不生效？**
重启 Reasonix 桌面端（`/new` 快捷键不够）。项目 hooks 需执行 `/hooks trust`。

**Q6：想跳过流程直接改怎么办？**
Agent 会提醒你"即便小改动也应走流程"，用最快速度跑完最小步骤。如果你坚持，回复「确认跳过」。

**Q7：所有改动完成后都会问我要不要沉淀？**
是的。三种工作流（FULL/HOTFIX/TWEAK）完成后，Agent 都会主动总结值得沉淀的点并给出推荐理由，由你决定是否写入经验库。

**Q8：需要装什么依赖吗？**
不需要。整个工作流是纯 Node.js（harness.mjs）+ Reasonix hooks（.cjs 脚本），零外部依赖。

---

## 6. 命令速查

| 干什么 | 怎么敲 |
|---|---|
| 启动工作流 | 直接向 Agent 提需求即可，Agent 自动判断走哪条路 |
| 看当前状态 | `cat workflow/harness/state.json` |
| 卡住了想重置 | `pnpm -s run harness:gate-reset -- --type full` |
| 验证 hooks 是否正常 | `node workflow/hooks/verify.cjs` |
| 手动 typecheck | `pnpm -s run check:type` |
| 手动 format | `pnpm -s run format` |
| 撤回某个文件 | `git checkout -- <文件名>` |

---

## 附录 A. 各 Phase 详细协议

以下为 **FULL 流程** 的 5 个 Phase。HOTFIX 在此基础上追加 Blast radius + Rollback plan。TWEAK 跳过 P0-P3，仅保留 check:type + 沉淀询问。

### Phase 0 — 改前准备

1. 加载项目约束 → 检索经验库 → 按需加载领域 skill（如 antdv-next、pinia）
2. 任务拆解为可执行的 checklist
3. 输出：**Scope**（改什么 + 不碰什么）+ **Risks**（至少 1 条风险）
4. **输出「改动清单简要」到对话框**：逐文件列出 `` `路径` — 改动点 `` + 非目标一行，让你不打开文件即可审阅改动范围
5. 你确认后才能开始改代码

**Gate：** Scope 和 Risks 不能有占位符或空值，至少一条具体风险。

### Phase 1 — 开发

1. 按任务清单逐项实现，每步 Ponytail 决策自检
2. 只改需要改的，不动无关代码
3. 改完用 `git diff --name-only` 列出实际改动的文件

**Gate：** 所有任务必须标记为 `[x]`（已完成）或 `[-]`（YAGNI 跳过），禁止残留 `[ ]`（未完成）任务。

### Phase 2 — 验证 ⭐

1. 依次跑 build → format → lint → typecheck
2. 失败 → **委派独立的 `p2-verifier` 子 Agent** 分析错误（只读），输出修正方案
3. 主 Agent 按方案逐一修正 → 重跑，最多 3 轮
4. verifier 标记为"需人工介入"的 → 停止，通知你

| 能自动修 | 不会自动修 |
|---|---|
| import 缺失 | 改业务逻辑 |
| 类型不匹配 | 换 API / 换组件 |
| 空值访问 | 重构函数结构 |
| 未用变量 | 运行时行为问题 |

**Gate：** build + format + lint + typecheck 全部 exit=0。失败时由独立 verifier 分析，主 Agent 执行修正，最多 3 轮。

### Phase 3 — 收尾自检

完整性校验 → 展示改动清单 → 你最终确认。

**Gate：** pipeline-guard 自检通过 + gate-verify（P0/P1/P2 全部完成）+ 用户确认。

### Phase 4 — 经验沉淀 🔴

**所有工作流统一策略：强制询问。**

1. Agent 总结本次改动中值得沉淀的点，给出推荐理由
2. 等待你明确确认：
   - ✅ "是" → 执行 5 维去重检查，写入或更新经验库
   - ❌ "不" → `status: skipped`，正常通过，不影响流程
3. **禁止** Agent 未经你确认自行决定跳过

**Gate：** 用户确认是否沉淀 + 证据完整。

> TWEAK 和 HOTFIX 同样执行此策略，无一例外。

---

## 附录 B. 三种工作流对比

| | FULL | HOTFIX | TWEAK |
|---|---|---|---|
| **适用** | 新功能、重构、跨模块 | 紧急 bug 修复 | 样式、文案、简单修复 |
| **Phase 0** | ✅ Scope + Risks | ✅ + Blast radius + Rollback | ❌ 跳过 |
| **Phase 1** | ✅ 逐任务实现 | ✅ + Risk mitigation | ❌ 跳过（直接改） |
| **Phase 2** | ✅ build+format+lint+typecheck + p2-verifier | ✅ 同 FULL | ❌ 跳过（仅 check:type） |
| **Phase 3** | ✅ 完整性校验 | ✅ + 验证 Rollback plan | ❌ 跳过 |
| **Phase 4** | 🔴 询问 | 🔴 询问 | 🔴 询问 |
| **确认次数** | 4 次 | 4 次 | 1 次（沉淀确认） |

---

## 附录 C. 关键文件地图

```
workflow/
├── evidence/
│   └── <change>/           ← 每次改动的证据目录（P0~P4.md、TASKS.md 等）
├── harness/
│   └── state.json           ← 流程状态中枢：taskType / gates / change
│                                ❌ 自动维护；卡住时 pnpm -s run harness:gate-reset 重置
├── hooks/                   ← 6 个运行时拦截脚本（gate-guard / prompt-check 等）
│   │                            + 共享 lib.cjs + 验证脚本 verify.cjs
│   │                            ❌ 配好不动；node workflow/hooks/verify.cjs 验证是否正常
│   ├── session-init.cjs
│   ├── prompt-check.cjs
│   ├── gate-guard.cjs
│   ├── evidence-collector.cjs
│   ├── compact-guard.cjs
│   └── session-end.cjs

.reasonix/
├── settings.json            ← Hook 事件绑定配置
│                                ⚠️ 首次需 /hooks trust；修改后必须重启桌面端
└── skills/                  ← 项目级 skill 库，git 管理
                                 📌 task-worker — 子 Agent 执行器（Phase 1 复杂任务委派）
                                 📌 p2-verifier — Phase 2 独立只读分析子 Agent
                                 📌 workflow — /workflow 斜杠命令（→ harness:start）
scripts/
└── harness.mjs              ← Gate 状态机（零外部依赖）
```

---

## 附录 D. 参考

### Ponytail 决策阶梯

Phase 1 开发阶段的决策方法论借鉴了 [Ponytail](https://github.com/DietrichGebert/ponytail)（65k+ stars）"Lazy Senior Developer"理念：**从最简方案开始，命中即停。** 通过 `ponytail-ladder` skill 加载到 Agent 上下文，每次写代码前强制执行。

**7 级决策（从上到下，命中即停）：**

```
① 这真的需要吗？       → 不必要则跳过（YAGNI）
② JS 标准库有吗？      → Date / URL / Intl / Array.from ...
③ 浏览器原生有吗？     → <input type="date"> / <dialog> / URLSearchParams ...
④ 已安装依赖有吗？     → lodash / dayjs / echarts（确认在 package.json）
⑤ 项目内已有封装？     → useDebounce / use-table-query / vue-modal-provider
⑥ 能一行搞定？         → 直接写，不做 wrapper / class / 新文件
⑦ 以上都不行           → 最小可行实现，禁止预先抽象
```

**示例：给搜索框加防抖**

```
① 需要吗？→ 是  ② stdlib？→ 无 debounce  ③ 浏览器？→ 无
④ lodash 有 debounce  ⑤ 项目内？→ ✅ useDebounce 已存在
→ 阶梯⑤命中！直接用，不引入新依赖。
```

**安全底线（不可裁减）：** 输入校验、错误处理、安全防护、无障碍绝不因简化而省略。

---

> **文档版本：** v4.0 · 最后更新：2026-07-08
> **变更说明：** 目录 `workflow/` 全面重命名（目录、hooks 路径、settings.json、全部文档引用）；skills 精简 28→18；去除所有 devflow 残留描述。
