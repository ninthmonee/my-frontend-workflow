# 经验沉淀 — Table

> 所有表格相关经验：跨页编辑、列设置、虚拟滚动、渲染、高亮、编辑态联动等。

---

## Vue 3 / Table

### 表格编辑态跨页（Map 方案）

> **meta** `type=pattern` `tech=vue3` `domain=table` `severity=high` `validated=2026-05-26` `version=vue@3.4`
> **tags** `table, edit, cross-page, pagination, Map`

支持跨页编辑时，必须用 `Map` 替代数组缓存行数据，以行主键为 key：

```ts
const originalMap = new Map<string, any>();
const editingMap = new Map<string, any>();
const dirtyKeys = new Set<string>(); // 只记录实际变更的行

// 进入编辑态或分页变化时，将当前页数据补充到 Map
watch(() => props.rows, (rows) => {
  rows.forEach(row => {
    const key = row.customerCode;
    if (!originalMap.has(key)) originalMap.set(key, { ...row });
    if (!editingMap.has(key)) editingMap.set(key, { ...row });
  });
});

// 表格渲染数据：编辑态用 editingMap 覆盖当前页
const rowsForTable = computed(() => {
  if (!isEditing.value) return props.rows;
  return props.rows.map(row => editingMap.get(row.customerCode) ?? row);
});
```

### 表格编辑态选项（筛选值与编辑值分离）

> **meta** `type=pattern` `tech=vue3` `domain=table` `severity=medium` `validated=2026-05-26` `version=vue@3.4`
> **tags** `table, edit, options, filter, enum`

筛选下拉允许"全部"，编辑下拉只允许有效业务值：

```ts
// 列配置中就地过滤，不修改字典源
const editOptions = (options: Option[]) => options.filter(o => o.value !== 'all');
```

### 表格列 Tooltip Key 同步

> **meta** `type=pattern` `tech=vue3` `domain=table` `severity=medium` `validated=2026-05-26`
> **tags** `table, columns, tooltip, key-sync`

Tooltip 字典 Key 必须与列配置的 `key` 或 `dataIndex` 严格一致：

```ts
export const tooltips = { pbAvgProfit: '...', sysLevel: '...' };

// 列定义直接对应
{ key: 'pbAvgProfit', dataIndex: 'pbAvgProfit', tooltip: tooltips.pbAvgProfit }
```

### 表格数据编辑后局部刷新

> **meta** `type=pattern` `tech=vue3` `domain=table` `severity=medium` `validated=2026-05-26`
> **tags** `table, refresh, partial, search, performance`

保存后仅刷新表格，避免全量刷新 KPI/图表：

```ts
// ❌ 不推荐
await loadAllData();

// ✅ 推荐：仅刷新表格
search();
```

### 表格列设置：兼容新增列不丢失

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=high` `validated=2026-05-26`
> **tags** `table, columns, settings, preference, diff`

后端保存的列偏好配置不含新迭代新增的列，需要 diff 合并：

```ts
const defaultSettings = getDefaultColumnSettings();
const savedKeys = new Set(savedSettings.map((s: any) => s.key));
const newColumns = defaultSettings.filter((def) => !savedKeys.has(def.key));
columnSettings.value = [...savedSettings, ...newColumns];
```

### 表格左侧固定列重叠

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=high` `validated=2026-05-26`
> **tags** `table, columns, fixed, left, width`

多列 `fixed: 'left'` 时，每列必须显式声明固定 `width`：

```ts
{ key: 'name', title: '产品名称', width: 140, fixed: 'left' },
{ key: 'code', title: '产品编号', width: 140, fixed: 'left' },
```

### 表格行级高亮与单元格高亮颜色冲突

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=medium` `validated=2026-05-26`
> **tags** `table, highlight, css, scoped, deep, color`

同时使用 `rowClassName`（行背景）和 `customRender`（单元格文字颜色）时，单元格颜色必须用 `:deep()` 穿透 + `!important`，并选高对比色（如 `destructive` 红）：

```scss
.table-wrapper {
  :deep(.cell-tail-warn) {
    color: hsl(var(--DECISION-destructive)) !important;
  }
}
```

### 表格列配置：`render` 参数签名变化

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=high` `validated=2026-05-26` `version=antdv@4.x`
> **tags** `table, render, columns, antdv-next`

特定版本下 `render` 可能不是对象解构，而是顺序参数：

```ts
// ❌ 不生效
render: ({ text, record }: any) => fn(text, record)

// ✅ 正确
render: (text: string, record: any) => fn(text, record)
```

### `#bodyCell` 中 `column.key` 不命中

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=medium` `validated=2026-05-26` `version=antdv@4.x`
> **tags** `table, bodyCell, columnKey, virtual, antdv-next`

虚拟滚动等场景下 `column.key` 可能缺失，需回退到 `columnKey`：

```ts
const getColumnKey = (col: any) =>
  String(col?.columnKey ?? col?.key ?? col?.dataIndex ?? '');
```

### 虚拟滚动需动态计算 Y 轴高度

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=high` `validated=2026-05-26` `version=antdv@4.x`
> **tags** `table, virtual-scroll, height, useElementSize`

```vue
<script setup lang="ts">
import { useElementSize } from '@vueuse/core';

const tableWrapperRef = ref<HTMLElement | null>(null);
const { height } = useElementSize(tableWrapperRef);
const tableScrollY = computed(() => Math.max(height.value - 40, 200));
</script>

<template>
  <div ref="tableWrapperRef" style="height: 100%;">
    <Table virtual :scroll="{ y: tableScrollY }" />
  </div>
</template>
```

### 可编辑单元格：内部状态避免多行编辑冲突

> **meta** `type=pattern` `tech=vue3` `domain=table` `severity=medium` `validated=2026-05-26`
> **tags** `table, edit, state, ref, editable-cell`

编辑状态下放到组件内部，对外只暴露 `value` 和 `@save`：

```vue
<script setup lang="ts">
const props = defineProps<{ value: number }>();
const emit = defineEmits<{ save: [value: number] }>();
const isEditing = ref(false);
const internalValue = ref(props.value);
</script>
```

### 末尾 10% 判定口径

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=high` `validated=2026-05-26`
> **tags** `table, ranking, percentile, tail10, highlight`

确认口径方向：本项目末尾 10% = `rankingRate >= 0.9`：

```ts
const isTail = (rate?: number) => Number(rate ?? 0) >= 0.9;
const rowTailWarn = [aRanking, bRanking, cRanking, dRanking, eRanking].some(isTail);
```

### 尾部预警规则扩展（三处同步修改）

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=high` `validated=2026-05-26`
> **tags** `table, rules, warning, highlight, extension`

新增预警字段时必须同步修改 3 处代码：

```ts
// 1. 兜底逻辑 — 极小值收集数组追加字段
const minFields = ['salesScore', 'trendScore', 'newField']; // +newField

// 2. 行级匹配 — rowClassName 增加比对
const isTail = isTailRate(row.newFieldRankingRate);

// 3. 单元格标记 — 映射字典补充键值对
const tailCellMap: Record<string, string> = {
  salesScore: 'salesScoreRankingRate',
  newField: 'newFieldRankingRate', // +newField
};
```

### 表头 Tooltip 条件渲染

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=low` `validated=2026-05-26`
> **tags** `table, tooltip, conditional-render, header`

未配置 tooltip 的列不应渲染问号图标：

```vue
<template #headerCell="{ column }">
  <span>{{ column.title }}</span>
  <Tooltip v-if="(column as any).tooltip" :title="(column as any).tooltip">
    <QuestionCircleOutlined />
  </Tooltip>
</template>
```

---

## Vue 3 / Table — 编辑态联动

### 产品分级：编辑人工分级后 Tag 颜色不更新

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=high` `validated=2026-05-26`
> **tags** `product-grading, table, tag, edit, reactivity`

编辑时必须同步更新 `retLevel` / `isAdjustment`：

```ts
onChange: (newVal: any) => {
  const manualLevel = newVal || '';
  const hasManual = Boolean(manualLevel);
  emit('update:row', {
    ...record,
    manualLevel,
    retLevel: hasManual ? manualLevel : record.sysLevel,
    isAdjustment: hasManual,
  });
},
```

### 客户分级：编辑人工分级后 Tag 颜色不更新

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=high` `validated=2026-05-26`
> **tags** `customer-grading, table, tag, edit, reactivity`

```ts
if (dataIndex === 'manCustomerLevel') {
  const nextVal = newVal || undefined;
  const hasManual = Boolean(nextVal);
  emit('update:row', {
    ...record,
    manCustomerLevel: nextVal,
    retCustomerLevel: hasManual ? nextVal : record.sysCustomerLevel,
    isAdjustment: hasManual,
  });
}
```

### 列渲染：`#bodyCell` 插槽优先于 `render` / JSX

> **meta** `type=pattern` `tech=vue3` `domain=table` `severity=medium` `validated=2026-05-26` `version=antdv-next@1.2`
> **tags** `table, bodyCell, render, jsx, antdv-next`

antdv-next 的列定义使用 `render`（非 `customRender`），但在 `<script setup>` 中：

1. **`render` 不支持 JSX 语法** — `.vue` 文件中的 `<script setup>` 默认不支持 JSX，即使配置了 `@vitejs/plugin-vue-jsx`，类型检查也会报错
2. **优先使用 `#bodyCell` 插槽** — 在模板中用 `<template #bodyCell="{ column, text, record }">` 做条件渲染，更简洁且类型安全
3. **必须用 JS 渲染时用 `h()`** — 如 `Tag` 等小组件，用 `import { h } from 'vue'` + `h(Tag, props, slots)` 替代 JSX

> `render` API 签名：`render(text, record, index) => VNode | string`（与旧版 `customRender: ({ text })` 不同）

> `#bodyCell` 插槽参数：`{ column, text, record, index }`（推荐）

> 相关 Demo：`demo/edit-cell.md` 和 `demo/style-class.md`

---

## Vue 3 / Table — 删除权限校验

### 表格行删除需校验数据所有权（createdBy）

> **meta** `type=pattern` `tech=vue3` `domain=table` `severity=high` `validated=2026-05-26` `version=vue@3.4`
> **tags** `table, delete, ownership, userStore, createdBy`

删除类操作必须校验数据创建人，非本人创建的数据禁用删除按钮：

```ts
import { computed } from 'vue';
import { useUserStore } from '@decision/stores';

/** 当前用户标识（优先 realName，否则 username） */
const currentUserName = computed(() => {
  const store = useUserStore();
  const realName = String(store.userInfo?.realName ?? '').trim();
  if (realName) return realName;
  return String(store.userInfo?.username ?? '').trim();
});

const deleteDisabled = (record: DemandForecastVersionItem) =>
  Number(record.useStatus) === 1 ||     // 已使用不可删
  isAlgoVersion(record) ||             // 算法版本不可删
  record.createdBy !== currentUserName.value; // 仅允许创建人删除
```

**注意事项**：
1. `createdBy` 字段来自后端返回，需与 `userStore` 中的 `realName`/`username` 进行比对
2. 若 `createdBy` 存储的是用户 ID，则需改用 `userStore.userInfo?.userId` 比对
3. 相关 tooltip 说明也应同步更新，避免文案与实际行为不一致

---

## Vue 3 / Table — 跨模块页面结构对齐

### 版本管理页面：组件结构、模板、CSS、组件选型对齐

> **meta** `type=pattern` `tech=vue3` `domain=table` `severity=medium` `validated=2026-05-28` `version=vue@3.4` `version=antdv-next@4.x`
> **tags** `table, page-layout, component-structure, antdv-next, Space, v-loading, version-management`

同一系统中不同业务模块的「同名页面」（如版本管理）应保持结构一致性，对齐以下四个维度：

1. **组件文件结构** — Table 组件使用 `version-table/index.vue` 子目录结构（与 header-bar 同级）
2. **模板 div 层级** — 外层 `.page-shell` 统一加 `v-loading` 指令；操作按钮使用 `Space :size="0" wrap` 替代自写 flex
3. **CSS 样式** — `.page-shell__body` 只用 `flex: 1; min-height: 0;`（不额外加 `display: flex`）；`.table-card` 无需 `margin-top`
4. **组件选型** — 操作按钮区域统一使用 `Space` 组件（禁用态用 `disabled` prop，不可操作态用 `Popconfirm` 包裹）

```vue
<!-- index.vue — 页面入口对齐要点 -->
<template>
  <div class="xxx-version-page">
    <div
      class="page-shell"
      ref="shellRef"
      :class="{ scrolling: shellScrolling }"
      v-loading="{ spinning: pageLoading, minLoadingTime: 200 }"
    >
      <HeaderBar title="模块名 - 版本管理" @create="handleCreate" />
      <div class="page-shell__body">
        <VersionTable
          :rows="list"
          :loading="tableLoading"
          :pagination="pagination"
          @update:pagination="handlePaginationChange"
          @action="handleTableAction"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
// .page-shell__body 只需 flex: 1 + min-height: 0
// 不要在 body 上加 display: flex; flex-direction: column;
// table-card 的 flex 布局由自身定义

// 操作按钮紧凑排版
.version-table {
  :deep(.compact-actions) {
    row-gap: 0 !important;
    .decision-ant-btn-link {
      padding: 0 4px;
    }
  }
}

// 通用副标题样式
.cell-sub {
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: hsl(var(--DECISION-muted-foreground));
}
</style>
```

**对齐检查清单**：
- [ ] Table 组件是否使用子目录 `components/version-table/index.vue`
- [ ] 页面入口 `.page-shell` 是否加了 `v-loading`
- [ ] 操作按钮是否使用 `Space :size="0" wrap class="compact-actions"`
- [ ] `CommonAntvTable` 是否同时设置了 `:scroll="{ x: 'max-content', y: tableBodyScrollY }"` + `table-layout="auto"`
- [ ] `.page-shell__body` 是否只有 `flex: 1; min-height: 0;`（无额外 display:flex）
- [ ] `.table-card` 是否没有 `margin-top`
- [ ] `.cell-sub` 样式是否与参考模块一致（margin-top: 4px, font-size: 12px）

---

## Vue 3 / Table — useTableQuery 统一管理表格状态

### 手动分页管理迁移到 useTableQuery

> **meta** `type=pattern` `tech=vue3` `domain=table` `severity=medium` `validated=2026-05-28` `version=vue@3.4`
 > **tags** `table, useTableQuery, version-management, page-layout, component-structure`

当同一系统中多个模块的「同名页面」（如版本管理）使用不同的表格状态管理模式时，
应统一使用 `useTableQuery` 避免状态管理分散。

**核心迁移点：**

1. 使用 `useTableQuery` 替代手动 `ref` 声明的 `list`/`pagination`/`tableLoading`
2. `queryFn` 内将 `useTableQuery` 的 `pageNo` 映射为接口所需的 `pageNum`
3. 移除 table 组件中的 `pageNum→pageNo` 映射层（`pageNoPagination` computed）
4. 分页事件直接透传 `@update:pagination="emit('update:pagination', \$event)"`
5. 页面入口用 `pageChange` 替代 `handlePaginationChange`
6. 删除操作利用 `useTableQuery` 内置的「最后一页空数据回退」逻辑，无需手动处理分页回退

```ts
// ==================== Before: 手动管理 ====================
import { ref } from 'vue';

const loading = ref(false);
const tableLoading = ref(false);
const list = ref<Item[]>([]);
const pagination = ref({ pageNum: 1, pageSize: 10 });

async function loadList() {
  tableLoading.value = true;
  const [err, resp] = await to(getListApi({
    pageNum: pagination.value.pageNum,
    pageSize: pagination.value.pageSize,
  }));
  tableLoading.value = false;
  if (err || resp?.code !== 0) return;
  list.value = resp.data?.list ?? [];
  pagination.value.total = resp.data?.total ?? 0;
}

function handlePaginationChange(next) {
  pagination.value.pageNum = next.pageNum;
  pagination.value.pageSize = next.pageSize;
  loadList();
}

async function init() {
  loading.value = true;
  await loadList();
  loading.value = false;
}

// Table 组件内还需 pageNum↔pageNo 映射:
const pageNoPagination = computed(() => ({
  pageNo: props.pagination.pageNum,
  pageSize: props.pagination.pageSize,
}));


// ==================== After: useTableQuery ====================
import { useTableQuery } from '#/hooks/use-table-query';

const {
  data: list,
  loading: tableLoading,
  pagination,
  pageChange,
  refresh,
} = useTableQuery({
  queryFn: async (queryParams: any) => {
    const resp = await getListApi({
      pageNum: queryParams.pagination?.pageNo ?? 1,
      pageSize: queryParams.pagination?.pageSize ?? 10,
    });
    return {
      code: resp.code,
      msg: resp.msg,
      data: {
        list: resp.data?.list ?? [],
        total: resp.data?.total ?? 0,
      },
    } as any;
  },
  defaultParams: {
    pagination: {
      pageNo: 1,
      pageSize: 10,
      showQuickJumper: true,
      showSizeChanger: true,
      showTotal: true,
      pageSizeOptions: ['10', '20', '50', '100'],
    },
  },
  immediate: false,
});

// Table 组件直接传递 pagination（PaginationConfig，含 pageNo）
// 页面入口使用 pageChange 处理分页变化
// 删除后只用 refresh() 无需手动回退

// 页面级别 loading: 监听 tableLoading 的第一次翻转
const pageReady = ref(false);
const loading = computed(() => !pageReady.value);
watch(tableLoading, (v, ov) => {
  if (ov && !v && !pageReady.value) {
    pageReady.value = true;
  }
});
```

**注意事项：**
- `useTableQuery` 返回的 `pagination` 使用 `pageNo` 字段（非 `pageNum`）
- `queryFn` 入参 `queryParams.pagination` 包含 `pageNo/pageSize/showXxx/pageSizeOptions`
- 接口返回必须满足 `code === 0`，否则 data 会清空并被 total 置 0
- `refresh()` 有默认 300ms 防抖，需要同步等待时需自行通过 watch tableLoading 处理

---

## Vue 3 / Table — 分组表头 + 分页重叠修复

### 表体与分页重叠：缺失中间层 + 分组表头高度未计入 scroll.y

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=high` `validated=2026-05-29` `version=vue@3.4` `version=antdv-next@4.x`
> **tags** `table, scroll, pagination, grouped-header, CommonAntvTable, layout, page-shell__body, useElementSize`

**现象**：表格 body 区域与底部分页组件重叠；每页 20 条数据只能看到约 15 条。

**根因**（两个叠加问题）：

1. **结构缺失**：`.table-card` 直接作为 `.page-shell`(overflow:auto) 的 flex 子元素，同时设置了 `flex:1` + `overflow:hidden`。缺少 `.page-shell__body` 中间包裹层来解耦 flex 分配与溢出裁剪。
   - 对比工作页面（如 version-management）：`.page-shell → .page-shell__body(flex:1) → .table-card(height:100%)`

2. **scroll.y 公式不精确**：分组表头（grouped columns，如「毛利额」→ 高/中/低三档）高度远大于普通单行表头（~80px vs ~45px），硬编码公式 `bodyHeight - 89` 远不够。

**解决方案**：

### 结构对齐（页面层）

在 `.page-shell` 内增加 `.page-shell__body` 包裹层，由它承担 `flex:1`，表格卡片改为 `height:100%`：

```scss
// 页面 CSS（如 supply-network/index.vue）

// ⚠️ 关键差异: 用 height:100% 而非 flex:1；overflow:hidden 在子元素而非 flex 子元素上
".table-card {
  height: 100%;        // 引用父级明确高度（非 flex 分配）
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;    // 裁剪在子元素上，不在 flex 子元素上
}"
```

```html
<!-- 页面模板 -->
<div class="page-shell">
  <ControlBar />
  <div class="page-shell__body">  <!-- 新增中间层：flex:1, min-height:0, 无 overflow -->
    <SupplyTable />
  </div>
</div>
```

### scroll.y 动态公式（表格组件层）

使用 `useElementSize` 测量容器高度 + 动态测量表头实际高度：

```ts
import { computed, nextTick, ref, watch } from 'vue';
import { useElementSize } from '@vueuse/core';

const bodyRef = ref<HTMLElement | null>(null);
const { height: bodyHeight } = useElementSize(bodyRef);

/** 表头实际高度（分组表头默认 80px 初始值） */
const headerHeight = ref(80);

/**
 * scroll.y = bodyHeight - 44 - headerHeight - 8
 * 44px: CommonAntvTable 底部开销（分页footer 32px + margin 12px）
 * headerHeight: 动态测量，覆盖分组表头场景
 * 8px: 底部间隙 buffer（补偿测量误差 + 表体与分页视觉间距）
 */
const tableBodyScrollY = computed(() =>
  Math.max(bodyHeight.value - 44 - headerHeight.value - 8, 200),
);

/** 数据加载后测量实际表头高度 */
function measureHeaderHeight() {
  nextTick(() => {
    const thead = bodyRef.value?.querySelector(
      '.decision-ant-table-thead',
    ) as HTMLElement | null;
    if (thead) {
      headerHeight.value = Math.round(thead.getBoundingClientRect().height);
    }
  });
}

watch(() => props.rows, measureHeaderHeight);
```

```html
<template>
  <div ref="bodyRef" class="table-card__body">
    <CommonAntvTable
      :scroll="{ x: 'max-content', y: tableBodyScrollY }"
      table-layout="auto"
      ...
    />
  </div>
</template>
```

> **⚠️ 注意**：`table-layout="auto"` + `fixed` 列 + 空数据三个条件同时满足时，固定列表头会出现间隙错位。详见下方「空数据时固定列表头间隙」子节。如果表格不需要固定列，优先移除 `fixed` 而非 `table-layout="auto"`。

**预防要点**：
- 新增带分组表头的表格模块时，先复制 working 页面的 `.page-shell → .page-shell__body → .table-card(height:100%)` 三层结构
- 分组表头高度不可硬编码，必须动态测量（`querySelector('.decision-ant-table-thead')`）
- scroll.y 公式必须逐项列出所有减项并加 buffer（CommonAntvTable开销 + 表头 + 间隙）

---

### 空数据时固定列表头间隙：避免 table-layout="auto" + fixed 列组合

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=medium` `validated=2026-06-01` `version=vue@3.4` `version=antdv-next@4.x`
> **tags** `table, fixed, empty, table-layout, CommonAntvTable`

**现象**：数据为空时，`fixed: 'start'` 列的表头出现间隙/错位；有数据时恢复正常。

**根因**：`table-layout="auto"` 覆盖了 antdv-next 的默认 `fixed` 布局（列有 `fixed` 时自动启用）。`auto` 模式下列宽依赖内容计算。空数据时无 body 行，antdv-next 固定列 `left` 偏移量计算得不到正确列宽，产生错位。

**解决方案**（二选一）：

1. **移除固定列**（表格不需要固定定位时优先）：

```diff
- { title: '大区', width: 100, fixed: 'start' },
+ { title: '大区', width: 100 },
```

2. **移除 `table-layout="auto"`**（需保留固定列时）：

```diff
<CommonAntvTable
  :scroll="{ x: 'max-content', y: tableBodyScrollY }"
- table-layout="auto"
  ...
/>
```

**验证方式**：清空表格数据，检查固定列表头无错位。

**预防要点**：
- `table-layout="auto"` + `fixed` 列 + 空数据 三个条件同时满足时才会触发此问题
- 如果表格不需要固定列，优先移除 `fixed` 而非 `table-layout="auto"`
- 如果必须同时使用二者，在 data 为空时确保至少渲染一个隐藏行（不推荐）

---

### antdv Table/CommonAntvTable rowKey 失效：kebab-case attrs 未被正确读取

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=high` `validated=2026-07-16` `version=vue@3.4`
> **tags** `table, antdv-next, CommonAntvTable, rowKey`

**现象**：表格删除一行后 DOM 组件被复用，下一行的 Popconfirm/编辑控件拿到的是已删除行的 record 数据，写入/删除接口操作错误行。

**原因**：`CommonAntvTable` 用 `useAttrs()` 读取父组件传入的 `row-key="id"` 时只取了 `attrs.rowKey`。Vue 3 的 attrs 保留原始书写形式（不像 props 自动 camelize），kebab-case 写入的 key 在 attrs 里仍是 `'row-key'`，`attrs.rowKey` 恒为 `undefined`。同时 `tableAttrs` 解构只排除了 camelCase 的 `rowKey`，kebab-case 残留在 rest 中经 `v-bind` 透传，但模板里显式 `<ATable :row-key="rowKey"` 又用 `undefined` 覆盖了它。最终 `ATable` 拿到 `rowKey = undefined`，fallback 用 index 作为行 key，删除行后 index 复用导致组件实例（含 Popconfirm 状态）错位。

**解决方案**：在 `CommonAntvTable` 中同时兼容两种写法，并在解构 `tableAttrs` 时排除 kebab-case 版本，避免重复透传：

```ts
// 1. rowKey 读取：优先 camelCase，fallback kebab-case
const rowKey = computed(
  () => (attrs as any).rowKey ?? (attrs as any)['row-key'],
);

// 2. tableAttrs 解构：同时排除两种形式
const {
  // ...
  rowKey: _rowKey,
  'row-key': _rowKeyKebab,
  rowSelection: _rowSelection,
  'row-selection': _rowSelectionKebab,
  ...rest
} = attrs as Record<string, any>;
```

**预防要点**：
- `CommonAntvTable` 是唯一需要修改的地方（一处修复，全仓库受益）
- 所有调用方统一使用 kebab-case（`row-key="id"`），无需变更
- 类似问题也可能发生在其他使用 `useAttrs` 读取 kebab-case props 的共享组件上

---

### antdv Table rowSelection 跨页选中：onChange 仅返回当前页 keys，需手动合并

> **meta** `type=fix` `tech=vue3` `domain=table` `severity=high` `validated=2026-07-23` `version=vue@3.4` `version=antdv-next@4.x`
> **tags** `table, row-selection, antdv-next, delete`

**现象**：表格多选 + 分页场景下，第 1 页选中的行切换到第 2 页后丢失选中状态，批量删除只能删当前页的数据。

**原因**：antdv-next Table `rowSelection.onChange(selectedRowKeys)` 只返回**当前页面**的选中 keys，不包含其他页的 keys。如果父组件直接用 `onChange` 的值覆盖全局 `selectedRowKeys`，翻页后其他页的选中记录就会被清空。

**解决方案**：在 `onChange` 中计算「非当前页 keys」并与当前页 keys 合并：

```ts
// ❌ 错误：翻页后丢失其他页选中
onChange: (keys) => emit('update:selectedRowKeys', keys)

// ✅ 正确：合并非当前页 keys 以支持跨页选中
onChange: (keys) => {
  const currentPageIds = new Set(props.rows.map((r) => r.id));
  const otherPageKeys = props.selectedRowKeys.filter(
    (k) => !currentPageIds.has(k),
  );
  emit('update:selectedRowKeys', [...otherPageKeys, ...keys]);
}
```

**注意事项**：
1. `selectedRowKeys` 必须提升到编排层（父组件）管理，子组件通过 props 接收 + emit update 通信
2. 进入编辑模式时需清空 `selectedRowKeys`，批量删除成功后也需清空
3. `selectedRowKeys` 传给 antdv Table 时是全量数据（含所有页 keys），antdv 对不在当前 dataSource 中的 key 会静默忽略
