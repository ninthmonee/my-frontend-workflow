# TASKS — 产能分配-分配结果 Tab 顺序调整 + 需求满足新增预测版本筛选

## 1. Setup
- [x] 1.1 改前检索（tab-container 全文、forecast-results API、useDemandForecastForecastResults 用法、decisionYear 格式）
      files: `apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue`, `apps/main-app/src/api/demand-forecast/forecast-results.ts`, `apps/main-app/src/views/demand-forecast/forecast-results/composables/useDemandForecastForecastResults.ts`
      verify: 确认接口 `listDemandForecastForecastResultVersionsApi({ year })`、选项映射 `{ value: id, label: versionName }`、decisionYear 为 'YYYY'
      mapsTo: P0 Scope

## 2. Core
- [x] 2.1 调整 items 数组：需求满足（'2085294974701674496'）移到利润参考（'2059579268395966464'）之后
      files: `apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue`
      verify: items 顺序 = 产能分配结果 → 销售目标 → 利润参考 → 需求满足 → 内销库存计划 → 多版本对比 → 基础信息
      mapsTo: P0 Scope
- [x] 2.2 新增预测版本筛选状态与选项加载：`demandForecastVersionFilter` ref + `demandForecastVersionOptions` ref + `loadDemandForecastVersions()`（调用 `listDemandForecastForecastResultVersionsApi({ year: props.decisionYear })`，onMounted 触发；await-to-js 错误处理）
      files: 同上
      verify: 选项映射 `{ value: item.id, label: item.versionName }`；接口错误时选项为空数组
      mapsTo: P0 Scope / P0 Risks
- [x] 2.3 需求满足筛选栏新增"预测版本"多选 Select（放最前），绑定 `demandForecastVersionFilter`，options 用 `demandForecastVersionOptions`，复用现有 getPopupContainer 与 filter-bar 结构
      files: 同上
      verify: Select 属性与同栏其他筛选项一致（allow-clear / option-filter-prop / max-tag-count=1 / get-popup-container）
      mapsTo: P0 Scope
- [x] 2.4 params 更新：需求满足分支 `version_ids` 改为 `demandForecastVersionFilter.value.length > 0 ? demandForecastVersionFilter.value : [props.versionId]`；`request_ids` 保持 `[props.requestNum]`（不新增产能分配版本筛选）
      files: 同上
      verify: 选中预测版本时传选中值数组，未选中回退 `[props.versionId]`
      mapsTo: P0 Scope / P0 Risks

## 3. Integration
- [ ] 3.1 验证：`pnpm check:type` 通过
      verify: typecheck exit=0
      mapsTo: P0 Risks
