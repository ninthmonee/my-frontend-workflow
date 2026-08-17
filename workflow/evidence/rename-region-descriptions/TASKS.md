# TASKS — rename-region-descriptions

## 1. 批量替换（Setup）
- [x] 1.1 全量替换 `apps/main-app/src` 下 36 个文件中的中文「大区」→「区域部门」（脚本批量 + 逐文件 git diff 审查）
  - files: apps/main-app/src 下 36 个含「大区」的文件（vue/ts/tsx/md/json）
  - verify: git diff 中每处替换均为纯中文文本替换，无英文标识符/字符串 key 被误伤
  - mapsTo: P0 Scope 全部
- [x] 1.2 复核英文标识符（saleZone/customerRegion/region/saleZoneIn）未被改动
  - files: 同 1.1
  - verify: git diff 不含这些英文标识符的变更
  - mapsTo: P0 Non-goals

## 2. 集成（Integration）
- [x] 2.1 确认无「大区」残留（除 workflow/evidence 历史记录）
  - files: apps/main-app/src
  - verify: grep -rn "大区" apps/main-app/src 返回 0
  - mapsTo: P0 Scope

## 3. 验证（Verify）
- [ ] 3.1 typecheck + format + lint 通过
  - files: 全部改动文件
  - verify: pnpm check:type / harness:p2 exit=0
  - mapsTo: P0 Risks（布局/契约风险）
