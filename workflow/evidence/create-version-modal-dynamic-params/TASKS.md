# TASKS — 创建版本弹窗动态参数 + 默认内建场景

> 需求：① 创建版本弹窗「引用场景」默认选中内建（builtIn=true）场景；② 场景参数块内容动态渲染（替代 CREATE_PARAM_GROUPS 硬编码）；③ 区域平衡、期望库存水位为表格形式，用 paramValues + definitions 结合驱动。

## 1. Setup — 类型与常量

- [x] 1.1 确认/补充 `ScenarioDetailGroup` / `ScenarioParamDefinition` 类型覆盖 `paramValues`（`Record<string, number>` 已够用：data.md 中区域平衡 paramValues 为 `{max,min}` 对象、库存为 `{PVC,丁腈}` 对象 → 需扩展为 `Record<string, unknown>` 或细化联合类型）
  - files: `apps/main-app/src/api/capacity-allocation/scenario.ts`
  - verify: typecheck 通过；场景配置页不破坏（上一轮已放宽过 paramValues，需确认 useCreateVersionModal 兼容）
  - mapsTo: P0 Scope 类型层 / Risk 2

## 2. Core — composable 数据流

- [x] 2.1 `useCreateVersionModal.ts`：
  - `loadScenarios` 成功后自动选中 builtIn=true 场景（`scenarioId.value = builtIn.scenarioId`），触发 `onScenarioChange`
  - 新增 `detailGroups` ref 保存当前场景详情 groups（含 definitions）
  - `onScenarioChange`：从场景详情 groups 动态构建 paramGridItems（替代 CREATE_PARAM_GROUPS 查找）：按 groupCode 分组，FORECAST_DATA+PRODUCT_MIX 堆叠、SUPPLY_CAPABILITY+CUSTOMER_SATISFACTION 堆叠、REGIONAL_BALANCE 单列、STOCKING_EXPECTATION 单列（顺序与现有一致）；同时从 paramValues 回填 regionBalanceRows / stockingValues（data.md 结构：区域 paramValues 为 {区域中文名: {max,min}}，库存为 {区域: {PVC,丁腈}}）
  - `initGroupValues` / `handleOk` 改造：基于 detailGroups.definitions 动态生成/提交 paramValues（替代 fields 硬编码）
  - files: `apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/composables/useCreateVersionModal.ts`
  - verify: 选择场景后参数块内容来自该场景 definitions；区域/库存表格回填 paramValues
  - mapsTo: P0 Scope 数据流 / Risk 1、3

- [x] 2.2 `applyConstraints` 保持兼容：约束接口返回的仍是大区扁平字段（DOMESTIC 等），需与新 paramValues 结构（中文区域名）映射
  - files: 同上
  - verify: 约束回填仍工作
  - mapsTo: P0 Scope 数据流 / Risk 3

## 3. Core — ParamGrid 动态渲染

- [x] 3.1 `ParamGrid.vue`：
  - paramGridItems 结构改为携带 `definitions`（由 composable 传入），普通组字段遍历 definitions 渲染（select 由 uiConfigJson.component==='select' 判断；其余 number）
  - REGIONAL_BALANCE 表格行来自 paramValues（区域名 → min/max），列为 大区/下限/上限
  - STOCKING_EXPECTATION 表格行/列来自 definitions.valueJson.materials（如 {PVC, 丁腈}）与 paramValues（区域 → 物料值）
  - files: `apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/ParamGrid.vue`
  - verify: 参数块动态渲染；两张表格数据正确
  - mapsTo: P0 Scope 组件层 / Risk 1、4

## 4. Verification

- [x] 4.1 `pnpm check:type` 通过；build / lint / format 通过
  - files: —
  - verify: 全部 exit=0
  - mapsTo: P0 Scope 验证
