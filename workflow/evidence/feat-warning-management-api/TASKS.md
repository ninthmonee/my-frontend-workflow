# TASKS — feat-warning-management-api

## 1. Type Redesign (types.ts)

- [ ] **1.1** 重写 `types.ts`：定义 API 对齐的类型
  - `DimJson` — 8 个维度字段
  - `SendToItem` — `{ id: number; roleCode: string }`
  - `ThresholdConfigRow` — 对应 monitor-config API 响应
  - `WarningMessageRow` — 对应 monitor-alter-message API 响应（统一替代 GradeWarningRow + TargetDeviationWarningRow）
  - 保留 `WarningStatus`、`WarningTarget`、`RoleOption`、`EnumOptions`
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/types.ts`
  - **verify**: 类型定义完整，通过 typecheck
  - **mapsTo**: P0 Risks #1

## 2. API Module

- [ ] **2.1** 新建 `api/tracking-monitoring/warning.ts`
  - `getMonitorConfigListApi(type)` — GET `/app/rest/monitor-config/list`
  - `addMonitorConfigApi(data)` — POST `/app/rest/monitor-config/sales-target/add`
  - `editMonitorConfigApi(data)` — POST `/app/rest/monitor-config/sales-target/edit`
  - `deleteMonitorConfigApi(id)` — POST `/app/rest/monitor-config/sales-target/delete`
  - `getWarningMessageListApi(type)` — GET `/app/rest/monitor-alter-message/list`
  - `confirmWarningMessageApi(id)` — POST `/app/rest/monitor-alter-message/confirm`
  - **files**: `apps/main-app/src/api/tracking-monitoring/warning.ts` (new)
  - **verify**: API 函数签名正确，通过 typecheck
  - **mapsTo**: P0 Scope API 模块

- [ ] **2.2** 注册 barrel 导出
  - 创建 `api/tracking-monitoring/index.ts`
  - 修改 `api/index.ts` 注册模块
  - **files**: `apps/main-app/src/api/tracking-monitoring/index.ts` (new), `apps/main-app/src/api/index.ts`
  - **verify**: `import { ... } from '#/api'` 可正常引用
  - **mapsTo**: P0 Scope API 模块

## 3. Component Adaptation

- [ ] **3.1** 适配 `index.vue`
  - 移除 mock 数据
  - `onMounted` 中一次性并行请求 3 个 API：`getMonitorConfigListApi('ALES_TARGET')` + `getWarningMessageListApi('CUSTOMER_LEVEL')` + `getWarningMessageListApi('PRODUCT_LEVEL')` + `getWarningMessageListApi('ALES_TARGET')`
  - 统计计数适配新状态字段
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/index.vue`
  - **verify**: 页面初始化正确请求 4 个 API，数据渲染到各 Tab
  - **mapsTo**: P0 Risks #4

- [ ] **3.2** 适配 `ThresholdConfigTab.vue`
  - `rows` 类型保持 `ThresholdConfigRow[]`
  - 所有 `record.enabled` → `record.status` 判断；`record.fixed` → `record.builtIn`
  - `record.receivers` → `record.sendTo`
  - 扁平字段访问 → `record.dimJson.*` / `record.metricJson.*`
  - CRUD 操作接入 API（add/edit/delete/status toggle）
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/components/ThresholdConfigTab.vue`
  - **verify**: 阈值配置 CRUD 通过 API 操作，表格正常渲染
  - **mapsTo**: P0 Scope 阈值配置, Risks #1

- [ ] **3.3** 适配 `GradeWarningTab.vue`
  - `rows` 类型改为 `WarningMessageRow[]`
  - `record.versionName` → `record.metricsValue.version`
  - `record.region` + `record.subjectName` → `record.dimConcat`
  - 分级结果字段 → `record.metricsValue.versionLevel*`
  - `record.status` → 适配新状态值（数字/枚举）
  - 确认操作接入 API
  - 通知人配置接入 API
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/components/GradeWarningTab.vue`
  - **verify**: 分级预警列表正常渲染，确认/通知人功能正常
  - **mapsTo**: P0 Scope 分级预警, Risks #1

- [ ] **3.4** 适配 `TargetDeviationTab.vue`
  - `rows` 类型改为 `WarningMessageRow[]`
  - 扁平字段 → `record.dimJson.*` + `record.metricsValue.sales*`
  - `record.status` 适配新状态值
  - 确认操作接入 API
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/components/TargetDeviationTab.vue`
  - **verify**: 目标偏差列表正常渲染，确认功能正常
  - **mapsTo**: P0 Scope 目标偏差, Risks #1

- [ ] **3.5** 适配 `DimensionEditModal.vue`
  - 编辑结果从扁平结构 → API 格式（dimJson + metricJson）
  - 新增/编辑后直接调用 API（不在本地 resolve 假数据）
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/components/DimensionEditModal.vue`
  - **verify**: 弹窗打开/保存正确构建 API payload
  - **mapsTo**: P0 Risks #2

- [ ] **3.6** 适配 `ReceiverConfigModal.vue`
  - `receivers: string[]` → `sendTo: SendToItem[]`
  - 选择器值类型适配
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/components/ReceiverConfigModal.vue`
  - **verify**: 接收人选择/保存正确
  - **mapsTo**: P0 Risks #3

- [ ] **3.7** 适配 `ReceiverTags.vue`
  - `receivers: string[]` → `sendTo: SendToItem[]`
  - 展示逻辑适配
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/components/ReceiverTags.vue`
  - **verify**: 接收人标签正确展示
  - **mapsTo**: P0 Risks #3

- [ ] **3.8** 适配 `GradeNotifyModal.vue`
  - `receivers: string[]` → `sendTo: SendToItem[]`
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/components/GradeNotifyModal.vue`
  - **verify**: 通知人配置弹窗正常
  - **mapsTo**: P0 Risks #3

- [ ] **3.9** 适配 `WarningDetailModal.vue`
  - 入参类型从旧 grade/target 结构 → 新 WarningMessageRow 结构
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/components/WarningDetailModal.vue`
  - **verify**: 详情弹窗正确展示
  - **mapsTo**: P0 Risks #1

## 4. Verification

- [ ] **4.1** 全链路验证
  - `pnpm check:type` — 零错误
  - `pnpm build` — 编译成功
  - `pnpm lint` — 无新增 warning
  - **files**: 所有变更文件
  - **verify**: typecheck + build + lint 全部通过
  - **mapsTo**: P0 Risks #1, #2
