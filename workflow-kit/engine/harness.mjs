/* eslint-disable no-useless-escape */
/* eslint-disable regexp/no-unused-capturing-group */
import { spawn } from 'node:child_process';
import { promises as fs, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

let ROOT = process.cwd();
let CONFIG = null; // main() 中通过 loadConfig 初始化

function getWorkflowDir() { return join(ROOT, CONFIG.workflowDir); }
function getHarnessDir() { return join(getWorkflowDir(), 'harness'); }
function getEvidenceDir() { return join(ROOT, CONFIG.evidenceDir); }
function getStatePath() { return join(ROOT, CONFIG.stateFile); }
function getStateBakPath() { return join(getHarnessDir(), 'state.bak.json'); }
function getStateBak1Path() { return join(getHarnessDir(), 'state.bak.1.json'); }
function getLockPath() { return join(getHarnessDir(), '.harness.lock'); }
const LOCK_STALE_MS = 10_000; // 锁文件超过此年龄视为僵死，可抢占
// ─────────────────────────────────────────────────────────
// 配置层：项目差异收敛到 workflow.config.json
// 查找顺序：--config <path> → $WORKFLOW_CONFIG → <root>/workflow.config.json → 内置默认值
// ─────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  schemaVersion: 1,
  language: 'zh-CN',
  packageManager: 'pnpm',
  workflowDir: 'workflow',
  stateFile: 'workflow/harness/state.json',
  evidenceDir: 'workflow/evidence',
  skillsDir: '.reasonix/skills',
  infraFiles: ['AGENTS.md', 'REASONIX.md', 'workflow.md', 'scripts/harness.mjs', 'workflow.config.json'],
  maxConvergenceRounds: 3,
  verify: {
    lintEnabled: true,
    full: [
      { key: 'build', script: 'build' },
      { key: 'format', script: 'format' },
      { key: 'lint', script: 'lint' },
      { key: 'typecheck', script: 'check:type' },
    ],
    tweak: [{ key: 'typecheck', script: 'check:type' }],
  },
  coreConstraints:
    '🔒 核心约束: 最小改动 | 不猜 API 先查 skill | 证据优先 | 验证通过才算完成',
};

const PM_RUN_ARGS = {
  pnpm: ['-s', 'run'],
  npm: ['run'],
  yarn: ['run'],
  bun: ['run'],
};

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override === undefined ? base : override;
  }
  if (base && override && typeof base === 'object' && typeof override === 'object') {
    const out = { ...base };
    for (const key of Object.keys(override)) {
      out[key] = key in base ? deepMerge(base[key], override[key]) : override[key];
    }
    return out;
  }
  return override === undefined ? base : override;
}

async function loadConfig(flags, root) {
  const candidate = flags.get('config')
    ? resolve(flags.get('config'))
    : process.env.WORKFLOW_CONFIG
      ? resolve(process.env.WORKFLOW_CONFIG)
      : join(root, 'workflow.config.json');
  let fileConfig = {};
  try {
    fileConfig = JSON.parse(await fs.readFile(candidate, 'utf8'));
  } catch {
    // 无配置文件是正常情况：回退到内置默认值
  }
  return deepMerge(DEFAULT_CONFIG, fileConfig);
}

function resolveCheck(check, env, lintEnabled) {
  if (!check) return null;
  if (check.key === 'lint' && !lintEnabled) return null;
  if (check.cmd && Array.isArray(check.args)) {
    return {
      key: check.key,
      name: [check.cmd, ...check.args].join(' '),
      cmd: check.cmd,
      args: check.args,
    };
  }
  const script = String(check.script ?? check.key)
    .replaceAll('{env}', env ?? check.defaultEnv ?? 'dev')
    .trim();
  const runArgs = PM_RUN_ARGS[CONFIG.packageManager] ?? ['run'];
  const cmd = CONFIG.packageManager;
  return {
    key: check.key,
    name: [cmd, ...runArgs, script].join(' '),
    cmd,
    args: [...runArgs, script],
  };
}

function buildCheckList(checks, flags) {
  const env = flags.get('env');
  const buildVariant = flags.get('build');
  const lintFlag = flags.get('lint');
  const lintEnabled =
    lintFlag === undefined ? (CONFIG.verify.lintEnabled ?? true) : lintFlag !== 'false';
  return (checks ?? [])
    .map((check) => {
      const c = { ...check };
      if (c.key === 'build' && buildVariant && c.variants && c.variants[buildVariant]) {
        c.script = c.variants[buildVariant];
      }
      return resolveCheck(c, env, lintEnabled);
    })
    .filter(Boolean);
}


function nowId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(16).slice(2, 8);
  return `${date}-${time}-${rand}`;
}

function parseArgs(argv) {
  const flags = new Map();

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      flags.set(key, next);
      i += 1;
    } else {
      flags.set(key, 'true');
    }
  }

  // command：第一个既不是 flag、也不是 flag 值的 token（支持 --root <dir> list）
  const flagValues = new Set(flags.values());
  const command =
    argv.find((token) => !token.startsWith('--') && !flagValues.has(token)) ??
    'help';

  return { command, flags };
}

async function ensureDirs() {
  await fs.mkdir(getEvidenceDir(), { recursive: true });
}

// ── 进程级写锁（防两个 harness 进程并发写 state.json） ──
let lockHeld = false;

/**
 * 尝试获取写锁（O_EXCL 创建 .harness.lock）。
 * 失败：若锁已僵死（超过 LOCK_STALE_MS 未更新）→ 抢占重试；否则提示后 exit 1。
 */
async function acquireLock() {
  await fs.mkdir(getHarnessDir(), { recursive: true });
  const staleBefore = Date.now() - LOCK_STALE_MS;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const fh = await fs.open(getLockPath(), 'wx');
      await fh.writeFile(String(process.pid));
      await fh.close();
      lockHeld = true;
      process.once('exit', releaseLock);
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // 锁存在：检查是否僵死
      try {
        const st = await fs.stat(getLockPath());
        if (st.mtimeMs >= staleBefore) break; // 新鲜锁 → 真的被占用
        await fs.unlink(getLockPath()).catch(() => {}); // 僵死 → 抢占
      } catch {
        break;
      }
    }
  }
  process.stderr.write(
    `⏳ 另一个 harness 进程正在运行（写锁 ${getLockPath()} 被占用）。\n` +
      `   请稍后重试；如确认无其他进程，可手动删除该锁文件。\n`,
  );
  process.exit(1);
}

function releaseLock() {
  if (!lockHeld) return;
  try {
    unlinkSync(getLockPath());
  } catch {
    /* 锁已被清理 */
  }
  lockHeld = false;
}

/**
 * 读取备份（多代回退：state.bak.json → state.bak.1.json）。失败返回 null。
 */
async function readStateBackup() {
  for (const bakPath of [getStateBakPath(), getStateBak1Path()]) {
    try {
      const raw = await fs.readFile(bakPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* 尝试下一代备份 */
    }
  }
  return null;
}

/**
 * 多槽位状态模型归一化（兼容旧单槽格式 → 新 registry 格式）。
 *
 * 新格式:
 *   { current: <slotId>, slots: { "<slotId>": { taskType, gates, change, ... } } }
 * 旧格式（v4 单槽）:
 *   { taskType, gates, change?, lastRunId?, ... }
 * 归一化规则：旧格式 → 迁移为单槽 registry；新格式 → 保证 current 有效。
 */
function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') raw = {};
  if (raw.slots && typeof raw.slots === 'object') {
    // 已是 registry：保证 current 指向存在的槽
    const keys = Object.keys(raw.slots);
    if (!keys.includes(raw.current)) {
      return { ...raw, current: keys[0] ?? '' };
    }
    return raw;
  }
  // 完全空的对象（从未初始化 / 读取失败兜底）→ 空 registry，不虚构槽位
  const hasSlotData =
    raw.taskType !== undefined ||
    raw.gates !== undefined ||
    raw.change ||
    raw.lastRunId ||
    raw.p2FailedKeys ||
    raw.p2ConvergenceRound;
  if (!hasSlotData) return { current: '', slots: {} };
  // 旧格式迁移：折叠为单槽 registry
  const slotId = raw.change || raw.lastRunId || '__default__';
  const slot = { ...raw };
  delete slot.current;
  delete slot.slots;
  slot.gates =
    slot.gates && typeof slot.gates === 'object'
      ? slot.gates
      : { P0: null, P1: null, P2: null, P3: null, DONE: null };
  return { current: slotId, slots: { [slotId]: slot } };
}

/** 取当前槽对象；无槽或 current 无效时返回 null */
function getCurrentSlot(state) {
  const s = normalizeState(state);
  return s.slots?.[s.current] ?? null;
}

/** 返回新 state：current 槽与 patch 合并（不修改入参；无 current 槽时原样返回，避免产生空名幽灵槽） */
function patchCurrent(state, patch) {
  const s = normalizeState(state);
  if (!s.current) return s;
  const slot = s.slots?.[s.current] ?? {};
  return { ...s, slots: { ...s.slots, [s.current]: { ...slot, ...patch } } };
}

/** 返回新 state：指定槽与 patch 合并（槽不存在则新建并激活为 current） */
function patchSlot(state, slotId, patch) {
  const s = normalizeState(state);
  const slot = s.slots?.[slotId] ?? { change: slotId, gates: { P0: null, P1: null, P2: null, P3: null, DONE: null } };
  const slots = { ...s.slots, [slotId]: { ...slot, ...patch } };
  return { ...s, current: slotId, slots };
}

/**
 * 返回新 state：删除指定槽位。
 * 若删除的是 current 槽，则 current 落到剩余第一个槽（无剩余则为 ''）。
 */
function removeSlotById(state, slotId) {
  const s = normalizeState(state);
  const slots = { ...s.slots };
  delete slots[slotId];
  const current =
    s.current === slotId ? (Object.keys(slots)[0] ?? '') : s.current;
  return { ...s, slots, current };
}

/**
 * 从备份恢复 state.json（损坏/误删自愈）。
 * @param {string} reason 恢复原因，仅用于提示文案
 * @returns 恢复成功返回备份状态；失败返回 {}
 */
async function restoreStateFromBackup(reason) {
  const backupRaw = await readStateBackup();
  if (backupRaw) {
    try {
      const backup = normalizeState(backupRaw);
      await fs.writeFile(
        getStatePath(),
        `${JSON.stringify(backup, null, 2)}\n`,
        'utf8',
      );
      process.stderr.write(
        `✅ state.json ${reason}，已从 ${getStateBakPath()} 自动恢复。\n`,
      );
      return backup;
    } catch {
      /* 写回失败 → 落到下方兜底提示 */
    }
  }
  process.stderr.write(
    `⚠️  state.json ${reason}，且无有效备份 (${getStateBakPath()})。\n` +
      `   请运行 pnpm -s run harness:restore 或 harness:gate-reset 处理。\n`,
  );
  return {};
}

/**
 * 读取状态中枢（registry）。注意：本函数具备自愈副作用——当 state.json
 * 损坏或被误删且存在有效备份时，会自动用备份内容写回修复；
 * 旧版单槽格式首次读取时自动迁移为 registry。
 */
async function readState() {
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(getStatePath(), 'utf8'));
  } catch (error) {
    // ENOENT: 无状态文件——可能从未初始化（正常）或被误删
    if (error.code === 'ENOENT') {
      return restoreStateFromBackup('缺失');
    }
    // JSON 解析失败: 损坏
    return restoreStateFromBackup('损坏');
  }
  const state = normalizeState(parsed);
  // 旧格式首次读取 → 持久化迁移为 registry
  if (!parsed || !parsed.slots) await writeState(state);
  return state;
}

/**
 * 判断文件是否为有效 JSON 对象（用于备份滚动前校验）。
 */
async function isValidJsonObject(p) {
  try {
    const parsed = JSON.parse(await fs.readFile(p, 'utf8'));
    return Boolean(parsed) && typeof parsed === 'object';
  } catch {
    return false;
  }
}

/**
 * 写入状态中枢（内部统一归一化为 registry），并滚动备份：
 * 有效的主备份 state.bak.json → state.bak.1.json，再写新 state.bak.json。
 * 若主备份已损坏/缺失则直接覆盖、不滚动（避免把坏内容保留为上一代）。
 * （多代备份防"坏写入污染唯一备份"；备份写失败不阻塞主流程。）
 */
async function writeState(nextState) {
  const state = normalizeState(nextState);
  await fs.mkdir(getHarnessDir(), { recursive: true });
  await fs.writeFile(
    getStatePath(),
    `${JSON.stringify(state, null, 2)}\n`,
    'utf8',
  );
  try {
    if (await isValidJsonObject(getStateBakPath())) {
      await fs.rename(getStateBakPath(), getStateBak1Path()).catch(() => {});
    }
    await fs.writeFile(
      getStateBakPath(),
      `${JSON.stringify(state, null, 2)}\n`,
      'utf8',
    );
  } catch {
    /* 备份目录不可写时忽略——state.json 本身已写入成功 */
  }
}

async function getRunId(flags) {
  const explicit = flags.get('id');
  if (explicit) return explicit;
  const state = await readState();
  const cur = getCurrentSlot(state);
  if (typeof cur?.lastRunId === 'string' && cur.lastRunId.trim()) {
    return cur.lastRunId;
  }
  // fallback: 槽位 change 名称（避免因遗漏 --id 而导致证据目录分裂）
  if (typeof cur?.change === 'string' && cur.change.trim()) {
    return cur.change;
  }
  const id = nowId();
  await writeState(patchCurrent(state, { lastRunId: id }));
  return id;
}

async function writePhaseTemplate(phase, runId, body, options = {}) {
  await ensureDirs();
  const evidenceDir = join(getEvidenceDir(), runId);
  await fs.mkdir(evidenceDir, { recursive: true });
  const evidencePath = join(evidenceDir, `${phase}.md`);
  const overwrite = options.overwrite === true;

  if (!overwrite) {
    try {
      await fs.access(evidencePath);
      process.stdout.write(`Evidence exists: ${evidencePath}\n`);
      return;
    } catch {}
  }
  await fs.writeFile(evidencePath, body, 'utf8');
  process.stdout.write(`Evidence saved: ${evidencePath}\n`);
}

async function readEvidence(phase, runId) {
  const evidencePath = join(getEvidenceDir(), runId, `${phase}.md`);
  const content = await fs.readFile(evidencePath, 'utf8');
  return { evidencePath, content };
}

function expectLineYes(content, key) {
  const re = new RegExp(`^\\s*-\\s*${key}:\\s*YES\\s*$`, 'im');
  return re.test(content);
}

function readScalar(content, key) {
  const re = new RegExp(`^\\s*-\\s*${key}:\\s*(.+?)\\s*$`, 'im');
  const m = content.match(re);
  return m?.[1]?.trim() ?? '';
}

async function validateP0(runId) {
  const { evidencePath, content } = await readEvidence('P0', runId);
  if (!expectLineYes(content, 'gateReady')) {
    throw new Error(
      `P0 未满足门禁：请在 ${evidencePath} 中把 "- gateReady:" 改为 YES`,
    );
  }

  // check that Scope and Risks are filled (not placeholders)
  const placeholders = /\b(MUST ask|填不出|TODO|待定|<填)/i;
  const scopeSection = content.match(/## Scope[\s\S]*?(?=## |$)/)?.[0] ?? '';
  const risksSection = content.match(/## Risks[\s\S]*?(?=## |$)/)?.[0] ?? '';

  if (placeholders.test(scopeSection)) {
    throw new Error(
      `P0 未满足门禁：${evidencePath} 中 Scope 存在占位符，MUST 填写具体内容`,
    );
  }
  if (placeholders.test(risksSection)) {
    throw new Error(
      `P0 未满足门禁：${evidencePath} 中 Risks 存在占位符，MUST 填写至少 1 条具体风险`,
    );
  }
}

async function validateTasks(runId) {
  const tasksPath = join(getEvidenceDir(), runId, 'TASKS.md');
  let content;
  try {
    content = await fs.readFile(tasksPath, 'utf8');
  } catch {
    throw new Error(`Tasks 未满足门禁：${tasksPath} 不存在`);
  }

  // check at least one task checkbox exists (not just template)
  if (!/\n- \[[ x\-]\] /.test(content)) {
    throw new Error(
      `Tasks 未满足门禁：${tasksPath} 中没有任务 checkbox，MUST 至少有一条 - [ ] 或 - [x] 或 - [-]`,
    );
  }

  // check no incomplete (non-skipped) tasks remain — all must be [x] or [-]
  const incomplete = content.match(/^- \[ \] /gm);
  if (incomplete && incomplete.length > 0) {
    throw new Error(
      `Tasks 未满足门禁：${tasksPath} 中有 ${incomplete.length} 条未完成的任务。所有任务必须标记为 [x]（已完成）或 [-]（跳过 YAGNI），禁止残留 [ ]。`,
    );
  }

  // check no placeholder descriptions remain
  if (/<任务描述>|<任务组名称>/.test(content)) {
    throw new Error(
      `Tasks 未满足门禁：${tasksPath} 中存在未替换的占位符，MUST 填写具体任务描述`,
    );
  }
}

async function validateP1(runId) {
  const { evidencePath, content } = await readEvidence('P1', runId);
  if (!expectLineYes(content, 'gateReady')) {
    throw new Error(
      `P1 未满足门禁：请在 ${evidencePath} 中把 "- gateReady:" 改为 YES`,
    );
  }
}

async function validateP3(runId) {
  const { evidencePath, content } = await readEvidence('P3', runId);
  if (!expectLineYes(content, 'verifyPassed')) {
    throw new Error(
      `P3 未满足门禁：请在 ${evidencePath} 中把 "- verifyPassed:" 改为 YES`,
    );
  }
  if (!expectLineYes(content, 'userConfirmed')) {
    throw new Error(
      `P3 未满足门禁：请在 ${evidencePath} 中把 "- userConfirmed:" 改为 YES`,
    );
  }
}

async function validateP4(runId) {
  const { evidencePath, content } = await readEvidence('P4', runId);
  if (!expectLineYes(content, 'knowledgeDone')) {
    throw new Error(
      `P4 未满足门禁：请在 ${evidencePath} 中把 "- knowledgeDone:" 改为 YES`,
    );
  }

  const status = readScalar(content, 'status');
  const path = readScalar(content, 'compoundEngineeringPath');

  if (!status || status.toUpperCase().startsWith('TODO')) {
    throw new Error(
      `P4 未满足门禁：请在 ${evidencePath} 中填写 "- status: written/skipped"`,
    );
  }

  if (status === 'written') {
    if (!path || path.toUpperCase().startsWith('TODO')) {
      throw new Error(
        `P4 未满足门禁：status=written 时必须填写 ${evidencePath} 中的 "- compoundEngineeringPath:"`,
      );
    }
  }
}

async function validateP2(runId) {
  const { evidencePath, content } = await readEvidence('P2', runId);
  // P2.md 由 harness:p2 生成，记录 allPassed；验证未全过不允许推进
  if (!/^- allPassed:\s*true\s*$/im.test(content)) {
    throw new Error(
      `P2 未满足门禁：${evidencePath} 中 "- allPassed:" 必须为 true（build/format/lint/typecheck 未全过不能推进）`,
    );
  }
}

async function writeP0(flags) {
  const runId = await getRunId(flags);
  const check = flags.get('check') === 'true';
  const overwrite = flags.get('overwrite') === 'true';

  if (check) {
    await validateP0(runId);
    process.stdout.write(`P0 check: PASS (${runId})\n`);
    return;
  }
  await writePhaseTemplate(
    'P0',
    runId,
    `# Evidence: P0

- runId: ${runId}

## Scope (必填)
- allowedFiles:
  - <填不出 MUST ask 用户>
- nonGoals:
  - <填不出 MUST ask 用户>

## Risks (必填，≥1 条)
- <填不出 MUST ask 用户>

## Tasks (可选)
- T-01: <具体任务> — 涉及文件: <path> — 验证: <方法>

## Gate
- gateReady: TODO (set YES when complete)
`,
    { overwrite },
  );
}

async function writeTasks(flags) {
  const runId = await getRunId(flags);
  const check = flags.get('check') === 'true';
  const overwrite = flags.get('overwrite') === 'true';
  const tasksPath = join(getEvidenceDir(), runId, 'TASKS.md');

  if (check) {
    await validateTasks(runId);
    process.stdout.write(`Tasks check: PASS (${runId})\n`);
    return;
  }

  if (!overwrite) {
    try {
      await fs.access(tasksPath);
      process.stdout.write(`Tasks exist: ${tasksPath}\n`);
      return;
    } catch {}
  }

  await fs.mkdir(join(getEvidenceDir(), runId), { recursive: true });
  await fs.writeFile(
    tasksPath,
    `# Tasks: ${runId}

> Phase 0 任务拆解 → Phase 1 逐项执行。
> 任务按依赖顺序排列。每项必须有可验证的完成标准（verify）。
> 完成后将 \`- [ ]\` 改为 \`- [x]\`。

## 1. <任务组名称>

- [ ] 1.1 <任务描述>
  - files: <涉及文件>
  - verify: <如何验证完成>
  - mapsTo: <对应 P0 Scope/Risks 中的哪条>

## 2. <任务组名称>

- [ ] 2.1 <任务描述>
  - files: <涉及文件>
  - verify: <如何验证完成>
  - mapsTo: <对应 P0 Scope/Risks 中的哪条>
`,
    'utf8',
  );

  process.stdout.write(`Tasks saved: ${tasksPath}\n`);
}

async function writeP1(flags) {
  const runId = await getRunId(flags);
  const check = flags.get('check') === 'true';
  const overwrite = flags.get('overwrite') === 'true';

  if (check) {
    await validateP1(runId);
    process.stdout.write(`P1 check: PASS (${runId})\n`);
    return;
  }
  const changedFiles = await getChangedFiles();
  const changedFilesMd =
    changedFiles.length > 0
      ? changedFiles.map((p) => `- ${p}`).join('\n')
      : '- (none)';
  await writePhaseTemplate(
    'P1',
    runId,
    `# Evidence: P1

- runId: ${runId}

## Changed Files
${changedFilesMd}

## Key Decisions
- 

## Gate
- gateReady: TODO (set YES when complete)
`,
    { overwrite },
  );
}

async function writeP3(flags) {
  const runId = await getRunId(flags);
  const check = flags.get('check') === 'true';
  const overwrite = flags.get('overwrite') === 'true';

  if (check) {
    await validateP3(runId);
    process.stdout.write(`P3 check: PASS (${runId})\n`);
    return;
  }
  await writePhaseTemplate(
    'P3',
    runId,
    `# Evidence: P3

- runId: ${runId}

## Verify
- result: TODO (PASS/FAIL)

## User Confirmation
- status: TODO (YES/NO)

## Gate
- verifyPassed: TODO (YES/NO)
- userConfirmed: TODO (YES/NO)
`,
    { overwrite },
  );
}

async function writeP4(flags) {
  const runId = await getRunId(flags);
  const check = flags.get('check') === 'true';
  const overwrite = flags.get('overwrite') === 'true';

  if (check) {
    await validateP4(runId);
    process.stdout.write(`P4 check: PASS (${runId})\n`);
    return;
  }
  await writePhaseTemplate(
    'P4',
    runId,
    `# Evidence: P4

- runId: ${runId}

## Knowledge
- status: TODO (written/skipped)
- compoundEngineeringPath: TODO

## Gate
- knowledgeDone: TODO (YES/NO)
`,
    { overwrite },
  );
}

/**
 * approve <phase> — 将证据文件中的 TODO 字段翻转为 YES
 * 支持 P0/P1/P3/P4，可选 --status written|skipped（仅 P4）
 */
async function approveGate(flags) {
  const phase = (flags.get('phase') ?? '').toUpperCase();
  const VALID_PHASES = ['P0', 'P1', 'P3', 'P4'];
  if (!VALID_PHASES.includes(phase)) {
    throw new Error(
      `非法 phase: ${phase}，可选: ${VALID_PHASES.join(', ')}`,
    );
  }
  const runId = await getRunId(flags);
  const { evidencePath, content } = await readEvidence(phase, runId);

  const replacements = {
    P0: [{ from: 'gateReady: TODO', to: 'gateReady: YES' }],
    P1: [{ from: 'gateReady: TODO', to: 'gateReady: YES' }],
    P3: [
      { from: 'verifyPassed: TODO', to: 'verifyPassed: YES' },
      { from: 'userConfirmed: TODO', to: 'userConfirmed: YES' },
    ],
    P4: [{ from: 'knowledgeDone: TODO', to: 'knowledgeDone: YES' }],
  };

  let result = content;
  for (const { from, to } of replacements[phase]) {
    if (result.includes(from)) {
      result = result.replace(from, to);
    }
  }

  // P4 可选 --status 设置 knowledge status 字段
  if (phase === 'P4') {
    const status = flags.get('status');
    if (status && ['written', 'skipped'].includes(status)) {
      result = result.replace(
        /- status: TODO[^\n]*/,
        `- status: ${status}`,
      );
    }
  }

  await fs.writeFile(evidencePath, result, 'utf8');
  process.stdout.write(
    `[APPROVE:${phase}] ✅ ${evidencePath}\n`,
  );
}

function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (buf) => {
      stdout += buf.toString();
      process.stdout.write(buf);
    });

    child.stderr.on('data', (buf) => {
      stderr += buf.toString();
      process.stderr.write(buf);
    });

    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function splitNonEmptyLines(text) {
  return String(text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

async function getChangedFiles() {
  const gitBaseArgs = ['-c', 'core.quotepath=false'];
  const unstaged = await runCommand(
    'git',
    [...gitBaseArgs, 'diff', '--name-only'],
    ROOT,
  );
  const staged = await runCommand(
    'git',
    [...gitBaseArgs, 'diff', '--cached', '--name-only'],
    ROOT,
  );
  const untracked = await runCommand(
    'git',
    [...gitBaseArgs, 'ls-files', '--others', '--exclude-standard'],
    ROOT,
  );

  const all = new Set([
    ...(staged.code === 0 ? splitNonEmptyLines(staged.stdout) : []),
    ...(unstaged.code === 0 ? splitNonEmptyLines(unstaged.stdout) : []),
    ...(untracked.code === 0 ? splitNonEmptyLines(untracked.stdout) : []),
  ]);

  return [...all].sort();
}

async function verifyP2(flags) {
  await ensureDirs();
  const runId = await getRunId(flags);
  const quickMode = flags.get('quick') === 'true';

  const startedAt = new Date().toISOString();

  // ── layered execution: 顺序来自 workflow.config.json 的 verify.full ──
  const checkOrder = buildCheckList(CONFIG.verify.full, flags);

  // quick mode: only re-run previously failed checks (read from state)
  let failedKeys = null;
  if (quickMode) {
    const state = await readState();
    failedKeys = getCurrentSlot(state)?.p2FailedKeys ?? null;
  }

  const results = [];
  let stoppedEarly = false;

  for (const check of checkOrder) {
    // quick mode: skip checks that passed last time（failedKeys 为空/null 时跑全部，防假通过）
    if (
      quickMode &&
      Array.isArray(failedKeys) &&
      failedKeys.length > 0 &&
      !failedKeys.includes(check.key)
    ) {
      continue;
    }

    const result = await runCommand(check.cmd, check.args, ROOT);
    results.push({ name: check.name, key: check.key, ...result });

    if (result.code !== 0) {
      stoppedEarly = true;
      break; // stop at first failure
    }
  }

  const endedAt = new Date().toISOString();
  const allPassed = !stoppedEarly && results.every((r) => r.code === 0);
  const failedKeysList = results.filter((r) => r.code !== 0).map((r) => r.key);

  // save failed keys + convergence round for quick mode and session recovery
  const state = await readState();
  const cur = getCurrentSlot(state) ?? {};
  const newRound = allPassed ? 0 : (cur.p2ConvergenceRound || 0) + 1;

  // hard limit: 3 rounds max
  if (newRound > 3) {
    process.stderr.write(
      `❌ P2 收敛已达最大轮次 (3)，无法继续自动修正。\n请手动修复问题后重新运行 harness:p2。\n`,
    );
    process.exit(1);
  }

  await writeState(
    patchCurrent(state, {
      p2FailedKeys: allPassed ? null : failedKeysList,
      p2ConvergenceRound: newRound,
    }),
  );

  // ── generate evidence ──
  const p2Dir = join(getEvidenceDir(), runId);
  await fs.mkdir(p2Dir, { recursive: true });
  const evidencePath = join(p2Dir, 'P2.md');
  const errorsPath = join(p2Dir, 'P2-errors.txt');

  const md = [
    `# Evidence: P2`,
    ``,
    `- runId: ${runId}`,
    `- startedAt: ${startedAt}`,
    `- endedAt: ${endedAt}`,
    `- allPassed: ${allPassed}`,
    `- stoppedEarly: ${stoppedEarly}`,
    `- quickMode: ${quickMode}`,
    `- convergenceRound: ${newRound}`,
    ``,
  ];

  if (allPassed) {
    md.push(
      `## Commands`,
      ...results.flatMap((r) => [
        ``,
        `### ${r.name}`,
        ``,
        `- exitCode: ${r.code}`,
        ``,
        '```text',
        `${(r.stdout ?? '').trim()}`,
        `${(r.stderr ?? '').trim()}`,
        '```',
      ]),
    );
  } else {
    const failed = results[results.length - 1];
    const errorLines = extractErrors(
      failed.stdout ?? '',
      failed.stderr ?? '',
      failed.key,
    );
    md.push(
      `## Failed: ${failed.name}`,
      ``,
      `- exitCode: ${failed.code}`,
      `- errorCount: ${errorLines.length}`,
      ``,
      '```text',
      ...errorLines.map((l) => l.slice(0, 200)),
      '```',
    );
  }

  md.push('');

  await fs.writeFile(evidencePath, md.join('\n'), 'utf8');

  if (allPassed) {
    try {
      await fs.unlink(errorsPath);
    } catch {}
  } else {
    const failed = results[results.length - 1];
    const errorLines = extractErrors(
      failed.stdout ?? '',
      failed.stderr ?? '',
      failed.key,
    );
    await fs.writeFile(
      errorsPath,
      `# P2 Errors: ${failed.name}\n\n${errorLines.join('\n')}`,
      'utf8',
    );
  }

  process.stdout.write(`\nEvidence saved: ${evidencePath}\n`);
  if (!allPassed) process.stdout.write(`Errors saved: ${errorsPath}\n`);
  process.exit(allPassed ? 0 : 1);
}

function extractErrors(stdout, stderr, key) {
  const lines = [...stdout.split('\n'), ...stderr.split('\n')];
  const errorPatterns = [
    /error/i,
    /Error:/,
    /✖/,
    /TS\d{4}:/,
    /FAILED/,
    /cannot find/i,
    /is not a/i,
    /Unexpected/i,
    /Expected/i,
    /Module.*not found/i,
    /Cannot.*find/i,
  ];

  return lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return errorPatterns.some((p) => p.test(trimmed));
  });
}

async function writeSkip(flags) {
  const runId = await getRunId(flags);
  const marker = flags.get('marker') ?? '';
  const reason = flags.get('reason') ?? '';
  await writePhaseTemplate(
    'SKIP',
    runId,
    `# Evidence: SKIP

- runId: ${runId}

## Marker
- ${marker || 'AUTO-SKIP / USER-SKIP / SKIPPED / SKIPPED-UNCONFIRMED'}

## Reason
- ${reason}
`,
  );
}

async function verifyTweak(flags) {
  await ensureDirs();
  const runId = await getRunId(flags);
  const changedFiles = await getChangedFiles();
  const changedFilesMd =
    changedFiles.length > 0
      ? changedFiles.map((p) => `- ${p}`).join('\n')
      : '- (none)';
  const startedAt = new Date().toISOString();
  const tweakChecks = buildCheckList(CONFIG.verify.tweak, flags);
  const results = [];
  let exitCode = 0;
  for (const check of tweakChecks) {
    const result = await runCommand(check.cmd, check.args, ROOT);
    results.push({ name: check.name, ...result });
    if (result.code !== 0) {
      exitCode = result.code;
      break;
    }
  }
  const endedAt = new Date().toISOString();

  const md = [
    `# Evidence: TWEAK`,
    ``,
    `- runId: ${runId}`,
    `- startedAt: ${startedAt}`,
    `- endedAt: ${endedAt}`,
    ``,
    `## Changed Files`,
    ``,
    changedFilesMd,
    ``,
    `## Commands`,
    ...results.map(
      (r) => `\n### ${r.name}\n\n- exitCode: ${r.code}\n\n\`\`\`text\n${(r.stdout ?? '').trim()}\n${(r.stderr ?? '').trim()}\n\`\`\``,
    ),
    ``,
  ].join('\n');

  const tweakDir = join(getEvidenceDir(), runId);
  await fs.mkdir(tweakDir, { recursive: true });
  const evidencePath = join(tweakDir, 'TWEAK.md');
  await fs.writeFile(evidencePath, md, 'utf8');

  process.stdout.write(`\nEvidence saved: ${evidencePath}\n`);
  if (exitCode === 0) {
    // TWEAK 完成 → 自动回收 auto-skip/user-skip 槽位（避免 registry 只增不减；
    // TWEAK 无 P0-P3 门禁状态可恢复，证据 TWEAK.md 已保留在 evidence/ 下）
    const state = await readState();
    const cur = getCurrentSlot(state);
    if (cur && ['auto-skip', 'user-skip'].includes(cur.taskType)) {
      const removed = state.current;
      await writeState(removeSlotById(state, removed));
      process.stdout.write(
        `♻️  TWEAK 完成，槽位 '${removed}' 已自动回收（证据保留于 ${CONFIG.evidenceDir}/${removed}/）\n`,
      );
    }
  }
  process.exit(exitCode === 0 ? 0 : 1);
}

// ── Gate state machine ──

const GATE_SEQUENCE = ['P0', 'P1', 'P2', 'P3', 'DONE'];
const GATE_TEMPLATE = { P0: null, P1: null, P2: null, P3: null, DONE: null };

async function gateCheck(flags) {
  const phase = (flags.get('phase') ?? '').toUpperCase();
  const runId = await getRunId(flags);

  if (!GATE_SEQUENCE.includes(phase)) {
    throw new Error(`非法 phase: ${phase}，可选: ${GATE_SEQUENCE.join(', ')}`);
  }

  const state = await readState();
  const cur = getCurrentSlot(state) ?? {};
  const gates = { ...(cur.gates ?? GATE_TEMPLATE) };

  // validate sequence: gate P[N] requires P[N-1] to exist
  const idx = GATE_SEQUENCE.indexOf(phase);
  if (idx > 0) {
    const prev = GATE_SEQUENCE[idx - 1];
    if (!gates[prev]) {
      throw new Error(`Gate 序列校验失败：${prev} 未声明，不能推进 ${phase}`);
    }
  }

  // ── 证据校验：gate 推进前自动验证对应 Phase 证据，堵"证据缺失/占位符也能过门" ──
  // 各 Phase 产物: P0=P0.md+TASKS.md | P1=P1.md+TASKS.md | P2=P2.md(allPassed)
  //               | P3=P3.md(userConfirmed) | DONE=P4.md(knowledgeDone)
  const validators = {
    P0: async () => {
      await validateP0(runId);
      await validateTasks(runId);
    },
    P1: async () => {
      await validateP1(runId);
      await validateTasks(runId);
    },
    P2: async () => validateP2(runId),
    P3: async () => validateP3(runId),
    DONE: async () => validateP4(runId),
  };
  if (validators[phase]) {
    try {
      await validators[phase]();
    } catch (error) {
      throw new Error(
        `[GATE:${phase}] 证据校验未通过，拒绝推进。\n${error.message}`,
      );
    }
  }

  // record gate timestamp
  gates[phase] = new Date().toISOString();
  await writeState(patchCurrent(state, { gates }));

  process.stdout.write(`[GATE:${phase}] ✅ ${gates[phase]} (slot: ${state.current})\n`);
}

async function gateReset(flags) {
  const taskType = flags.get('type') ?? 'full';
  const VALID_TYPES = ['full', 'mandatory', 'auto-skip', 'user-skip'];
  if (!VALID_TYPES.includes(taskType)) {
    throw new Error(
      `非法 taskType: ${taskType}，可选: ${VALID_TYPES.join(', ')}`,
    );
  }
  const target = flags.get('id') || '';
  const state = await readState();

  const cleanPatch = {
    taskType,
    gates: { ...GATE_TEMPLATE },
    // 清除该槽上一条流程的残留字段
    lastRunId: undefined,
    p2FailedKeys: undefined,
    p2ConvergenceRound: undefined,
  };

  let next;
  if (target) {
    // 显式目标槽：重置（不存在则新建）并激活
    next = patchSlot(state, target, { ...cleanPatch, change: target });
    process.stdout.write(`Gate reset: type=${taskType} slot=${target}\n`);
  } else {
    // 无目标：重置当前槽（手动放弃当前流程；change 名即槽身份，予以保留）
    const cur = getCurrentSlot(state);
    if (!cur) {
      next = patchSlot(state, '__default__', { ...cleanPatch, change: '__default__' });
    } else {
      next = patchCurrent(state, cleanPatch);
    }
    process.stdout.write(`Gate reset: type=${taskType} (current slot: ${state.current || '(none)'})\n`);
  }
  await writeState(next);
}

async function gateVerify(flags) {
  const runId = await getRunId(flags);
  const state = await readState();
  const cur = getCurrentSlot(state) ?? {};
  const gates = cur.gates ?? {};

  const required = ['P0', 'P1', 'P2'];
  const missing = required.filter((g) => !gates[g]);

  if (missing.length > 0) {
    throw new Error(`Gate verify 失败：${missing.join(', ')} 未完成`);
  }

  process.stdout.write(
    `Gate verify: PASS (P0/P1/P2 all complete for ${runId})\n`,
  );
}

async function startDevflow(flags) {
  const mode = flags.get('mode') ?? 'full';
  const change = flags.get('change') ?? '';

  const taskTypeByMode = {
    full: 'full',
    hotfix: 'mandatory',
    tweak: 'auto-skip',
  };
  const taskType = taskTypeByMode[mode] ?? 'full';

  if (!change.trim()) {
    throw new Error(
      `缺少参数：--change <name>\n示例：pnpm -s run harness:start -- --mode ${mode} --change feat-xxx`,
    );
  }

  // 多槽位模型：start = 新建（或重置同名已完成）槽位并激活
  const state = await readState();
  const existing = state.slots?.[change];
  if (existing) {
    if (existing.gates?.DONE) {
      process.stderr.write(
        `ℹ️  槽位 '${change}' 已存在且已完结（DONE），将重置后重新开始。\n`,
      );
    } else {
      throw new Error(
        `槽位 '${change}' 已存在且未完成（taskType=${existing.taskType}）。\n` +
          `  请用不同的 --change 名称开启新任务；如确认放弃该任务，先执行：\n` +
          `  pnpm -s run harness:drop -- --change ${change}`,
      );
    }
  }

  // 同名旧证据处理：FULL/HOTFIX 的 P0~P4/TASKS 多文件证据由 writePhaseTemplate
  // 写入且不覆盖已存在文件——重跑同名 change 会让新流程证据写不进去、gate 校验
  // 读到上一轮内容（假通过）。因此先把旧 evidence 目录移入 _archive/ 再开始。
  if (mode !== 'tweak' && (await exists(join(getEvidenceDir(), change)))) {
    const archived = await archiveEvidenceDir(change);
    process.stderr.write(
      `📦 检测到同名旧证据 workflow/evidence/${change}/（上次流程残留），` +
        `已归档至 evidence/_archive/${archived}。\n`,
    );
  } else if (mode === 'tweak' && (await exists(join(getEvidenceDir(), change)))) {
    process.stderr.write(
      `ℹ️  同名 evidence/${change}/TWEAK.md 已存在，本次将通过后将覆盖（单文件自包含，无门禁风险）。\n`,
    );
  }

  await writeState(
    patchSlot(state, change, {
      taskType,
      change,
      gates: { ...GATE_TEMPLATE },
    }),
  );

  const phases =
    mode === 'tweak'
      ? 'skip → tweak → phase4 → done'
      : 'P0 → P1 → P2 → P3 → P4 → done';
  const slotCount = Object.keys((await readState()).slots ?? {}).length;

  process.stdout.write(
    `🚀 工作流已就绪\n` +
      `   Mode: ${mode} (${taskType})\n` +
      `   Change: ${change}\n` +
      `   路径: ${phases}\n` +
      `   槽位: ${slotCount} 个任务共存（当前: ${change}）\n\n` +
      `  按 AGENTS.md Phase 执行协议推进。\n`,
  );
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * 归档 evidence/<change> 到 evidence/_archive/<change>（保留审计，可恢复）。
 * _archive 下同名已存在时追加时间戳后缀避免覆盖。返回实际归档后的目录名。
 */
async function archiveEvidenceDir(change) {
  const src = join(getEvidenceDir(), change);
  if (!(await exists(src))) return '';
  const archiveDir = join(getEvidenceDir(), '_archive');
  await fs.mkdir(archiveDir, { recursive: true });
  const base = join(archiveDir, change);
  const finalDest = (await exists(base))
    ? join(archiveDir, `${change}-${Date.now()}`)
    : base;
  await fs.rename(src, finalDest);
  return finalDest.slice(finalDest.lastIndexOf('/') + 1);
}

/**
 * restore — 从 state.bak.json 显式恢复 state.json
 * 适用场景：hooks 提示"state.json 损坏/缺失，已用备份判定"后，手动修复落盘。
 */
async function stateRestore(flags) {
  const backup = await readStateBackup();
  if (!backup) {
    process.stderr.write(
      `❌ 无有效备份 (${getStateBakPath()})，无法恢复。\n` +
        `   若从未运行过工作流，请用 harness:start 初始化。\n`,
    );
    process.exit(1);
  }
  await writeState(backup);
  const cur = getCurrentSlot(backup);
  process.stdout.write(
    `✅ 已从 ${getStateBakPath()} 恢复 state.json：` +
      `taskType=${cur?.taskType ?? '(empty)'} change=${cur?.change ?? backup.current ?? '(empty)'}\n` +
      `   槽位: ${Object.keys(backup.slots ?? {}).join(', ') || '(empty)'}\n`,
  );
}

/**
 * gc — 归档中断/残留的 evidence 目录到 _archive/（保留审计，不删除）
 *
 * 残档判定：既无 P0.md（FULL 起点）也无 TWEAK.md 的一级证据目录，
 * 且不属于任何槽位的活跃流程（各槽 change / lastRunId）。
 * 默认执行移动；--dry-run 仅预览。
 */
async function collectGarbage(flags) {
  const dryRun = flags.get('dry-run') === 'true';
  await ensureDirs();
  const state = await readState();
  const activeIds = new Set();
  for (const slot of Object.values(state.slots ?? {})) {
    for (const v of [slot.change, slot.lastRunId]) {
      if (typeof v === 'string' && v.trim()) activeIds.add(v);
    }
  }
  const archiveDir = join(getEvidenceDir(), '_archive');

  const dirs = (await fs.readdir(getEvidenceDir(), { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => name !== '_archive' && !activeIds.has(name));

  const candidates = [];
  for (const name of dirs) {
    const dir = join(getEvidenceDir(), name);
    const hasP0 = await exists(join(dir, 'P0.md'));
    const hasTweak = await exists(join(dir, 'TWEAK.md'));
    if (!hasP0 && !hasTweak) candidates.push(name);
  }

  if (candidates.length === 0) {
    process.stdout.write(
      `GC: 无残档可归档（扫描 ${dirs.length} 个目录，均完整或受活跃流程保护）\n`,
    );
    return;
  }

  process.stdout.write(
    `GC: 发现 ${candidates.length} 个残档目录（无 P0.md / TWEAK.md，非活跃流程）：\n`,
  );
  for (const name of candidates) process.stdout.write(`  - ${name}\n`);

  if (dryRun) {
    process.stdout.write(
      `DRY-RUN: 未移动。执行归档: pnpm -s run harness:gc\n`,
    );
    return;
  }

  await fs.mkdir(archiveDir, { recursive: true });
  for (const name of candidates) {
    await fs.rename(join(getEvidenceDir(), name), join(archiveDir, name));
    process.stdout.write(`  ✅ ${name} → _archive/\n`);
  }
  process.stdout.write(
    `GC 完成：${candidates.length} 个目录已归档到 ${archiveDir}\n` +
      `  （保留审计数据，可随时移回 evidence/ 恢复）\n`,
  );
}

// ── 多槽位管理: switch / list / drop ────────────────────

function gateIcons(gates) {
  const mark = (g) => (g ? '✅' : '⬜');
  const g = gates ?? {};
  return `P0:${mark(g.P0)} P1:${mark(g.P1)} P2:${mark(g.P2)} P3:${mark(g.P3)} DONE:${mark(g.DONE)}`;
}

function slotSummary(state) {
  const out = [];
  for (const [id, slot] of Object.entries(state.slots ?? {})) {
    const flag = id === state.current ? '▶' : ' ';
    const done = slot.gates?.DONE ? ' (已完结)' : '';
    out.push(
      `${flag} ${id}${done}  [${slot.taskType ?? '?'}]  ${gateIcons(slot.gates)}`,
    );
  }
  return out;
}

/**
 * switch — 切换当前任务槽位（挂起当前，恢复目标）
 * 目标槽必须先经 harness:start 创建。切换后门禁判定跟随新槽。
 */
async function switchSlot(flags) {
  const target = flags.get('change') || '';
  if (!target.trim()) {
    throw new Error('缺少参数：--change <name>');
  }
  const state = await readState();
  if (!state.slots?.[target]) {
    throw new Error(
      `槽位不存在: ${target}。可用 pnpm -s run harness:list 查看已有槽位，` +
        `或 pnpm -s run harness:start -- --change ${target} 新建。`,
    );
  }
  await writeState({ ...state, current: target });
  const cur = state.slots[target];
  process.stdout.write(
    `✅ 已切换到任务: ${target}  [${cur.taskType ?? '?'}]  ${gateIcons(cur.gates)}\n` +
      `   门禁判定已跟随该槽位。查看全部: pnpm -s run harness:list\n`,
  );
}

/** list — 列出全部任务槽位与门禁进度 */
async function listSlots() {
  const state = await readState();
  const entries = Object.entries(state.slots ?? {});
  if (entries.length === 0) {
    process.stdout.write('暂无任务槽位。用 pnpm -s run harness:start -- --change <name> 开启第一个任务。\n');
    return;
  }
  process.stdout.write(`任务槽位 (${entries.length} 个，▶ = 当前):\n`);
  for (const line of slotSummary(state)) process.stdout.write(`  ${line}\n`);
  process.stdout.write(
    `\n切换: pnpm -s run harness:switch -- --change <name>\n` +
      `放弃: pnpm -s run harness:drop -- --change <name>\n`,
  );
}

/** drop — 删除指定任务槽位（仅删状态，evidence 证据目录保留） */
async function dropSlot(flags) {
  const target = flags.get('change') || '';
  if (!target.trim()) {
    throw new Error('缺少参数：--change <name>');
  }
  const state = await readState();
  if (!state.slots?.[target]) {
    throw new Error(`槽位不存在: ${target}。可用 pnpm -s run harness:list 查看。`);
  }
  const wasCurrent = state.current === target;
  const next = removeSlotById(state, target);
  await writeState(next);
  process.stdout.write(
    `🗑  已删除槽位: ${target}${wasCurrent ? '（原为当前槽，已切换到下一个）' : ''}\n` +
      `   证据目录 workflow/evidence/${target}/ 保留未动；如需归档残留可用 pnpm -s run harness:gc\n`,
  );
}

function printHelp() {
  process.stdout.write(`harness.mjs

Usage:
  node scripts/harness.mjs p0 [--id <runId>] [--check] [--overwrite]
  node scripts/harness.mjs tasks [--id <runId>] [--overwrite] [--check]
  node scripts/harness.mjs p1 [--id <runId>] [--check] [--overwrite]
  node scripts/harness.mjs p2 [--id <runId>] [--build main|full|<script>] [--lint] [--quick]
  node scripts/harness.mjs p3 [--id <runId>] [--check] [--overwrite]
  node scripts/harness.mjs p4 [--id <runId>] [--check] [--overwrite]
  node scripts/harness.mjs skip [--id <runId>] [--marker <marker>] [--reason <reason>]
  node scripts/harness.mjs tweak [--id <runId>]
  node scripts/harness.mjs start --mode full|hotfix|tweak --change <name>
  node scripts/harness.mjs switch --change <name>
  node scripts/harness.mjs list
  node scripts/harness.mjs drop --change <name>
  node scripts/harness.mjs gate --phase p0|p1|p2|p3|done [--id <runId>]
  node scripts/harness.mjs approve --phase p0|p1|p3|p4 [--id <runId>] [--status written|skipped]
  node scripts/harness.mjs gate-reset --type full|mandatory|auto-skip|user-skip [--id <runId>]
  node scripts/harness.mjs gate-verify [--id <runId>]
  node scripts/harness.mjs restore
  node scripts/harness.mjs gc [--dry-run]

Global flags:
  --root <dir>        项目根目录（默认当前目录）
  --config <path>     配置文件路径（默认 <root>/workflow.config.json）
`);
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  ROOT = flags.get('root') ? resolve(flags.get('root')) : process.cwd();
  CONFIG = await loadConfig(flags, ROOT);

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  // 写锁：同一时刻只允许一个 harness 进程（help 豁免）
  await acquireLock();

  if (command === 'p0') {
    await writeP0(flags);
    return;
  }
  if (command === 'tasks') {
    await writeTasks(flags);
    return;
  }
  if (command === 'p1') {
    await writeP1(flags);
    return;
  }
  if (command === 'p2') {
    await verifyP2(flags);
    return;
  }
  if (command === 'p3') {
    await writeP3(flags);
    return;
  }
  if (command === 'p4') {
    await writeP4(flags);
    return;
  }
  if (command === 'skip') {
    await writeSkip(flags);
    return;
  }
  if (command === 'tweak') {
    await verifyTweak(flags);
    return;
  }
  if (command === 'start') {
    await startDevflow(flags);
    return;
  }
  if (command === 'gate') {
    await gateCheck(flags);
    return;
  }
  if (command === 'approve') {
    await approveGate(flags);
    return;
  }
  if (command === 'gate-reset') {
    await gateReset(flags);
    return;
  }
  if (command === 'gate-verify') {
    await gateVerify(flags);
    return;
  }
  if (command === 'restore') {
    await stateRestore(flags);
    return;
  }
  if (command === 'gc') {
    await collectGarbage(flags);
    return;
  }
  if (command === 'switch') {
    await switchSlot(flags);
    return;
  }
  if (command === 'list') {
    await listSlots();
    return;
  }
  if (command === 'drop') {
    await dropSlot(flags);
    return;
  }

  printHelp();
  process.exit(1);
}

// ── 可测试导出 ───────────────────────────────────────────
// 被测试/其他模块 import 时不执行 CLI；直接运行 node scripts/harness.mjs 时正常走 main。
// 暴露的状态模型纯函数供 workflow/tests/ 下的 node:test 用例回归验证。
const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

export {
  normalizeState,
  getCurrentSlot,
  patchCurrent,
  patchSlot,
  removeSlotById,
  gateIcons,
  GATE_TEMPLATE,
};

if (isDirectRun) {
  main().catch((error) => {
    // 友好错误：只输出 message，不泄堆栈；需要堆栈时设 HARNESS_DEBUG=1
    const message = String(error?.message ?? error);
    if (process.env.HARNESS_DEBUG) {
      process.stderr.write(`${String(error?.stack ?? error)}\n`);
    } else {
      process.stderr.write(`❌ ${message}\n`);
    }
    process.exit(1);
  });
}
