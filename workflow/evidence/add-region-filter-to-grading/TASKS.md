# TASKS — add-region-filter-to-grading

## 1. 客户分级（Setup）
- [x] 1.1 `customer/type.ts`：`CustomerFilterValues` 新增 `saleZoneSum?: string`
  - files: apps/main-app/src/views/order-grading/customer/type.ts
  - verify: 字段声明与 saleZones 同风格（逗号分隔字符串）
  - mapsTo: P0 Scope 客户分级
- [x] 1.2 `customer/.../control-bar/index.vue`：新增 `saleZoneSumArr` computed + 模板「区域」field（在「区域部门」之前）
  - files: apps/main-app/src/views/order-grading/customer/components/control-bar/index.vue
  - verify: computed 模式与 saleZonesArr 一致；field 在区域部门 field 之前；options 用 enumStore.customerRegionSumFilterOptions
  - mapsTo: P0 Scope 客户分级

## 2. 产品分级（Setup）
- [x] 2.1 `product/types.ts`：`ProductFilterValues` 新增 `saleZoneSum?: string`
  - files: apps/main-app/src/views/order-grading/product/types.ts
  - verify: 字段声明与 saleZones 同风格
  - mapsTo: P0 Scope 产品分级
- [x] 2.2 `product/.../control-bar/index.vue`：新增 `saleZoneSumArr` computed + 模板「区域」field（在「区域部门」之前）
  - files: apps/main-app/src/views/order-grading/product/components/control-bar/index.vue
  - verify: computed 模式与 saleZonesArr 一致；field 在区域部门 field 之前；options 用 enumStore.customerRegionSumFilterOptions
  - mapsTo: P0 Scope 产品分级

## 3. 验证（Verify）
- [ ] 3.1 typecheck + format + lint 通过
  - files: 4 个改动文件
  - verify: harness:p2 exit=0
  - mapsTo: P0 Risks
