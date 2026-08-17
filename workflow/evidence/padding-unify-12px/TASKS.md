# TASKS — padding-unify-12px

## 1. 批量替换页面容器 padding

- [ ] 1.1 替换桌面端 `18px` → `12px`（10 files × 4 sides）
  - **files**: 10 个模块 index.vue
  - **verify**: `grep -rn '18px.*env(safe-area-inset'` 在目标目录下无残留
  - **mapsTo**: P0 Scope 全部

- [ ] 1.2 替换响应式 `14px` → `12px`（9 files 有 @media ≤1024px）
  - **files**: 同上（除 capacity-allocation/version-management，其响应式直接复写为另一组 calc(18px+...)）
  - **verify**: `grep -rn '14px.*env(safe-area-inset'` 在目标目录下无残留
  - **mapsTo**: P0 Scope 全部
