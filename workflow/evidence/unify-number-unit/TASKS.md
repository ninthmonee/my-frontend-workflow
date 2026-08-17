# 任务拆解 — unify-number-unit

## 1. Core — 工具层

- [x] 1.1 在 `money.ts` 中移除 `formatMoneyAutoUnit`、`MoneyAutoUnit`、`NumberAutoUnit` 类型，统一为单一 `formatNumberAutoUnit` + `AutoUnit` 类型
  - **files**: `packages/@core/base/shared/src/utils/money.ts`
  - **verify**: `grep -r "formatMoneyAutoUnit\|MoneyAutoUnit" packages/` 零残留 ✅
  - **mapsTo**: P0 Risk #1

## 2. Integration — 调用方适配

- [x] 2.1 适配 customer kpi-grid：`formatMoneyAutoUnit` → `formatNumberAutoUnit`；内联 `quantityOf` → `formatNumberAutoUnit`
  - **files**: `apps/main-app/src/views/order-grading/customer/components/kpi-grid/index.vue`
  - **verify**: typecheck 通过 ✅
  - **mapsTo**: P0 Risk #2

- [x] 2.2 适配 product kpi-grid：同上
  - **files**: `apps/main-app/src/views/order-grading/product/components/kpi-grid/index.vue`
  - **verify**: typecheck 通过 ✅
  - **mapsTo**: P0 Risk #2

- [x] 2.3 适配 TargetDeviationTab：`formatMoneyAutoUnit` → `formatNumberAutoUnit`（金额字段调用方拼 "元"）；删除 `formatMoney` 包装
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/components/TargetDeviationTab.vue`
  - **verify**: typecheck 通过 ✅
  - **mapsTo**: P0 Risk #3

- [x] 2.4 适配 WarningDetailModal：同上
  - **files**: `apps/main-app/src/views/tracking-monitoring/warning-management/components/WarningDetailModal.vue`
  - **verify**: typecheck 通过 ✅
  - **mapsTo**: P0 Risk #3

## 3. Validation

- [x] 3.1 `pnpm check:type` 全量 typecheck 通过
  - **verify**: exit=0 ✅
