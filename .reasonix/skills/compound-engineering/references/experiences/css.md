# 经验沉淀 — CSS & 主题

> 所有样式、布局、主题、Card、滚动条相关经验。

---

## Vue 3 / CSS & 主题

### 页面骨架（Page + Shell + Inner）

> **meta** `type=pattern` `tech=vue3` `domain=css` `severity=medium` `validated=2026-05-28` `last_updated=2026-05-28`
> **tags** `layout, page, shell, max-width, ipad`

```scss
.page { position: relative; height: 100%; min-height: 0; overflow: hidden; }
.shell { position: relative; height: 100%; min-height: 0; overflow: auto; -webkit-overflow-scrolling: touch; padding: 16px; }
.shell__inner { max-width: 1440px; margin: 0 auto; height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 16px; }
```

> ⚠ 补充（2026-05-28）：参照设计稿实现页面时，除了套用骨架模板，还需检查以下细节。

**flex 链完整性**：`.page-shell` → `.page-shell__body` → 子卡片 → 卡片 body — 每一层需要 `flex:1;min-height:0` 的必须逐层补齐，否则子元素无法撑满剩余空间。

```scss
.page-shell { display: flex; flex-direction: column; } // 必须设置，否则子元素无法纵向填充
.page-shell__body { flex: 1; min-height: 0; display: flex; flex-direction: column; } // 作为 flex 子项时填满空间，同时作为 flex 容器让子卡片继续填充
.table-card { flex: 1; min-height: 0; display: flex; flex-direction: column; } // 卡片也需接入 flex 链
.table-card__body { flex: 1; min-height: 0; } // 最终承载表格 body 的区域
```

**padding 一致性**：`.page` 的 `padding` 上下值必须一致（如均用 `18px`），否则视觉偏斜。响应式断点内也需同步检查。


### 页面背景：光晕 + 竖线网格

> **meta** `type=pattern` `tech=general` `domain=css` `severity=low` `validated=2026-05-26`
> **tags** `css, background, radial-gradient, grid, theme`

```scss
.page::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(1100px 560px at 8% -10%, var(--bg-primary), transparent 62%),
    radial-gradient(900px 520px at 92% 0%, var(--bg-success), transparent 65%),
    repeating-linear-gradient(90deg, var(--bg-line) 0, var(--bg-line) 1px, transparent 1px, transparent 24px);
}
```

### scoped 样式：对 `h()` 创建的 VNode 不生效

> **meta** `type=fix` `tech=vue3` `domain=css` `severity=medium` `validated=2026-05-26`
> **tags** `scoped, css, deep, vnode, render, table`

```scss
.table-header {
  :deep(.th) { display: inline-flex; gap: 10px; }
  :deep(.th-icon) { flex: 0 0 auto; }
}
```

### scoped 样式：对 antdv 组件 Fragment 不生效

> **meta** `type=fix` `tech=vue3` `domain=css` `severity=medium` `validated=2026-05-26`
> **tags** `scoped, css, deep, antdv-next, fragment, width`

```scss
.header-actions {
  :deep(.station-select) { width: 140px; }
}
```

### antdv-next：样式前缀不要写死 `.ant-`

> **meta** `type=fix` `tech=vue3` `domain=css` `severity=high` `validated=2026-05-26` `version=antdv@4.x`
> **tags** `antdv-next, css, prefix, scoped, deep, decision`

项目通过 `ANTD_PREFIX_CLS` 配置前缀（如 `decision-ant`），写死 `.ant-` 不命中：

```scss
// ✅ 使用变量或确认实际前缀
:deep(.decision-ant-upload) { display: inline-block; }
```

### 主题变量：使用 `--DECISION-*`

> **meta** `type=fix` `tech=general` `domain=theme` `severity=medium` `validated=2026-05-26`
> **tags** `theme, css-var, decision, card, styles`

```scss
.card {
  border: 1px solid hsl(var(--DECISION-border));
  background: hsl(var(--DECISION-background) / 0.72);
}
```

### 内容区域滚动条自动隐藏

> **meta** `type=pattern` `tech=general` `domain=css` `severity=low` `validated=2026-05-26`
> **tags** `scroll, scrollbar, layout, ipad`

```scss
.page-shell { overflow: auto; scrollbar-width: thin; scrollbar-color: transparent transparent; }
.page-shell.scrolling { scrollbar-color: hsl(var(--DECISION-foreground) / 18%) transparent; }
```

```ts
const shellRef = ref<HTMLElement | null>(null);
const shellScrolling = ref(false);
let timer: number | undefined;

onMounted(() => {
  shellRef.value?.addEventListener('scroll', () => {
    shellScrolling.value = true;
    clearTimeout(timer);
    timer = window.setTimeout(() => { shellScrolling.value = false; }, 800);
  }, { passive: true });
});
```

### 表格内容区高度按固定行数计算

> **meta** `type=pattern` `tech=vue3` `domain=table` `severity=medium` `validated=2026-05-26`
> **tags** `table, scroll, height, rows`

```ts
const tableBodyScrollY = ref(600);
const minRowHeight = 60;
const rowsToShow = 10;

const syncTableBodyHeight = async () => {
  await nextTick();
  await new Promise<void>(r => requestAnimationFrame(() => r()));
  const firstRow = wrapRef.value?.querySelector('.decision-ant-table-tbody > tr') as HTMLElement | null;
  const measured = Math.round(firstRow?.getBoundingClientRect().height || minRowHeight);
  tableBodyScrollY.value = Math.max(measured, minRowHeight) * rowsToShow;
};
```

---

## Vue 3 / Card

### Card 根节点 flex ≠ 内容层 flex

> **meta** `type=fix` `tech=vue3` `domain=css` `severity=medium` `validated=2026-05-26` `version=antdv@4.x`
> **tags** `card, css, layout, flex, antdv-next`

Card 有 body 包装层，样式需命中 `*-card-body`：

```scss
.my-card :deep(.decision-ant-card-body) {
  display: flex;
  gap: 12px;
}
```

### 容器 z-index 不足导致 Select 下拉被后续元素遮挡

> **meta** `type=fix` `tech=vue3` `domain=css` `severity=high` `validated=2026-05-26` `version=antdv-next@1.2`
> **tags** `select, dropdown, z-index, getPopupContainer, antdv-next`

antdv-next 的 Select 下拉菜单默认挂载到 `document.body`，当 Select 位于一个设置了 `position: relative` + `z-index` 的容器中时，下拉菜单的层叠上下文由 `document.body` 决定，可能被后续 DOM 元素（如表格面板）覆盖。

**两种修复方式：**

方式一 — 提高容器 z-index（简单有效）：
```scss
.control-bar {
  position: relative;
  z-index: 10; // 大于后续容器的隐式层叠上下文
}
```

方式二 — 将下拉菜单挂载到容器内（需要容器不裁剪 overflow）：
```vue
<Select :get-popup-container="(node) => node.parentElement || document.body" />
```

推荐优先使用方式一，不影响 Select 原本的弹出定位逻辑。

---

## antdv-next / Tabs — 按钮放插槽不可见时改用独立 flex 行

> **meta** `type=fix` `tech=vue3` `domain=css` `severity=medium` `validated=2026-05-27` `version=antdv-next@4.x`
> **tags** `antdv-next, tabs, layout, flex`

**现象**：Tabs 组件的 `#rightExtra` / `#leftExtra` 插槽内放置按钮后，按钮渲染但不可见。

**根因**：antdv-next Tabs 对 `extra` 插槽的内部布局可能隐藏或截断按钮。

**解决**：不依赖 Tabs 插槽，改用独立 flex row 布局：

```html
<!-- ❌ 按钮放 Tabs 插槽不可见 -->
<a-tabs>
  <template #rightExtra>
    <a-button>创建</a-button>
  </template>
</a-tabs>

<!-- ✅ 独立 flex 行，Tabs 与按钮并排 -->
<div class="tabs-row">
  <a-tabs class="tabs-row__tabs" />
  <div class="tabs-row__actions">
    <a-button>
      <template #icon><PlusOutlined /></template>
      创建
    </a-button>
  </div>
</div>
```

```scss
.tabs-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tabs-row__tabs { flex: 1; min-width: 0; }
.tabs-row__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
```

**注意**：
- 同时需隐藏 Tabs 原始内容区 `:deep(.ant-tabs-content-holder) { display: none; }`（若卡片在下方独立渲染）

---

## CSS / Flex 高度链 — `height: 100%` + padding 需 `box-sizing: border-box`

> **meta** `type=fix` `tech=vue3` `domain=css` `severity=high` `validated=2026-05-27` `version=general`
> **tags** `css, layout, flex, box-sizing, height`

**现象**：flex column 容器设置 `height: 100%` + `padding` 后，总高度 = `100% + padding`，超出父容器导致溢出。

**根因**：`box-sizing` 默认为 `content-box`，`height: 100%` 仅约束内容区，padding/border 额外叠加。

**解决**：对所有参与高度链的容器显式设置 `box-sizing: border-box`：

```scss
.page {
  height: 100%;
  padding: 18px;
  box-sizing: border-box; // padding 计入高度
}

.page-shell {
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
}
```

同时避免 `@supports (height: 100dvh)` 中使用 `100dvh`——该单位在 flex 上下文中会导致非预期高度，统一使用 `100%`。

---

## iOS Safari — bfcache 恢复时页面自动放大

> **meta** `type=fix` `tech=vue3` `domain=css` `severity=high` `validated=2026-07-07`
> **tags** `viewport, ios-safari, bfcache, touch-action, pageshow, visibilitychange`

**现象**：iPad mini / iPhone Safari 上，用户切换到其他 App 后再返回 Safari，页面自动放大（scale > 1.0），且因 `user-scalable=0` 无法手动 pinch 缩回。

**根因**：iOS WebKit 在 bfcache restore 阶段会暂时忽略 viewport meta 约束，以错误 scale 恢复渲染。`user-scalable=0` 使问题恶化——一旦恢复为错误 scale，用户无法自行纠正。这是 Apple 已知 Bug（iOS 12~18 均存在）。

**解决方案（三层防治）**：

**第一层 — JS 监听恢复并强制重置 viewport**（核心）：

```ts
// packages/@core/composables/src/use-ios-viewport-fix.ts

function resetViewportScale(): void {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="viewport"]',
  );
  if (!meta) return;

  const original = meta.getAttribute('content') ?? '';
  // 先设一个中间值迫使 WebKit 重解析，再写回原始值
  meta.setAttribute('content', 'width=device-width,initial-scale=0.5');
  requestAnimationFrame(() => {
    meta.setAttribute('content', original);
  });
}

export function useIOSViewportFix(): void {
  // bfcache 从缓存恢复
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      resetViewportScale();
    }
  });

  // App 切换后恢复
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestAnimationFrame(() => {
        resetViewportScale();
      });
    }
  });
}
```

在 `bootstrap.ts` 最早处调用（位于 Vue app 创建之前，确保监听器在页面生命周期最先注册）：

```ts
// apps/main-app/src/bootstrap.ts
import { useIOSViewportFix } from '@decision/hooks';

async function bootstrap(namespace: string) {
  useIOSViewportFix();
  // ...
}
```

**第二层 — CSS 阻止双击缩放**（辅助）：

```css
/* packages/@core/base/design/src/css/global.css */
html {
  touch-action: manipulation;
}
```

**第三层 — viewport meta 保持不变**（已有配置无需修改）：

```html
<meta name="viewport"
  content="width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=0" />
```

**注意事项**：
- `pageshow` + `e.persisted` 专门覆盖 bfcache restore，比 `visibilitychange` 更精确
- `visibilitychange` → `requestAnimationFrame` 覆盖普通 App 切换，延迟一帧确保 Safari 自身恢复完成
- 临时设 `scale=0.5` 再恢复原值是关键——单纯的 `setAttribute(content, original)` 在值不变时不会触发 WebKit 重解析
- `touch-action: manipulation` 消除双击缩放延迟，同时阻止另一种 zoom 路径
- 所有 API（`pageshow` / `visibilitychange` / `requestAnimationFrame`）iOS Safari 9+ 均支持

---

### 筛选项统一样式规范（卡片化边框 + label 等宽 + Select 等宽）

> **meta** `type=pattern` `tech=vue3` `domain=css` `severity=low` `validated=2026-08-12` `last_updated=2026-08-12`
> **tags** `css, filter, select`

**背景**：筛选栏需统一视觉：① label 文本长度不一（「区域」2 字 vs「特殊品类」4 字）导致 Select 左边界不齐；② 筛选项缺少卡片化外层边框。以客户分级筛选项为基准样式，跨页面统一。

**核心逻辑**（三要素）：

```scss
/* 1. 卡片化外层边框（容器类：.field / .field-filter / .month-filter / .filter-bar__item 均可套用） */
.field {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 4px 8px;
  background: hsl(var(--DECISION-background) / 55%);
  border: 1px solid hsl(var(--DECISION-foreground) / 6%);
  border-radius: 12px;
  box-shadow: 0 1px 0 hsl(var(--DECISION-background) / 75%) inset;
}

/* 2. label 文本区域等宽（必须固定 width，不要 min-width） */
.field__label {
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  flex-shrink: 0;
  width: 5em; /* 4 全角字 + 全角冒号（font-size 12px → 60px） */
}

/* 3. 普通筛选 Select 等宽 */
/* style="width: 170px"（内联）或统一 class */
```

**版本控件例外**：当前版本 / 多版本对比 / 展示版本等长文本版本选择控件**不参与** 170px 等宽，保持较宽（240/260/280px），对应客户分级「展示版本 280px 例外」。

**注意事项**：
1. **必须用固定 `width`，不要用 `min-width`**：四字 label（如「特殊品类：」= 4 字 + 全角冒号 ≈ 5em）会撑开超过 `min-width: 4em`，二字/四字 label 实际宽度仍不同，Select 依旧错位
2. 宽度按 em 计算相对 `font-size` 自适应，无需硬编码 px
3. `flex-shrink: 0` 防止 flex 布局挤压导致 label 变窄
4. 各页面 label 类名可能不同（`.field__label` / `.field-filter__label` / `.month-filter__label` / `.filter-bar__label`），均需单独加等宽样式
5. 参考实现：客户分级 `order-grading/customer/components/control-bar/index.vue`（基准）；已统一页面：目标监控、供应网络、产品分级、需求预测-版本管理/预测结果、产能分配-分配结果
6. **label 不带冒号**（2026-08-12 补充）：筛选项 label 统一去冒号（「区域：」→「区域」），保持简洁；元信息类文本（更新时间/路径数等 `control-meta__label`）保留冒号以示区分。去冒号后 label 等宽 `width: 5em` 仍适用（固定宽度保证对齐）
