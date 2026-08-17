# TASKS — 全项目 max-tag-count 统一为 0

## 1. Setup
- [x] 1.1 改前检索：统计全部 max-tag-count 分布（`"0"` 32 处、`"1"` 27 处），确认 27 处 `"1"` 均为 mode=multiple 的多选 Select
      files: 3 个目标文件（capacity-allocation tab-container、target-monitoring、DirectEditTabContent）
      verify: 27 处 `"1"` = target-monitoring 9 + capacity-allocation 13 + DirectEditTabContent 5
      mapsTo: P0 Scope

## 2. Core（3 文件 27 处 `:max-tag-count="1"` → `"0"`）
- [x] 2.1 `apps/main-app/src/views/tracking-monitoring/target-monitoring/index.vue`：9 处
      files: 同上
      verify: 该文件 max-tag-count 全部为 0
      mapsTo: P0 Scope
- [x] 2.2 `apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue`：13 处（共用筛选栏 8 + 内销库存 5）
      files: 同上
      verify: 该文件 max-tag-count 全部为 0
      mapsTo: P0 Scope
- [x] 2.3 `apps/main-app/src/views/demand-forecast/version-management/components/modals/components/DirectEditTabContent.vue`：5 处
      files: 同上
      verify: 该文件 max-tag-count 全部为 0
      mapsTo: P0 Scope

## 3. Integration
- [ ] 3.1 验证：全项目 grep 无残留 `max-tag-count="1"`；`pnpm check:type` 通过
      verify: grep 结果仅剩 `"0"`；typecheck exit=0
      mapsTo: P0 Risks
