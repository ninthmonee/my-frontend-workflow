# TASKS — add-region-sum-filter-supply-network

## 1. 类型层（Setup）
- [x] 1.1 types.ts 的 SupplyNetworkFilterValues 新增 saleZoneSumIn: string[]
  - files: apps/main-app/src/views/master-data/supply-network/types.ts
  - verify: 字段声明与 saleZoneIn 同风格
  - mapsTo: P0 Scope

## 2. 编排层（Setup）
- [x] 2.1 useSupplyNetworkOrchestration.ts：filters 默认值加 saleZoneSumIn: []，查询 params 加 saleZoneSumIn 透传（saleZoneIn 旁）
  - files: apps/main-app/src/views/master-data/supply-network/useSupplyNetworkOrchestration.ts
  - verify: 2 处接入，模式与 saleZoneIn 一致（空数组传 undefined）
  - mapsTo: P0 Scope

## 3. UI 层（Setup）
- [x] 3.1 control-bar/index.vue：新增 saleZoneSumOpts computed（enumStore.customerRegionSumFilterOptions）+ 模板在「区域部门」之前插入「区域」field
  - files: apps/main-app/src/views/master-data/supply-network/components/control-bar/index.vue
  - verify: computed 就位；「区域」field 在「区域部门」之前，v-model 绑 localFilters.saleZoneSumIn
  - mapsTo: P0 Scope

## 4. 验证（Verify）
- [ ] 4.1 typecheck + format + lint 通过
  - files: 3 个改动文件
  - verify: harness:p2 exit=0
  - mapsTo: P0 Risks
