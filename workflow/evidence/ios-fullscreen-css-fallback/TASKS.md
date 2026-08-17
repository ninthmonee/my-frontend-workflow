# TASKS — ios-fullscreen-css-fallback

## 1. Setup — 创建 usePlatformFullscreen composable

- [ ] 1.1 新建 `packages/@core/composables/src/use-platform-fullscreen.ts`
  - **files**: `packages/@core/composables/src/use-platform-fullscreen.ts`
  - **verify**: composable 导出 `usePlatformFullscreen(target?, options?)` 函数，返回 `{ isFullscreen, enter, exit, toggle }`
  - **mapsTo**: P0 Scope #1
- [ ] 1.2 实现 `isIPadOSSafari()` 检测函数
  - **files**: `packages/@core/composables/src/use-platform-fullscreen.ts`
  - **verify**: 在 iPad mini Safari 返回 true，桌面 Chrome/Safari 返回 false，Android Chrome 返回 false
  - **mapsTo**: P0 Risks #1
- [ ] 1.3 实现 CSS 降级路径（iOS Safari 时用 CSS `position:fixed; inset:0; z-index:9999` + `overflow:auto` + `background:var(--DECISION-bg)` 模拟全屏）
  - **files**: `packages/@core/composables/src/use-platform-fullscreen.ts`
  - **verify**: 设置了 `isFullscreen = true` 时给目标元素添加 `.is-css-fullscreen` class，`false` 时移除
  - **mapsTo**: P0 Risks #2, #3
- [ ] 1.4 实现原生路径（非 iOS Safari 委托给 `@vueuse/core` 的 `useFullscreen`）
  - **files**: `packages/@core/composables/src/use-platform-fullscreen.ts`
  - **verify**: 桌面 Chrome 点击全屏/退出全屏正常，`isFullscreen` 与 `document.fullscreenElement` 同步
  - **mapsTo**: P0 Risks #4
- [ ] 1.5 在 `packages/@core/composables/src/index.ts` 中导出
  - **files**: `packages/@core/composables/src/index.ts`
  - **verify**: `import { usePlatformFullscreen } from '@decision-core/composables'` 可用
  - **mapsTo**: P0 Scope #2

## 2. Core — 替换全屏入口

- [ ] 2.1 替换 DecisionFullScreen 组件
  - **files**: `packages/@core/ui-kit/shadcn-ui/src/components/full-screen/full-screen.vue`
  - **verify**: Header 全屏按钮正常切换，iPad mini Safari 使用 CSS 模拟，桌面 Chrome 使用原生 API
  - **mapsTo**: P0 Scope #3
- [ ] 2.2 替换 forecast-results tab-container 的 toggleFullscreen
  - **files**: `apps/main-app/src/views/demand-forecast/forecast-results/components/tab-container/index.vue`
  - **verify**: 预测结果页面全屏按钮正常，`:fullscreen` 伪类替换为 `.is-css-fullscreen` class
  - **mapsTo**: P0 Scope #4, Risks #3
- [ ] 2.3 替换 allocation-results tab-container 的 toggleFullscreen
  - **files**: `apps/main-app/src/views/capacity-allocation/allocation-results/components/tab-container/index.vue`
  - **verify**: 分配结果页面全屏按钮正常，`:fullscreen` 伪类替换为 `.is-css-fullscreen` class
  - **mapsTo**: P0 Scope #5, Risks #3
- [ ] 2.4 替换 EditCollaborateVersionModal 的 toggleFullscreen
  - **files**: `apps/main-app/src/views/demand-forecast/version-management/components/modals/EditCollaborateVersionModal.vue`
  - **verify**: 协作版本弹窗全屏按钮正常，`:fullscreen` 伪类替换为 `.is-css-fullscreen` class
  - **mapsTo**: P0 Scope #6, Risks #3

## 3. Integration — 样式收敛

- [ ] 3.1 为 `.is-css-fullscreen` 定义全局样式
  - **files**: `packages/@core/base/design/src/css/global.css`（或新建专用 CSS 文件）
  - **verify**: `.is-css-fullscreen` 类在 iOS Safari 下全屏效果与原 `:fullscreen` 视觉一致
  - **mapsTo**: P0 Risks #2, #3
