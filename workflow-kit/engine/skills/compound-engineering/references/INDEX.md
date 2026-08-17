# 复利工程索引

## 快速入口

- [经验沉淀库 (experiences.md)](./experiences.md) — 汇总入口，按领域链接到拆分文件
- `experiences/` 目录 — 按 domain 拆分的独立文件

## 使用方式

1. **改前搜索**：根据任务关键词在 `experiences/*.md` 中搜索，或在下方索引按 domain 查找
2. **沉淀前检查**：搜索确认是否已有相似条目（避免重复）；优先在对应 domain 文件内搜索
3. **新增条目**：选择对应 domain 文件追加，或新建 domain 文件；格式参考 `_TEMPLATE.md`

---

## 按 meta 字段检索速查

### 按领域（domain）— 对应文件

| domain | 文件 | 主要条目 |
|:-------|:-----|:---------|
| `table` | [experiences/table.md](./experiences/table.md) | 跨页编辑、局部刷新、虚拟滚动、固定列、render 参数、bodyCell、列设置、行高亮、编辑联动、Tooltip、尾部预警、删除权限校验、跨模块页面结构对齐、useTableQuery 统一管理表格状态、分组表头 scroll.y 动态计算、空数据固定列表头间隙 |
| `form` | [experiences/form.md](./experiences/form.md) | Select/DatePicker 弹层遮挡、FormItem 校验、Select 类型变更、Input 防抖、标签闭合、CheckboxGroup 弹窗必填校验、Select 选项超长 Tooltip |
| `modal` | [experiences/modal.md](./experiences/modal.md) | 弹窗生命周期、Drawer width 废弃、useModalRef 模板、筛选编辑禁用分离、异步加载防卡片状态闪烁 |
| `chart` | [experiences/chart.md](./experiences/chart.md) | 四象限图、图表不显示、label 聚合、坐标轴标签、y 轴负值、散点图、高度塌陷、resize、legend 溢出滚动、emphasis focus 不同步 |
| `css` | [experiences/css.md](./experiences/css.md) | 页面骨架、背景网格、scoped 穿透、scrollbar、antdv 样式前缀、主题变量、Card flex、Tabs 独立 flex 行、box-sizing 高度链、iOS Safari bfcache viewport 缩放、筛选项统一样式规范 |
| `api` | [experiences/api.md](./experiences/api.md) | await-to-js、Promise.all、RequestClient、Patch 方法、批量编辑 payload、枚举映射、请求序列守卫防过期、API 参数可选化、字段对齐后端返回名 |
| `state` | [experiences/composition-api.md](./experiences/composition-api.md) | Composition API 规范、defineModel、defineProps 冲突、mock 兜底数据禁止、空态处理、script setup 禁止 export |
| `build` | [experiences/build.md](./experiences/build.md) | pnpm catalog 依赖管理 |
| `file` | [experiences/api.md](./experiences/api.md) | 文件下载 |
| `micro-frontend` | [experiences/micro-frontend.md](./experiences/micro-frontend.md) | micro-app 跨域, watch immediate setData |
| `theme` | [experiences/css.md](./experiences/css.md) | `--DECISION-*` 变量 |
| `route` | [experiences/route.md](./experiences/route.md) | 路由模块、菜单新增 |

### 按严重度（severity）

| severity | 说明 | 数量 |
|:---------|:-----|:-----|
| `high` | 必读 — 容易导致功能异常/404/白屏 | 20+ |
| `medium` | 建议读 — 常见场景的规范与坑位 | 15+ |
| `low` | 按需读 — 视觉微调、锦上添花 | 5+ |

---

## 按 tags 关键词搜索

常用搜索关键词（搜索时指定 `experiences/*.md` 全量搜索）：

```
table       -> 表格相关（跨页编辑、虚拟滚动、固定列、高亮等）
echarts     -> 图表相关（四象限图、坐标轴、散点图等）
modal       -> 弹窗/抽屉
scoped      -> CSS 样式穿透
antdv-next  -> antd 组件相关
defineModel -> v-model 绑定
enum        -> 枚举映射
micro-frontend -> 微前端
| pnpm        -> 包管理
| vue-router  -> 路由/菜单新增
```
field-rename -> 字段名对齐/重命名（与后端 API 对齐）

---

## Tags 受控词表

新增条目时，tags 必须从此表中选取（可组合多个，逗号分隔）。**禁止自造同义词**。

### 技术栈 / 库

| 标准写法 | 对应 | 禁止写法 |
|:---------|:-----|:---------|
| `vue3` | Vue 3 (Composition API) | `vue`, `vue2`, `vue.js` |
| `antdv-next` | Ant Design Vue 4.x | `antd`, `ant-design-vue`, `antdv` |
| `echarts` | ECharts 图表 | `ecahrt`, `chart`（表意太宽） |
| `vueuse` | VueUse 工具库 | `vue-use` |
| `pinia` | Pinia 状态管理 | `store`（太泛） |
| `pnpm` | pnpm 包管理器 | `npm`, `yarn` |
| `vite` | Vite 构建工具 | `webpack`（除非确实相关） |
| `vue-router` | Vue Router | `router` |
| `turbo` | Turborepo | `turbo` 可接受 |

### 组件 / 领域

| 标准写法 | 对应 | 禁止写法 |
|:---------|:-----|:---------|
| `table` | antdv Table 及相关 | `grid`, `list`（除非特指） |
| `modal` | Modal / Drawer 弹窗 | `dialog`, `popup` |
| `form` | 表单控件 | `input` |
| `select` | Select 下拉选择 | `dropdown`（指组件用 select） |
| `date-picker` | DatePicker / RangePicker | `date`, `picker` |
| `card` | Card 卡片组件 | — |
| `drawer` | Drawer 抽屉 | — |
| `echarts` | ECharts 图表 | — |
| `bar` | ECharts 柱状图系列 | — |
| `legend` | ECharts legend 组件 | — |
| `filter` | 筛选条件控件 | — |
| `tooltip` | Tooltip 提示（含 Select optionRender 场景） | `tip`, `hint` |
| `delete` | 表格删除操作 | — |
| `row-selection` | 表格行选择/多选 | `select`, `checkbox` |
| `readonly` | 只读态 / 禁用编辑 | — |
| `enabled` | 组件启用/禁用状态 | — |
| `page-layout` | 页面布局模式对齐 | — |
| `component-structure` | 组件文件组织结构 | — |
| `version-management` | 版本管理页面模式 | — |
|| `CommonAntvTable` | 通用表格容器组件 | — |
|| `fixed` | 固定列定位 | — |
|| `empty` | 表格空数据态 | — |
|| `table-layout` | 表格布局模式 (auto/fixed) | — |
|| `rowKey` | 表格行唯一标识 key / kebab-case attrs 读取 | — |

### 概念 / 模式

| 标准写法 | 对应 | 禁止写法 |
|:---------|:-----|:---------|
| `scoped` | Vue scoped CSS / `:deep()` | `deep`, `css-scoped` |
| `createdBy` | 创建人字段 | — |
| `ownership` | 数据所有权校验 | — |
| `defineModel` | Vue 3.4 defineModel | `v-model`（太泛） |
| `v-loading` | antdv-next v-loading 指令 | `loading` |
| `userStore` | useUserStore Pinia store | `user` |
| `virtual-scroll` | 虚拟滚动 | `virtual`, `scroll` |
| `micro-frontend` | 微前端 | `microfrontend`, `micro-app`（指具体实现时可用） |
| `watch` | Vue 3 watch 监听器 | `watcher` |
| `async` | 异步数据加载与竞态控制 | — |
| `setData` | micro-app setData 通信 | — |
| `Space` | antdv-next Space 组件 | `space` |
| `enum` | 枚举映射/翻译 | `enum-map`, `dict` |
| `field-rename` | 字段名对齐/重命名（前端自命名对齐后端返回名） | `field-map`, `rename` |
| `catalog` | pnpm catalog 依赖管理 | `catalog:` |
| `await-to-js` | await-to-js 错误处理 | `to`, `error-handling` |
| `validate` | 表单校验/validate | `validation`, `validator` |
| `debounce` | 防抖/useDebounceFn | `throttle` |
| `request` | HTTP 请求/API 调用 | `fetch`, `http` |
| `template` | Vue 模板相关（标签闭合等） | `tag-closure`, `end-tag` |
| `useTableQuery` | useTableQuery 表格查询状态管理 hook | `use-table-query` |
| `emphasis` | ECharts emphasis 强调状态 | — |
| `notMerge` | ECharts setOption notMerge 策略 | — |
| `viewport` | viewport meta / 视口相关 | — |
| `ios-safari` | iOS Safari 特定兼容问题 | — |
| `bfcache` | 浏览器后退/前进缓存（bfcache） | — |
| `touch-action` | CSS touch-action 属性 | — |
| `migration` | defineModel/API 大规模迁移指南 | — |
| `refactor` | 代码重构/模式升级 | — |
| `script-setup` | Vue SFC `<script setup>` 编译限制/用法 | `setup-script` |
| `scenario-config` | 产能分配场景配置页面模式 | — |

### 新增词表流程
如果确实需要新增一个不在上述表中的 tag，必须在 INDEX.md 中**同时追加到受控词表**，并在 PR 备注中说明理由。

---

## 跨 skill 知识覆盖

不同 skill 覆盖的知识有重叠但视角不同。沉淀前用此表判断该写入哪个 skill：

| 领域 | `project-constraints` | `vue-best-practices` | `compound-engineering` |
|:-----|:---------------------|:---------------------|:-----------------------|
| 项目级禁止项（如"不要写死 `.ant-`"） | ✅ 定义规则 | — | — |
| Vue 通用写法（如 `ref` vs `reactive`） | — | ✅ 最佳实践 | ✅ 经验互补 |
| antdv-next 组件用法坑位 | — | — | ✅ 踩坑记录 |
| ECharts 配置模式 | — | — | ✅ |
| 构建/依赖配置 | — | — | ✅ |
| 跨页编辑、保存策略 | — | — | ✅ |
| 团队约定（样式规范、文件结构） | ✅ | ✅ | ❌ 不沉淀 |

**去重原则**：
- `project-constraints` 已禁止的 → 不要再在 compound-engineering 里重写禁止理由，直接引用其路径
- `vue-best-practices` 已覆盖的 → 如果 compound-engineering 有补充的坑位/变体，标注 `ref: vue-best-practices`
- **默认进 compound-engineering**：除非明确属于上述两种，否则沉淀到 `experiences/` 下对应 domain 文件

---

> **最后更新**：2026-07-15
