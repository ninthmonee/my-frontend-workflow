# TASKS — 创建场景弹窗参数组动态获取

> 需求：创建新场景弹窗中的场景参数（参数组勾选列表）由硬编码 constants 改为动态获取。
> 方案（用户三次确认演进）：
> 1. 复用基础场景详情（builtIn=true 场景的 detail.groups 作为全量参数组定义）
> 2. 只动态、不写死：移除 constants 回退占位（避免名称闪烁），失败保持空列表由空态兜底
> 3. 预取缓存：页面加载场景列表（获取到内建基础场景）时预取参数组定义；打开创建弹窗**直接读取缓存，不重新请求接口**

## 1. Setup — 数据加载（预取 + 缓存）

- [x] 1.1 新增 `composables/useBaseScenarioParamGroups.ts`：模块级单例缓存（`paramGroups` ref + `loadPromise` 幂等）；`loadBaseScenarioParamGroups()`（场景列表找 builtIn → 详情 groups → 缓存，失败/缺失保持空列表）、`getBaseScenarioParamGroups()`（返回响应式 ref）
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/composables/useBaseScenarioParamGroups.ts`（新增）
  - verify: 并发/重复调用共享同一次请求；加载失败缓存为空
  - mapsTo: P0 Scope 数据加载 / Risk 1、2、4

- [x] 1.2 `useScenarioConfig.ts`：`loadScenarioList` 成功后 `void loadBaseScenarioParamGroups()` 预取（获取到内建基础场景即准备参数组）
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/composables/useScenarioConfig.ts`
  - verify: 页面加载即预取；不阻塞列表渲染
  - mapsTo: P0 Scope 数据加载 / Risk 2

- [x] 1.3 `CreateScenarioModal.vue`：`paramGroupList = getBaseScenarioParamGroups()`（绑定共享缓存）；`ensureParamGroupsLoaded()` 幂等等待缓存就绪（已预取直接返回、无新请求）；移除组件内请求逻辑
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/components/CreateScenarioModal.vue`
  - verify: 打开弹窗不产生新请求；缓存就绪立即渲染
  - mapsTo: P0 Scope 数据加载 / Risk 1、2

## 2. Core — 状态与 UI 适配

- [x] 2.1 新增 `groupsLoading` ref：加载期间禁用「确认」按钮（防提交未完成加载的选择）并显示加载态；`loading`（提交中）语义不变
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/components/CreateScenarioModal.vue`
  - verify: 加载中不可提交；加载完成恢复
  - mapsTo: P0 Scope UI / Risk 2

- [x] 2.2 `resetForm` 改造：`selectedGroups` 默认值由「加载完成后的全部 code」决定（加载完成前为空数组，加载完成后置全选）；`onMounted` 先 `ensureParamGroupsLoaded()` 再 `resetForm()`
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/components/CreateScenarioModal.vue`
  - verify: 默认全选与动态列表一致
  - mapsTo: P0 Scope UI / Risk 3

- [x] 2.3 模板：加载中显示「参数组加载中...」、空列表显示「暂无可用参数组」、正常渲染 CheckboxGroup（v-if/v-else-if/v-else 三态，避免闪烁）
  - files: `apps/main-app/src/views/capacity-allocation/scenario-config/components/CreateScenarioModal.vue`
  - verify: 无静态名称先渲染；空态/加载态正确
  - mapsTo: P0 Scope UI / Risk 1、2

## 3. Verification

- [ ] 3.1 `pnpm check:type` 通过；build / lint / format 通过
  - files: —
  - verify: 全部 exit=0
  - mapsTo: P0 Scope 验证
