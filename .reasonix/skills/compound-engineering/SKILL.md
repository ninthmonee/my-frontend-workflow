---
name: "compound-engineering"
description: "MUST invoke for every task involving code/config changes. Run before changes (Phase 0) and after user confirms (Phase 4). The Phase 3 skip-redundant-question logic applies only within the same workflow — do NOT carry over Phase 3 confirmation from a prior workflow in the same session."
---

# 复利工程（Compound Engineering）

## 语言要求（必须遵守）
- 所有回复必须使用中文（包括说明、总结、交付提示；代码本身按项目约定使用中英文皆可）

## 触发条件（用于调度，必须遵守）
当用户请求满足以下任一条件时，必须调用本 Skill（不需要用户显式要求）：
- 修改/新增/删除项目代码文件（如 `apps/`、`packages/`、`internal/` 下的 `.vue/.ts/.tsx/.scss/.json/.yaml` 等）
- 调整会影响业务运行的构建、依赖或项目配置（如 `package.json`、Vite 配置、tsconfig 等）
- 修复业务 Bug、重构业务实现、性能优化、结构拆分、样式调整

以下任务默认不触发本 Skill：
- 对话问答、纯分析、纯 review、概念解释
- 文档阅读、文档总结、纯文档修改
- `workflow/`、仓库流程脚本、仓库规则文档改动
- 其他不涉及项目代码改动/生成的工作

## 何时调用（强制执行的"前后钩子"）
1. **改前**（Phase 0）：准备修改项目代码/配置之前 —— 必须先调用一次，执行「改前检索」流程
2. **改后**（Phase 4，收尾自检通过且用户确认改动后）：项目代码修改完成、验证通过且收尾自检（pipeline-guard）确认 + 用户确认改动无误后 —— 必须再调用一次，执行「沉淀」流程
3. 用户通过 question 工具选择"已解决"后：必须把本次经验沉淀到本目录
4. 用户选择"未解决"或选择"跳过沉淀"：不得沉淀为"已解决方案"，必须通过 question 工具记录问题原因，写入"排查中/待验证"

---

## 改前检索流程（改前必须执行）

每次修改前，必须按以下步骤检索已有知识，**并将检索摘要输出给用户**：

### 步骤 1 — 提取关键词
从当前任务描述中提取 2~5 个关键词/技术标签，例如：
- 涉及组件 → 组件名：`Select`, `DatePicker`, `Card`, `Table`, `Drawer`, `Modal`
- 涉及库 → 库名：`antdv-next`, `echarts`, `vue-router`, `vite`, `pnpm`
- 涉及概念 → 主题：`scoped`, `defineModel`, `virtual-scroll`, `enum`, `micro-app`

### 步骤 2 — 全库搜索
在 `references/experiences/*.md` 中按关键词搜索匹配条目。搜索策略：
1. 优先搜索 `tags` 行是否包含关键词
2. 其次搜索 `meta` 字段是否匹配（如 `tech=vue3`、`domain=table`）
3. 最后搜索标题/内容是否包含关键词

**overlap 检测**（命中多条时）：
从以下 5 个维度评估新经验与旧条目的关联度：
| 维度 | 说明 |
|---|---|
| 问题描述 | 现象/错误信息是否一致 |
| 根因 | 根因分析是否相同 |
| 解法 | 解决方案是否相似 |
| 涉及文件/组件 | 改动范围是否重叠 |
| 预防方式 | 预防策略是否一致 |

关联度评分：
- **高**（4-5 维度匹配）→ 已有经验覆盖，按通用规范执行
- **中**（2-3 维度匹配）→ 同一领域不同角度，参考已有同时关注差异
- **低**（0-1 维度匹配）→ 不同问题，正常执行


### 步骤 3 — 输出检索摘要（强制输出）
将匹配结果格式化为以下摘要，**在开始改代码前**告诉用户：

```
🔍 改前检索摘要
────────────────────────
关键词：<关键词1>, <关键词2>, <关键词3>
命中条目：<N> 条
────────────────────────
• <条目1> → <链接>
• <条目2> → <链接>
────────────────────────
改前提醒：重点关注 <条目1> 中的 <xxx> 坑位
```

- 命中 0 条：写"未找到直接相关条目，按通用规范执行"
- 命中 >=1 条：输出链接并给出阅读理解后的关键坑位提醒


### 步骤 4 — 结构化搜索命令（直接执行）

将关键词转化为以下 grep 命令，在 `references/experiences/*.md` 中精确过滤：

```bash
# 示例：搜索 vue3 + table + high 严重度的条目
grep -B1 'tech=vue3.*domain=table.*severity=high' references/experiences/*.md

# 搜索任意 tech + 特定 domain
grep 'domain=chart' references/experiences/*.md

# 搜索包含特定 tags 的条目
grep 'tags.*virtual-scroll' references/experiences/*.md

# 搜索指定 severity 的所有条目
grep 'severity=high' references/experiences/*.md

# 搜索未经验证（无 validated）的条目
grep -L 'validated=' references/experiences/*.md 2>/dev/null || echo "全都有 validated"
```

> **提示**：优先用 `tech + domain + severity` 组合过滤，命中更精准。

---

## 核心目标
- 把"踩坑经验"沉淀到本目录，形成可检索、可复用、可迁移的知识资产
- 所有经验按 domain 拆分为独立文件存放在 `references/experiences/` 下，通过 `meta` 和 `tags` 字段实现跨框架/跨领域检索
- 只沉淀与代码直接相关的经验（模式/修复/API 参考），不沉淀文档规范类内容

## 输出要求（必须遵守）
- 每条经验必须可复现：包含问题现象、根因、解决方案、验证方式
- 必须给出至少一段可运行的示例代码（或最小复现片段）
- 每条经验必须包含完整的 `meta` 和 `tags` 字段

## 分类与文件约定

本目录维护以下文件：
- `references/experiences.md`：汇总入口，按 domain 链接到拆分文件
- `references/experiences/`：按 domain 拆分的独立经验文件（table.md, form.md, ...）
- `references/INDEX.md`：搜索索引，按 meta 字段（tech/domain/severity）和 tags 组织，包含文件路径映射
- `references/_TEMPLATE.md`：条目模板

## 条目格式规则（必须遵守）

### 标准模板

```md
## <标题>

> **meta** `type=pattern|fix|ref` `tech=vue3|react|general` `domain=<领域>` `severity=high|medium|low` `validated=yyyy-mm-dd` `version=<技术@版本>`
> **tags** `<tag1>, <tag2>, <tag3>`

<精简内容，聚焦代码>

```ts
// 可运行示例代码
```
```

### meta 字段说明

| 字段 | 可选值 | 说明 |
|---|---|---|
| `type` | `pattern` / `fix` / `ref` | 最佳实践 / 排查修复 / API 参考 |
| `tech` | `vue3` / `react` / `node` / `java` / `general` | 技术栈（按需扩展，不限上述） |
| `domain` | `table` / `chart` / `modal` / `form` / `api` / `css` / `enum` / `build` / `file` / `state` / `micro-frontend` / `theme` | 领域（按需扩展） |
| `severity` | `high` / `medium` / `low` | 重要程度 |
| `validated` | `yyyy-mm-dd` | 最后验证日期 |
| `version` | `<技术>@<版本>` | 验证时的版本号（可选） |

### tags 要求
- 用逗号分隔
- 必须包含入口关键词（如 `table`, `echarts`, `modal` 等），也可以包含实现细节词（如 `defineModel`, `virtual-scroll`）
- 建议参考 INDEX.md 中的常用搜索词

### 沉淀原则
- **只沉淀代码类经验**：模式（pattern）、排查修复（fix）、API 参考（ref）
- **不沉淀文档规范**：如 "如何写 README"、"commit message 格式" 等不收录
- **跨框架兼容**：通过 `tech` 字段区分框架（vue3 / react / node / java / general），新增框架时直接填入即可，无需修改分类结构
- **后端兼容**：`tech` 取 `node` / `java`，`domain` 取 `api` / `build` 等即可

---

## 执行流程（每次任务结束必须做）

### 改后沉淀流程

> **前置判断（仅限同一工作流内）**：若 Pipeline Phase 3（pipeline-guard）中用户已确认「已解决」，则 **跳过步骤 3（二次提问）**，直接进入步骤 6 去重检查 + 写入。此时步骤 3 的 question 调用改为：直接询问「需要沉淀这条经验？」（选项：需要沉淀 / 跳过），不重复询问是否已解决。**禁止**将上一轮工作流的 Phase 3 确认结论用于本轮。

1. 跑验证：至少 typecheck；如有 lint/tests 也一并跑（以项目约定为准）
2. 若验证失败：停止沉淀流程，修复问题后重新从步骤 1 开始
3. 检测是否触发「自动触发识别」信号（用户已说出"已修复"等确认词）：
   - 有信号 → 直接调用 question 工具：「看起来问题已解决，是否需要沉淀这条经验？」（选项：需要沉淀 / 跳过）
   - 无信号 → 调用 question 工具：「本次修改是否已成功解决你的问题？」（选项：已解决 / 未解决）
4. 若用户选择「需要沉淀」或「已解决」：开始沉淀
5. 若用户选择「跳过」或「未解决」：调用 question 工具记录问题原因（问题：请描述遇到的问题或未解决的原因，以便后续排查 / 选项：功能异常、样式问题、交互问题、其他（可自行输入）），将记录写入对应 domain 的排查中条目，不得标记为已解决方案
6. **去重检查 + overlap 合并**：在写入前，按 5 维度（问题描述/根因/解法/涉及文件/预防方式）评估与已有条目的关联度：

   | 关联度 | 操作 |
   |--------|------|
   | **高**（4-5 维度匹配） | **更新已有条目**：在旧条目末尾追加新场景/新解法，更新 validated 日期，不新建条目 |
   | **中**（2-3 维度匹配） | **补充**：在原有条目末尾添加同领域子节，标注差异点 |
   | **低**（0-1 维度匹配） | **新增**：同时检查旧条目是否需标记可能过期 |

   当更新已有条目时：保留 frontmatter 结构，更新内容与代码示例。
   添加 `last_updated: YYYY-MM-DD`，不改标题除非问题框架已实质变化。

7. 写入前检查 tags 是否在 INDEX.md 受控词表中；若使用新 tag，必须同步追加到受控词表
8. 写入对应 domain 的 `references/experiences/*.md`（遵循条目格式规则，包含完整 `meta` 和 `tags` 字段）
9. 写入后必须同步更新 `INDEX.md`：
   - 新增 domain 文件 → 在「按领域」表中追加一行
   - 新增 tag → 在「Tags 受控词表」中追加对应条目

### 条目老化与主动刷新
- 写入时记录 `validated_at: <日期> @ <版本>`
- 当项目中主要依赖版本（vue/antdv-next/vite）发生 major 升级后，版本戳对应的条目应标记为"待复审"
- 复审确认仍有效后，更新版本戳；确认已过时则移入"archive"注释块
- **主动刷新触发**：当本次沉淀的新经验与某条旧条目在根因或解法维度上直接矛盾时，自动输出提示：
  ```
  ⚠ 发现矛盾条目：<旧条目标题>
  新经验的根因/解法与旧条目不一致。
  建议：1. 复审 <旧条目链接> 是否已过时
       2. 若确认过时，在旧条目上加注 [deprecated: <新条目链接>]
  ```

---

## 改前检索 + 改后沉淀 — 完整流程模板

- 任何涉及项目代码/配置变更的任务：
  1. **改前**（Phase 0）：执行本 SKILL → 输出「改前检索摘要」→ 阅读理解命中条目
  2. **改中**（Phase 1）：按检索到的坑位规避已知问题
  3. **验证**（Phase 2）：执行 check:type + 编译构建验证
  4. **收尾自检**（Phase 3）：执行 skill("pipeline-guard") → 用户确认改动正确
  5. **改后沉淀**（Phase 4）：
     - **前置判断**：若 Phase 3 已确认「已解决」→ 跳过二次提问，直接执行步骤 6 去重检查 + 写入
     - **未确认** → 调用 question 工具询问用户「本次修改是否已成功解决你的问题？」（选项：已解决 / 未解决）
  6. 若用户选择"已解决"或 Phase 3 已确认 → 去重检查 → 按模板写入对应 `experiences/*.md`（含完整 `meta` + `tags`）→ 更新 `INDEX.md`
  7. 若用户选择"未解决" → 调用 question 工具记录问题原因 → 写入排查中条目

## 询问方式（必须使用 question 工具，不得输出文本提问）

---
description: 当助手已完成当前请求的工作、准备结束回复或不再有明确下一步可执行内容时，必须先调用提问工具 question 获取进一步指示；不得直接结束对话。 / When the assistant has completed the current task and is about to end the reply or has no clear next action, it must call the question tool to obtain further instructions instead of ending the conversation.
applyTo: '当检测到回复将以收尾语句结束或无后续动作时 / When a reply is about to end with a closing statement or has no follow-up action'
---

当你完成工作时，请调用 `question` 工具弹出对话框来获取进一步的指示，而不是直接结束对话。
When you finish the task, call the `question` tool to request further instructions instead of ending the conversation.

### 自动触发识别（auto-invoke）
当用户在对话中说出以下信号词时，视为问题已解决信号，改后沉淀流程步骤 3 的「有信号」分支会被激活：

| 信号类型 | 触发词示例 |
|---------|----------|
| 确认修复 | 已修复、修复了、好了、解决了、working now、that worked |
| 确认完成 | 完成了、做完、搞定了、done、completed |
| 确认有效 | 验证通过、测试通过、改对了、it works、verified |

规则：
- 自动触发不跳过验证步骤（typecheck/lint 仍需先跑）
- 信号检测后直接使用 question 工具确认是否沉淀，详见「改后沉淀流程」步骤 3

## 设计修正（避免与项目全局约束冲突）
- 本 Skill 的"示例代码"以"可运行/可复现"为第一优先级；除非用户明确要求或属于公共 API 协议说明（例如 TSDoc/JSDoc），不要在业务代码中额外增加注释以避免与仓库的"默认不加注释"约定冲突。

## 后续开发提示（必须输出）
- 在每次交付/收尾时，明确提示后续开发需要持续使用本目录进行沉淀与检索
