---
name: workflow
description: 一键启动工作流。用法：/workflow <mode> <change-name>（mode: full|hotfix|tweak）
---

# /workflow — 一键启动工作流

当用户调用 `/workflow` 时，执行以下步骤：

## 参数解析

从 arguments 中提取两个参数（空格分隔）：
- **mode**: `full` | `hotfix` | `tweak`（默认 `full`）
- **change**: 变更名称（kebab-case，如 `feat-login`、`fix-crash`）

## 执行序列

1. 如果缺少参数，用 ask 工具询问用户：
   - mode 选项：`full`（常规功能/重构）、`hotfix`（紧急修复）、`tweak`（微小改动）
   - change 名称
2. 参数齐全后，执行：
   ```bash
   pnpm -s run harness:start -- --mode {mode} --change {change}
   ```
3. 输出启动结果：Mode、Change、后续步骤提示

## 快捷示例

```
/workflow full feat-user-list    → 全流程：用户列表功能
/workflow hotfix fix-login-npe   → 紧急修复：登录空指针
/workflow tweak fix-label-align  → 微调：标签对齐
```
