# TASKS — remove-page-max-width-1440

## 1. Setup
- [x] 1.1 确认 10 个页面入口 `.page-shell` 块均含 `max-width: 1440px` + `margin: 0 auto`
  - files: 10 个页面 index.vue（capacity-allocation×3、demand-forecast×2、master-data×1、order-grading×2、tracking-monitoring×2）
  - verify: grep 确认每个文件 `.page-shell` 块上下文与目标行
  - mapsTo: P0 Scope

## 2. Core
- [x] 2.1 逐文件删除 `.page-shell` 中 `max-width: 1440px` 与 `margin: 0 auto` 两行
  - files: 同 1.1
  - verify: 全仓 grep `max-width: 1440px` 页面入口残留 = 0
  - mapsTo: P0 Scope

## 3. Integration
- [ ] 3.1 Phase 2 验证：typecheck 通过（无 CSS 语法影响，主要为回归确认）
  - files: 无新增
  - verify: pnpm -s run check:type exit 0
  - mapsTo: P0 Risks
