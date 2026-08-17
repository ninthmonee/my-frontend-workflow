# 经验沉淀 — 微前端

---

## 微前端

### micro-app 本地跨域（Vite proxy）

> **meta** `type=fix` `tech=general` `domain=micro-frontend` `severity=high` `validated=2026-05-26`
> **tags** `micro-frontend, cors, vite, proxy, local-dev`

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/app': { target: env.VITE_APP_DOMAIN, changeOrigin: true, secure: false },
    },
  },
});
```

子应用 url 改为同源路径 `/app/xxx/`，不拼接域名。

### EmbedMicroApp watch 缺少 immediate 导致 setData 不触发

> **meta** `type=fix` `tech=vue3` `domain=micro-frontend` `severity=high` `validated=2026-05-28`
> **tags** `micro-frontend, micro-app, setData, watch, immediate, embed-micro-app`

**现象**：子应用嵌入组件（EmbedMicroApp）在页面重新挂载后，`microApp.setData()` 不会被调用，导致子应用未收到新版本/参数数据。

**根因**：`watch(resolvedPath, pushRoute)` 缺少 `{ immediate: true }`，watch 仅在 `resolvedPath` 变化时触发。组件首次挂载时，`resolvedPath` 的初始值不算变化，因此 `pushRoute` → `setData` 永远不会被调用。

**修复前**：
```ts
watch(resolvedPath, pushRoute);
```

**修复后**：
```ts
watch(resolvedPath, pushRoute, { immediate: true });
```

**说明**：`default-page` prop 只控制子应用初始加载 URL，但已加载的子应用需要 `setData({ route: { path } })` 才能主动导航到新路径。两者不可互相替代。`{ immediate: true }` 确保首次挂载和后续参数变化时都能正确触发 `setData`。
