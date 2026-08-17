# TASKS — 无权限白屏提示

## 1. Guard — 权限异常兜底

- [x] 1.1 guard.ts `setupAccessGuard` 中 `await authStore.fetchUserInfo()` 包 try-catch，异常时 message.warning 提示后跳 `/403`
  - `files`: `apps/main-app/src/router/guard.ts`
  - `verify`: typecheck 通过
  - `mapsTo`: P0 Risks 1, P0 根因分析 1

- [x] 1.2 guard.ts 中 `generateAccess()` 后检测 `accessibleMenus.length === 0` → message.warning 提示后跳 `/403`
  - `files`: `apps/main-app/src/router/guard.ts`
  - `verify`: typecheck 通过
  - `mapsTo`: P0 根因分析 2

## 2. Layout — 空菜单兜底

- [x] 2.1 layout.vue #menu 插槽中：`isAccessChecked && sidebarMenus.length === 0` 时渲染无权限提示
  - `files`: `packages/effects/layouts/src/basic/layout.vue`
  - `verify`: typecheck 通过
  - `mapsTo`: P0 Risks 2
