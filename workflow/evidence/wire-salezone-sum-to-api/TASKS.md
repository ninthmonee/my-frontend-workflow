# TASKS — wire-salezone-sum-to-api

## 1. 客户分级编排层（Setup）
- [x] 1.1 `useCustomerOrchestration.ts` 四处接入 saleZoneSum：getCommonParams 透传、toPostParams split、defaultParams 初始值、watch 触发列表
  - files: apps/main-app/src/views/order-grading/customer/useCustomerOrchestration.ts
  - verify: 四处与 saleZones 完全平行；grep 可见 4 处 saleZoneSum
  - mapsTo: P0 Scope 客户分级

## 2. 产品分级编排层（Setup）
- [x] 2.1 `useProductOrchestration.ts` 四处接入 saleZoneSum：getCommonParams 透传、toPostParams split、defaultParams 初始值、watch 触发列表
  - files: apps/main-app/src/views/order-grading/product/useProductOrchestration.ts
  - verify: 四处与 saleZones 完全平行；grep 可见 4 处 saleZoneSum
  - mapsTo: P0 Scope 产品分级

## 3. 验证（Verify）
- [ ] 3.1 typecheck + format + lint 通过
  - files: 2 个改动文件
  - verify: harness:p2 exit=0
  - mapsTo: P0 Risks
