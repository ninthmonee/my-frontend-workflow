# TASKS — region-tag-color-pool

> 需求：大区不再固定为 5 个，移除内部维护的兜底大区逻辑；预生成固定 50 色数组，大区数据请求回来后按顺序绑定颜色，用于页面中大区 Tag 上色。

## 1. Setup

- [x] 1.1 生成 P0 证据（Scope/Risks）并经用户确认
  - files: `workflow/evidence/region-tag-color-pool/P0.md`
  - verify: Scope 无占位符、至少 1 条具体风险、用户确认
  - mapsTo: P0 Scope/Risks

## 2. Core — enum store 改造

- [x] 2.1 `store/enum.ts` 移除 CustomerRegion 兜底大区与写死颜色映射
  - 删除 `ENUM_FALLBACK_MAP` 中 `ai.shanshu.optisense.busi.app.level.enums.CustomerRegion` 条目（内销/欧洲/北美/亚太/日韩）
  - 删除 `TAG_COLOR_MAP`（写死 6 个大区颜色）
  - files: `apps/main-app/src/store/enum.ts`
  - verify: 两个写死映射不再存在于文件中；`StrategicLevel`/`ProductLevel` 兜底保留
  - mapsTo: P0 Scope 1 / Risks 1

- [x] 2.2 `store/enum.ts` 新增 50 色固定数组，按顺序绑定 tagColor
  - 新增 `CUSTOMER_REGION_TAG_COLORS`（50 个 hex 色）
  - `fetchCustomerRegionOptions` 中 `tagColor: CUSTOMER_REGION_TAG_COLORS[index % CUSTOMER_REGION_TAG_COLORS.length]`
  - files: `apps/main-app/src/store/enum.ts`
  - verify: `getCustomerRegionTagColor` 仍返回 `tagColor ?? 'default'`；typecheck 通过
  - mapsTo: P0 Scope 1 / Risks 3

## 3. Integration — 预警管理大区 Tag 颜色动态化

- [x] 3.1 `TargetDeviationTab.vue` saleZone 颜色改走 enum store
  - `getTagColor` 中 `d === 'saleZone'` 分支调 `enumStore.getCustomerRegionTagColor(v)`
  - 移除 `tagColorMap.saleZone` 写死 5 大区映射
  - files: `apps/main-app/src/views/tracking-monitoring/warning-management/components/TargetDeviationTab.vue`
  - verify: 无 `内销/欧洲/北美/亚太/日韩` 残留于文件；typecheck 通过
  - mapsTo: P0 Scope 2 / Risks 2

- [x] 3.2 `ThresholdConfigTab.vue` 同上
  - files: `apps/main-app/src/views/tracking-monitoring/warning-management/components/ThresholdConfigTab.vue`
  - verify: 无写死大区颜色残留；typecheck 通过
  - mapsTo: P0 Scope 2 / Risks 2

## 4. 验证

- [x] 4.1 Phase 2 验证：build → format → lint → typecheck 全部 exit=0
  - files: 无
  - verify: `pnpm check:type` 等命令 exit=0
  - mapsTo: P2 Gate

## 5. Phase 3 回退修复

- [x] 3.3（Phase 3 用户反馈，两轮）颜色调整为贴近页面蓝/青/橙/绿风格
  - 第 1 轮：50 → 25 色
  - 第 2 轮：色系调整 — 以页面主色蓝为起点，蓝→青→绿→橙 4 色系各 6 档深浅渐变（共 24 + 主蓝 = 25），s=62%，深中档保证白字可读
  - files: `apps/main-app/src/store/enum.ts`
  - verify: 数组长度 25；typecheck + eslint 通过
  - mapsTo: Phase 3 用户确认（未解决→已修改）

- [x] 3.4（Phase 3 用户反馈）客户分级数据表大区列宽度 88 → 110
  - files: `apps/main-app/src/views/order-grading/customer/components/customer-table/use-columns.tsx`
  - verify: width 已调整；typecheck 通过
  - mapsTo: Phase 3 用户确认（未解决→已修改）
