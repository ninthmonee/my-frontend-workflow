# 经验沉淀（Experiences）

> 每条记录包含 **meta**（类型/技术栈/领域/严重度/验证版本）和 **tags**（搜索标签）。

> | meta 字段 | 可选值 | 说明 |
> |---|---|---|
> | `type` | `pattern` 最佳实践 / `fix` 排查修复 / `ref` API 参考 | 经验类型 |
> | `tech` | `vue3` / `react` / `node` / `java` / `general` | 技术栈（按需扩展） |
> | `domain` | `table` / `chart` / `modal` / `form` / `api` / `css` / `enum` / `build` / `file` / `state` / `micro-frontend` / `theme` | 领域 |
> | `severity` | `high` / `medium` / `low` | 重要程度 |
> | `validated` | `yyyy-mm-dd` | 最后验证日期 |
> | `version` | `技术@版本` | 验证时的版本 |

> **沉淀原则**：只沉淀与代码直接相关的经验（模式/修复/API），不沉淀文档规范类内容。

---

## 按领域快速入口

| 领域 | 文件 | 条目数 | 涵盖内容 |
|:-----|:-----|:-------|:---------|
| Table | [experiences/table.md](./experiences/table.md) | 16+ | 跨页编辑、列设置、虚拟滚动、渲染、高亮、编辑联动、rowKey kebab-case 失效 |
| Modal & Drawer | [experiences/modal.md](./experiences/modal.md) | 5 | 弹窗生命周期、useModalRef、Drawer width、声明式迁移、destroy-on-close 下 watch(visible) 冗余 |
| Form | [experiences/form.md](./experiences/form.md) | 6 | Select/DatePicker 弹层、FormItem 校验、多选类型、防抖搜索、autocomplete 自动填充 |
| Composition API | [experiences/composition-api.md](./experiences/composition-api.md) | 10 | ref/defineModel 规范、await-to-js、import 陷阱、同名冲突、defineModel 三层清理 |
| ECharts | [experiences/chart.md](./experiences/chart.md) | 12 | 四象限图、图表不显示、label 聚合、坐标轴、散点图、resize、legend 溢出、emphasis 不同步 |
| CSS & 主题 | [experiences/css.md](./experiences/css.md) | 10 | 页面骨架、背景网格、scoped 穿透、样式前缀、主题变量、Card、iOS Safari viewport 缩放 |
| API & 数据流 | [experiences/api.md](./experiences/api.md) | 8 | RequestClient、Patch、Payload、文件下载、序列守卫 |
| 枚举 | [experiences/enum.md](./experiences/enum.md) | 2 | ProductLevel 渲染、模块重构 |
| 构建 | [experiences/build.md](./experiences/build.md) | 1 | pnpm catalog 依赖管理 |
| 微前端 | [experiences/micro-frontend.md](./experiences/micro-frontend.md) | 1 | micro-app 跨域代理 |
| 路由 & 菜单 | [experiences/route.md](./experiences/route.md) | 1 | 路由模块新增模式 |

---

## 附录：PRD 与版本记录

> 以下 PRD 描述性条目仅保留索引，不展开完整内容（非代码经验）。

| 主题 | 位置 |
|:-----|:-----|
| 列表型模块标准结构（use-table-query） | 代码已封装在 `@decision/stores` |
| 模块入口组件三层结构 | 代码已在 `apps/main-app/src/layouts` |
| Vue 组件样式编写规范 | 由 `project-constraints` skill 覆盖 |

---

> **提示**：搜索经验时，直接 `grep` 对应领域文件，或使用 `experiences/*.md` 全量搜索：

```bash
# 按关键词搜索所有经验文件
grep "keyword" experiences/*.md

# 按 domain 搜索
grep "domain=table" experiences/*.md

# 按 tags 搜索
grep "tags.*virtual-scroll" experiences/*.md

# 搜索指定 severity
grep "severity=high" experiences/*.md
```
