# TASKS — hooks-integration

## 1. Setup

- [ ] 1.1 创建 `.devflow/hooks/` 目录
  - `files`: `.devflow/hooks/` (新建)
  - `verify`: 目录存在且为空
  - `mapsTo`: P0 Scope — 目录结构准备

## 2. Core — gate-guard.js (PreToolUse 门禁阻断)

- [ ] 2.1 实现 `gate-guard.js` 核心逻辑
  - `files`: `.devflow/hooks/gate-guard.js` (新建)
  - `verify`: 
    - 读取 stdin JSON payload，解析 `tool` / `arguments`
    - 读取 `.devflow/harness/state.json`
    - taskType 为 auto-skip/user-skip → allow
    - state.json 不存在 → allow
    - taskType 为 full/mandatory/hotfix 且 P0 gate 未通过 → block 编辑工具
    - 危险 bash 命令 (rm -rf, git push --force) → block
    - 写入路径在 .devflow/ 下 → allow
    - stdout 输出 `{"outcome":"allow"}` 或 `{"outcome":"block","reason":"..."}`
  - `mapsTo`: P0 Risks 2 (阻断误伤), Risks 4 (性能)

- [ ] 2.2 验证 gate-guard.js 语法正确
  - `files`: `.devflow/hooks/gate-guard.js`
  - `verify`: `node --check .devflow/hooks/gate-guard.js` 无错误
  - `mapsTo`: P0 Risks 4

## 3. Core — session-init.js (SessionStart 上下文注入)

- [ ] 3.1 实现 `session-init.js` 核心逻辑
  - `files`: `.devflow/hooks/session-init.js` (新建)
  - `verify`:
    - 读取 `.devflow/harness/state.json`
    - 存在活跃流程 → 注入状态摘要（change、phase、gates 状态）+ TASKS 未完成项
    - 不存在活跃流程 → 注入新任务引导提示
    - 始终注入核心约束速查（3-5 条）
    - stdout 输出注入文本
  - `mapsTo`: P0 Risks 3 (上下文膨胀), P0 Scope

- [ ] 3.2 验证 session-init.js 语法正确
  - `files`: `.devflow/hooks/session-init.js`
  - `verify`: `node --check .devflow/hooks/session-init.js` 无错误
  - `mapsTo`: P0 Risks 3

## 4. Integration — hooks.json 配置

- [ ] 4.1 创建 `.reasonix/hooks.json`
  - `files`: `.reasonix/hooks.json` (新建)
  - `verify`:
    - 正确配置 SessionStart + PreToolUse 两个事件
    - PreToolUse 包含 matcher 过滤编辑工具
    - timeout 值合理（SessionStart 3000ms, PreToolUse 3000ms）
    - JSON 格式合法
  - `mapsTo`: P0 Risks 1 (格式兼容性)

## 5. Integration — AGENTS.md 配套修改

- [ ] 5.1 修改 AGENTS.md — 入口判断增加状态感知
  - `files`: `AGENTS.md` (修改)
  - `verify`: 入口判断章节新增「SessionStart hook 注入的状态包含当前 DevFlow 状态，如显示 Phase N 未完成 → 继续当前流程」
  - `mapsTo`: P0 Scope

- [ ] 5.2 修改 AGENTS.md — Phase 1 增加编辑文件自动读取
  - `files`: `AGENTS.md` (修改)
  - `verify`: Phase 1 章节新增「读取 .devflow/harness/edited-files.txt 作为 Changed files 补充校验」
  - `mapsTo`: P0 Scope

- [ ] 5.3 修改 AGENTS.md — 新增跨会话恢复章节
  - `files`: `AGENTS.md` (修改)
  - `verify`: 新增「跨会话恢复」章节，说明通过 memory:devflow-last-state 恢复
  - `mapsTo`: P0 Scope
