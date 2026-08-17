# TASKS — 场景配置动态渲染 + 区域平衡表格

> 需求：场景配置按 data.md 数据结构（groups + definitions）动态渲染 group 及内部结构；REGIONAL_BALANCE 改为三列表格（大区 / 上限 / 下限）。

## 1. Setup — 类型层

- [x] 1.1 扩展 `apps/main-app/src/api/capacity-allocation/scenario.ts`：`ScenarioDetail.groups[]` 增加 `name`、`definitions` 字段；新增 `ScenarioParamDefinition`、`ScenarioDetailGroup` 类型（对齐 data.md 结构：groupCode/name/enabled/paramValues/definitions；definition: code/name/description/displayValue/dataType/valueJson/validationRuleJson/uiConfigJson/sortOrder/required）
  - files: `apps/main-app/src/api/capacity-allocation/scenario.ts`
  - verify: typecheck 通过；CreateScenarioModal 引用不破坏
  - mapsTo: P0 Scope 类型层

## 2. Core — 数据流

- [x] 2.1 `useScenarioConfig.ts`：`loadScenarioDetail` 保留完整 groups（新增 `detailGroups` ref）；`saveEdit` 基于 detailGroups 的 groupCode 顺序提交 enabled（detailGroups 为空时回退 `SCENARIO_GROUP_CODES`）
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/composables/useScenarioConfig.ts`
  - verify: enabledGroups/editingGroups 勾选逻辑不变；保存 payload 结构不变（UpdateScenarioParams）
  - mapsTo: P0 Scope 数据流 / Risk 3

## 3. Core — 组件动态渲染

- [x] 3.1 `ParamCard.vue`：`group` prop 类型改为动态类型（ScenarioDetailGroup）；内部按 `definitions`（sortOrder 排序）渲染 name + description；definitions 为空显示兜底占位；`defineModel('enabled')` 契约不变
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/components/ParamCard.vue`
  - verify: 卡片标题用 group.name；项列表来自 definitions
  - mapsTo: P0 Scope 组件层 / Risk 1

- [x] 3.2 `InventoryLevelCard.vue`：`group` prop 类型更新为动态类型；标题仍用 group.name；表格结构不变
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/components/InventoryLevelCard.vue`
  - verify: 标题动态、表格渲染正常
  - mapsTo: P0 Scope 组件层

- [-] 3.3 ~~新增 `RegionalBalanceCard.vue`~~（YAGNI 已跳过）：用户确认区域平衡不显示表格，与 ParamCard 统一按 name + description 渲染；组件重复故不新建
  - files: —
  - verify: —
  - mapsTo: P0 Scope 组件层 / Risk 2

## 4. Integration — 页面组装

- [x] 4.1 `index.vue`：循环渲染 `detailGroups`（替代 SCENARIO_GROUP_CODES 硬编码循环）；按 groupCode 分流：STOCKING_EXPECTATION → InventoryLevelCard、其他（含 REGIONAL_BALANCE）→ ParamCard；key 用 groupCode；卡片 enabled 状态仍走 isGroupEnabled/toggleGroup
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/index.vue`
  - verify: 6 组卡片按接口数据渲染；勾选/保存流程不变
  - mapsTo: P0 Scope 页面层 / Risk 1

## 5. Verification

- [ ] 5.1 `pnpm check:type` 通过；build / lint / format 通过
  - files: —
  - verify: 全部 exit=0
  - mapsTo: P0 Scope 验证
