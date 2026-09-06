---
name: workflow
description: 工作流控制台。用法：/workflow [start|switch|list|drop] …。start: /workflow <mode> <change-name>（mode: full|hotfix|tweak）；switch/drop 需 --change <name>；list 无参数
---

# /workflow — 工作流控制台

当用户调用 `/workflow` 时，按子命令执行。兼容旧用法：**不带子命令时等价于 `start`**（如 `/workflow full feat-xxx`）。

## 参数解析

第一个 token 若匹配 `start|switch|list|drop` 则视为子命令，否则视为旧式 `start` 调用：

- **start**（默认）：启动新任务
  - mode: `full` | `hotfix` | `tweak`（默认 `full`）
  - change: 变更名称（kebab-case，如 `feat-login`、`fix-crash`）
- **switch**: 切换当前任务槽位（挂起当前、恢复目标）→ 需要 `--change <name>`
- **list**: 查看全部任务槽位与 Gate 进度 → 无参数
- **drop**: 放弃某任务槽位（证据保留）→ 需要 `--change <name>`

## 执行序列

### start
1. 如果缺少参数，用 ask 工具询问用户：
   - mode 选项：`full`（常规功能/重构）、`hotfix`（紧急修复）、`tweak`（微小改动）
   - change 名称
2. 参数齐全后执行：
   ```bash
   pnpm -s run harness:start -- --mode {mode} --change {change}
   ```
3. 输出启动结果：Mode、Change、槽位数量、后续步骤提示。若报"槽位已存在且未完成"——先 `list` 查看，用 `drop` 放弃或换 change 名。

### switch / list / drop
按子命令映射到 pnpm script，change 缺失时用 ask 询问：

```bash
pnpm -s run harness:switch -- --change {name}   # 或 /workflow switch <name>
pnpm -s run harness:list
pnpm -s run harness:drop   -- --change {name}   # 或 /workflow drop <name>
```

输出对应结果（切换后提示门禁已跟随新槽；drop 提示证据目录保留）。

## 多任务提示

切换任务前若工作区有未提交改动，先 `git stash`；切回后 `git stash pop`（避免两任务改动混在工作区）。

## 快捷示例

```
/workflow full feat-user-list     → 全流程：用户列表功能（旧式 start）
/workflow hotfix fix-login-npe    → 紧急修复：登录空指针
/workflow tweak fix-label-align   → 微调：标签对齐
/workflow list                    → 查看所有任务进度
/workflow switch feat-user-list   → 切回任务 A（恢复其 Gate 进度）
/workflow drop fix-label-align    → 放弃微调任务（证据保留）
```
