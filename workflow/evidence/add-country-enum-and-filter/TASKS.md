# TASKS — add-country-enum-and-filter

## 1. API 与 enum store（Setup）
- [x] 1.1 customer.ts 新增 getCountryApi()（GET /app/rest/country）
  - files: apps/main-app/src/api/order-grading/customer.ts
  - verify: 函数与 getCustomerSaleZoneApi 同格式
  - mapsTo: P0 Scope
- [x] 1.2 enum.ts 新增 countryList 状态 + fetchCountryOptions + getCountryOptions/getCountryFilterOptions + $reset + 导出
  - files: apps/main-app/src/store/enum.ts
  - verify: 参照 customerRegionList 模式完整；ensureLoaded 内触发 fetch
  - mapsTo: P0 Scope

## 2. 客户分级筛选（Setup）
- [x] 2.1 type.ts 新增 country?: string
  - files: apps/main-app/src/views/order-grading/customer/type.ts
  - verify: 字段与 saleZones 同风格
  - mapsTo: P0 Scope
- [x] 2.2 control-bar 新增 countryArr computed + 模板 field（区域部门与系统分级之间）
  - files: apps/main-app/src/views/order-grading/customer/components/control-bar/index.vue
  - verify: computed 与 saleZonesArr 同模式；field 位置在区域部门之后
  - mapsTo: P0 Scope
- [x] 2.3 orchestration 四处接入 country（getCommonParams/toPostParams/defaultParams/watch）
  - files: apps/main-app/src/views/order-grading/customer/useCustomerOrchestration.ts
  - verify: 4 处 grep 可见
  - mapsTo: P0 Scope

## 3. 表格列（Setup）
- [x] 3.1 customer-table/types.ts 的 CustomerRow 新增 country: string
  - files: apps/main-app/src/views/order-grading/customer/components/customer-table/types.ts
  - verify: 字段声明就位
  - mapsTo: P0 Scope
- [x] 3.2 use-columns.tsx 在 saleZone 列之后新增 country 列（title=国家，Tag 渲染同 saleZone）
  - files: apps/main-app/src/views/order-grading/customer/components/customer-table/use-columns.tsx
  - verify: country 列紧随区域部门列
  - mapsTo: P0 Scope

## 4. 验证（Verify）
- [ ] 4.1 typecheck + format + lint 通过
  - files: 7 个改动文件
  - verify: harness:p2 exit=0
  - mapsTo: P0 Risks
