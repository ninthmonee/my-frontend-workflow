# TASKS: defineModel 迁移

## 1. 简单迁移（单变量、无回调依赖）

- [ ] 1.1 `scenario-config/ParamCard.vue` — `enabled` → defineModel
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/components/ParamCard.vue`
  - verify: prop `enabled` + emit `update:enabled` 移除 → `defineModel('enabled')`；模板引用路径不变
  - mapsTo: P0 Scope #2

- [ ] 1.2 `customer/DiffResultPane.vue` — `localActiveTab` → defineModel
  - files: `apps/main-app/src/views/order-grading/customer/components/diff-analysis/DiffResultPane.vue`
  - verify: computed get/set 移除 → defineModel；模板 `v-model:value="localActiveTab"` → `v-model:value="activeTab"`
  - mapsTo: P0 Scope #3

- [ ] 1.3 `product/DiffResultPane.vue` — `localActiveTab` → defineModel
  - files: `apps/main-app/src/views/order-grading/product/components/diff-analysis/DiffResultPane.vue`
  - verify: 同 1.2
  - mapsTo: P0 Scope #4

- [ ] 1.4 `customer/VersionSelectionPane.vue` — `selectedKeys` → defineModel
  - files: `apps/main-app/src/views/order-grading/customer/components/diff-analysis/VersionSelectionPane.vue`
  - verify: prop + emit 移除 → defineModel；`emit('update:selectedKeys', ...)` → `selectedKeys.value = ...`
  - mapsTo: P0 Scope #7

- [ ] 1.5 `product/VersionSelectionPane.vue` — `selectedKeys` → defineModel
  - files: `apps/main-app/src/views/order-grading/product/components/diff-analysis/VersionSelectionPane.vue`
  - verify: 同 1.4
  - mapsTo: P0 Scope #8

- [ ] 1.6 `demand-forecast/tab-container` — `compareVersionIds` → defineModel
  - files: `apps/main-app/src/views/demand-forecast/forecast-results/components/tab-container/index.vue`
  - verify: prop + emit 移除 → defineModel；emit 从未被调用处，只需声明
  - mapsTo: P0 Scope #12

## 2. Pagination 迁移（需调整 handleChange 写入）

- [ ] 2.1 `common-antv-table` — `paginationConfig` computed → `pagination` defineModel
  - files: `apps/main-app/src/components/common-antv-table/index.vue`
  - verify: computed get/set 移除 → defineModel；handlePageChange/handlePageSizeChange 改为写 `pagination.value`
  - mapsTo: P0 Scope #1, Risk #1

- [ ] 2.2 `customer-table` — `pagination` prop+emit → defineModel
  - files: `apps/main-app/src/views/order-grading/customer/components/customer-table/index.vue`
  - verify: prop + emit 移除 → defineModel；模板 `:pagination` → `v-model:pagination`
  - mapsTo: P0 Scope #5

- [ ] 2.3 `product-table` — `pagination` prop+emit → defineModel
  - files: `apps/main-app/src/views/order-grading/product/components/product-table/index.vue`
  - verify: prop + emit 移除 → defineModel
  - mapsTo: P0 Scope #6

- [ ] 2.4 `version-management/version-table` — `pagination` → defineModel
  - files: `apps/main-app/src/views/capacity-allocation/version-management/components/version-table/index.vue`
  - verify: prop + emit + handlePaginationChange 移除 → defineModel
  - mapsTo: P0 Scope #9

- [ ] 2.5 `demand-forecast/version-table` — `pagination` → defineModel
  - files: `apps/main-app/src/views/demand-forecast/version-management/components/version-table/index.vue`
  - verify: prop + emit 移除 → defineModel；模板 `@update:pagination` 移除
  - mapsTo: P0 Scope #10

- [ ] 2.6 `supply-table` — `pagination` → defineModel
  - files: `apps/main-app/src/views/master-data/supply-network/components/supply-table/index.vue`
  - verify: prop + emit 移除 → defineModel
  - mapsTo: P0 Scope #11

## 3. selectedCustomerId（有回调链依赖）

- [ ] 3.1 `customer-table` — `selectedCustomerId` → defineModel
  - files: `apps/main-app/src/views/order-grading/customer/components/customer-table/index.vue`, `apps/main-app/src/views/order-grading/customer/components/customer-table/use-columns.tsx`
  - verify: prop + emit 移除 → defineModel；use-columns.tsx 中 `emit('update:selectedCustomerId', code)` 改为直接回调
  - mapsTo: P0 Scope #5, Risk #2

## 4. 消费者侧 :model-value → v-model

- [ ] 4.1 `language-toggle.vue` — `:model-value` + `@update:model-value` → `v-model`
  - files: `packages/effects/layouts/src/widgets/language-toggle.vue`
  - verify: 模板简化为 `v-model="..."`；功能不变
  - mapsTo: P0 Scope #15

- [ ] 4.2 `layout-toggle.vue` — `:model-value` + `@update:model-value` → `v-model`
  - files: `packages/effects/layouts/src/widgets/layout-toggle.vue`
  - verify: 模板简化为 `v-model="..."`
  - mapsTo: P0 Scope #16

- [ ] 4.3 `theme-toggle.vue` — `:model-value` + `@update:model-value` → `v-model`
  - files: `packages/effects/layouts/src/widgets/theme-toggle/theme-toggle.vue`
  - verify: 模板简化为 `v-model="..."`；注意可能需要 watch 替代副作用
  - mapsTo: P0 Scope #17

## 5. 验证

- [ ] 5.1 typecheck 全量通过
  - verify: `npx vue-tsc --project apps/main-app/tsconfig.json --noEmit` exit=0
  - mapsTo: P0 Risks #3
