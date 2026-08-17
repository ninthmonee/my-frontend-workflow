# Evidence: TWEAK

- runId: supply-table-editing-scroll
- startedAt: 2026-07-16T10:17:06.896Z
- endedAt: 2026-07-16T10:17:21.832Z

## Changed Files

- apps/main-app/src/views/capacity-allocation/scenario-config/components/CreateScenarioModal.vue
- apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/index.vue
- apps/main-app/src/views/demand-forecast/forecast-results/components/modification-drawer/index.vue
- apps/main-app/src/views/demand-forecast/version-management/components/modals/AdjustTraceModal.vue
- apps/main-app/src/views/demand-forecast/version-management/components/modals/CreateAlgoRunVersionModal.vue
- apps/main-app/src/views/demand-forecast/version-management/components/modals/CreateManualAdjustVersionModal.vue
- apps/main-app/src/views/demand-forecast/version-management/components/modals/EditCollaborateVersionModal.vue
- apps/main-app/src/views/master-data/supply-network/components/add-path-modal/index.vue
- apps/main-app/src/views/master-data/supply-network/components/coefficient-adjust/index.vue
- apps/main-app/src/views/master-data/supply-network/components/create-version-modal/index.vue
- apps/main-app/src/views/master-data/supply-network/components/supply-table/index.vue
- apps/main-app/src/views/master-data/supply-network/index.vue
- apps/main-app/src/views/master-data/supply-network/useSupplyNetworkOrchestration.ts
- apps/main-app/src/views/order-grading/customer/components/create-version-modal/index.vue
- apps/main-app/src/views/order-grading/customer/components/customer-history-modal/DetailModal.vue
- apps/main-app/src/views/order-grading/customer/components/customer-history-modal/index.vue
- apps/main-app/src/views/order-grading/customer/components/diff-analysis/index.vue
- apps/main-app/src/views/order-grading/product/components/diff-analysis/index.vue
- apps/main-app/src/views/order-grading/product/components/product-history-modal/DetailModal.vue
- apps/main-app/src/views/order-grading/product/components/product-history-modal/index.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/components/DimensionEditModal.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/components/GradeNotifyModal.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/components/ReceiverConfigModal.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/components/WarningDetailModal.vue

## Commands

### pnpm -s run check:type

- exitCode: 0

```text
• Packages in scope: @decision-core/composables, @decision-core/design, @decision-core/form-ui, @decision-core/icons, @decision-core/layout-ui, @decision-core/menu-ui, @decision-core/popup-ui, @decision-core/preferences, @decision-core/shadcn-ui, @decision-core/shared, @decision-core/tabs-ui, @decision-core/typings, @decision/access, @decision/commitlint-config, @decision/common-ui, @decision/constants, @decision/eslint-config, @decision/hooks, @decision/icons, @decision/layouts, @decision/locales, @decision/main-app, @decision/node-utils, @decision/plugins, @decision/preferences, @decision/prettier-config, @decision/request, @decision/stores, @decision/stylelint-config, @decision/styles, @decision/tailwind-config, @decision/tsconfig, @decision/turbo-run, @decision/types, @decision/utils, @decision/vite-config, @decision/vsh
• Running typecheck in 37 packages
• Remote caching disabled
@decision/main-app:typecheck: cache miss, executing 427ea5657bebbd2a
@decision/main-app:typecheck: 
@decision/main-app:typecheck: > @decision/main-app@0.2.4 typecheck /Users/admin/Desktop/projects/optimos-intco-frontend/apps/main-app
@decision/main-app:typecheck: > vue-tsc --noEmit --skipLibCheck
@decision/main-app:typecheck: 

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    13.567s
• turbo 2.7.1
```
