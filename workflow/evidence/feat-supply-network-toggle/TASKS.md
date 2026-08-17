# 供应网络 — 状态列 + 批量启用/停用

## 1. API 层 — 新增两个 toggle 接口

- [ ] 1.1 新增 `toggleSupplyNetDraftDetailApi`（单条启用/停用）和 `batchToggleSupplyNetDraftDetailApi`（批量启用/停用）
  - **files**: `apps/main-app/src/api/master-data/supply-network.ts`
  - **verify**: API 函数名以 `Api` 结尾，URL/method/参数符合需求文档
  - **mapsTo**: Scope → 新增 API 调用

## 2. 类型层 — SupplyNetDetailRow 补充 enabled 字段

- [ ] 2.1 `SupplyNetDetailRow` 接口新增 `enabled: boolean` 字段
  - **files**: `apps/main-app/src/api/master-data/supply-network.ts`
  - **verify**: typecheck 通过，表格可正确读取 enabled
  - **mapsTo**: Scope → 修改共享类型

## 3. 编排层 — 新增批量启用/停用、单条 toggle 逻辑

- [ ] 3.1 `useSupplyNetworkOrchestration` 新增 `handleBatchToggle(ids, enabled)` 和 `handleToggleDetail(id, enabled)` 方法
  - **files**: `apps/main-app/src/views/master-data/supply-network/useSupplyNetworkOrchestration.ts`
  - **verify**: 方法正确调用 API，刷新表格，清空选中
  - **mapsTo**: Scope → 新增批量/单条启用停用逻辑

## 4. 表格组件 — 状态列 + 批量按钮图标

- [ ] 4.1 在操作列之前新增 status 列：只读模式显示 Tag，编辑模式显示 Switch
  - **files**: `apps/main-app/src/views/master-data/supply-network/components/supply-table/index.vue`
  - **verify**: 只读模式下 Tag 正确显示"启用"(green)/"停用"(default)；编辑模式下 Switch 正确切换并触发 toggle
  - **mapsTo**: Scope → 状态列

- [ ] 4.2 批量启用/停用按钮（带图标）+ emit 新事件
  - **files**: `apps/main-app/src/views/master-data/supply-network/components/supply-table/index.vue`
  - **verify**: 批量启用/停用/删除按钮均带图标；点击批量启用/停用触发正确事件
  - **mapsTo**: Scope → 批量启用/停用功能

## 5. 页面入口 — 传递新事件

- [ ] 5.1 `index.vue` 中解构并传递 `handleBatchToggle`、`handleToggleDetail`
  - **files**: `apps/main-app/src/views/master-data/supply-network/index.vue`
  - **verify**: 事件链路完整，toggle 操作正确执行
  - **mapsTo**: Scope → 页面集成
