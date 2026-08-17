# Evidence: TWEAK

- runId: rename-country-to-country-region
- startedAt: 2026-08-07T08:48:27.994Z
- endedAt: 2026-08-07T08:48:42.645Z

## Changed Files

- apps/main-app/src/api/order-grading/customer.ts
- apps/main-app/src/store/enum.ts
- apps/main-app/src/views/order-grading/customer/components/control-bar/index.vue
- apps/main-app/src/views/order-grading/customer/components/customer-table/types.ts
- apps/main-app/src/views/order-grading/customer/components/customer-table/use-columns.tsx
- apps/main-app/src/views/order-grading/customer/type.ts
- apps/main-app/src/views/order-grading/customer/useCustomerOrchestration.ts
- apps/main-app/src/views/order-grading/product/components/control-bar/index.vue
- apps/main-app/src/views/order-grading/product/types.ts
- apps/main-app/src/views/order-grading/product/useProductOrchestration.ts

## Commands

### pnpm -s run check:type

- exitCode: 0

```text
• Packages in scope: @decision-core/composables, @decision-core/design, @decision-core/form-ui, @decision-core/icons, @decision-core/layout-ui, @decision-core/menu-ui, @decision-core/popup-ui, @decision-core/preferences, @decision-core/shadcn-ui, @decision-core/shared, @decision-core/tabs-ui, @decision-core/typings, @decision/access, @decision/commitlint-config, @decision/common-ui, @decision/constants, @decision/eslint-config, @decision/hooks, @decision/icons, @decision/layouts, @decision/locales, @decision/main-app, @decision/node-utils, @decision/plugins, @decision/preferences, @decision/prettier-config, @decision/request, @decision/stores, @decision/stylelint-config, @decision/styles, @decision/tailwind-config, @decision/tsconfig, @decision/turbo-run, @decision/types, @decision/utils, @decision/vite-config, @decision/vsh
• Running typecheck in 37 packages
• Remote caching disabled
@decision/main-app:typecheck: cache miss, executing cf0fe913d8f5817d
@decision/main-app:typecheck: 
@decision/main-app:typecheck: > @decision/main-app@0.2.4 typecheck /Users/admin/Desktop/projects/optimos-intco-frontend/apps/main-app
@decision/main-app:typecheck: > vue-tsc --noEmit --skipLibCheck
@decision/main-app:typecheck: 

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    13.064s
• turbo 2.7.1
```
