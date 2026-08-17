#!/usr/bin/env node
/* eslint-disable no-useless-escape */
/* eslint-disable regexp/no-unused-capturing-group */
/**
 * harness.mjs — 工作流 Gate 状态机（引擎，v5 模板化）
 *
 * 特性：
 * - 零第三方依赖（纯 Node.js）
 * - 项目差异收敛到 workflow.config.json：验证命令、路径、语言、包管理器、文案
 * - 配置查找顺序：--config <path> → $WORKFLOW_CONFIG → <root>/workflow.config.json → 内置默认值
 * - 可选 --root 指定项目根目录，引擎可在任意位置运行
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';

// ─────────────────────────────────────────────────────────
// 默认配置（通用兜底值；项目通过 workflow.config.json 覆盖）
// ─────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  schemaVersion: 1,
  language: 'zh-CN',
  packageManager: 'pnpm',
  workflowDir: 'workflow',
  stateFile: 'workflow/harness/state.json',
  evidenceDir: 'workflow/evidence',
  skillsDir: '.reasonix/skills',
  infraFiles: [
    'AGENTS.md',
    'REASONIX.md',
    'workflow.md',
    'scripts/harness.mjs',
  ],
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
  editTools: [
    'edit_file',
    'write_file',
    'multi_edit',
    'delete_range',
    'move_file',
  ],
  skipKeywords: [
    '紧急',
    '赶紧',
    '线上',
    '马上',
    '修 bug',
    'hotfix',
    '崩溃',
    '报错',
    '挂了',
    '不行了',
    '回滚',
    '立刻',
  ],
  coreConstraints:
    '🔒 核心约束: 最小改动 | 不猜 API 先查 skill | 证据优先 | 验证通过才算完成',
};

const PM_RUN_ARGS = {
  pnpm: ['-s', 'run'],
  npm: ['run'],
  yarn: ['run'],
  bun: ['run'],
};

// ─────────────────────────────────────────────────────────
// 消息层（zh-CN / en）
// ─────────────────────────────────────────────────────────
const HELP_ZH = `harness.mjs

Usage:
  node harness.mjs p0 [--id <runId>] [--check] [--overwrite]
  node harness.mjs tasks [--id <runId>] [--overwrite] [--check]
  node harness.mjs p1 [--id <runId>] [--check] [--overwrite]
  node harness.mjs p2 [--id <runId>] [--env dev|qa|rc|prod] [--build main|full] [--lint] [--quick]
  node harness.mjs p3 [--id <runId>] [--check] [--overwrite]
  node harness.mjs p4 [--id <runId>] [--check] [--overwrite]
  node harness.mjs skip [--id <runId>] [--marker <marker>] [--reason <reason>]
  node harness.mjs tweak [--id <runId>]
  node harness.mjs start --mode full|hotfix|tweak --change <name>
  node harness.mjs gate --phase p0|p1|p2|p3|done [--id <runId>]
  node harness.mjs approve --phase p0|p1|p3|p4 [--id <runId>] [--status written|skipped]
  node harness.mjs gate-reset --type full|mandatory|auto-skip [--id <runId>]
  node harness.mjs gate-verify [--id <runId>]

Global flags:
  --root <dir>        项目根目录（默认当前目录）
  --config <path>     配置文件路径（默认 <root>/workflow.config.json）`;

const HELP_EN = `harness.mjs

Usage:
  node harness.mjs p0 [--id <runId>] [--check] [--overwrite]
  node harness.mjs tasks [--id <runId>] [--overwrite] [--check]
  node harness.mjs p1 [--id <runId>] [--check] [--overwrite]
  node harness.mjs p2 [--id <runId>] [--env dev|qa|rc|prod] [--build main|full] [--lint] [--quick]
  node harness.mjs p3 [--id <runId>] [--check] [--overwrite]
  node harness.mjs p4 [--id <runId>] [--check] [--overwrite]
  node harness.mjs skip [--id <runId>] [--marker <marker>] [--reason <reason>]
  node harness.mjs tweak [--id <runId>]
  node harness.mjs start --mode full|hotfix|tweak --change <name>
  node harness.mjs gate --phase p0|p1|p2|p3|done [--id <runId>]
  node harness.mjs approve --phase p0|p1|p3|p4 [--id <runId>] [--status written|skipped]
  node harness.mjs gate-reset --type full|mandatory|auto-skip [--id <runId>]
  node harness.mjs gate-verify [--id <runId>]

Global flags:
  --root <dir>        project root (default: cwd)
  --config <path>     config path (default: <root>/workflow.config.json)`;

const MESSAGES = {
  'zh-CN': {
    stateCorrupt:
      '⚠️  state.json 已损坏，请运行 {pm} -s run harness:gate-reset 重置',
    evidenceExists: 'Evidence exists: {path}\n',
    evidenceSaved: 'Evidence saved: {path}\n',
    p0GateReady:
      'P0 未满足门禁：请在 {path} 中把 "- gateReady:" 改为 YES',
    p0Scope:
      'P0 未满足门禁：{path} 中 Scope 存在占位符，MUST 填写具体内容',
    p0Risks:
      'P0 未满足门禁：{path} 中 Risks 存在占位符，MUST 填写至少 1 条具体风险',
    tasksMissing: 'Tasks 未满足门禁：{path} 不存在',
    tasksNoCheckbox:
      'Tasks 未满足门禁：{path} 中没有任务 checkbox，MUST 至少有一条 - [ ] 或 - [x] 或 - [-]',
    tasksIncomplete:
      'Tasks 未满足门禁：{path} 中有 {count} 条未完成的任务。所有任务必须标记为 [x]（已完成）或 [-]（跳过 YAGNI），禁止残留 [ ]。',
    tasksPlaceholder:
      'Tasks 未满足门禁：{path} 中存在未替换的占位符，MUST 填写具体任务描述',
    p1GateReady:
      'P1 未满足门禁：请在 {path} 中把 "- gateReady:" 改为 YES',
    p3VerifyPassed:
      'P3 未满足门禁：请在 {path} 中把 "- verifyPassed:" 改为 YES',
    p3UserConfirmed:
      'P3 未满足门禁：请在 {path} 中把 "- userConfirmed:" 改为 YES',
    p4KnowledgeDone:
      'P4 未满足门禁：请在 {path} 中把 "- knowledgeDone:" 改为 YES',
    p4Status:
      'P4 未满足门禁：请在 {path} 中填写 "- status: written/skipped"',
    p4Path:
      'P4 未满足门禁：status=written 时必须填写 {path} 中的 "- compoundEngineeringPath:"',
    illegalPhase: '非法 phase: {phase}，可选: {valid}',
    gateSequenceFail:
      'Gate 序列校验失败：{prev} 未声明，不能推进 {phase}',
    gatePass: '[GATE:{phase}] ✅ {ts}\n',
    gateVerifyFail: 'Gate verify 失败：{missing} 未完成\n',
    gateVerifyPass:
      'Gate verify: PASS (P0/P1/P2 all complete for {runId})\n',
    invalidTaskType: '非法 taskType: {type}，可选: {valid}',
    resetDone: 'Gate reset: type={type}\n',
    p2MaxRounds:
      '❌ P2 收敛已达最大轮次 ({rounds})，无法继续自动修正。\n请手动修复问题后重新运行 harness:p2。',
    p2EvidenceSaved: '\nEvidence saved: {path}',
    p2ErrorsSaved: 'Errors saved: {path}\n',
    approveDone: '[APPROVE:{phase}] ✅ {path}\n',
    changedFilesNone: '- (none)',
    startReady:
      '🚀 工作流已就绪\n' +
      '   Mode: {mode} ({taskType})\n' +
      '   Change: {change}\n' +
      '   路径: {phases}\n\n' +
      '  按 AGENTS.md Phase 执行协议推进。',
    startMissingChange:
      '缺少参数：--change <name>\n示例：{pm} -s run harness:start -- --mode {mode} --change feat-xxx',
    gateResetFailed: 'gate-reset failed: {stderr}',
    help: HELP_ZH,
  },
  en: {
    stateCorrupt:
      '⚠️  state.json is corrupted. Run {pm} -s run harness:gate-reset to reset',
    evidenceExists: 'Evidence exists: {path}\n',
    evidenceSaved: 'Evidence saved: {path}\n',
    p0GateReady:
      'P0 gate not satisfied: set "- gateReady:" to YES in {path}',
    p0Scope:
      'P0 gate not satisfied: Scope contains placeholders in {path}, MUST fill in concrete content',
    p0Risks:
      'P0 gate not satisfied: Risks contains placeholders in {path}, MUST include at least 1 concrete risk',
    tasksMissing: 'Tasks gate not satisfied: {path} does not exist',
    tasksNoCheckbox:
      'Tasks gate not satisfied: no task checkbox in {path}; MUST have at least one - [ ] / - [x] / - [-]',
    tasksIncomplete:
      'Tasks gate not satisfied: {count} incomplete tasks in {path}. All tasks MUST be [x] (done) or [-] (YAGNI skipped), no [ ] allowed.',
    tasksPlaceholder:
      'Tasks gate not satisfied: un-replaced placeholders in {path}, MUST fill in concrete task descriptions',
    p1GateReady:
      'P1 gate not satisfied: set "- gateReady:" to YES in {path}',
    p3VerifyPassed:
      'P3 gate not satisfied: set "- verifyPassed:" to YES in {path}',
    p3UserConfirmed:
      'P3 gate not satisfied: set "- userConfirmed:" to YES in {path}',
    p4KnowledgeDone:
      'P4 gate not satisfied: set "- knowledgeDone:" to YES in {path}',
    p4Status:
      'P4 gate not satisfied: fill "- status: written/skipped" in {path}',
    p4Path:
      'P4 gate not satisfied: status=written requires "- compoundEngineeringPath:" in {path}',
    illegalPhase: 'Illegal phase: {phase}, valid: {valid}',
    gateSequenceFail:
      'Gate sequence check failed: {prev} is not declared, cannot advance to {phase}',
    gatePass: '[GATE:{phase}] ✅ {ts}\n',
    gateVerifyFail: 'Gate verify failed: {missing} incomplete\n',
    gateVerifyPass:
      'Gate verify: PASS (P0/P1/P2 all complete for {runId})\n',
    invalidTaskType: 'Illegal taskType: {type}, valid: {valid}',
    resetDone: 'Gate reset: type={type}\n',
    p2MaxRounds:
      '❌ P2 convergence reached max rounds ({rounds}); automatic fixes stopped.\nFix manually, then re-run harness:p2.',
    p2EvidenceSaved: '\nEvidence saved: {path}',
    p2ErrorsSaved: 'Errors saved: {path}\n',
    approveDone: '[APPROVE:{phase}] ✅ {path}\n',
    changedFilesNone: '- (none)',
    startReady:
      '🚀 Workflow ready\n' +
      '   Mode: {mode} ({taskType})\n' +
      '   Change: {change}\n' +
      '   Path: {phases}\n\n' +
      '  Follow the Phase protocol in AGENTS.md.',
    startMissingChange:
      'Missing argument: --change <name>\nExample: {pm} -s run harness:start -- --mode {mode} --change feat-xxx',
    gateResetFailed: 'gate-reset failed: {stderr}',
    help: HELP_EN,
  },
};

// ── 运行时状态（main() 中初始化） ──
let ROOT = process.cwd();
let CONFIG = DEFAULT_CONFIG;

function t(key, vars = {}) {
  const table = MESSAGES[CONFIG.language] ?? MESSAGES['zh-CN'];
  let msg = table[key] ?? MESSAGES['zh-CN'][key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    msg = msg.replaceAll(`{${k}}`, v);
  }
  return msg;
}

// ─────────────────────────────────────────────────────────
// 配置加载
// ─────────────────────────────────────────────────────────
function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override === undefined ? base : override;
  }
  if (
    base &&
    override &&
    typeof base === 'object' &&
    typeof override === 'object'
  ) {
    const out = { ...base };
    for (const key of Object.keys(override)) {
      out[key] =
        key in base ? deepMerge(base[key], override[key]) : override[key];
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

function statePath() {
  return join(ROOT, CONFIG.stateFile);
}

function evidenceDir() {
  return join(ROOT, CONFIG.evidenceDir);
}

// ─────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────
function nowId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = Math.random().toString(16).slice(2, 8);
  return `${date}-${time}-${rand}`;
}

function parseArgs(argv) {
  const command = argv[0] ?? 'help';
  const flags = new Map();
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags.set(key, next);
        i += 1;
      } else {
        flags.set(key, 'true');
      }
    }
  }
  return { command, flags };
}

async function ensureDirs() {
  await fs.mkdir(evidenceDir(), { recursive: true });
}

async function readState() {
  try {
    const raw = await fs.readFile(statePath(), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    process.stderr.write(t('stateCorrupt', { pm: CONFIG.packageManager }));
    return {};
  }
}

async function writeState(nextState) {
  await fs.mkdir(join(ROOT, CONFIG.workflowDir, 'harness'), {
    recursive: true,
  });
  await fs.writeFile(statePath(), `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
}

async function getRunId(flags) {
  const explicit = flags.get('id');
  if (explicit) return explicit;
  const state = await readState();
  if (typeof state.lastRunId === 'string' && state.lastRunId.trim()) {
    return state.lastRunId;
  }
  if (typeof state.change === 'string' && state.change.trim()) {
    return state.change;
  }
  const id = nowId();
  await writeState({ ...state, lastRunId: id });
  return id;
}

async function writePhaseTemplate(phase, runId, body, options = {}) {
  await ensureDirs();
  const dir = join(evidenceDir(), runId);
  await fs.mkdir(dir, { recursive: true });
  const evidencePath = join(dir, `${phase}.md`);
  const overwrite = options.overwrite === true;
  if (!overwrite) {
    try {
      await fs.access(evidencePath);
      process.stdout.write(t('evidenceExists', { path: evidencePath }));
      return;
    } catch {}
  }
  await fs.writeFile(evidencePath, body, 'utf8');
  process.stdout.write(t('evidenceSaved', { path: evidencePath }));
}

async function readEvidence(phase, runId) {
  const evidencePath = join(evidenceDir(), runId, `${phase}.md`);
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

function runCommand(command, args, cwd, options = {}) {
  return new Promise((resolvePromise) => {
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
      if (!options.quiet) process.stderr.write(buf);
    });
    child.on('close', (code) => {
      resolvePromise({ code: code ?? 1, stdout, stderr });
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
    { quiet: true },
  );
  const staged = await runCommand(
    'git',
    [...gitBaseArgs, 'diff', '--cached', '--name-only'],
    ROOT,
    { quiet: true },
  );
  const untracked = await runCommand(
    'git',
    [...gitBaseArgs, 'ls-files', '--others', '--exclude-standard'],
    ROOT,
    { quiet: true },
  );
  const all = new Set([
    ...(staged.code === 0 ? splitNonEmptyLines(staged.stdout) : []),
    ...(unstaged.code === 0 ? splitNonEmptyLines(unstaged.stdout) : []),
    ...(untracked.code === 0 ? splitNonEmptyLines(untracked.stdout) : []),
  ]);
  return [...all].sort();
}

// ─────────────────────────────────────────────────────────
// 验证命令解析（配置驱动）
// ─────────────────────────────────────────────────────────
function resolveCheck(check, env, lintEnabled) {
  if (!check) return null;
  if (check.key === 'lint' && !lintEnabled) return null;

  // 显式 cmd/args 优先（支持任意命令）
  if (check.cmd && Array.isArray(check.args)) {
    return {
      key: check.key,
      name: [check.cmd, ...check.args].join(' '),
      cmd: check.cmd,
      args: check.args,
    };
  }

  let script = check.script ?? check.key;
  script = String(script)
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
    lintFlag === undefined
      ? (CONFIG.verify.lintEnabled ?? true)
      : lintFlag !== 'false';

  return (checks ?? [])
    .map((check) => {
      const c = { ...check };
      if (
        c.key === 'build' &&
        buildVariant &&
        c.variants &&
        c.variants[buildVariant]
      ) {
        c.script = c.variants[buildVariant];
      }
      return resolveCheck(c, env, lintEnabled);
    })
    .filter(Boolean);
}

// ─────────────────────────────────────────────────────────
// Phase 证据与 Gate 校验
// ─────────────────────────────────────────────────────────
async function validateP0(runId) {
  const { evidencePath, content } = await readEvidence('P0', runId);
  if (!expectLineYes(content, 'gateReady')) {
    throw new Error(t('p0GateReady', { path: evidencePath }));
  }
  const placeholders = /\b(MUST ask|填不出|TODO|待定|<填)/i;
  const scopeSection = content.match(/## Scope[\s\S]*?(?=## |$)/)?.[0] ?? '';
  const risksSection = content.match(/## Risks[\s\S]*?(?=## |$)/)?.[0] ?? '';
  if (placeholders.test(scopeSection)) {
    throw new Error(t('p0Scope', { path: evidencePath }));
  }
  if (placeholders.test(risksSection)) {
    throw new Error(t('p0Risks', { path: evidencePath }));
  }
}

async function validateTasks(runId) {
  const tasksPath = join(evidenceDir(), runId, 'TASKS.md');
  let content;
  try {
    content = await fs.readFile(tasksPath, 'utf8');
  } catch {
    throw new Error(t('tasksMissing', { path: tasksPath }));
  }
  if (!/\n- \[[ x\-]\] /.test(content)) {
    throw new Error(t('tasksNoCheckbox', { path: tasksPath }));
  }
  const incomplete = content.match(/^- \[ \] /gm);
  if (incomplete && incomplete.length > 0) {
    throw new Error(
      t('tasksIncomplete', { path: tasksPath, count: incomplete.length }),
    );
  }
  if (/<任务描述>|<任务组名称>/.test(content)) {
    throw new Error(t('tasksPlaceholder', { path: tasksPath }));
  }
}

async function validateP1(runId) {
  const { evidencePath, content } = await readEvidence('P1', runId);
  if (!expectLineYes(content, 'gateReady')) {
    throw new Error(t('p1GateReady', { path: evidencePath }));
  }
}

async function validateP3(runId) {
  const { evidencePath, content } = await readEvidence('P3', runId);
  if (!expectLineYes(content, 'verifyPassed')) {
    throw new Error(t('p3VerifyPassed', { path: evidencePath }));
  }
  if (!expectLineYes(content, 'userConfirmed')) {
    throw new Error(t('p3UserConfirmed', { path: evidencePath }));
  }
}

async function validateP4(runId) {
  const { evidencePath, content } = await readEvidence('P4', runId);
  if (!expectLineYes(content, 'knowledgeDone')) {
    throw new Error(t('p4KnowledgeDone', { path: evidencePath }));
  }
  const status = readScalar(content, 'status');
  const path = readScalar(content, 'compoundEngineeringPath');
  if (!status || status.toUpperCase().startsWith('TODO')) {
    throw new Error(t('p4Status', { path: evidencePath }));
  }
  if (status === 'written') {
    if (!path || path.toUpperCase().startsWith('TODO')) {
      throw new Error(t('p4Path', { path: evidencePath }));
    }
  }
}

// ─────────────────────────────────────────────────────────
// 各 Phase 写入
// ─────────────────────────────────────────────────────────
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
  const tasksPath = join(evidenceDir(), runId, 'TASKS.md');
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
  await fs.mkdir(join(evidenceDir(), runId), { recursive: true });
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
      : t('changedFilesNone');
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
      t('illegalPhase', { phase, valid: VALID_PHASES.join(', ') }),
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
    if (result.includes(from)) result = result.replace(from, to);
  }
  if (phase === 'P4') {
    const status = flags.get('status');
    if (status && ['written', 'skipped'].includes(status)) {
      result = result.replace(/- status: TODO[^\n]*/, `- status: ${status}`);
    }
  }
  await fs.writeFile(evidencePath, result, 'utf8');
  process.stdout.write(t('approveDone', { phase, path: evidencePath }));
}

// ─────────────────────────────────────────────────────────
// P2 验证 + 收敛
// ─────────────────────────────────────────────────────────
async function verifyP2(flags) {
  await ensureDirs();
  const runId = await getRunId(flags);
  const quickMode = flags.get('quick') === 'true';
  const checkOrder = buildCheckList(CONFIG.verify.full, flags);
  const startedAt = new Date().toISOString();

  let failedKeys = null;
  if (quickMode) {
    const state = await readState();
    failedKeys = state.p2FailedKeys ?? null;
  }

  const results = [];
  let stoppedEarly = false;
  for (const check of checkOrder) {
    if (quickMode && failedKeys && !failedKeys.includes(check.key)) {
      continue;
    }
    const result = await runCommand(check.cmd, check.args, ROOT);
    results.push({ name: check.name, key: check.key, ...result });
    if (result.code !== 0) {
      stoppedEarly = true;
      break;
    }
  }

  const endedAt = new Date().toISOString();
  const allPassed = !stoppedEarly && results.every((r) => r.code === 0);
  const failedKeysList = results.filter((r) => r.code !== 0).map((r) => r.key);
  const state = await readState();
  const newRound = allPassed ? 0 : (state.p2ConvergenceRound || 0) + 1;

  const maxRounds = CONFIG.maxConvergenceRounds ?? 3;
  if (newRound > maxRounds) {
    process.stderr.write(t('p2MaxRounds', { rounds: maxRounds }));
    process.exit(1);
  }

  await writeState({
    ...state,
    p2FailedKeys: allPassed ? null : failedKeysList,
    p2ConvergenceRound: newRound,
  });

  const p2Dir = join(evidenceDir(), runId);
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

  process.stdout.write(t('p2EvidenceSaved', { path: evidencePath }));
  if (!allPassed) {
    process.stdout.write(t('p2ErrorsSaved', { path: errorsPath }));
  }
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

// ─────────────────────────────────────────────────────────
// TWEAK 验证
// ─────────────────────────────────────────────────────────
async function verifyTweak(flags) {
  await ensureDirs();
  const runId = await getRunId(flags);
  const changedFiles = await getChangedFiles();
  const changedFilesMd =
    changedFiles.length > 0
      ? changedFiles.map((p) => `- ${p}`).join('\n')
      : t('changedFilesNone');
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
      (r) =>
        `\n### ${r.name}\n\n- exitCode: ${r.code}\n\n\`\`\`text\n${(r.stdout ?? '').trim()}\n${(r.stderr ?? '').trim()}\n\`\`\``,
    ),
    ``,
  ].join('\n');

  const tweakDir = join(evidenceDir(), runId);
  await fs.mkdir(tweakDir, { recursive: true });
  const evidencePath = join(tweakDir, 'TWEAK.md');
  await fs.writeFile(evidencePath, md, 'utf8');
  process.stdout.write(`\nEvidence saved: ${evidencePath}\n`);
  process.exit(exitCode === 0 ? 0 : 1);
}

// ─────────────────────────────────────────────────────────
// Gate 状态机
// ─────────────────────────────────────────────────────────
const GATE_SEQUENCE = ['P0', 'P1', 'P2', 'P3', 'DONE'];
const GATE_TEMPLATE = { P0: null, P1: null, P2: null, P3: null, DONE: null };

async function gateCheck(flags) {
  const phase = (flags.get('phase') ?? '').toUpperCase();
  const runId = await getRunId(flags);
  if (!GATE_SEQUENCE.includes(phase)) {
    throw new Error(
      t('illegalPhase', { phase, valid: GATE_SEQUENCE.join(', ') }),
    );
  }
  const state = await readState();
  const gates = state.gates ?? { ...GATE_TEMPLATE };
  const idx = GATE_SEQUENCE.indexOf(phase);
  if (idx > 0) {
    const prev = GATE_SEQUENCE[idx - 1];
    if (!gates[prev]) {
      throw new Error(t('gateSequenceFail', { prev, phase }));
    }
  }
  gates[phase] = new Date().toISOString();
  await writeState({ ...state, gates });
  process.stdout.write(t('gatePass', { phase, ts: gates[phase] }));
}

async function gateReset(flags) {
  const taskType = flags.get('type') ?? 'full';
  const VALID_TYPES = ['full', 'mandatory', 'auto-skip', 'user-skip'];
  if (!VALID_TYPES.includes(taskType)) {
    throw new Error(
      t('invalidTaskType', { type: taskType, valid: VALID_TYPES.join(', ') }),
    );
  }
  const change = flags.get('id') || '';
  await writeState({
    taskType,
    gates: { ...GATE_TEMPLATE },
    ...(change ? { change } : {}),
    lastRunId: undefined,
    p2FailedKeys: undefined,
    p2ConvergenceRound: undefined,
  });
  process.stdout.write(t('resetDone', { type: taskType }));
}

async function gateVerify(flags) {
  const runId = await getRunId(flags);
  const state = await readState();
  const gates = state.gates ?? {};
  const required = ['P0', 'P1', 'P2'];
  const missing = required.filter((g) => !gates[g]);
  if (missing.length > 0) {
    throw new Error(t('gateVerifyFail', { missing: missing.join(', ') }));
  }
  process.stdout.write(t('gateVerifyPass', { runId }));
}

// ─────────────────────────────────────────────────────────
// 启动
// ─────────────────────────────────────────────────────────
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
      t('startMissingChange', { pm: CONFIG.packageManager, mode }),
    );
  }
  const harnessPath = resolve(process.argv[1]);
  const gateResetResult = await runCommand(
    'node',
    [harnessPath, 'gate-reset', '--type', taskType, '--id', change, '--root', ROOT],
    ROOT,
  );
  if (gateResetResult.code !== 0) {
    process.stderr.write(
      t('gateResetFailed', { stderr: gateResetResult.stderr }),
    );
    process.exit(1);
  }
  const phases =
    mode === 'tweak'
      ? 'skip → tweak → phase4 → done'
      : 'P0 → P1 → P2 → P3 → P4 → done';
  process.stdout.write(t('startReady', { mode, taskType, change, phases }));
}

function printHelp() {
  process.stdout.write(`${t('help')}\n`);
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

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  ROOT = flags.get('root') ? resolve(flags.get('root')) : process.cwd();
  CONFIG = await loadConfig(flags, ROOT);

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (command === 'p0') return writeP0(flags);
  if (command === 'tasks') return writeTasks(flags);
  if (command === 'p1') return writeP1(flags);
  if (command === 'p2') return verifyP2(flags);
  if (command === 'p3') return writeP3(flags);
  if (command === 'p4') return writeP4(flags);
  if (command === 'skip') return writeSkip(flags);
  if (command === 'tweak') return verifyTweak(flags);
  if (command === 'start') return startDevflow(flags);
  if (command === 'gate') return gateCheck(flags);
  if (command === 'approve') return approveGate(flags);
  if (command === 'gate-reset') return gateReset(flags);
  if (command === 'gate-verify') return gateVerify(flags);
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  process.stderr.write(`${String(error?.stack ?? error)}\n`);
  process.exit(1);
});
