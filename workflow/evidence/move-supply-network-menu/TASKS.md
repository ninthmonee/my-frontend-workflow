# TASKS — move-supply-network-menu

## 1. Route Refactor

- [x] 1.1 删除 `master-data.ts` 路由文件（移除业务数据管理菜单）
  - files: `apps/main-app/src/router/routes/modules/master-data.ts`
  - verify: 文件已删除，`import.meta.glob` 不再加载该路由 ✅
  - mapsTo: Scope#1

- [x] 1.2 在产能分配路由中新增「供应网络」子路由
  - files: `apps/main-app/src/router/routes/modules/capacity-allocation-target.ts`
  - verify: 新增 supply-network 子路由，path `/capacity-allocation/supply-network` ✅
  - mapsTo: Scope#2

- [x] 1.3 更新 `version-info.vue` 中硬编码的供应网络路径
  - files: `apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/version-info.vue`
  - verify: `goToSupplyNetworkVersion` 跳转路径从 `/master-data/supply-network` 改为 `/capacity-allocation/supply-network` ✅
  - mapsTo: Scope#3
