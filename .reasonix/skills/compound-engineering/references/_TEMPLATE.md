# 条目模板

> 新增条目时复制此文件内容，替换占位符即可。
>
> meta 字段说明见 INDEX.md「按 meta 字段检索速查」。
> tags 必须使用受控词表中的标准写法（见 INDEX.md「Tags 受控词表」）。

---

## 条目模板（pattern — 最佳实践）

### <一句话标题>

> **meta** `type=pattern` `tech=vue3` `domain=<领域>` `severity=high` `validated=<yyyy-mm-dd>` `version=<技术@版本>`
> **tags** `<tag1>, <tag2>, <tag3>`

**背景**：<一句话描述为什么需要这个模式>

**核心逻辑**：
```ts
// 最小可运行示例
```

**注意事项**：
1. <注意点 1>
2. <注意点 2>

---

## 条目模板（fix — 排查修复）

### <问题标题>

> **meta** `type=fix` `tech=vue3` `domain=<领域>` `severity=high` `validated=<yyyy-mm-dd>` `version=<技术@版本>`
> **tags** `<tag1>, <tag2>, <tag3>`

**现象**：<问题表现>
**原因**：<一句话根因>
**解决方案**：
1. <步骤 1>
2. <步骤 2>
3. <步骤 3>

```ts
// 修复后的代码
```

---

## 条目模板（ref — API 参考）

### <组件/API 名>

> **meta** `type=ref` `tech=vue3` `domain=<领域>` `severity=medium` `validated=<yyyy-mm-dd>`
> **tags** `<tag1>, <tag2>`

```ts
// 标准 API 签名 + 调用示例
```
