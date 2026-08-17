# 经验沉淀 — Modal & Drawer

---

## Vue 3 / Modal & Drawer

### 弹窗/抽屉生命周期管理

> **meta** `type=pattern` `tech=vue3` `domain=modal` `severity=high` `validated=2026-05-26` `version=vue-modal-provider@latest`
> **tags** `modal, drawer, vue-modal-provider, lifecycle, destroy`

弹窗内部使用 `hide()+remove()` 管理销毁，不依赖外部 `afterClose`：

```ts
const { visible, hide, remove, resolve } = useModalRef();
const REMOVE_DELAY = 200;

const onCancel = () => { resolve(false); hide(); window.setTimeout(remove, REMOVE_DELAY); };
const onOk = async () => { /* 提交逻辑 */ resolve(true); hide(); window.setTimeout(remove, REMOVE_DELAY); };
```

### useModalRef 标准模板

> **meta** `type=ref` `tech=vue3` `domain=modal` `severity=medium` `validated=2026-07-17`
> **tags** `modal, drawer, useModalRef, vue-modal-provider`

```ts
const { args, visible, hide, remove, resolve } = useModalRef();

// ⚠️ 仅 :destroy-on-hidden="false" 保活模式下才需要 watch(visible)
// destroy-on-close（默认）模式下，每次打开是新实例，用 onMounted 即可
watch(() => visible.value, async (v) => {
  if (v) await load(String(args.value?.id ?? ''));
});

const closeModal = () => { hide(); window.setTimeout(remove, 200); };
```

### destroy-on-close 模式下 watch(visible) 是冗余的

> **meta** `type=pattern` `tech=vue3` `domain=modal` `severity=medium` `validated=2026-07-17` `version=vue-modal-provider@0.6`
> **tags** `modal, vue-modal-provider, watch, lifecycle, destroy`

当 Modal 每次关闭都通过 `remove()` 销毁组件（默认 destroy-on-close），每次打开是全新实例，`watch(visible)` 完全多余：

```ts
// ❌ 冗余：每次打开是新实例，watch 和 onMounted 效果完全相同
watch(() => visible.value, (v) => {
  if (v) loadData();
}, { immediate: true });

// ✅ 正确：onMounted 更简洁，且没有 immediate 语义混淆
onMounted(() => {
  loadData();
});
```

**判断标准：** 只要同时满足以下条件，`watch(visible)` 就是冗余的：
1. 使用 `useModalRef()` 且关闭时调用 `remove()`
2. 未设置 `:destroy-on-hidden="false"`
3. watch 回调仅在 `v === true` 时执行逻辑

**例外：** 如果 `destroy-on-hidden="false"`（保活模式），或者 `modalArgs` 可能变化（需要 watch versionId 等外部参数），则 watch 仍然必要。

### 声明式 v-model:open → vue-modal-provider 命令式迁移

> **meta** `type=pattern` `tech=vue3` `domain=modal` `severity=high` `validated=2026-07-16` `version=vue-modal-provider@0.6`
> **tags** `modal, vue-modal-provider, useModalRef, refactor`

将旧式声明式 Modal（`defineModel('open')` + `emit`）迁移为标准命令式模式：

**Modal 组件侧：**

```ts
// ❌ 旧：声明式
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ (e: 'created', payload: T): void }>();
function handleAfterClose() { /* 手动重置 */ }

// ✅ 新：命令式
export type MyModalArgs = { id: string; onCreated?: () => void };

const { args, visible, hide, remove, resolve } = useModalRef();
const modalArgs = computed(() => args.value as unknown as MyModalArgs);

function handleCancel() {
  hide();
  setTimeout(() => remove(), 200);
}
function handleOk(result: T) {
  resolve(result);
  modalArgs.value.onCreated?.();
  handleCancel();
}
```

**模板侧：**

```vue
<!-- ✅ 新：v-model:open 绑定 useModalRef 的 visible，并添加 @cancel -->
<Modal v-model:open="visible" @cancel="handleCancel">
```

**父组件侧：**

```ts
// ❌ 旧：声明式 + 手动 ref
const open = ref(false);
const loading = ref(false);
async function onCreated(payload: T) {
  loading.value = true;
  const ok = await handleCreate(payload);
  loading.value = false;
  if (ok) open.value = false;
}

// ✅ 新：useModal() 命令式
import { useModal } from 'vue-modal-provider';

const myModal = useModal(MyModal);

async function onOpen() {
  const [err, payload] = await to(
    myModal.show({ id: selectedId.value }),
  );
  if (err || !payload) return;
  await handleCreate(payload);
}
```

**关键原则：**

1. **destroy-on-close 模式下无需 `watch(visible)` 重置表单**：每次 `remove()` 后组件被销毁，下次打开是新实例，`ref` 自然回到初始值。这与 `:destroy-on-hidden="false"` 的保活模式不同——保活才需要 watch 手动重置。
2. `resolve()` 的结果就是 `show()` 的 Promise 返回值，比 `emit` 更直接
3. 父组件不再需要在 template 中写 `<MyModal v-model:open="..." />`，弹窗由 vue-modal-provider 动态挂载

### Drawer：`width` deprecated

> **meta** `type=fix` `tech=vue3` `domain=modal` `severity=medium` `validated=2026-05-26` `version=antdv@4.x`
> **tags** `drawer, width, deprecated, antdv-next`

```diff
- :width="450"
+ :size="450"
```
```diff
- :width="450"
+ :size="450"
```

---
## Vue 3 / Modal — 筛选与编辑禁用分离

### 弹窗中筛选控件不应与编辑控件共用 disabled 状态

> **meta** `type=pattern` `tech=vue3` `domain=modal` `severity=medium` `validated=2026-05-26` `version=vue@3.4`
> **tags** `modal, readonly, disabled, filter, select`

当弹窗进入只读态（如协作模式全部已提交）时，筛选条件必须保持可用，只有编辑操作需禁用：

```vue
<!-- ❌ 错误：disabled 同时禁用了筛选和编辑 -->
<Select v-model:value="filterState.regionCode" :disabled="disabled" />
<InputNumber v-model:value="coefficient" :disabled="disabled" />

<!-- ✅ 正确：筛选不解绑 disabled，编辑绑 -->
<Select v-model:value="filterState.regionCode" placeholder="请选择区域" />
<InputNumber v-model:value="coefficient" :disabled="disabled" />
```

**注意事项**：
1. 筛选条件只是查询参数，非编辑操作，永远不应被 `disabled` 绑定
2. 表格分页/排序同样不应被禁用，用户需要浏览数据
3. 如 `allSubmittedDisabled` 同时传递给筛选和编辑控件，应在子组件中区分使用：筛选控件不传 `:disabled`，编辑控件传

---

## Vue 3 / Modal — 异步切换引用数据时防止 UI 状态闪烁

### 弹窗中切换引用源时不宜提前清空卡片启用状态

> **meta** `type=pattern` `tech=vue3` `domain=modal` `severity=medium` `validated=2026-05-28` `version=vue@3.4`
> **tags** `modal, v-loading, async, watch, card, enabled`

当用户在下拉选择中切换引用场景时，如果先清空 `enabledGroupCodes` 再异步请求详情，
会经历「全部禁用 → 加载中 → 部分启用」的视觉闪烁，体验不佳。

**方案**：不在异步请求前修改启用状态，而是用 `v-loading` 遮罩覆盖参数区域，
数据返回后一次到位更新。

```vue
<script setup lang="ts">
const scenarioDetailLoading = ref(false);

async function onScenarioChange(id: string | undefined) {
  // 先重置表单默认值（不影响 enabledGroupCodes，避免卡片状态闪烁）
  initGroupValues();
  resetRegionBalance();

  if (!id) {
    enabledGroupCodes.value = [];
    return;
  }

  // 开启 loading 遮罩，屏蔽参数卡片在数据返回前的状态变化
  scenarioDetailLoading.value = true;
  const [err, resp] = await to(getScenarioDetailApi(id));
  scenarioDetailLoading.value = false;

  if (err || resp?.code !== 0) {
    enabledGroupCodes.value = ALL_GROUPS; // 降级
    return;
  }

  // 数据返回后一次性更新，无中间闪烁
  enabledGroupCodes.value = resp.data.groups
    .filter((g) => g.enabled)
    .map((g) => g.groupCode);
}
</script>

<template>
  <!-- 用 v-loading 遮罩，请求期间卡片状态不变 -->
  <div class="params-grid" v-loading="{ spinning: scenarioDetailLoading }">
    <ParamBlock
      v-for="code in paramCodes"
      :key="code"
      :enabled="isGroupEnabled(code)"
    />
  </div>
</template>
```

**关键原则**：
1. 异步加载期间不主动修改 UI 状态，用 loading 遮罩过渡
2. 仅当 API 返回成功时才更新状态（失败降级另行处理）
3. 表单数据（如默认值）仍可同步初始化，不依赖异步结果
