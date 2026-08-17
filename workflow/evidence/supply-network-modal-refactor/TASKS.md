# TASKS — supply-network-modal-refactor

## 1. 重构 CreateVersionModal

- [x] 1.1 引入 `vue-modal-provider` 的 `useModalRef`，替换 `defineModel('open')` 和 `emit('created')`<!-- completed -->
  - **files**: `apps/main-app/src/views/master-data/supply-network/components/create-version-modal/index.vue`
  - **verify**: Modal 使用 `useModalRef()` 管理生命周期；导出 `CreateVersionModalArgs` 类型
  - **mapsTo**: P0 Scope 项 1

- [x] 1.2 实现标准生命周期：`visible` watch 重置表单、`handleCancel` 用 `hide()+remove()`<!-- completed -->
  - **files**: 同上
  - **verify**: 打开弹窗时表单重置；取消时 200ms 后 remove
  - **mapsTo**: P0 Scope 项 1

## 2. 重构 AddPathModal

- [x] 2.1 引入 `vue-modal-provider` 的 `useModalRef`，替换 `defineModel('open')` 和 `emit('added')`<!-- completed -->
  - **files**: `apps/main-app/src/views/master-data/supply-network/components/add-path-modal/index.vue`
  - **verify**: Modal 使用 `useModalRef()` 管理生命周期；导出 `AddPathModalArgs` 类型
  - **mapsTo**: P0 Scope 项 2

- [x] 2.2 实现标准生命周期：`visible` watch 重置表单、`handleCancel` 用 `hide()+remove()`<!-- completed -->
  - **files**: 同上
  - **verify**: 打开弹窗时表单重置；取消时 200ms 后 remove
  - **mapsTo**: P0 Scope 项 2

## 3. 改造父组件调用方式

- [x] 3.1 用 `useModal()` 命令式唤起替代声明式 `v-model:open`<!-- completed -->
  - **files**: `apps/main-app/src/views/master-data/supply-network/index.vue`
  - **verify**: 删除 `createVersionOpen`/`addPathOpen`/loading refs；删除 template 中的 modal 组件；用 `.show(args)` 唤起
  - **mapsTo**: P0 Scope 项 3

## 4. 验证

- [ ] 4.1 typecheck 通过
  - **files**: 全部变更文件
  - **verify**: `pnpm run check:type` 或 `harness:p2` exit=0
  - **mapsTo**: P0 Risks 项 1
