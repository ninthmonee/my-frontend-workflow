# TASKS — stocking-expectation-card

> 需求：产能分配-创建版本弹窗参数块中新增「期望库存水位」参数卡片（仓库 / 丁腈（标箱）/ PVC（标箱）三列，除仓库列外为可编辑数字输入框），提交结构对齐 STOCKING_EXPECTATION paramValues（CN_NBR 等 flat key）。
> 现状：数据层（constants + useCreateVersionModal）已完整，仅缺 ParamGrid.vue 的 UI 渲染分支与 props 透传。

## 1. Core

- [x] 1.1 ParamGrid.vue 新增 stockingValues prop 与表格结构定义
  - files: `apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/ParamGrid.vue`
  - verify: script 中新增 `stockingValues` prop、`stockingColumns`（仓库/丁腈（标箱）/PVC（标箱））、基于 `STOCKING_LOCATIONS` 的行数据；typecheck 通过
  - mapsTo: P0 Scope#ParamGrid.vue

- [x] 1.2 ParamGrid.vue 模板新增 STOCKING_EXPECTATION 表格分支
  - files: 同 1.1
  - verify: `STOCKING_EXPECTATION` 渲染为 ATable，仓库列只读文本，NBR/PVC 列为 InputNumber（min=0，无 % 后缀/无 100 上限），编辑写回 `stockingValues[`${loc}_${prod}`]`，禁用态跟随 `isGroupEnabled('STOCKING_EXPECTATION')`
  - mapsTo: P0 Scope#ParamGrid.vue

## 2. Integration

- [x] 2.1 index.vue 解构并传入 stockingValues
  - files: `apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/index.vue`
  - verify: 从 `useCreateVersionModal()` 解构 `stockingValues` 并作为 prop 传给 `<ParamGrid>`；typecheck 通过
  - mapsTo: P0 Scope#index.vue

## 3. P3 反馈修复（用户指定布局调整）

- [x] 3.1 paramGridItems 调整为用户指定 4 列布局
  - files: `.../CreateVersionModal/composables/useCreateVersionModal.ts`
  - verify: 列1=预测数据+产品组合（stacked），列2=供应能力+客户满足（stacked），列3=区域平衡，列4=期望库存水位
  - mapsTo: P3 用户反馈

- [x] 3.2 ParamGrid.vue 修复 stacked key 冲突 + 表头不换行 + 列宽紧凑化
  - files: `.../CreateVersionModal/ParamGrid.vue`
  - verify: 两个 stacked 项 key 唯一；表格 th white-space nowrap（丁腈（标箱）/PVC（标箱）不换行）；grid-template-columns 调整为单行 4 列无空白第二行
  - mapsTo: P3 用户反馈
