# 适配器示例：Vue 3 + Vite + pnpm（蓝本：optimos-intco-frontend 工作流 v4）

这个适配器演示"把一份真实项目工作流参数化后长什么样"。

## 内容

| 文件 | 说明 |
|---|---|
| `workflow.config.json` | 验证命令：`build:main:{env}`（带 `--build full` 变体）+ format + lint + check:type |
| `package.json.scripts.json` | 需要合并进 package.json 的 12 个 `harness:*` scripts |
| `.reasonix.settings.json` | Reasonix 6 个 hook 事件绑定（含 node-shim） |
| `skills/project-constraints.example.md` | 项目专属 skill 示例（只放适配层，不进引擎） |

## 和原项目的映射

- 原 `scripts/harness.mjs` 中硬编码的 `pnpm -s run build:main:dev` → 配置项 `verify.full[0]`
- 原 hooks 中硬编码的 `workflow/`、`.reasonix/skills/` → 配置项 `workflowDir` / `skillsDir`
- 原 AGENTS.md 路由表（antdv-next/vue/pinia）→ 安装时填到 `{{DOMAIN_SKILLS}}`
- 原 `CORE_CONSTRAINTS`（antdv-next≠ant-design-vue 等）→ 配置项 `coreConstraints`

## 使用

```bash
node ../install.mjs --config workflow.config.json --target /tmp/demo-app
```

## 反例对照：一个无 lint 的 Node 库项目

```json
{
  "verify": {
    "lintEnabled": false,
    "full": [
      { "key": "build", "script": "build" },
      { "key": "typecheck", "script": "typecheck" }
    ],
    "tweak": [{ "key": "typecheck", "script": "typecheck" }]
  }
}
```

引擎不强制 lint/build，配置里没有就不跑。
