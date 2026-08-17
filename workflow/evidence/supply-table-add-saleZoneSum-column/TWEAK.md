# Evidence: TWEAK

- runId: supply-table-add-saleZoneSum-column
- startedAt: 2026-08-10T02:24:30.427Z
- endedAt: 2026-08-10T02:24:32.915Z

## Changed Files

- apps/main-app/src/api/master-data/supply-network.ts
- apps/main-app/src/views/master-data/supply-network/components/control-bar/index.vue
- apps/main-app/src/views/master-data/supply-network/components/supply-table/index.vue
- apps/main-app/src/views/master-data/supply-network/index.vue
- apps/main-app/src/views/order-grading/customer/components/control-bar/index.vue
- apps/main-app/src/views/order-grading/customer/useCustomerOrchestration.ts

## Commands

### pnpm -s run check:type

- exitCode: 0

```text
• Packages in scope: @decision-core/composables, @decision-core/design, @decision-core/form-ui, @decision-core/icons, @decision-core/layout-ui, @decision-core/menu-ui, @decision-core/popup-ui, @decision-core/preferences, @decision-core/shadcn-ui, @decision-core/shared, @decision-core/tabs-ui, @decision-core/typings, @decision/access, @decision/commitlint-config, @decision/common-ui, @decision/constants, @decision/eslint-config, @decision/hooks, @decision/icons, @decision/layouts, @decision/locales, @decision/main-app, @decision/node-utils, @decision/plugins, @decision/preferences, @decision/prettier-config, @decision/request, @decision/stores, @decision/stylelint-config, @decision/styles, @decision/tailwind-config, @decision/tsconfig, @decision/turbo-run, @decision/types, @decision/utils, @decision/vite-config, @decision/vsh
• Running typecheck in 37 packages
• Remote caching disabled
@decision/main-app:typecheck: cache hit, replaying logs cf7b299afa9601bf
@decision/main-app:typecheck: 
@decision/main-app:typecheck: > @decision/main-app@0.2.4 typecheck /Users/admin/Desktop/projects/optimos-intco-frontend/apps/main-app
@decision/main-app:typecheck: > vue-tsc --noEmit --skipLibCheck
@decision/main-app:typecheck: 

 Tasks:    1 successful, 1 total
Cached:    1 cached, 1 total
  Time:    823ms >>> FULL TURBO
• turbo 2.7.1
```
