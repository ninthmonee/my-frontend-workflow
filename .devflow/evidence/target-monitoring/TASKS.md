# TASKS — target-monitoring

## 1. 页面实现

- [x] 1.1 实现页面布局（header + tooltip + 副标题 + filter-bar + content 区域）
  - `files`: `apps/main-app/src/views/tracking-monitoring/target-monitoring/index.vue`
  - `verify`: 页面渲染正确，header/tooltip/副标题显示
  - `mapsTo`: Scope #1

- [x] 1.2 集成 8 个筛选下拉框（大区/客户级别/产品级别/材质/类别/克重类型/颜色/特殊品类），所有选项从 store enum 获取
  - `files`: `apps/main-app/src/views/tracking-monitoring/target-monitoring/index.vue`
  - `verify`: 下拉选项正确显示，max-tag-count=1
  - `mapsTo`: Scope #2

- [x] 1.3 集成 EmbedMicroApp（boardId=2067207235448086528），筛选参数通过 params 传递
  - `files`: `apps/main-app/src/views/tracking-monitoring/target-monitoring/index.vue`
  - `verify`: 子应用正确加载，筛选项变更时子应用收到更新
  - `mapsTo`: Scope #3

- [x] 1.4 样式对齐 tracking-monitoring 组内风格
  - `files`: `apps/main-app/src/views/tracking-monitoring/target-monitoring/index.vue`
  - `verify`: 视觉与 warning-management 一致
  - `mapsTo`: Scope #4
