# Evidence: TWEAK

- runId: fix-vite-proxy-dana
- startedAt: 2026-08-07T07:14:02.463Z
- endedAt: 2026-08-07T07:14:19.309Z

## Changed Files

- .stylelintcache
- apps/main-app/src/api/master-data/supply-network.ts
- apps/main-app/src/api/order-grading/customer.ts
- apps/main-app/src/locales/langs/zh-CN/page.json
- apps/main-app/src/store/enum.ts
- apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue
- apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/version-info.vue
- apps/main-app/src/views/capacity-allocation/scenario-config/constants.ts
- apps/main-app/src/views/capacity-allocation/scenario-config/index.vue
- apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/ParamGrid.vue
- apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/index.vue
- apps/main-app/src/views/capacity-allocation/version-management/components/version-table/index.vue
- apps/main-app/src/views/capacity-allocation/version-management/constants.ts
- apps/main-app/src/views/capacity-allocation/version-management/创建版本弹窗设计文档.md
- apps/main-app/src/views/demand-forecast/forecast-results/components/tab-container/index.vue
- apps/main-app/src/views/demand-forecast/forecast-results/components/tab-container/version-info.vue
- apps/main-app/src/views/demand-forecast/version-management/components/modals/components/DirectEditTabContent.vue
- apps/main-app/src/views/master-data/supply-network/README.md
- apps/main-app/src/views/master-data/supply-network/components/add-path-modal/index.vue
- apps/main-app/src/views/master-data/supply-network/components/coefficient-adjust/index.vue
- apps/main-app/src/views/master-data/supply-network/components/control-bar/index.vue
- apps/main-app/src/views/master-data/supply-network/components/create-version-modal/index.vue
- apps/main-app/src/views/master-data/supply-network/components/supply-table/index.vue
- apps/main-app/src/views/master-data/supply-network/constants.ts
- apps/main-app/src/views/master-data/supply-network/index.vue
- apps/main-app/src/views/master-data/supply-network/types.ts
- apps/main-app/src/views/order-grading/customer/README.md
- apps/main-app/src/views/order-grading/customer/components/charts-grid/index.vue
- apps/main-app/src/views/order-grading/customer/components/control-bar/index.vue
- apps/main-app/src/views/order-grading/customer/components/customer-history-modal/DetailModal.vue
- apps/main-app/src/views/order-grading/customer/components/customer-table/use-columns.tsx
- apps/main-app/src/views/order-grading/customer/components/diff-analysis/index.vue
- apps/main-app/src/views/order-grading/customer/type.ts
- apps/main-app/src/views/order-grading/customer/useCustomerOrchestration.ts
- apps/main-app/src/views/order-grading/product/README.md
- apps/main-app/src/views/order-grading/product/components/control-bar/index.vue
- apps/main-app/src/views/order-grading/product/types.ts
- apps/main-app/src/views/order-grading/product/useProductOrchestration.ts
- apps/main-app/src/views/tracking-monitoring/target-monitoring/index.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/components/DimensionEditModal.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/components/GradeNotifyModal.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/components/TargetDeviationTab.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/components/ThresholdConfigTab.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/components/WarningDetailModal.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/index.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/types.ts
- apps/main-app/src/views/tracking-monitoring/warning-management/预警管理接口文档.md
- apps/main-app/vite.config.mts

## Commands

### pnpm -s run check:type

- exitCode: 0

```text
• Packages in scope: @decision-core/composables, @decision-core/design, @decision-core/form-ui, @decision-core/icons, @decision-core/layout-ui, @decision-core/menu-ui, @decision-core/popup-ui, @decision-core/preferences, @decision-core/shadcn-ui, @decision-core/shared, @decision-core/tabs-ui, @decision-core/typings, @decision/access, @decision/commitlint-config, @decision/common-ui, @decision/constants, @decision/eslint-config, @decision/hooks, @decision/icons, @decision/layouts, @decision/locales, @decision/main-app, @decision/node-utils, @decision/plugins, @decision/preferences, @decision/prettier-config, @decision/request, @decision/stores, @decision/stylelint-config, @decision/styles, @decision/tailwind-config, @decision/tsconfig, @decision/turbo-run, @decision/types, @decision/utils, @decision/vite-config, @decision/vsh
• Running typecheck in 37 packages
• Remote caching disabled
@decision/main-app:typecheck: cache miss, executing f05f001e450eb289
@decision/main-app:typecheck: 
@decision/main-app:typecheck: > @decision/main-app@0.2.4 typecheck /Users/admin/Desktop/projects/optimos-intco-frontend/apps/main-app
@decision/main-app:typecheck: > vue-tsc --noEmit --skipLibCheck
@decision/main-app:typecheck: 

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    15.384s
• turbo 2.7.1
```
