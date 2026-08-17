# TASKS — ScenarioParamDefinition 新增 isDisplay 渲染开关

> 需求：`definitions` 每一项新增 `isDisplay`；`true`/缺失 → 渲染，`false` → 跳过渲染。涉及场景配置 ParamCard 与创建版本弹窗 ParamGrid 两个渲染点。

## 1. Setup — 类型

- [x] 1.1 `scenario.ts`：`ScenarioParamDefinition` 新增 `isDisplay?: boolean`（注释：false 时跳过渲染）
  - files: `apps/main-app/src/api/capacity-allocation/scenario.ts`
  - verify: typecheck 通过
  - mapsTo: P0 Scope 类型层

## 2. Core — 渲染过滤

- [x] 2.1 `ParamCard.vue`：`sortedDefinitions` 先过滤 `isDisplay !== false` 再排序
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/components/ParamCard.vue`
  - verify: isDisplay:false 的项不渲染
  - mapsTo: P0 Scope 渲染层

- [x] 2.2 `ParamGrid.vue`：`normalizeFields` 中 definitions 先过滤 `isDisplay !== false` 再 map
  - files: `apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/ParamGrid.vue`
  - verify: isDisplay:false 的字段不渲染输入控件
  - mapsTo: P0 Scope 渲染层

## 3. Core — 提交一致性（isDisplay:false 不初始化/不提交）

- [x] 3.1 `useCreateVersionModal.ts`：`initGroupValues`（289 行）遍历 definitions 时过滤 `isDisplay !== false`
  - files: `apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/composables/useCreateVersionModal.ts`
  - verify: 隐藏字段不产生初始值
  - mapsTo: P0 Scope 一致性 / Risk 1

- [x] 3.2 `useCreateVersionModal.ts`：`handleOk` 提交（531 行）遍历 definitions 时过滤 `isDisplay !== false`
  - files: 同上
  - verify: 隐藏字段不提交
  - mapsTo: P0 Scope 一致性 / Risk 1

## 4. Verification

- [ ] 4.1 `pnpm check:type` 通过；build / lint / format 通过
  - files: —
  - verify: 全部 exit=0
  - mapsTo: P0 Scope 验证
