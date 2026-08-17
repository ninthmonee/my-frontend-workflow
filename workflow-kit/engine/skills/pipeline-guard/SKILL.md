---
name: "pipeline-guard"
description: "Self-check skill invoked at end of every task. Verifies Phase 0-2 were completed and performs Phase 3 self-check, then checks Phase 4 knowledge precipitation. If any MUST step was missed, report as incomplete."
---

# Pipeline Guard — 任务收尾自检

## 触发条件

每次代码/配置变更任务结束时（验证通过后、声称完成前）必须调用本 skill。
不要在任务中途调用 — 只在收尾时用。

## 自检清单

逐项检查，每一项都必须得到确认：

### Phase 0 检查
- [ ] 是否加载了 skill("project-constraints") 并阅读了项目约束？（如项目未定义此 skill，跳过）
- [ ] 是否加载了 skill("compound-engineering") 并输出了改前检索摘要？（如项目未定义此 skill，跳过）
- [ ] 是否按路由表加载了所需领域 skill？

### Phase 1 检查
- [ ] 代码是否按 loaded skills 指导编写？
- [ ] 是否只做了必要改动，没有顺手优化？
- [ ] 是否检查过项目内是否已有同类封装？

### Phase 2 检查
- [ ] 是否加载了 skill("verification-before-completion")？（如项目未定义此 skill，跳过）
- [ ] 是否运行了 {{PM}} run {{TWEAK_SCRIPT}} 且 exit code = 0？
- [ ] 是否运行了 lint（按需）并确认无错误？
- [ ] 失败时是否委派了独立的 `p2-verifier` 子 Agent 分析错误？（skill: `{{SKILLS_DIR}}/p2-verifier.md`）
- [ ] 主 Agent 是否按 verifier 方案逐项修正，未自行判断跳过？
- [ ] 所有关口 [GATE:P0] [GATE:P1] [GATE:P2] 是否已逐项声明？
- [ ] 是否有任何 "should work" / "probably fine" 的侥幸心理？（如有 → 必须跑验证）

### Phase 3 检查（收尾自检 — 问题解决确认）

**仓库校验**：执行以下 harness 命令验证流程完整性：

```bash
{{PM}} -s run harness:gate-verify -- --id <change>  # 校验 P0/P1/P2 Gate 完整性
cat {{STATE_FILE}}                                  # 查看当前全量状态
```

任一命令失败（退出码非 0）则停止，回退补全。

**向用户确认问题已解决**（Phase 3 独立确认，不与 Phase 4 合并）：

Agent MUST 使用 `ask` 工具发起交互式确认（不中断工作流），确认以下三点：
- ✅ 改动是否正确？
- ✅ 问题是否已解决？
- ✅ 需求功能是否已实现 / 是否已满足需求？

- [ ] Phase 0-2 所有关口 [GATE:P0] [GATE:P1] [GATE:P2] 是否已逐项声明？
- [ ] 是否使用 `ask` 工具向用户确认了「改动是否正确 + 问题是否已解决 + 需求是否已满足」？
- [ ] 用户是否已确认通过？
  - ✅ **是（已解决）** → [GATE:P3] ✅，进入 Phase 4 知识沉淀
  - ❌ **否（未解决）** → 记录具体问题，🔁 回退到 Phase 1 修复，修复完成后重新走 Phase 2 → Phase 3

## 输出格式

### 全部通过时
```
✅ Pipeline Guard: Phase 0-2 全部通过 + Phase 3 收尾自检完成
```

### 有遗漏时
```
❌ Pipeline Guard: 发现遗漏
- Phase X 步骤 Y 未执行
→ 回退到遗漏步骤重新执行
```

不得在遗漏项未补全时声称 "完成"。

## 常见遗漏模式（警惕）

| 遗漏 | 典型借口 | 后果 |
|------|---------|------|
| 跳过 Phase 0 | "改动太小，不需要查约束" | 可能违反项目禁止项 |
| 跳过 Phase 2 typecheck | "lint 没报错，应该没事" | 类型错误上线 |
| 跳过 Phase 3 自检 | "验证过了就行了" | 用户确认缺失，隐患未沟通 |
| 跳过 Phase 4 沉淀 | "这个问题以后还会遇到，下次再说" | 经验永不积累 |
| 跳过询问用户 | "看起来成功了，不用问了" | 可能不是用户真正需要的 |

## 与其他 skill 的关系

| Skill | 关系 |
|-------|------|
| compound-engineering | 定义沉淀流程 — Pipeline Guard 在 Phase 3 标记为待检查项，由 Phase 4 [GATE:DONE] 确认执行 |
| verification-before-completion | 定义验证原则 — Pipeline Guard 检查是否已跑命令 |
| project-constraints | 定义项目规则 — Pipeline Guard 检查是否已加载 |

---

## Phase 4 补充检查（知识沉淀）

本 skill（pipeline-guard）执行完毕后，由 [GATE:DONE] 关口进一步检查 Phase 4 知识沉淀。

**所有工作流统一强制询问策略**（详见 AGENTS.md「Phase 4 — 知识沉淀」）：

| 工作流 | 策略 | P4 检查重点 |
|---|---|---|
| **全部** | 🔴 强制询问 | Agent 是否主动询问用户并给出推荐理由？用户说"是" → 是否执行去重 + 写入 experiences？用户说"不" → P4.md 中 `status: skipped` 且 `knowledgeDone: YES` |

- [ ] Agent 是否使用 `ask` 工具主动询问了用户「是否需要沉淀经验？」并给出推荐理由？
- [ ] 用户是否已明确回复（是/否）？
- [ ] 若执行沉淀：是否加载 skill("compound-engineering") 做去重 + 写入 experiences？是否更新了 INDEX.md？
- [ ] 若跳过：P4.md 中 `status` 是否为 `skipped` 且 `knowledgeDone: YES`？
