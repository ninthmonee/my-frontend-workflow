# TASKS — add-region-sum-filter-forecast

## 1. 需求预测预测结果 tab（Setup）
- [x] 1.1 新增 regionSumFilter 状态 + regionSumOptions 数据源（onMounted 填充 enumStore.getCustomerRegionSumOptions）
  - files: apps/main-app/src/views/demand-forecast/forecast-results/components/tab-container/index.vue
  - verify: 状态声明与 regionFilter 平行；数据源来自 enum saleZoneSum options
  - mapsTo: P0 Scope
- [x] 1.2 模板在「区域部门」之前插入「区域」Select field
  - files: 同 1.1
  - verify: field 位于区域部门之前，props 与 regionFilter 的 Select 一致
  - mapsTo: P0 Scope
- [x] 1.3 params computed 预测结果 tab 分支新增 zone_sum: regionSumFilter.value（区域部门 zone 保持）
  - files: 同 1.1
  - verify: zone_sum 与 zone 并列，子应用传参契约正确
  - mapsTo: P0 Scope

## 2. 验证（Verify）
- [ ] 2.1 typecheck + format + lint 通过
  - files: 1 个改动文件
  - verify: harness:p2 exit=0
  - mapsTo: P0 Risks
