# 经验沉淀 — 枚举

---

## 通用 / 枚举

### 全局枚举 ProductLevel 渲染错位

> **meta** `type=fix` `tech=general` `domain=enum` `severity=high` `validated=2026-05-26`
> **tags** `enum, product-level, tag, filter, store`

```ts
import { useEnumStore } from '#/store';

const enumKey = 'ai.shanshu.optisense.busi.app.level.enums.ProductLevel';
const options = useEnumStore().getSafeEnumOptions(enumKey);
// options: [{ label: '明星级', value: 'STAR' }, ...]
```

### 复杂业务模块重构（以产品分级为例）

> **meta** `type=pattern` `tech=vue3` `domain=state` `severity=high` `validated=2026-05-26`
> **tags** `refactor, mock, orchestration, Map, edit, download`

```ts
// 1. 移除 Mock 数据，对接真实 API
// 2. 状态抽取到 useXxxOrchestration.ts
// 3. 表格跨页编辑用 Map 方案
// 4. 补齐下载等基础能力：downloadFileFromResponse(resp, name)
```
