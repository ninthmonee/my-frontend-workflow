# TASKS — 切换币种后自动重新请求当前页面数据

> Change: `currency-refetch`（full）

## 1. Setup — 通用模式

- [x] 1.1 确认三个页面各自的刷新入口与现有 watch 模式（客户/产品 `onFilterChangeImmediate`、供应网络 `exitEdit + refreshTotalPaths + search`）；确认 enumStore.currentCurrency 的响应式访问方式
  - files: 三个 orchestration 文件
  - verify: 已读代码确认调用签名
  - mapsTo: P0 Scope；Risk 2

## 2. Core — 三个页面监听币种切换

- [x] 2.1 客户编排：init 时记录 `lastRequestedCurrency`；watch `currentCurrency.code` → 若变化则更新记录并调 `onFilterChangeImmediate()`
  - files: `apps/main-app/src/views/order-grading/customer/useCustomerOrchestration.ts`
  - verify: 币种切换触发全量刷新；首次进入不重复请求
  - mapsTo: Scope 客户；Risk 1、3
- [x] 2.2 产品编排：同 2.1（复用其 `onFilterChangeImmediate()`）
  - files: `apps/main-app/src/views/order-grading/product/useProductOrchestration.ts`
  - verify: 同 2.1
  - mapsTo: Scope 产品；Risk 1、3
- [x] 2.3 供应网络编排：同 2.1；编辑态时先 `exitEdit()` 再刷新，否则 `refreshTotalPaths()` + `search()`
  - files: `apps/main-app/src/views/master-data/supply-network/useSupplyNetworkOrchestration.ts`
  - verify: 编辑态切换币种先退出编辑；只读态直接重查
  - mapsTo: Scope 供应网络；Risk 2

## 3. 验证

- [x] 3.1 `pnpm check:type` 通过；prettier/lint 无新增错误；dev 冒烟（进入页面 → 切换币种 → 接口携带新 X-Currency 重新请求 → 页面数据更新；刷新页面不重复请求）
  - verify: exit=0
  - mapsTo: Risk 1（首次竞态）、Risk 4（watch 初始触发）
