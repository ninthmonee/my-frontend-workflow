# Evidence: TWEAK

- runId: product-table-decimal
- startedAt: 2026-08-13T09:27:21.717Z
- endedAt: 2026-08-13T09:27:36.612Z

## Changed Files

- .stylelintcache
- apps/main-app/components.d.ts
- apps/main-app/src/api/core/currency.ts
- apps/main-app/src/api/core/index.ts
- apps/main-app/src/api/request.ts
- apps/main-app/src/components/currency-switch/index.vue
- apps/main-app/src/composables/use-currency.ts
- apps/main-app/src/layouts/basic.vue
- apps/main-app/src/store/enum.ts
- apps/main-app/src/views/master-data/supply-network/components/add-path-modal/index.vue
- apps/main-app/src/views/master-data/supply-network/components/supply-table/index.vue
- apps/main-app/src/views/master-data/supply-network/useSupplyNetworkOrchestration.ts
- apps/main-app/src/views/order-grading/customer/components/charts-grid/index.vue
- apps/main-app/src/views/order-grading/customer/components/customer-table/use-columns.tsx
- apps/main-app/src/views/order-grading/customer/components/kpi-grid/index.vue
- apps/main-app/src/views/order-grading/customer/useCustomerOrchestration.ts
- apps/main-app/src/views/order-grading/product/components/charts-grid/index.vue
- apps/main-app/src/views/order-grading/product/components/kpi-grid/index.vue
- apps/main-app/src/views/order-grading/product/components/product-table/use-columns.tsx
- apps/main-app/src/views/order-grading/product/useProductOrchestration.ts
- apps/main-app/src/需求文档.md

## Commands

### pnpm -s run check:type

- exitCode: 0

```text
• Packages in scope: @decision-core/composables, @decision-core/design, @decision-core/form-ui, @decision-core/icons, @decision-core/layout-ui, @decision-core/menu-ui, @decision-core/popup-ui, @decision-core/preferences, @decision-core/shadcn-ui, @decision-core/shared, @decision-core/tabs-ui, @decision-core/typings, @decision/access, @decision/commitlint-config, @decision/common-ui, @decision/constants, @decision/eslint-config, @decision/hooks, @decision/icons, @decision/layouts, @decision/locales, @decision/main-app, @decision/node-utils, @decision/plugins, @decision/preferences, @decision/prettier-config, @decision/request, @decision/stores, @decision/stylelint-config, @decision/styles, @decision/tailwind-config, @decision/tsconfig, @decision/turbo-run, @decision/types, @decision/utils, @decision/vite-config, @decision/vsh
• Running typecheck in 37 packages
• Remote caching disabled
@decision/main-app:typecheck: cache miss, executing 802c88513fa285dd
@decision/main-app:typecheck: 
@decision/main-app:typecheck: > @decision/main-app@0.2.4 typecheck /Users/admin/Desktop/projects/optimos-intco-frontend/apps/main-app
@decision/main-app:typecheck: > vue-tsc --noEmit --skipLibCheck
@decision/main-app:typecheck: 

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    13.603s
• turbo 2.7.1
```
