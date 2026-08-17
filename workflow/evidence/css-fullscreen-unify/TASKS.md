# TASKS — css-fullscreen-unify

## 1. Core — 修改 usePlatformFullscreen

- [x] 1.1 移除 `isIPadOSSafari()` 函数和原生 Fullscreen API 分支
  - **files**: `packages/@core/composables/src/use-platform-fullscreen.ts`
  - **verify**: 所有平台走 CSS 全屏逻辑；移除 `@vueuse/core` 的 `useFullscreen` 导入
  - **mapsTo**: Scope #1

- [x] 1.2 更新 JSDoc 注释
  - **files**: `packages/@core/composables/src/use-platform-fullscreen.ts`
  - **verify**: 注释描述「所有平台统一使用 CSS 模拟全屏」，移除 iOS Safari 特化说明
  - **mapsTo**: Scope #1

## 2. Cleanup — 清理调用方 :fullscreen 伪类样式

- [x] 2.1 清理需求预测 tab-container 的 `:fullscreen` / `:-webkit-full-screen` 样式
  - **files**: `apps/main-app/src/views/demand-forecast/forecast-results/components/tab-container/index.vue`
  - **verify**: 删除 `.predict-content:fullscreen`、`.predict-content:-webkit-full-screen` 及对应 `::backdrop` 规则，保留 `.predict-content.is-css-fullscreen`
  - **mapsTo**: Scope #2

- [x] 2.2 清理产能分配 tab-container 的 `:fullscreen` / `:-webkit-full-screen` 样式
  - **files**: `apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue`
  - **verify**: 删除 `.result-content:fullscreen`、`.result-content:-webkit-full-screen` 及对应 `::backdrop` 规则，保留 `.result-content.is-css-fullscreen`
  - **mapsTo**: Scope #3

- [x] 2.3 清理 EditCollaborateVersionModal 的 `:fullscreen` / `:-webkit-full-screen` 样式
  - **files**: `apps/main-app/src/views/demand-forecast/version-management/components/modals/EditCollaborateVersionModal.vue`
  - **verify**: 删除 `.form-section--tabs:fullscreen`、`.form-section--tabs:-webkit-full-screen` 及对应 `::backdrop` 规则
  - **mapsTo**: Scope #4

## 3. Fix — getPopupContainer 适配 CSS 全屏

- [x] 3.1 需求预测 tab-container：getPopupContainer 改为返回 predictContentRef
  - **files**: `apps/main-app/src/views/demand-forecast/forecast-results/components/tab-container/index.vue`
  - **verify**: Select 下拉在全屏时挂载到 predictContentRef 内部，避免被 z-index 9999 遮挡
  - **mapsTo**: Risk #1

- [x] 3.2 产能分配 tab-container：getPopupContainer 保持 resultContentRef（无需改动，确认兼容）
  - **files**: `apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue`
  - **verify**: 已有实现兼容 CSS 全屏，无 overflow 裁剪问题
  - **mapsTo**: Risk #2
