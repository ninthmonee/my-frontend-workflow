# Evidence: TWEAK

- runId: param-grid-column-widths
- startedAt: 2026-08-05T10:48:32.142Z
- endedAt: 2026-08-05T10:48:53.141Z

## Changed Files

- apps/main-app/src/api/capacity-allocation/scenario.ts
- apps/main-app/src/api/capacity-allocation/version.ts
- apps/main-app/src/views/capacity-allocation/scenario-config/components/CreateScenarioModal.vue
- apps/main-app/src/views/capacity-allocation/scenario-config/components/InventoryLevelCard.vue
- apps/main-app/src/views/capacity-allocation/scenario-config/components/ParamCard.vue
- apps/main-app/src/views/capacity-allocation/scenario-config/composables/useBaseScenarioParamGroups.ts
- apps/main-app/src/views/capacity-allocation/scenario-config/composables/useScenarioConfig.ts
- apps/main-app/src/views/capacity-allocation/scenario-config/index.vue
- apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/ParamGrid.vue
- apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/composables/useCreateVersionModal.ts
- apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/index.vue
- apps/main-app/src/views/capacity-allocation/version-management/constants.ts
- apps/main-app/src/views/capacity-allocation/version-management/创建版本弹窗设计文档.md
- apps/main-app/vite.config.mts

## Commands

### pnpm -s run check:type

- exitCode: 0

```text
• Packages in scope: @decision-core/composables, @decision-core/design, @decision-core/form-ui, @decision-core/icons, @decision-core/layout-ui, @decision-core/menu-ui, @decision-core/popup-ui, @decision-core/preferences, @decision-core/shadcn-ui, @decision-core/shared, @decision-core/tabs-ui, @decision-core/typings, @decision/access, @decision/commitlint-config, @decision/common-ui, @decision/constants, @decision/eslint-config, @decision/hooks, @decision/icons, @decision/layouts, @decision/locales, @decision/main-app, @decision/node-utils, @decision/plugins, @decision/preferences, @decision/prettier-config, @decision/request, @decision/stores, @decision/stylelint-config, @decision/styles, @decision/tailwind-config, @decision/tsconfig, @decision/turbo-run, @decision/types, @decision/utils, @decision/vite-config, @decision/vsh
• Running typecheck in 37 packages
• Remote caching disabled
@decision/main-app:typecheck: cache miss, executing 65db5f2e472f7378
@decision/main-app:typecheck: 
@decision/main-app:typecheck: > @decision/main-app@0.2.4 typecheck /Users/admin/Desktop/projects/optimos-intco-frontend/apps/main-app
@decision/main-app:typecheck: > vue-tsc --noEmit --skipLibCheck
@decision/main-app:typecheck: 

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    19.098s
[WARN] The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.peerDependencyRules", "pnpm.overrides", "pnpm.neverBuiltDependencies". See https://pnpm.io/settings for the new home of each setting.
• turbo 2.7.1
```
