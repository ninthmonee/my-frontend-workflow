# 经验沉淀 — 路由 / 菜单

---

## 新增路由模块（菜单页）

> **meta** `type=pattern` `tech=vue3` `domain=route` `severity=low` `validated=2026-05-26` `version=vue-router@4`
> **tags** `vue-router, route, menu`

在 `apps/main-app/src/router/routes/modules/` 下新增一个 `.ts` 文件即可自动注册（使用 `import.meta.glob` 自动扫描）。无需手动修改路由入口。

```ts
// apps/main-app/src/router/routes/modules/<module-name>.ts
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      order: 4,        // 菜单排序；参考已有模块的 order 值排列
      title: '业务数据管理', // 中文标题，直接显示在菜单中
      menuKey: 'app.menu.item.master_data', // 权限码
      link: `/master-data`,                  // 前端路径
      icon: 'lucide:database',               // unplugin-icons 图标名
    },
    name: 'master-data',                  // 路由 name，全局唯一
    path: `/master-data`,
    redirect: `/master-data/supply-network`, // 有子菜单时重定向到第一个子项
    children: [
      {
        meta: {
          order: 0,
          title: '供应网络',
          menuKey: 'app.menu.item.master_data.supply_network',
          link: `/master-data/supply-network`,
        },
        name: 'master-data-supply-network', // 子路由 name 也应全局唯一
        path: `supply-network`,             // 相对路径
        component: () =>
          import('#/views/master-data/supply-network/index.vue'),
      },
    ],
  },
];

export default routes;
```

**关键注意事项：**

1. **自动注册**：`import.meta.glob('./modules/**/*.ts', { eager: true })` 会自动扫描 `modules/` 目录下的所有 `.ts` 文件，无需手动注册
2. **`order` 值**：决定菜单在侧边栏的排序顺序；参考已有模块（订单分级=0、需求预测=1、产能分配=2、追踪监控=3）
3. **`name` 全局唯一**：路由 name 不可重复，否则会导致路由冲突
4. **`menuKey`**：用于权限控制，按 `app.menu.item.<module>` 层级命名
5. **视图路径**：视图文件放在 `src/views/<module-name>/<page-name>/index.vue`，通过 `#/views/...` alias 引用
