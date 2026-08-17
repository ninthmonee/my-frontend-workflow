# TASKS — unify-filter-style-4pages

## 1. Setup
- [ ] 1.1 确认 5 文件筛选控件清单与 label 类名（.month-filter__label/.field-filter__label/.filter-bar__label）
  - files: 5 个组件文件
  - verify: 逐文件 grep 出全部 Select 与 label 类
  - mapsTo: P0 Scope

## 2. Core A — demand-forecast
- [x] 2.1 version-management header-bar：起始月份 160→170 + `.month-filter__label` 等宽
  - files: demand-forecast/version-management/components/header-bar/index.vue
  - verify: grep 无 160px 残留，label 含 width:5em
  - mapsTo: P0 Scope
- [x] 2.2 forecast-results header-bar：起始月份 160→170 + `.field-filter__label` 等宽（当前版本 240 保持）
  - files: demand-forecast/forecast-results/components/header-bar/index.vue
  - verify: grep 无 160px 残留（240px 保留）
  - mapsTo: P0 Scope
- [x] 2.3 forecast-results tab-container：10 个筛选普通项→170 + `.filter-bar__label` 等宽（多版本对比 260 保持）
  - files: demand-forecast/forecast-results/components/tab-container/index.vue
  - verify: grep 无 120-160px 残留（260px 保留）
  - mapsTo: P0 Scope

## 3. Core B — capacity-allocation
- [x] 3.1 allocation-results header-bar：决策年份 160→170 + `.field-filter__label` 等宽（当前版本 240 保持）
  - files: capacity-allocation/allocation-results/components/header-bar/index.vue
  - verify: grep 无 160px 残留（240px 保留）
  - mapsTo: P0 Scope
- [x] 3.2 allocation-results tab-container：21 个筛选普通项→170 + `.filter-bar__label` 等宽（多版本对比 260 保持）
  - files: capacity-allocation/allocation-results/components/tab-container/index.vue
  - verify: grep 无 120-160px 残留（260px 保留）
  - mapsTo: P0 Scope

## 4. Integration
- [ ] 4.1 Phase 2 验证：typecheck 通过
  - files: 无新增
  - verify: pnpm -s run check:type exit 0
  - mapsTo: P0 Risks
