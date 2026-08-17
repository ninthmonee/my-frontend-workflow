# TASKS — supply-net-draft-count

## 1. API 层

- [ ] 1.1 新增 `getSupplyNetDraftCountApi(versionId)` — `GET /app/rest/supply-net/{versionId}/draft/count`
  - **files**: `apps/main-app/src/api/master-data/supply-network.ts`
  - **verify**: 函数签名正确，使用 `requestClient.get`
  - **mapsTo**: P0 Scope 项 1

## 2. 编排层

- [ ] 2.1 `totalPathsFromVersion` 从 `computed` 改为 `ref` + 新增 `refreshTotalPaths()` 方法
  - **files**: `apps/main-app/src/views/master-data/supply-network/useSupplyNetworkOrchestration.ts`
  - **verify**: 只读模式读 `totalRows`，编辑模式调 draft count API
  - **mapsTo**: P0 Scope 项 2

- [ ] 2.2 在 `enterEdit()` / `exitEdit()` 后调用 `refreshTotalPaths()`
  - **files**: 同上
  - **verify**: 模式切换后路径数刷新
  - **mapsTo**: P0 Scope 项 2

- [ ] 2.3 在 `handleDeleteDetail()` / `handleAddPath()` 后调用 `refreshTotalPaths()`
  - **files**: 同上
  - **verify**: 增删路径后计数更新
  - **mapsTo**: P0 Risks 项 1

## 3. 验证

- [ ] 3.1 typecheck 通过
  - **files**: 全部变更文件
  - **verify**: `harness:p2` exit=0
  - **mapsTo**: P0 Risks 项 2
