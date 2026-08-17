# TASKS — 币种切换组件 + X-Currency 注入 + 金额动态展示

> Change: `currency-switch`（full）

## 1. Setup — 币种数据源与全局 header

- [x] 1.1 新增 `apps/main-app/src/api/core/currency.ts`：`getCurrenciesApi()` GET `/app/rest/currencies`，类型 `{ code; name; symbol; basicUnit }[]`
  - files: `apps/main-app/src/api/core/currency.ts`
  - verify: typecheck 通过；接口 URL 与需求一致
  - mapsTo: Scope「新增 api/core/currency.ts」
- [x] 1.2 `useEnumStore` 注册 currencies：`currencies` ref、`fetchCurrencies()`（加载后默认选中第一个）、`currentCurrency` ref、`setCurrentCurrency(code)`、`getCurrentCurrency()` getter
  - files: `apps/main-app/src/store/enum.ts`
  - verify: store 导出新 API；默认选中第一个币种
  - mapsTo: Scope「store/enum.ts」；Risk 3
- [x] 1.3 `request.ts` 拦截器注入 `X-Currency`：`config.headers['X-Currency'] = currentCurrency.code`（全站生效，已确认）
  - files: `apps/main-app/src/api/request.ts`
  - verify: typecheck；拦截器已设置 header
  - mapsTo: Scope「request.ts」；Risk 2

## 2. Core — header 币种切换组件

- [x] 2.1 新增 `apps/main-app/src/components/currency-switch/index.vue`：`PayCircleOutlined` 图标 + 「币种」文本 + antdv-next `Segmented`（options=币种数组，value=code）；onMounted 加载币种并默认选中第一个；change 时 `setCurrentCurrency`
  - files: `apps/main-app/src/components/currency-switch/index.vue`
  - verify: Segmented 用 `v-model:value` 或 `:value`+change；options 为空时不报错
  - mapsTo: Scope「新增 currency-switch」；Risk 3；antdv-next segmented API（`value` 支持 `v-model:value`、`options`）
- [x] 2.2 `basic.vue` header-right 插槽接入 `<CurrencySwitch />`
  - files: `apps/main-app/src/layouts/basic.vue`
  - verify: 插槽命名与现有 header-right-XX 一致
  - mapsTo: Scope「basic.vue」

## 3. 金额格式化 composable

- [x] 3.1 新增 `apps/main-app/src/composables/use-currency.ts`：基于 `formatNumberAutoUnit` + 当前币种 basicUnit 输出「数字 + 基本单位」格式化（如 `1亿元`/`1亿美元`）；提供 `formatMoneyWithUnit(n)`、`columnTitle(prefix, baseUnit)`（生成 `前缀（人民币/元）` 或 `前缀(美元/标箱)` 动态列名）等
  - files: `apps/main-app/src/composables/use-currency.ts`
  - verify: 返回 `{ value, unit, basicUnit }` 或拼接字符串；列名规则 `{name}/{basicUnit}`
  - mapsTo: Scope「新增 use-currency.ts」；Risk 5

## 4. 客户分级页金额动态化

- [x] 4.1 `kpi-grid/index.vue`：客户销售表现、客户总毛利额指标卡金额值 + 单位（万元/美元）动态化
  - files: `views/order-grading/customer/components/kpi-grid/index.vue`
  - verify: 切换币种后主值/单位变化
  - mapsTo: Scope 客户页
- [x] 4.2 `charts-grid/index.vue`：各区域部门金额分布图表 tooltip/yAxis 金额格式化动态化
  - files: `views/order-grading/customer/components/charts-grid/index.vue`
  - verify: tooltip 显示当前币种单位
  - mapsTo: Scope 客户页
- [x] 4.3 `customer-table/use-columns.tsx`：9 个「人民币/元」金额列标题 + 单元格数值动态化
  - files: `views/order-grading/customer/components/customer-table/use-columns.tsx`
  - verify: 列名随币种变化、数值按当前币种分档；columnSettings 持久化不冲突
  - mapsTo: Scope 客户页；Risk 1、4

## 5. 产品分级页金额动态化

- [x] 5.1 `kpi-grid/index.vue`：产品销售表现、平均单箱利润额指标卡金额动态化
  - files: `views/order-grading/product/components/kpi-grid/index.vue`
  - verify: 切换币种后值/单位变化
  - mapsTo: Scope 产品页
- [x] 5.2 `charts-grid/index.vue`：四象限分布图表 tooltip/坐标轴金额格式化动态化
  - files: `views/order-grading/product/components/charts-grid/index.vue`
  - verify: tooltip 金额带当前币种单位
  - mapsTo: Scope 产品页
- [x] 5.3 `product-table/use-columns.tsx`：4 个金额列标题+数值动态化；「平均单箱售价（人民币/元）」与「（美金/USD）」两列合并为一列，前端按当前币种二选一渲染（CNY→unitPriceRmb，USD→unitPriceUsd）
  - files: `views/order-grading/product/components/product-table/use-columns.tsx`
  - verify: 仅剩一个「平均单箱售价」列，随币种切换数值与列名
  - mapsTo: Scope 产品页；Risk 1、4；用户确认「前端按当前币种二选一显示」

## 6. 供应网络金额动态化

- [x] 6.1 `supply-table/index.vue`：销售价格/毛利额/生产成本 (元/标箱) 三列标题 + 单元格数值动态化（含只读与编辑两种查询共用列）
  - files: `views/master-data/supply-network/components/supply-table/index.vue`
  - verify: 列名 `(元/标箱)`→`(美元/标箱)`，数值随币种
  - mapsTo: Scope 供应网络
- [x] 6.2 `add-path-modal/index.vue`：「三档位毛利额(元/标箱)」「生产成本(元/标箱)」标题动态化
  - files: `views/master-data/supply-network/components/add-path-modal/index.vue`
  - verify: 标题单位随币种
  - mapsTo: Scope 供应网络

## 7. 验证

- [x] 7.1 `pnpm check:type` 通过；`pnpm lint` 通过；相关页面 dev 冒烟（header 出现币种切换、切换后接口带 X-Currency、三页面金额变化）
  - verify: exit=0
  - mapsTo: Risk 2（循环依赖）、Risk 3（Segmented）
