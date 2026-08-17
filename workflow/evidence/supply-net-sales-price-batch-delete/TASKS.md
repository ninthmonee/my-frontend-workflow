# TASKS — supply-net-sales-price-batch-delete

## 1. API / Types

- [x] 1.1 SupplyNetDetailRow 新增 salePriceHigh/salePriceMiddle/salePriceLow 字段 ✅
  - files: `apps/main-app/src/api/master-data/supply-network.ts`
  - verify: typecheck 通过，表格可引用新字段
  - mapsTo: Scope#1

- [x] 1.2 新增 mock batchDeleteSupplyNetDraftDetailApi ✅
  - files: `apps/main-app/src/api/master-data/supply-network.ts`
  - verify: typecheck 通过，函数签名正确
  - mapsTo: Scope#4

## 2. SupplyTable 组件

- [x] 2.1 新增「销售价格(元/标箱)」分组列（高档/中档/低档，只读） ✅
  - files: `apps/main-app/src/views/master-data/supply-network/components/supply-table/index.vue`
  - verify: 表格出现新列，不可编辑（无 InputNumber）
  - mapsTo: Scope#2

- [x] 2.2 新增 rowSelection 多选 + 批量删除按钮 ✅
  - files: `apps/main-app/src/views/master-data/supply-network/components/supply-table/index.vue`
  - verify: 编辑模式下表格左侧出现复选框，底部/头部出现批量删除按钮
  - mapsTo: Scope#3, Scope#4

## 3. Orchestration / Page

- [x] 3.1 新增 selectedRowKeys 状态和 handleBatchDelete 方法 ✅
  - files: `apps/main-app/src/views/master-data/supply-network/useSupplyNetworkOrchestration.ts`
  - verify: typecheck 通过
  - mapsTo: Scope#4

- [x] 3.2 index.vue 透传批量删除事件 ✅
  - files: `apps/main-app/src/views/master-data/supply-network/index.vue`
  - verify: typecheck 通过，事件链路完整
  - mapsTo: Scope#4
