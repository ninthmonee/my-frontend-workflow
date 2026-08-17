# TASKS — 文本超长省略号 + Tooltip (placement="top")

## 1. 单选版本下拉框（labelRender）

- [x] 1.1 客户分级 control-bar 版本 Select 加 `#labelRender` + Tooltip
  - **files**：`apps/main-app/src/views/order-grading/customer/components/control-bar/index.vue`
  - **verify**：选中长版本名时文本截断显示省略号，hover 显示完整 tooltip（placement="top"）
  - **mapsTo**：P0 Scope 第1条

- [x] 1.2 产品分级 control-bar 版本 Select 加 `#labelRender` + Tooltip
  - **files**：`apps/main-app/src/views/order-grading/product/components/control-bar/index.vue`
  - **verify**：同上
  - **mapsTo**：P0 Scope 第2条

- [x] 1.3 需求预测 header-bar 版本 Select 加 `#labelRender` + Tooltip
  - **files**：`apps/main-app/src/views/demand-forecast/forecast-results/components/header-bar/index.vue`
  - **verify**：同上
  - **mapsTo**：P0 Scope 第3条

- [x] 1.4 产能分配 header-bar 版本 Select 加 `#labelRender` + Tooltip
  - **files**：`apps/main-app/src/views/capacity-allocation/allocation-results/components/header-bar/index.vue`
  - **verify**：同上
  - **mapsTo**：P0 Scope 第4条

## 2. 多选手套产品下拉框（tagRender + maxTagTextLength）

- [x] 2.1 产能分配 tab-container 手套产品 Select（commonGloveNameFilter + invGloveNameFilter）加 `#tagRender` + Tooltip + `maxTagTextLength`
  - **files**：`apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue`
  - **verify**：tag 文字过长时截断，hover 显示完整文本 tooltip（placement="top"），关闭按钮正常
  - **mapsTo**：P0 Scope 第5条

## 3. 多选 max-tag-count="0" 下拉框（optionRender + Tooltip）

- [x] 3.1 需求预测 tab-container 手套产品 + 多版本对比 Select（3个）加 `#optionRender` + Tooltip
  - **files**：`apps/main-app/src/views/demand-forecast/forecast-results/components/tab-container/index.vue`
  - **verify**：下拉选项文本过长时显示省略号，hover 显示完整 tooltip（placement="top"）
  - **mapsTo**：P0 Scope 第6条

- [x] 3.2 产能分配 tab-container 版本对比 Select（1个）加 `#optionRender` + Tooltip
  - **files**：`apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue`
  - **verify**：同上
  - **mapsTo**：P0 Scope 第7条

## 4. 版本信息展示（CSS ellipsis + Tooltip）

- [x] 4.1 需求预测 version-info 中 `.info-item__value` 文本值加 CSS ellipsis + Tooltip
  - **files**：`apps/main-app/src/views/demand-forecast/forecast-results/components/tab-container/version-info.vue`
  - **verify**：版本名称等长文本截断显示省略号，hover 显示完整 tooltip
  - **mapsTo**：P0 Scope 第8条

- [x] 4.2 产能分配 version-info 中 `.info-item__value` 文本值加 CSS ellipsis + Tooltip
  - **files**：`apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/version-info.vue`
  - **verify**：同上
  - **mapsTo**：P0 Scope 第9条
