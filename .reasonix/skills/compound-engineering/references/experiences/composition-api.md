# 经验沉淀 — Composition API

> Vue 3 Composition API 的规范、模式与坑位：ref/reactive、defineModel、composable 拆分、错误处理等。

---

## Vue 3 / Composition API

### Vue 3.4+ 组合式 API 规范

> **meta** `type=pattern` `tech=vue3` `domain=state` `severity=high` `validated=2026-05-26` `version=vue@3.4`
> **tags** `vue, composition-api, ref, defineModel, defineOptions, hook`

```ts
// ✅ 统一使用 ref，禁止 reactive
const count = ref(0);

// ✅ v-model 优先 defineModel
const value = defineModel<string>('value', { default: '' });

// ✅ 复杂逻辑抽离到 Hook
// useXxxOrchestration.ts 管理状态 + API + watch
// index.vue 退化为纯布局
```

### 异步错误处理（await-to-js）

> **meta** `type=pattern` `tech=general` `domain=api` `severity=high` `validated=2026-05-26` `version=await-to-js@3.x`
> **tags** `async, await, try-catch, error-handling, await-to-js`

```ts
import to from 'await-to-js';

const [err, res] = await to(apiCall());
if (err) { /* 错误处理 */; return; }
// 正常业务
```

### Promise.all 中某接口报错导致全部数据为空

> **meta** `type=fix` `tech=general` `domain=api` `severity=high` `validated=2026-05-26`
> **tags** `promise.all, await-to-js, api-error, error-handling`

```ts
// Promise.all 单接口失败会导致整体 reject
// 修复方案：确保各接口正确，或用 Promise.allSettled
const results = await Promise.allSettled([apiA(), apiB(), apiC()]);
```

### defineModel 字段重命名后 watch 失效

> **meta** `type=fix` `tech=vue3` `domain=state` `severity=high` `validated=2026-05-26`
> **tags** `defineModel, watch, refactor, rename`

修改字段名（如 `productNo` → `productCode`）后必须全局搜索旧字段名：

```bash
grep -r "productNo" src/
```

重点检查：watch 依赖数组、初始化对象、表单组件的 ref 初始化。

### 页面初始化接口重复请求

> **meta** `type=fix` `tech=vue3` `domain=api` `severity=medium` `validated=2026-05-26`
> **tags** `watch, duplicate-request, pagination, table`

当 `total < pageSize` 时直接基于当前表格数据计算兜底值，无需再请求：

```ts
function syncMinScoresFromTable() {
  const total = Number(pagination.value?.total ?? 0);
  if (!(total > 0 && total < pageSize)) return;
  const rows = Array.isArray(data.value) ? data.value : [];
  // 直接基于 rows 计算极小值
}
```

### 函数误作 type 导入导致 ReferenceError

> **meta** `type=fix` `tech=vue3` `domain=build` `severity=high` `validated=2026-05-26`
> **tags** `import-type, reference-error, typescript`

```diff
- import type { apiFunction } from './api';
+ import { apiFunction } from './api';
```

### 重复导入导致 Identifier declared

> **meta** `type=fix` `tech=vue3` `domain=build` `severity=low` `validated=2026-05-26`
> **tags** `vue, compiler, import, duplicate`

在 `<script setup>` 中重复导入同一变量会报 `Identifier has already been declared`，搜索并删除重复 import 即可。

### 模板中 `??` 与 `||` / `&&` 混用报错

> **meta** `type=fix` `tech=vue3` `domain=build` `severity=medium` `validated=2026-05-26`
> **tags** `vue, compiler, nullish-coalescing, operator`

```diff
- r?.id || r?.code ?? ''
+ (r?.id || r?.code) ?? ''
```

### defineProps 与 ref 同名冲突

> **meta** `type=fix` `tech=vue3` `domain=state` `severity=medium` `validated=2026-05-26` `version=vue@3.4`
> **tags** `defineProps, defineModel, duplicate-key, script-setup`

```diff
- // defineProps 声明了 editing，又 const editing = ref(false)
+ // 改用 defineModel
+ const editing = defineModel<boolean>('editing', { default: false });
```

### 禁止在 composable 中注入 mock/兜底数据（空态应由 UI 层处理）

> **meta** `type=pattern` `tech=vue3` `domain=state` `severity=high` `validated=2026-05-28` `version=vue@3.4`
> **tags** `composable, state, mock, empty, antdv-next, scenario-config`

**问题**：composable 中在 API 返回空列表时注入 mock 兜底数据（如假的基础场景），导致 UI 空态永远无法触发。

**根因**：数据状态管理越界——composable 不应替 API「补齐」缺失数据。mock 数据应仅在开发/测试阶段由外部注入，不应硬编码在生产 composable 中。

**解决**：
1. 删除 composable 中的所有 mock 回退逻辑
2. API 返回空列表 → 保持空列表（`list = []`），不做假数据补齐
3. activeKey 对空列表安全赋值：`activeKey.value = list.length > 0 ? list[0].scenarioId : ''`
4. UI 层通过 `v-if`/`v-else` 展示 antdv-next `Empty` 组件 + 引导 CTA 按钮

```vue
<!-- 空态：antdv-next Empty + CTA -->
<div v-else class="empty-state-wrapper">
  <a-empty description="暂无场景数据">
    <template #default>
      <a-button type="primary" @click="handleCreate">
        <template #icon><PlusOutlined /></template>
        创建第一个场景
      </a-button>
    </template>
  </a-empty>
</div>
```

```scss
// 空态容器：居中填充剩余空间，兼容日夜间主题
.empty-state-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: 24px;
}
```

---

### defineModel 迁移指南：从旧模式迁移到 Vue 3.4+ defineModel

> **meta** `type=pattern` `tech=vue3` `domain=state` `severity=high` `validated=2026-07-10` `version=vue@3.4`
> **tags** `defineModel, refactor, migration, v-model`

三种常见旧模式及其 defineModel 替换方案：

**模式 A：`defineProps` + `defineEmits('update:xxx')`**
```diff
 const props = defineProps<{
-  pagination: PaginationConfig;
   rows: Row[];
 }>();
-const emit = defineEmits<{
-  (e: 'update:pagination', pagination: PaginationConfig): void;
-}>();

+const pagination = defineModel<PaginationConfig>('pagination', { required: true });
```
模板变化：
```diff
-:pagination="props.pagination"
-@update:pagination="(p) => emit('update:pagination', p)"
+// 改为直接写入 defineModel ref
+:pagination="pagination"
+@update:pagination="(p) => pagination = p"
```

**模式 B：`computed({ get, set })` 代理**
```diff
-const props = defineProps<{ activeTab: DiffTabKey }>();
-const emit = defineEmits<{ (e: 'update:activeTab', val: DiffTabKey): void }>();
-const localActiveTab = computed({
-  get: () => props.activeTab,
-  set: (val) => emit('update:activeTab', val),
-});

+const activeTab = defineModel<DiffTabKey>('activeTab', { required: true });
```
模板中 `v-model:value="localActiveTab"` → `v-model:value="activeTab"`。

**模式 C：`emit('update:xxx', value)` 在函数内部调用**
```diff
-function handleRowSelectionChange(keys: Array<string | number>) {
-  ...
-  emit('update:selectedKeys', next);
-}

+function handleRowSelectionChange(keys: Array<string | number>) {
+  ...
+  selectedKeys.value = next;
+}
```

**模式 D：有回调链依赖（如 use-columns.tsx 通过 emit 回调）**
将 defineModel ref 作为参数传入 composable：
```ts
// 传入方
const selectedCustomerId = defineModel<string>('selectedCustomerId', { default: '' });
useCustomColumns(props, emit, selectedCustomerId);

// composable 方
export function useCustomColumns(
  props: { ... },
  emit: (event: any, ...args: any[]) => void,
  selectedCustomerId?: Ref<string>,
) {
  // 读：selectedCustomerId?.value
  // 写：selectedCustomerId!.value = newValue
}
```

**注意事项：**
1. antdv-next Select 的 v-model 协议是 `v-model:value`（不是 `v-model`）
2. defineModel 不加 `required`/`default` 时类型为 `T | undefined`，可能导致父组件类型不匹配
3. 移除 `emit('update:xxx')` 后注意清理模板中残留的 `@update:xxx` 监听和死代码函数

---

### 移除 defineModel 的三层清理模式

> **meta** `type=pattern` `tech=vue3` `domain=state` `severity=medium` `validated=2026-07-15`
> **tags** `defineModel, refactor, modal, checkbox`

**背景**：当需要移除一个通过 defineModel 双向绑定的状态（如 coefficientEnabled）时，需要在 3 个层级同步清理，漏掉任何一级都会导致 typecheck 失败。

**清理清单（按依赖顺序）**：
1. **子组件** — 删除 `defineModel` 声明、删除 import（如 `Checkbox`）、删除模板中使用该状态的元素
2. **composable** — 删除 `ref` 声明、删除使用该状态的 guard/逻辑、从 return 对象中删除
3. **父组件** — 删除 `v-model:xxx` 绑定、删除解构中对应变量

```ts
// ❌ 清理前：3 层各自引用 coefficientEnabled
// 子组件: const coefficientEnabled = defineModel<boolean>('coefficientEnabled', { required: true })
// composable: const coefficientEnabled = ref(false); if (!coefficientEnabled.value) return;
// 父组件: v-model:coefficient-enabled="coefficientEnabled"

// ✅ 清理后：3 层全部移除，仅保留 coefficientValue 的绑定
// 子组件: 仅 const coefficientValue = defineModel<number>('coefficientValue', { required: true })
// composable: 仅 const coefficientValue = ref<number>(1)
// 父组件: 仅 v-model:coefficient-value="coefficientValue"
```

---

### `<script setup>` 不允许 ES module export（共享常量/类型必须放独立模块）

> **meta** `type=fix` `tech=vue3` `domain=state` `severity=high` `validated=2026-07-15` `version=vue@3.5`
> **tags** `script-setup, template, refactor, scenario-config`

**现象**：vite build 失败，`@vue/compiler-sfc` 报错 `<script setup> cannot contain ES module exports`，抛出点为 `ScriptCompileContext.error`。

**原因**：在 `.vue` 的 `<script setup>` 块中写了 `export const` / `export type`（本例：`STOCKING_PARAM_KEY_MAP` 常量与 `StockingData` 类型），而 `<script setup>` 编译产物只允许默认导出组件本身。

**解决方案**：
1. 将共享常量/类型移到同目录的 `constants.ts`（或独立 `.ts` 模块）
2. `.vue` 组件改为 `import type { ... } from '../constants'` 消费
3. 其他消费方（composable 等）也从 `constants.ts` 导入，不要从 `.vue` 文件导入运行时符号

```ts
// ❌ InventoryLevelCard.vue <script setup> 内
export const STOCKING_PARAM_KEY_MAP = { ... }; // 编译失败
export type StockingData = ...;

// ✅ constants.ts
export const STOCKING_PARAM_KEY_MAP: Record<string, Record<string, string>> = {
  国内: { '丁腈（标箱）': 'CN_NBR', 'PVC（标箱）': 'CN_PVC' },
  越南: { '丁腈（标箱）': 'VN_NBR', 'PVC（标箱）': 'VN_PVC' },
  印尼: { '丁腈（标箱）': 'IDN_NBR', 'PVC（标箱）': 'IDN_PVC' },
};
export type StockingData = Record<string, Record<string, number | null>>;

// ✅ InventoryLevelCard.vue
import type { ScenarioParamGroup, StockingData } from '../constants';
```

**预防**：新建组件需要对外共享 mapping/类型时，第一时间放 `constants.ts`；`.vue` 文件的公开导出只应是组件默认导出。
