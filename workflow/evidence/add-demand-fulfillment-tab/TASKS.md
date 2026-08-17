# TASKS — add-demand-fulfillment-tab

## 1. 状态与数据源（Setup）
- [x] 1.1 新增 demand* 系列筛选 ref（regionSum/zone/material/customerLevel/productLevel/gloveName/profitLevel）+ demandRegionSumOptions computed
  - files: apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue
  - verify: 7 个 ref + 1 computed，regionSumOptions 用 enumStore.customerRegionSumFilterOptions
  - mapsTo: P0 Scope

## 2. 注册 tab（Setup）
- [x] 2.1 items 数组插入 { key: '2085294974701674496', label: '需求满足' }（产能分配结果之后、销售目标之前）
  - files: 同 1.1
  - verify: tab 顺序正确
  - mapsTo: P0 Scope
- [x] 2.2 subAppHeight 为 '2085294974701674496' 新增横屏/竖屏高度 case
  - files: 同 1.1
  - verify: 两个 switch 分支均有 case
  - mapsTo: P0 Scope

## 3. params 与模板（Integration）
- [x] 3.1 params computed 新增需求满足分支（version_ids + request_ids + zone_sum + zone + customer_level_code + material + product_level_code + gloves_code + profit_level_code）
  - files: 同 1.1
  - verify: 9 个参数齐全，键名与需求一致
  - mapsTo: P0 Scope
- [x] 3.2 新增独立 template 块（filter-bar 7 个筛选项 + EmbedMicroApp name=demand-fulfillment）
  - files: 同 1.1
  - verify: 模板结构参照 result-content，筛选项顺序：区域→区域部门→客户分级→材料→产品分级→手套产品→利润档位
  - mapsTo: P0 Scope

## 4. 验证（Verify）
- [ ] 4.1 typecheck + format + lint 通过
  - files: 1 个改动文件
  - verify: harness:p2 exit=0
  - mapsTo: P0 Risks
