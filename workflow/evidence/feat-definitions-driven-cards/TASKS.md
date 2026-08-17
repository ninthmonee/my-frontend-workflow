# TASKS — feat-definitions-driven-cards

## 1. API 类型层

- [x] 1.1 新增 `ScenarioParamDefinition` 类型
  - `files`: `apps/main-app/src/api/capacity-allocation/scenario.ts`
  - `verify`: `check:type` 通过，类型包含 code/name/description/displayValue/dataType/valueJson/validationRuleJson/uiConfigJson/sortOrder/required
  - `mapsTo`: P0 Scope — 类型契约变更

- [x] 1.2 更新 `ScenarioDetail.groups` 增加 `definitions` 字段
  - `files`: `apps/main-app/src/api/capacity-allocation/scenario.ts`
  - `verify`: `check:type` 通过，`ScenarioDetail.groups[].definitions` 类型为 `ScenarioParamDefinition[]`
  - `mapsTo`: P0 Scope — 类型契约变更

## 2. 数据层

- [x] 2.1 `useScenarioConfig` 存储完整场景详情（含 definitions），暴露 `scenarioDetail` ref
  - `files`: `apps/main-app/src/views/capacity-allocation/scenario-config/composables/useScenarioConfig.ts`
  - `verify`: composable 返回 `scenarioDetail`（ref），可通过 devtools 查看 definitions 数据
  - `mapsTo`: P0 Scope — 数据流重构

- [x] 2.2 `useScenarioConfig` 保留现有 enabled/editing/toggleGroup 逻辑不变
  - `files`: `apps/main-app/src/views/capacity-allocation/scenario-config/composables/useScenarioConfig.ts`
  - `verify`: 编辑模式：复选框勾选/取消 → editingGroups 变更 → 保存后 enabledGroups 同步
  - `mapsTo`: P0 Risks — 交互方式不变

## 3. 视图层

- [x] 3.1 `index.vue` 改为从 `scenarioDetail` 传 definitions 到卡片组件，用 groups[].name 作为卡片标题
  - `files`: `apps/main-app/src/views/capacity-allocation/scenario-config/index.vue`
  - `verify`: 切换场景 → 卡片内容根据 definitions 渲染；标题取自 groups[].name 而非硬编码
  - `mapsTo`: P0 Scope — 视图数据源切换

- [x] 3.2 `ParamCard.vue` 改为接受 `definitions` + `groupName` props，废弃 `ScenarioParamGroup`
  - `files`: `apps/main-app/src/views/capacity-allocation/scenario-config/components/ParamCard.vue`
  - `verify`: 卡片标题显示 groupName，body 渲染 definitions[].name + definitions[].description
  - `mapsTo`: P0 Scope — 组件契约变更

- [x] 3.3 `InventoryLevelCard.vue` 改为接受 `definitions` + `groupName` props，表格数据从 definitions 解析
  - `files`: `apps/main-app/src/views/capacity-allocation/scenario-config/components/InventoryLevelCard.vue`
  - `verify`: 表格保持 3 仓库 × 2 产品布局，每格显示 definitions 对应的 name/displayValue/description
  - `mapsTo`: P0 Scope — 组件契约变更

- [x] 3.4 清理 `index.vue` 中不再使用的 `SCENARIO_PARAM_GROUPS` import（保留在 constants.ts 供 CreateScenarioModal 使用）
  - `files`: `apps/main-app/src/views/capacity-allocation/scenario-config/constants.ts`
  - `verify`: 无 unused import 警告，`SCENARIO_PARAM_GROUPS` 引用全部清理
  - `mapsTo`: P0 Scope — 清理硬编码常量

## 4. 验证

- [x] 4.1 `check:type` + `build` 全部通过
  - `files`: 所有变更文件
  - `verify`: `pnpm check:type` exit=0, `pnpm lint` exit=0
  - `mapsTo`: P0 Risks — 质量门禁
