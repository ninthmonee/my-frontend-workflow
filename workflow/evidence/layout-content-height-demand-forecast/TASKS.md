# TASKS — layout-content-height-demand-forecast

## 1. 打破 flex-grow 高度链

- [ ] 1.1 两个 `index.vue` 的 `.page-shell__body` 去掉 `flex: 1; min-height: 0`
  - **files**: `forecast-results/index.vue`, `version-management/index.vue`
  - **verify**: `.page-shell__body` 无 `flex: 1` 或 `min-height: 0`
  - **mapsTo**: P0 Scope #1, #2

- [ ] 1.2 `tab-container/index.vue` 去掉 tab-shell 的 `height:100%` + 内部 `flex:1` + `overflow-y:auto`
  - **files**: `forecast-results/components/tab-container/index.vue`
  - **verify**: `.tab-shell` 无 `height: 100%`；`.tab-content`/`.tab-scroll`/`.predict-content` 无 `flex: 1`/`overflow-y: auto`
  - **mapsTo**: P0 Scope #3

- [ ] 1.3 `version-info.vue` 的 `.version-info` 去掉 flex + overflow
  - **files**: `forecast-results/components/tab-container/version-info.vue`
  - **verify**: `.version-info` 无 `flex: 1 1 auto` 和 `overflow: auto`
  - **mapsTo**: P0 Scope #4

- [ ] 1.4 `version-table/index.vue` 的 `.table-card` 去掉 `height:100%` + `.table-card__body` 去掉 `flex:1`
  - **files**: `version-management/components/version-table/index.vue`
  - **verify**: `.table-card` 无 `height: 100%`；`.table-card__body` 无 `flex: 1`
  - **mapsTo**: P0 Scope #5
