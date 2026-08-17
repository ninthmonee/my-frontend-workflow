

---

### iPad Safari Select 多选下拉选项无法点击选中

> **meta** `type=fix` `tech=vue3` `domain=form` `severity=high` `validated=2026-07-07` `version=antdv-next@4.x`
> **tags** `select, antdv-next, ios-safari, getPopupContainer, touch-action`

**现象**：iPad / iPadOS Safari 下，antdv-next Select（`mode="multiple"`）下拉列表的选项点击无反应，选中不生效。桌面 Chrome / Safari 正常。

**原因**：`getPopupContainer` 将下拉面板挂载到了父元素内部，而该父元素的祖先链上存在 `-webkit-overflow-scrolling: touch` 样式（如 `.page-shell` 的页面级滚动容器）。iPad Safari 的 `-webkit-overflow-scrolling: touch` 会启动原生动量滚动，勾子该区域内所有子元素的 touch 事件——下拉面板（`position: absolute`）的 tap 被误当作滚动意图消费，`onChange` 从未触发。

**解决方案**：
将 `getPopupContainer` 改为挂载到 `document.body`，脱离「被原生滚动接管」的容器：

```ts
// ❌ 错误：挂载到 -webkit-overflow-scrolling: touch 容器内
function getPopupContainer(node: HTMLElement) {
  return predictContentRef.value || node.parentElement || document.body;
}

// ✅ 修复：直接挂载到 body
function getPopupContainer() {
  return document.body;
}
```

**排查方法**：
1. 打开 Safari Web Inspector → Elements 面板
2. 点击 Select 展开下拉，检查下拉 DOM 节点挂载位置
3. 向上查找祖先是否有 `-webkit-overflow-scrolling: touch`
4. 若有 → 就是这个问题

**注意**：
- 该问题仅影响 **iPadOS / iOS Safari**（WebKit 内核），桌面 Chrome / Safari 不受影响
- `-webkit-overflow-scrolling: touch` 常用于"平滑滚动"页面容器，副作用是子元素 touch 事件被劫持
- 不推荐去掉 `-webkit-overflow-scrolling: touch`（会影响滚动体验），优先修 `getPopupContainer`

---

### Select 选项超长显示 Tooltip（optionRender + Tooltip + ellipsis）

> **meta** `type=pattern` `tech=vue3` `domain=form` `severity=medium` `validated=2026-07-16` `version=antdv-next@1.x`
> **tags** `select, antdv-next, tooltip`

**背景**：下拉选项文本过长（如需求预测版本名）会被容器截断，用户看不到完整内容。antdv-next Select 支持 `#optionRender` slot 自定义选项渲染，`option.data` 为原始 option 对象。

**核心逻辑**：
```vue
<script setup lang="ts">
import { Select, Tooltip } from 'antdv-next';
</script>

<template>
  <Select :options="options" option-filter-prop="label">
    <template #optionRender="{ option }">
      <Tooltip :title="option.data.label" placement="left">
        <div class="select-option-ellipsis">{{ option.data.label }}</div>
      </Tooltip>
    </template>
  </Select>
</template>

<style scoped lang="scss">
.select-option-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
```

**注意事项**：
1. `option.data` 才是传入的原始 option（`option` 本身是 FlattenOptionData 包装）
2. 弹层在卡片/弹窗边缘时 `placement="left"` 可避免 tooltip 被 Modal 裁剪
3. 内层 div 必须有 ellipsis 三件套，否则长文本会撑开下拉面板宽度
4. 参考实现：apps/main-app/src/views/capacity-allocation/version-management/components/CreateVersionModal/ParamGrid.vue

---

### Input 聚焦弹出浏览器自动填充下拉（autocomplete="off"）

> **meta** `type=fix` `tech=vue3` `domain=form` `severity=medium` `validated=2026-07-16` `version=antdv-next@4.x`
> **tags** `form, antdv-next`

**现象**：弹窗中的 Input 组件点击聚焦后，浏览器弹出历史保存值的下拉层（含删除按钮），干扰正常输入。

**原因**：antdv-next 的 `<FormItem name="xxx">` 会给内部 `<input>` 设置 `name` 属性，Chrome/Safari 等浏览器识别到已知字段名后触发自动填充（autofill），展示历史记录下拉。

**解决方案**：给 `<Input>` 添加原生 `autocomplete="off"` 属性。antdv-next Input 会将未知 attribute 透传到内部 `<input>` 元素：

```vue
<!-- ❌ 触发浏览器 autofill 下拉 -->
<Input v-model:value="version" placeholder="请输入" />

<!-- ✅ 禁用浏览器自动填充 -->
<Input v-model:value="version" placeholder="请输入" autocomplete="off" />
```

**预防要点**：
- 所有弹窗/模态框内的表单输入框都应考虑添加 `autocomplete="off"`，避免历史数据干扰
- `autocomplete` 是原生 HTML attribute，antdv-next 组件透明传递，无需特殊处理
- 也可在 `<Form>` 上设置 `autocomplete="off"`，但对 antdv-next Form 不保证透传到底层 `<form>` 元素
