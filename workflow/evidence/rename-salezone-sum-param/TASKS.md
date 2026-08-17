# TASKS — rename-salezone-sum-param

## 1. 客户分级（Setup）
- [x] 1.1 type.ts：saleZoneSum → saleZoneSums（仍 string？或 string[]？——按需求「是个数组」改为 string[]）
  - files: apps/main-app/src/views/order-grading/customer/type.ts
  - verify: 字段类型与语义一致
  - mapsTo: P0 Scope
- [x] 1.2 control-bar：区域 field max-tag-count 1→0；saleZoneSumArr 改为数组直绑
  - files: apps/main-app/src/views/order-grading/customer/components/control-bar/index.vue
  - verify: max-tag-count=0；v-model 绑 saleZoneSums
  - mapsTo: P0 Scope
- [x] 1.3 orchestration：saleZoneSum → saleZoneSums，GET 直接传数组（不再逗号串 split），defaultParams/watch 同步
  - files: apps/main-app/src/views/order-grading/customer/useCustomerOrchestration.ts
  - verify: 4 处改名 + 数组传参
  - mapsTo: P0 Scope

## 2. 产品分级（Setup）
- [x] 2.1 type.ts：saleZoneSum → saleZoneSums（string[]）
  - files: apps/main-app/src/views/order-grading/product/types.ts
  - verify: 字段类型 string[]
  - mapsTo: P0 Scope
- [x] 2.2 control-bar：saleZoneSumArr 改为数组直绑（max-tag-count 已是 0）
  - files: apps/main-app/src/views/order-grading/product/components/control-bar/index.vue
  - verify: v-model 绑 saleZoneSums
  - mapsTo: P0 Scope
- [x] 2.3 orchestration：saleZoneSum → saleZoneSums，数组传参，defaultParams/watch 同步
  - files: apps/main-app/src/views/order-grading/product/useProductOrchestration.ts
  - verify: 4 处改名 + 数组传参
  - mapsTo: P0 Scope

## 3. 验证（Verify）
- [ ] 3.1 typecheck + format + lint 通过
  - files: 6 个改动文件
  - verify: harness:p2 exit=0
  - mapsTo: P0 Risks
