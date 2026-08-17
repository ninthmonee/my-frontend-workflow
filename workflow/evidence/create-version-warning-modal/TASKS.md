# TASKS — create-version-warning-modal

## 1. API 层

- [ ] 1.1 `CreateCapacityVersionPayload` 新增 `ignoreWarnings?: boolean` 字段
  **files**: `apps/main-app/src/api/capacity-allocation/version.ts`
  **verify**: typecheck 通过，`createVersionApi` 调用可传入 `ignoreWarnings`
  **mapsTo**: Scope → API 类型扩展

## 2. Warning 弹窗组件

- [ ] 2.1 新建 `CreateVersionWarningModal.vue`
  **files**: `apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/components/CreateVersionWarningModal.vue`
  **verify**: 
  - 使用 `vue-modal-provider` 标准模式（`useModalRef` + `defineOptions`）
  - 导出 `CreateVersionWarningModalArgs = { confirmMessages: string[] }`
  - 导出 `CreateVersionWarningModalResult = { action: 'cancel' | 'continue' }`
  - 模板：antdv-next `Modal` + 警告图标 + `v-for` 渲染 warning 列表
  - footer 自定义：「取消」(resolve cancel + close) + 「继续运行」(resolve continue + close)
  **mapsTo**: Scope → 新增 warning 弹窗组件

## 3. Composable 层

- [ ] 3.1 `useCreateVersionModal` 集成 warning 弹窗逻辑
  **files**: `apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/composables/useCreateVersionModal.ts`
  **verify**:
  - `useModal(CreateVersionWarningModal)` 获取 warning modal 句柄
  - 首次 `createVersionApi` 调用时 payload 携带 `ignoreWarnings: false`
  - 捕获 error 后从 `err?.response?.data?.data?.confirmMessages` 提取 warning 列表
  - 若 confirmMessages 非空 → `warningModal.show({ confirmMessages })` → 根据用户选择分支处理
  - 取消 → loading 置 false, return false（主弹窗保持打开）
  - 继续运行 → `ignoreWarnings: true` 重试 → 成功后 resolve + 正常流程
  **mapsTo**: Scope → handleOk 流程重构
