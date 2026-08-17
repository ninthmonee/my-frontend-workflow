# Evidence: TWEAK

- runId: 20260708-173427-a4b5ba
- startedAt: 2026-07-08T09:34:27.887Z
- endedAt: 2026-07-08T09:34:30.446Z

## Changed Files

- apps/main-app/.env
- apps/main-app/index.html
- apps/main-app/src/app.vue
- apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue
- apps/main-app/src/views/demand-forecast/forecast-results/components/tab-container/index.vue
- apps/main-app/src/views/demand-forecast/version-management/components/modals/EditCollaborateVersionModal.vue
- internal/vite-config/src/options.ts
- internal/vite-config/src/plugins/license.ts
- internal/vite-config/src/utils/env.ts
- packages/@core/preferences/src/config.ts
- packages/locales/src/langs/en-US/authentication.json
- scripts/vsh/README.md

## Commands

### pnpm -s run check:type

- exitCode: 0

```text
• Packages in scope: @decision-core/composables, @decision-core/design, @decision-core/form-ui, @decision-core/icons, @decision-core/layout-ui, @decision-core/menu-ui, @decision-core/popup-ui, @decision-core/preferences, @decision-core/shadcn-ui, @decision-core/shared, @decision-core/tabs-ui, @decision-core/typings, @decision/access, @decision/commitlint-config, @decision/common-ui, @decision/constants, @decision/eslint-config, @decision/hooks, @decision/icons, @decision/layouts, @decision/locales, @decision/main-app, @decision/node-utils, @decision/plugins, @decision/preferences, @decision/prettier-config, @decision/request, @decision/stores, @decision/stylelint-config, @decision/styles, @decision/tailwind-config, @decision/tsconfig, @decision/turbo-run, @decision/types, @decision/utils, @decision/vite-config, @decision/vsh
• Running typecheck in 37 packages
• Remote caching disabled
@decision/main-app:typecheck: cache hit, replaying logs 60fb35a841eb71b5
@decision/main-app:typecheck: 
@decision/main-app:typecheck: > @decision/main-app@0.2.4 typecheck /Users/admin/Desktop/projects/optimos-intco-frontend/apps/main-app
@decision/main-app:typecheck: > vue-tsc --noEmit --skipLibCheck
@decision/main-app:typecheck: 

 Tasks:    1 successful, 1 total
Cached:    1 cached, 1 total
  Time:    1.033s >>> FULL TURBO
• turbo 2.7.1
```
