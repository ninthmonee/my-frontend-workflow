---
name: ponytail-ladder
description: Ponytail 决策阶梯 — 写代码前的轻量自检。已集成到 Phase 1，可选显式加载。
---

# Ponytail 决策阶梯

> 参考 [Ponytail](https://github.com/DietrichGebert/ponytail) 理念。

## 触发

- 已集成到 AGENTS.md Phase 1 步骤 2 和硬约束中
- 本文件为补充说明，需要时可显式加载 `/ponytail-ladder`

## 决策阶梯（逐级自问，命中即停）

动手写代码前，从第 1 级开始逐级自问：

| 级别 | 问题 | 命中时的行动 | 示例 |
|---|---|---|---|
| ① | **这真的需要吗？** | 跳过（YAGNI），在 TASKS.md 标注 `[-]` | 用户随口提的"顺便加个导出" |
| ② | **JS 标准库有吗？** | 直接用 stdlib | `Date`、`URL`、`Array.from`、`Intl`、`Promise.all` |
| ③ | **浏览器原生有吗？** | 直接用平台 API/元素 | `<input type="date">`、`<dialog>`、`URLSearchParams`、`localStorage` |
| ④ | **已安装依赖有吗？** | 直接用现有依赖 | `lodash`、`dayjs`、`echarts`（确认 `package.json` 中有） |
| ⑤ | **项目内已有封装？** | 复用项目组件/hooks | `@your-scope/ui-kit`、`use-table-query`、`modal-provider` |
| ⑥ | **能一行搞定？** | 直接写一行 | 不做 wrapper、不做 class、不建新文件 |
| ⑦ | **以上都不行** | 写最小可行实现 | 禁止预先抽象、禁止"以防万一"的参数 |

## 反模式（Ponytail 禁止）

- ❌ 为一次调用建 class
- ❌ 为两个字段建 interface 文件
- ❌ 为简单逻辑建 3 层 wrapper
- ❌ 引入 50KB 依赖替代一行 stdlib
- ❌ "以后可能会用到"的参数/配置
- ❌ 装饰器/AOP 为了一次性包装

## 安全底线（不可裁减）

以下内容**绝不因"懒"而省略**：
- 输入校验（信任边界）
- 错误处理（数据丢失风险）
- 安全防护（XSS/SQL 注入/路径遍历）
- 无障碍（a11y）
