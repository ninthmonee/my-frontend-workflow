# TASKS — stocking-constraints-autofill

> 需求：期望库存水位数据随需求预测版本切换自动获取默认值，与其他参数卡片（客户满足/产品组合/区域平衡）逻辑一致。
> 链路：watchConstraints → getVersionConstraintsApi → applyConstraints；后端新字段 cnNbr/cnPvc/idnNbr/idnPvc/vnNbr/vnPvc。

## 1. Core

- [x] 1.1 AllocationVersionConstraintsData 类型新增 6 个期望库存字段
  - files: `apps/main-app/src/api/capacity-allocation/version.ts`
  - verify: 类型含 cnNbr / cnPvc / idnNbr / idnPvc / vnNbr / vnPvc（number）；typecheck 通过
  - mapsTo: P0 Scope#version.ts

- [x] 1.2 applyConstraints 回填 stockingValues
  - files: `apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/composables/useCreateVersionModal.ts`
  - verify: 基于 STOCKING_LOCATIONS × STOCKING_PRODUCTS 生成 camelCase 字段名（cn+Nbr 等）读取约束值并写入 stockingValues 对应 flat key（CN_NBR 等）；字段缺失/null 时不覆盖现值
  - mapsTo: P0 Scope#useCreateVersionModal.ts
