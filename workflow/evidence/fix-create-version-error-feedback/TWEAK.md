# Evidence: TWEAK

- runId: fix-create-version-error-feedback
- startedAt: 2026-07-23T03:24:47.852Z
- endedAt: 2026-07-23T03:25:00.416Z

## Changed Files

- apps/main-app/src/router/routes/modules/capacity-allocation-target.ts
- apps/main-app/src/router/routes/modules/master-data.ts
- apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/version-info.vue
- apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/composables/useCreateVersionModal.ts
- apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/index.vue
- apps/main-app/src/views/order-grading/customer/components/kpi-grid/index.vue
- apps/main-app/src/views/order-grading/product/components/charts-grid/index.vue
- apps/main-app/src/views/order-grading/product/components/kpi-grid/index.vue

## Commands

### pnpm -s run check:type

- exitCode: 0

```text
• Packages in scope: @decision-core/composables, @decision-core/design, @decision-core/form-ui, @decision-core/icons, @decision-core/layout-ui, @decision-core/menu-ui, @decision-core/popup-ui, @decision-core/preferences, @decision-core/shadcn-ui, @decision-core/shared, @decision-core/tabs-ui, @decision-core/typings, @decision/access, @decision/commitlint-config, @decision/common-ui, @decision/constants, @decision/eslint-config, @decision/hooks, @decision/icons, @decision/layouts, @decision/locales, @decision/main-app, @decision/node-utils, @decision/plugins, @decision/preferences, @decision/prettier-config, @decision/request, @decision/stores, @decision/stylelint-config, @decision/styles, @decision/tailwind-config, @decision/tsconfig, @decision/turbo-run, @decision/types, @decision/utils, @decision/vite-config, @decision/vsh
• Running typecheck in 37 packages
• Remote caching disabled
@decision/main-app:typecheck: cache miss, executing 738db34e28bb106b
@decision/main-app:typecheck: 
@decision/main-app:typecheck: > @decision/main-app@0.2.4 typecheck /Users/admin/Desktop/projects/optimos-intco-frontend/apps/main-app
@decision/main-app:typecheck: > vue-tsc --noEmit --skipLibCheck
@decision/main-app:typecheck: 

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    11.3s
• turbo 2.7.1
```
