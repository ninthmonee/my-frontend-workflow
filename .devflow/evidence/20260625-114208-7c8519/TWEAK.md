# Evidence: TWEAK

- runId: 20260625-114208-7c8519
- startedAt: 2026-06-25T07:17:06.244Z
- endedAt: 2026-06-25T07:17:08.309Z

## Changed Files

- apps/main-app/src/router/routes/modules/micro-app.ts
- apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue
- apps/main-app/src/views/capacity-allocation/allocation-results/composables/useAllocationResults.ts
- apps/main-app/src/views/capacity-allocation/allocation-results/index.vue
- apps/main-app/src/views/order-grading/customer/components/diff-analysis/index.vue
- apps/main-app/src/views/order-grading/customer/index.vue
- apps/main-app/src/views/order-grading/customer/useCustomerOrchestration.ts
- apps/main-app/src/views/order-grading/product/components/diff-analysis/index.vue
- apps/main-app/src/views/order-grading/product/index.vue
- apps/main-app/src/views/order-grading/product/useProductOrchestration.ts
- apps/main-app/src/views/tracking-monitoring/warning-management/components/GradeWarningTab.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/components/TargetDeviationTab.vue
- apps/main-app/src/views/tracking-monitoring/warning-management/components/ThresholdConfigTab.vue
- apps/main-app/vite.config.mts

## Commands

### pnpm -s run check:type

- exitCode: 0

```text
• Packages in scope: @decision-core/composables, @decision-core/design, @decision-core/form-ui, @decision-core/icons, @decision-core/layout-ui, @decision-core/menu-ui, @decision-core/popup-ui, @decision-core/preferences, @decision-core/shadcn-ui, @decision-core/shared, @decision-core/tabs-ui, @decision-core/typings, @decision/access, @decision/commitlint-config, @decision/common-ui, @decision/constants, @decision/eslint-config, @decision/hooks, @decision/icons, @decision/layouts, @decision/locales, @decision/main-app, @decision/node-utils, @decision/plugins, @decision/preferences, @decision/prettier-config, @decision/request, @decision/stores, @decision/stylelint-config, @decision/styles, @decision/tailwind-config, @decision/tsconfig, @decision/turbo-run, @decision/types, @decision/utils, @decision/vite-config, @decision/vsh
• Running typecheck in 37 packages
• Remote caching disabled
@decision/main-app:typecheck: cache hit, replaying logs 287d1309bb8dad92
@decision/main-app:typecheck: 
@decision/main-app:typecheck: > @decision/main-app@0.2.4 typecheck /Users/admin/Desktop/projects/optimos-intco-frontend/apps/main-app
@decision/main-app:typecheck: > vue-tsc --noEmit --skipLibCheck
@decision/main-app:typecheck: 

 Tasks:    1 successful, 1 total
Cached:    1 cached, 1 total
  Time:    499ms >>> FULL TURBO
• turbo 2.7.1
```
