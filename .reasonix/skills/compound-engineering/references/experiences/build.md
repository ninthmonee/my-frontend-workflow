# 经验沉淀 — 构建

---

## 通用 / 构建

### 更新 antdv-next 依赖版本

> **meta** `type=fix` `tech=general` `domain=build` `severity=medium` `validated=2026-05-26` `version=pnpm@10`
> **tags** `pnpm, catalog, workspace, antdv-next, dependencies`

在 pnpm workspace + catalog 架构下，版本号统一改 `pnpm-workspace.yaml`：

```yaml
# pnpm-workspace.yaml
catalog:
  antdv-next: ^1.2.1
```

然后执行 `pnpm install`。
