# 经验沉淀 — ECharts

---

## Vue 3 / ECharts

### 散点四象限图坐标居中相交

> **meta** `type=pattern` `tech=vue3` `domain=chart` `severity=medium` `validated=2026-05-26`
> **tags** `echarts, scatter, quadrant, axisLine, onZero, offset`

通过数据偏移使中心点转为 (0,0)，配合 `axisLine.onZero`：

```ts
const centerX = 100, centerY = 50;

const option = {
  xAxis: {
    axisLine: { show: true, onZero: true },
    axisLabel: { formatter: (val: number) => val + centerX }
  },
  yAxis: {
    axisLine: { show: true, onZero: true },
    axisLabel: { formatter: (val: number) => val + centerY }
  },
  series: [{
    type: 'scatter',
    data: originalData.map(item => [item.x - centerX, item.y - centerY])
  }]
};
```

### 图表不显示：接口 data 包装 + 枚举不匹配

> **meta** `type=fix` `tech=general` `domain=chart` `severity=high` `validated=2026-05-26`
> **tags** `echarts, api, enum, data-structure`

兼容两种返回形态，分组用枚举值而非中文：

```ts
const data = Array.isArray(resp) ? resp : resp?.data ?? [];
const groups: Record<string, typeof data> = {};
data.forEach(item => {
  const key = item.customerLevel === 'STRATEGIC' ? '战略' : '非战略';
  (groups[key] ??= []).push(item);
});
```

### 图表按中文 label 聚合导致某档统计为 0

> **meta** `type=fix` `tech=general` `domain=chart` `severity=high` `validated=2026-05-26`
> **tags** `echarts, enum, product-level, aggregation`

用枚举值而非中文 label 做聚合 key：

```ts
const gradeLabelMap: Record<string, string> = {
  STAR: '明星级', COW: '奶牛级', SEED: '种子级', SKINNY_DOG: '瘦狗级',
};
const levelKey = String(val.level ?? '').trim().toUpperCase();
const level = gradeLabelMap[levelKey] ?? '';
if (level && counts[level] !== undefined) counts[level] += val.sysCount || 0;
```

### ECharts 坐标轴标签被遮挡

> **meta** `type=fix` `tech=general` `domain=chart` `severity=medium` `validated=2026-05-26`
> **tags** `echarts, axisLabel, overlap, hideOverlap`

```ts
xAxis: { axisLabel: { hideOverlap: true, margin: 12 } },
grid: { left: 20, right: 80, top: 40, bottom: 40 },
```

### y 轴负值被截断

> **meta** `type=fix` `tech=general` `domain=chart` `severity=high` `validated=2026-05-26`
> **tags** `echarts, yAxis, negative, min, max`

```diff
- yAxis: { min: 0 }
+ yAxis: {}  // 移除 min/max 限制，让 ECharts 自动缩放
```

### 散点图点大小需一致（非气泡图）

> **meta** `type=fix` `tech=general` `domain=chart` `severity=low` `validated=2026-05-26`
> **tags** `echarts, scatter, symbolSize`

```diff
- symbolSize: (val: number[]) => normalizedSize(val)
+ symbolSize: 10
```

### 散点图悬浮去除节点额外文本

> **meta** `type=fix` `tech=general` `domain=chart` `severity=low` `validated=2026-05-26`
> **tags** `echarts, scatter, hover, emphasis, label`

```ts
series: [{ type: 'scatter', emphasis: { label: { show: false } } }]
```

### 图表 `height: 100%` 导致塌陷

> **meta** `type=fix` `tech=vue3` `domain=chart` `severity=high` `validated=2026-05-26`
> **tags** `echarts, height, percent, flex, layout`

百分比高度链路必须闭合：

```scss
.page { height: 100%; overflow: hidden; }
.shell { height: 100%; overflow: auto; }
.content { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.panel__body { flex: 1; min-height: 320px; }
```

### 柱状图 legend 多版本名溢出重叠

> **meta** `type=fix` `tech=general` `domain=chart` `severity=medium` `validated=2026-07-07`
> **tags** `echarts, legend, bar, notMerge`

**现象**：差异分析弹窗的柱状图使用版本名称作为 legend item（如 "2024年Q1客户分级评估版本V1"），5 个版本名挤在图表底部宽度不足，文本重叠。

**根因**：`legend: { bottom: 0 }` 无溢出处理，长文本项数量多时必然溢出。

**解决方案**：
1. `legend.type: 'scroll'` — ECharts 内置滚动 legend，溢出自动显示滚动箭头（Web 鼠标滚轮/iPad 触摸滑动均原生支持）
2. `grid.bottom` 从 30 适当增大到 38，给 scroll legend 滚动条留空间

```diff
  legend: {
    bottom: 0,
+   type: 'scroll',
  },
  grid: {
-   bottom: 30,
+   bottom: 38,
  },
```

**注意事项**：
- `type: 'scroll'` 在所有主流平台（含 iPad Safari）均原生支持触摸滑动，无需额外 polyfill
- 不要用 `textStyle.overflow: 'truncate'` — 截断后用户看不到完整版本名
- 不要用 `orient: 'vertical'` — 竖排 legend 占用水平空间，iPad 上图表更窄

### 柱状图 legend 选中状态与图表高亮不同步

> **meta** `type=fix` `tech=general` `domain=chart` `severity=medium` `validated=2026-07-07`
> **tags** `echarts, legend, bar, emphasis, focus, notMerge`

**现象**：ECharts 柱状图中，legend 某项显示为选中（高亮），但对应柱状图却处于模糊态。用户 hover 某根柱子后再操作 legend 切换时尤其容易出现。

**根因**：`emphasis.focus: 'series'` 会在 hover 时模糊其他 series。当与 legend 切换交互叠加时，`use-echarts.ts` 中的 `notMerge: true` 导致 setOption 全量替换，`emphasis` 的模糊状态可能"卡住"，造成 legend UI 状态（`selected`）与 series 渲染状态不同步。

**解决方案**：移除 `emphasis.focus: 'series'`。该图表已有 `tooltip: { trigger: 'axis' }`，hover 时 tooltip 已同时展示所有 series 数值，无需 blur 效果辅助区分。

```diff
  series: series.map((s) => ({
    name: s.name,
    type: 'bar',
    barWidth: 18,
    data: s.data,
-   emphasis: { focus: 'series' },
  })),
```

**注意事项**：
- 如果确实需要 focus 效果，可将 `notMerge` 改为 `false`（但会影响其他 option 更新行为，需全量评估）
- 此问题在散点图中不常见（散点 hover 是单点，bar hover 是整组），但原理相同

### CommonEcharts 自动 resize

> **meta** `type=ref` `tech=vue3` `domain=chart` `severity=medium` `validated=2026-05-26`
> **tags** `echarts, resize, autoresize`

```vue
<CommonEcharts :option="option" height="320px" :autoresize="true" />
```
