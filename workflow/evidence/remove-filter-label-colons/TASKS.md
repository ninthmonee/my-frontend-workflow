# TASKS — remove-filter-label-colons

## 1. Setup
- [ ] 1.1 确认 4 文件筛选项 label 冒号清单（排除更新时间/路径数）
  - files: 4 个组件文件
  - verify: grep 列出全部「label">文本：」并分类筛选/元信息
  - mapsTo: P0 Scope

## 2. Core
- [ ] 2.1 target-monitoring：9 处筛选 label 去冒号
  - files: tracking-monitoring/target-monitoring/index.vue
  - verify: grep 筛选 label 无「：」残留
  - mapsTo: P0 Scope
- [ ] 2.2 supply-network control-bar：7 处筛选 label 去冒号（保留更新时间/路径数）
  - files: master-data/supply-network/components/control-bar/index.vue
  - verify: grep 确认筛选 label 无冒号、更新时间/路径数保留
  - mapsTo: P0 Scope
- [ ] 2.3 customer control-bar：8 处筛选 label 去冒号（保留更新时间）
  - files: order-grading/customer/components/control-bar/index.vue
  - verify: grep 确认筛选 label 无冒号、更新时间保留
  - mapsTo: P0 Scope
- [ ] 2.4 product control-bar：11 处筛选 label 去冒号（保留更新时间）
  - files: order-grading/product/components/control-bar/index.vue
  - verify: grep 确认筛选 label 无冒号、更新时间保留
  - mapsTo: P0 Scope

## 3. Integration
- [ ] 3.1 Phase 2 验证：typecheck 通过
  - files: 无新增
  - verify: pnpm -s run check:type exit 0
  - mapsTo: P0 Risks
