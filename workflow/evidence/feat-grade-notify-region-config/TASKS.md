# TASKS — feat-grade-notify-region-config

> 客户分级预警/产品分级预警的"配置预警通知人"弹窗改造：按五个大区分组展示通知人配置

## 1. Setup — 数据模型与传参

- [ ] 1.1 修改 `GradeNotifyModalArgs` 类型，新增 `regionOptions` 字段
  - **files**: `GradeNotifyModal.vue`
  - **verify**: TypeScript 编译通过，`regionOptions` 类型为 `Array<{ label: string; value: string }>`
  - **mapsTo**: Scope-1

- [ ] 1.2 在 `GradeWarningTab` 中传递 `regionOptions`（从 `props.enumOptions.regionOptions` 获取）给 `GradeNotifyModal`
  - **files**: `GradeWarningTab.vue`
  - **verify**: 调用 `notifyModal.show` 时包含 `regionOptions` 参数
  - **mapsTo**: Scope-2

## 2. Core — GradeNotifyModal 弹窗改造

- [ ] 2.1 重构弹窗内部数据模型：将单一 `formRoleCodes` 改为按大区分组的 `regionFormMap: Record<string, string[]>`
  - **files**: `GradeNotifyModal.vue`
  - **verify**: 每个大区独立维护自己的 roleCodes 数组，通过 `regionOptions` 初始化空数组
  - **mapsTo**: Scope-1, Risks-1

- [ ] 2.2 改造弹窗打开时的数据读取逻辑：从 API 返回的 `ThresholdConfigRow[]` 按 `dimJson.saleZone` 匹配到各大区，填充 `regionFormMap`
  - **files**: `GradeNotifyModal.vue`
  - **verify**: watch(args) 中正确解析 configs 数组，按 saleZone 分发到各区域
  - **mapsTo**: Scope-1

- [ ] 2.3 改造保存逻辑：遍历所有大区，每个大区独立调用 `editMonitorConfigApi`，使用对应的 id/status/builtIn
  - **files**: `GradeNotifyModal.vue`
  - **verify**: 保存时每个大区的 sendTo 正确提交，使用 `Promise.all` + `to` 批量处理
  - **mapsTo**: Scope-1, Risks-2

- [ ] 2.4 改造弹窗模板：按大区分组展示，每组包含大区名称标签 + 多选 Select
  - **files**: `GradeNotifyModal.vue`
  - **verify**: 弹窗内显示五个大区，每个大区有独立的 Select（mode="multiple"），布局清晰
  - **mapsTo**: Scope-1

## 3. Integration — 验证

- [ ] 3.1 typecheck 通过
  - **files**: 所有涉及文件
  - **verify**: `pnpm check:type` 无错误
  - **mapsTo**: Risks-3
