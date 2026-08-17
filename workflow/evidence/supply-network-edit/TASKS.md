# 任务拆解 — 供应网络编辑功能

## 1. API 层扩展

- [ ] 1.1 新增 API 函数与类型定义
  - **files**: `apps/main-app/src/api/master-data/supply-network.ts`
  - **verify**: 新增的 10 个 API 函数类型检查通过，函数名以 `Api` 结尾
  - **mapsTo**: P0 Scope — 接口对接

## 2. Types 扩展

- [ ] 2.1 新增表单及编辑状态类型
  - **files**: `apps/main-app/src/views/master-data/supply-network/types.ts`
  - **verify**: 新增类型定义完整，可被其他模块引用
  - **mapsTo**: P0 Scope — 类型定义

## 3. 弹窗组件

- [ ] 3.1 创建引用版本弹窗 (create-version-modal)
  - **files**: `components/create-version-modal/index.vue`
  - **verify**: 弹窗正常打开/关闭，表单校验正确，调用创建 API 成功
  - **mapsTo**: P0 Scope — 引用版本新建功能

- [ ] 3.2 创建新增供应路径弹窗 (add-path-modal)
  - **files**: `components/add-path-modal/index.vue`
  - **verify**: 弹窗正常打开/关闭，四个下拉框 + 三个毛利额输入框 + 生产成本输入框，表单校验正确，调用新增 API 成功
  - **mapsTo**: P0 Scope — 新增供应路径功能

## 4. 系数调整组件

- [ ] 4.1 创建系数调整区域组件 (coefficient-adjust)
  - **files**: `components/coefficient-adjust/index.vue`
  - **verify**: 仅在编辑模式下显示，Checkbox 控制按钮可用性，Segmented 切换提示文本，emit 事件正确
  - **mapsTo**: P0 Scope — 系数调整区域

## 5. ControlBar 扩展

- [ ] 5.1 新增引用版本新建、编辑/取消/保存按钮
  - **files**: `components/control-bar/index.vue`
  - **verify**: 按钮正确显示/隐藏，emit 事件正确触发
  - **mapsTo**: P0 Scope — Header 按钮

## 6. SupplyTable 编辑模式

- [ ] 6.1 新增编辑模式下 InputNumber 渲染 + 删除按钮 + 操作列
  - **files**: `components/supply-table/index.vue`
  - **verify**: 编辑模式下毛利额/生产成本列显示 InputNumber，删除按钮可点击，emit 事件正确
  - **mapsTo**: P0 Scope — 表格编辑模式

## 7. Orchestration 编排扩展

- [ ] 7.1 扩展 useSupplyNetworkOrchestration：编辑状态管理、锁定/解锁、草稿查询、新增/删除/编辑/保存/取消/批量调整
  - **files**: `useSupplyNetworkOrchestration.ts`
  - **verify**: 所有编辑操作正确调用对应 API，状态切换正确，筛选条件变化时使用对应接口
  - **mapsTo**: P0 Scope — 编辑模式编排逻辑

## 8. Main Page 集成

- [ ] 8.1 集成所有新组件到主页面，串联事件流
  - **files**: `index.vue`
  - **verify**: 页面功能完整可交互，编辑/只读模式切换正常
  - **mapsTo**: P0 Scope — 主页面集成
