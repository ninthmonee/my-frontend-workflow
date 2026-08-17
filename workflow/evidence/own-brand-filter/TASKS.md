# 任务拆解 — own-brand-filter

## 1. API 类型扩展

### 1.1 PageForecastResultItem 新增 ownBrand 字段
- **files**: `apps/main-app/src/api/demand-forecast/version-management.ts`
- **verify**: `PageForecastResultItem` 类型包含 `ownBrand: string`（后端返回 `"1"` / `"0"`）
- **mapsTo**: P0 Scope — API 类型层

### 1.2 PageForecastResultParams 新增 ownBrand 筛选参数
- **files**: `apps/main-app/src/api/demand-forecast/version-management.ts`
- **verify**: `PageForecastResultParams` 类型包含 `ownBrand?: string[]`
- **mapsTo**: P0 Scope — API 类型层

### 1.3 ForecastBatchAdjustPayload 新增 ownBrand 参数
- **files**: `apps/main-app/src/api/demand-forecast/version-management.ts`
- **verify**: `ForecastBatchAdjustPayload` 类型包含 `ownBrand?: string[]`
- **mapsTo**: P0 Scope — API 类型层

## 2. Composable 层

### 2.1 filterState 新增 ownBrand
- **files**: `apps/main-app/src/views/demand-forecast/version-management/composables/useEditCollaborateData.ts`
- **verify**: `filterState` ref 初始值包含 `ownBrand: [] as string[]`
- **mapsTo**: P0 Scope — Composable 数据层

### 2.2 loadPageForecastResult 传递 ownBrand 筛选参数
- **files**: `apps/main-app/src/views/demand-forecast/version-management/composables/useEditCollaborateData.ts`
- **verify**: 当 `filterState.ownBrand.length > 0` 时，`params.ownBrand` 被设置
- **mapsTo**: P0 Scope — Composable 数据层

### 2.3 handleApplyCoefficient 传递 ownBrand
- **files**: `apps/main-app/src/views/demand-forecast/version-management/composables/useEditCollaborateData.ts`
- **verify**: `forecastBatchAdjustSaveApi` 调用包含 `ownBrand: filterState.value.ownBrand`
- **mapsTo**: P0 Scope — Composable 数据层

### 2.4 buildEditableRow 提取 ownBrand 字段
- **files**: `apps/main-app/src/views/demand-forecast/version-management/composables/useEditCollaborateData.ts`
- **verify**: 行对象包含 `ownBrand: item.ownBrand`
- **mapsTo**: P0 Scope — Composable 数据层

### 2.5 editableColumns 新增「自有品牌」列
- **files**: `apps/main-app/src/views/demand-forecast/version-management/composables/useEditCollaborateData.ts`
- **verify**: 表格固定列中新增一列 `dataIndex: 'ownBrand'`，render 为 Tag（"1"→自有品牌，"0"→非自有品牌）
- **mapsTo**: P0 Scope — 表格列渲染

## 3. UI 筛选组件

### 3.1 filterState defineModel 类型新增 ownBrand
- **files**: `apps/main-app/src/views/demand-forecast/version-management/components/modals/components/DirectEditTabContent.vue`
- **verify**: `filterState` defineModel 类型包含 `ownBrand: string[]`
- **mapsTo**: P0 Scope — UI 筛选层

### 3.2 模板新增「自有品牌」Select 筛选项
- **files**: `apps/main-app/src/views/demand-forecast/version-management/components/modals/components/DirectEditTabContent.vue`
- **verify**: filter-row 中新增 Select（mode="multiple"，options：[自有品牌=1, 非自有品牌=0]，@change 触发 onSearch）
- **mapsTo**: P0 Scope — UI 筛选层

## 4. 父组件验证

### 4.1 确认 EditCollaborateVersionModal 兼容性
- **files**: `apps/main-app/src/views/demand-forecast/version-management/components/modals/EditCollaborateVersionModal.vue`
- **verify**: `v-model:filter-state` 绑定自动透传新增的 `ownBrand` 字段，无需额外改动
- **mapsTo**: P0 Scope — 集成验证
