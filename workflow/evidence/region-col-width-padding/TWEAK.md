# Evidence: TWEAK

- runId: region-col-width-padding
- startedAt: 2026-07-16T08:52:34.892Z
- endedAt: 2026-07-16T08:52:49.356Z

## Changed Files

- apps/main-app/src/api/capacity-allocation/scenario.ts
- apps/main-app/src/api/capacity-allocation/version.ts
- apps/main-app/src/views/capacity-allocation/scenario-config/components/InventoryLevelCard.vue
- apps/main-app/src/views/capacity-allocation/scenario-config/composables/useScenarioConfig.ts
- apps/main-app/src/views/capacity-allocation/scenario-config/constants.ts
- apps/main-app/src/views/capacity-allocation/scenario-config/index.vue
- apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/ParamGrid.vue
- apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/composables/useCreateVersionModal.ts
- apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/index.vue
- apps/main-app/src/views/capacity-allocation/version-management/constants.ts
- apps/main-app/src/views/capacity-allocation/version-management/index.vue
- apps/main-app/vite.config.mts

## Commands

### pnpm -s run check:type

- exitCode: 0

```text
• Packages in scope: @decision-core/composables, @decision-core/design, @decision-core/form-ui, @decision-core/icons, @decision-core/layout-ui, @decision-core/menu-ui, @decision-core/popup-ui, @decision-core/preferences, @decision-core/shadcn-ui, @decision-core/shared, @decision-core/tabs-ui, @decision-core/typings, @decision/access, @decision/commitlint-config, @decision/common-ui, @decision/constants, @decision/eslint-config, @decision/hooks, @decision/icons, @decision/layouts, @decision/locales, @decision/main-app, @decision/node-utils, @decision/plugins, @decision/preferences, @decision/prettier-config, @decision/request, @decision/stores, @decision/stylelint-config, @decision/styles, @decision/tailwind-config, @decision/tsconfig, @decision/turbo-run, @decision/types, @decision/utils, @decision/vite-config, @decision/vsh
• Running typecheck in 37 packages
• Remote caching disabled
@decision/main-app:typecheck: cache miss, executing 847ac2504cfbc747
@decision/main-app:typecheck: 
@decision/main-app:typecheck: > @decision/main-app@0.2.4 typecheck /Users/admin/Desktop/projects/optimos-intco-frontend/apps/main-app
@decision/main-app:typecheck: > vue-tsc --noEmit --skipLibCheck
@decision/main-app:typecheck: 

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    13.079s
• turbo 2.7.1
```
