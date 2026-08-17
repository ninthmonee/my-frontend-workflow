# 任务拆解 — inventory-level-card

> 需求：在场景配置页面新增「期望库存水位」参数卡片
> 布局：三列表格（仓库 | 丁腈（标箱） | PVC（标箱）），行：越南 / 印尼 / 国内
> 非编辑：丁腈/PVC 列显示「来源：生产管理期望库存水平」
> 编辑：丁腈/PVC 列显示数字输入框

---

## 1. 数据层

- [x] 1.1 在 `constants.ts` 新增 `DOMESTIC_STOCKING_EXPECTATION_UB` 参数组定义（code: `domestic_stocking_expectation_ub`）
  - **files**: `apps/main-app/src/views/capacity-allocation/scenario-config/constants.ts`
  - **verify**: `SCENARIO_PARAM_GROUPS` 包含 `DOMESTIC_STOCKING_EXPECTATION_UB` 键（含 `code`、`name`、`locations`、`products`），`SCENARIO_GROUP_CODES` 包含 6 个 code
  - **mapsTo**: P0 Scope 1

- [x] 1.2 扩展 `ScenarioParamGroup` 类型以支持表格结构数据（可选 `locations`/`products` 字段）
  - **files**: `apps/main-app/src/views/capacity-allocation/scenario-config/constants.ts`
  - **verify**: TypeScript 类型推导正确，`InventoryLevelCard` 组件类型不报错
  - **mapsTo**: P0 Scope 1

## 2. UI 层

- [x] 2.1 新建 `InventoryLevelCard.vue` 组件
  - **files**: `apps/main-app/src/views/capacity-allocation/scenario-config/components/InventoryLevelCard.vue`
  - **verify**: 组件接收 `group`、`editing`、`isBuiltIn` props + `v-model:enabled`; 非编辑模式渲染三列表格，丁腈/PVC 列显示文案；编辑模式显示数字输入框；disabled 置灰对齐 ParamCard
  - **mapsTo**: P0 Scope 2

## 3. 集成

- [x] 3.1 修改 `index.vue` — cards-grid 循环中对 `DOMESTIC_STOCKING_EXPECTATION_UB` 渲染 `InventoryLevelCard`
  - **files**: `apps/main-app/src/views/capacity-allocation/scenario-config/index.vue`
  - **verify**: 页面正常渲染 6 个参数卡片，第 6 个为库存水位卡片；编辑/非编辑切换正确
  - **mapsTo**: P0 Scope 3

- [x] 3.2 修改 `useScenarioConfig.ts` — 新增库存水位编辑态数据管理
  - **files**: `apps/main-app/src/views/capacity-allocation/scenario-config/composables/useScenarioConfig.ts`
  - **verify**: `inventoryLevelData` ref 存在，save 时收集数据（沿用 TODO 标记）
  - **mapsTo**: P0 Scope 3

## 4. 验证

- [x] 4.1 Phase 2 验证 (build → format → lint → typecheck)
  - **files**: 上述全部
  - **verify**: 四条命令全部 exit=0
  - **mapsTo**: P0 Risks 1
