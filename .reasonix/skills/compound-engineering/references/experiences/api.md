# 经验沉淀 — API & 数据流

> 所有 API 调用、数据流、请求守卫、文件下载相关经验。

---

## 通用 / API & 数据流

### RequestClient 支持所有 HTTP Method

> **meta** `type=pattern` `tech=general` `domain=api` `severity=medium` `validated=2026-05-26`
> **tags** `requestClient, api, rest, patch, axios`

```ts
// 快捷方法（推荐）
requestClient.get(url, params);
requestClient.post(url, data);
requestClient.patch(url, data);

// 兜底写法
requestClient.request({ url, method: 'PATCH', data });
```

### 操作确认接口：无 payload 的 POST + await-to-js 错误提示 + 刷新列表

> **meta** `type=pattern` `tech=vue3` `domain=api` `severity=low` `validated=2026-06-09`
> **tags** `await-to-js, requestClient, request, version-management, card`

```ts
const loading = ref(false);
const selectedVersionId = ref<string | null>(null);

const selectedItem = computed(() =>
  items.value.find((item) => selectedVersionId.value === item.versionId),
);

async function handleConfirm() {
  const item = selectedItem.value;
  if (!item) return;

  loading.value = true;
  const [err, resp] = await to(confirmVersionApi(String(item.versionId)));
  loading.value = false;

  if (err) {
    message.error('确认失败，请稍后重试');
    return;
  }

  if (resp?.code !== 0) {
    message.error(resp?.message || '确认失败，请稍后重试');
    return;
  }

  message.success('版本已确认');
  selectedVersionId.value = null;
  await loadData();
}
```

### Axios Patch 方法调用方式不一致

> **meta** `type=fix` `tech=general` `domain=api` `severity=high` `validated=2026-05-26`
> **tags** `axios, request, patch, method, interceptor`

```ts
// ❌ 某些封装下直接调用可能失效
return requestClient.patch('/api/path', data);

// ✅ 兜底：显式指定 method
return requestClient.request({ url: '/api/path', method: 'PATCH', data });
```

### 批量编辑 Payload 数据结构嵌套错误

> **meta** `type=fix` `tech=general` `domain=api` `severity=high` `validated=2026-05-26`
> **tags** `api, payload, batch-edit, patch, structure`

```ts
// ❌ 扁平结构
const bad = { versionId: '1', list: [{ productCode: 'A', level: 'STAR' }] };

// ✅ 按接口契约嵌套
const good = { versionId: '1', edits: [{ productCode: 'A', values: { level: 'STAR' } }] };
```

### 历史记录弹窗枚举翻译失效及样式丢失

> **meta** `type=fix` `tech=vue3` `domain=api` `severity=medium` `validated=2026-05-26`
> **tags** `table, render, enum, tag, color, history`

兼容后端字段名映射，用 `h(Tag)` 渲染颜色：

```ts
render: (text: string, record: any) => {
  const label = parseEnumLabel(record.property, text);
  const color = getEnumColor(record.property, text);
  return h(Tag, { color, variant: 'outlined' }, () => label);
}
```

### 文件下载（统一入口）

> **meta** `type=pattern` `tech=general` `domain=file` `severity=medium` `validated=2026-05-26`
> **tags** `file, download, blob, axios, utils`

```ts
import { downloadFileFromResponse, downloadFileFromUrl } from '@decision/utils';

// 从请求响应下载
const resp = await requestClient.get('/api/export', { responseType: 'blob', responseReturn: 'raw' });
downloadFileFromResponse(resp, '文件名.xlsx');

// 从 URL 下载
downloadFileFromUrl({ source: url, fileName: '报告.pdf' });
```

### 指标卡接口拆分与金额单位统一

> **meta** `type=pattern` `tech=general` `domain=api` `severity=medium` `validated=2026-07-14` `last_updated=2026-07-14`
> **tags** `metrics, api-split, currency, refactor`

```ts
// 接口拆分
const [countRes, amountRes, ratioRes] = await Promise.all([
  fetchCountApi(), fetchAmountApi(), fetchRatioApi()
]);

// 金额与数量统一格式化（2026-07 重构：formatMoneyAutoUnit 已删除，统一为 formatNumberAutoUnit）
import { formatNumberAutoUnit } from '@decision/utils';
const m = formatNumberAutoUnit(rawAmount, { precision: 2 });
// 金额显示：m.unit ? `${m.value} ${m.unit}元` : `${m.value} 元`
// 数量显示：m.unit ? `${m.value} ${m.unit}标箱` : `${m.value} 标箱`
```

### 统一数字单位转换 — 单一方法分离关注点

> **meta** `type=pattern` `tech=general` `domain=api` `severity=medium` `validated=2026-07-14`
> **tags** `currency, refactor`

**背景**：项目中原有 `formatMoneyAutoUnit`（元/万元/亿元，含 baseUnit 预处理）和 `formatNumberAutoUnit`（万/千万/亿）两个方法，实则逻辑高度重合。2026-07 合并为单一 `formatNumberAutoUnit`。

**核心原则**：函数只做纯数字 → 量级除法（≥1万→万 / ≥1000万→千万 / ≥1亿→亿），不关心原始单位。调用方自行拼接业务单位后缀。

```ts
// @decision/utils
export type AutoUnit = '' | '万' | '千万' | '亿';

export function formatNumberAutoUnit(
  input: number | null | undefined,
  options?: { precision?: number },
): { unit: AutoUnit; value: string }

// 金额场景 — 调用方拼 "元"
const m = formatNumberAutoUnit(12345678, { precision: 2 });
// { value: "1234.57", unit: "万" } → "1234.57 万元"

// 数量场景 — 调用方拼业务单位
const m = formatNumberAutoUnit(50000000);
// { value: "5", unit: "千万" } → "5 千万标箱"

// 小值 — unit 为空
const m = formatNumberAutoUnit(5000);
// { value: "5000", unit: "" } → "5000 元" 或 "5000 标箱"
```

---

## API — 请求序列守卫（Request Sequence Guard）防过期响应覆盖

> **meta** `type=pattern` `tech=vue3` `domain=api` `severity=high` `validated=2026-05-26`
> **tags** `api, state, request, concurrent, stale`

**场景**：筛选快速切换时，旧的 API 响应可能在最新请求之后到达，覆盖掉新数据（race condition）。

**方案**：为每类请求维护一个递增的序列计数器，响应回来后检查计数器是否仍然匹配，不匹配则丢弃。

```ts
let loadSeq = 0;

async function loadPageForecastResult() {
  const seq = ++loadSeq;

  editableLoading.value = true;
  const [err, resp] = await to(getSomeApi(params));

  // 过期响应 → 关闭 loading 但不更新数据
  if (seq !== loadSeq) {
    editableLoading.value = false;
    return;
  }

  // 最新响应 → 正常更新
  editableLoading.value = false;
  // ... 更新 data ...
}
```

**注意**：
- 序列计数器必须在 composable/组件作用域内（不要放在文件顶层，防止跨实例冲突）
- 子请求函数如果独立更新状态（如 `loadKpi`），也要逐个加 guard
- 此模式不取消 HTTP 请求（请求仍在进行），只丢弃其响应
- 如需真正取消请求，需配合 AbortController（更重、需要 API 层改动）


### API 参数可选化：同一接口支持不同调用方传不同参数组合

> **meta** `type=pattern` `tech=general` `domain=api` `severity=low` `validated=2026-05-28`
> **tags** `api, demand-forecast, optional-parameter, version`

当同一个 API 被多个调用方以不同查询维度使用时，将参数类型设为可选，由各调用方按需传递：

```ts
// API 定义 — 所有参数均设为可选
export function listVersionsApi(data: {
  month?: string;
  year?: string;
}) {
  return requestClient.post('/app/rest/list-versions', data);
}

// 调用方 A — 传 month
listVersionsApi({ month: '2025-06-01' });

// 调用方 B — 传 year（不传 month）
listVersionsApi({ year: '2025' });
```

**原则**：
- 不同调用方有不同的查询维度需求时，不要为每个场景新建 API，而是在同一接口上扩展可选参数
- 类型上标记为 `?:` 即可，无需额外运行时默认值逻辑
- 已有调用方（如只传 `month`）不受影响，继续按原方式传参
- ⚠️ **参数值应动态绑定，不要硬编码**：当可选参数对应 UI 中的下拉选中项时，通过 `watch` 联动触发请求，而非写死固定值：

```ts
// ❌ 硬编码固定值
listVersionsApi({ year: '2025' });

// ✅ watch 联动选中项，动态传参
watch(() => selectedYear.value, (year) => {
  if (year) listVersionsApi({ year: String(year) });
});
```
### 供应路径明细字段对齐后端 API 返回字段名

> **meta** `type=fix` `tech=vue3` `domain=api` `severity=medium` `validated=2026-05-29`
> **tags** `supply-network, api, enum, field-rename`

**场景**：供应网络模块的需求文档初期未明确后端 API 返回字段名，`SupplyNetDetailRow` 类型和表格列均使用前端自命名的字段（`highMargin`/`midMargin`/`lowMargin`/`productionCost`）。后端实际上返回 `grossProfitHigh`/`grossProfitMiddle`/`grossProfitLow`/`unitCost`。

**解决步骤**：
1. 更新 API 类型定义中的字段名
2. 更新表格列定义的 `dataIndex` 和 `key`
3. 更新模板 `bodyCell` 中 `record.*` 引用
4. typecheck 验证，确认无新增错误

```diff
// API 类型 (supply-network.ts)
-  highMargin: number;
-  midMargin: number;
-  lowMargin: number;
-  productionCost: number;
+  grossProfitHigh: number;
+  grossProfitMiddle: number;
+  grossProfitLow: number;
+  unitCost: number;

// 表格列定义 (supply-table/index.vue)
-  dataIndex: 'highMargin'
+  dataIndex: 'grossProfitHigh'
-  dataIndex: 'midMargin'
+  dataIndex: 'grossProfitMiddle'
-  dataIndex: 'lowMargin'
+  dataIndex: 'grossProfitLow'
-  dataIndex: 'productionCost'
+  dataIndex: 'unitCost'
```

**预防**：需求文档中标注"返回值缺失，字段先自行命名，后续完善"时，后续收到后端实际字段名后必须全局搜索并同步更新类型 + 列定义 + 模板引用。
