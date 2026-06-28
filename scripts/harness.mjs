/* eslint-disable regexp/no-unused-capturing-group */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DEVFLOW_DIR = join(ROOT, '.devflow');
const HARNESS_DIR = join(DEVFLOW_DIR, 'harness');
const EVIDENCE_DIR = join(DEVFLOW_DIR, 'evidence');
const STATE_PATH = join(HARNESS_DIR, 'state.json');

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
      continue;
    }
  }

  return { command, flags };
}

async function ensureDirs() {
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });
}

async function readState() {
  try {
    const raw = await fs.readFile(STATE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    // ENOENT: 无状态文件（正常）
    if (e.code === 'ENOENT') return {};
    // JSON 解析失败: 损坏
    process.stderr.write(`⚠️  state.json 已损坏，请运行 harness:gate-reset 重置\n`);
    return {};
  }
}

async function writeState(nextState) {
  await fs.mkdir(HARNESS_DIR, { recursive: true });
  await fs.writeFile(
    STATE_PATH,
    `${JSON.stringify(nextState, null, 2)}\n`,
    'utf8',
  );
}

async function getRunId(flags) {
  const explicit = flags.get('id');
  if (explicit) return explicit;
  const state = await readState();
  if (typeof state.lastRunId === 'string' && state.lastRunId.trim()) {
    return state.lastRunId;
  }
  const id = nowId();
  await writeState({ ...state, lastRunId: id });
  return id;
}

async function writePhaseTemplate(phase, runId, body, options = {}) {
  await ensureDirs();
  const evidenceDir = join(EVIDENCE_DIR, runId);
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
  const evidencePath = join(EVIDENCE_DIR, runId, `${phase}.md`);
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

function replaceScalarLine(content, key, value) {
  const re = new RegExp(`^(\\s*-\\s*${key}:\\s*).*$`, 'im');
  if (!re.test(content)) {
    throw new Error(`Evidence 格式不符合预期：缺少 "${key}" 行`);
  }
  return content.replace(re, `$1${value}`);
}

async function approveGate(flags) {
  const phase = (flags.get('phase') ?? '').toLowerCase();
  const runId = await getRunId(flags);

  const normalized =
    phase === '0' || phase === 'p0'
      ? 'P0'
      : phase === '1' || phase === 'p1'
        ? 'P1'
        : phase === '3' || phase === 'p3'
          ? 'P3'
          : phase === '4' || phase === 'p4'
            ? 'P4'
            : '';

  if (!normalized) {
    throw new Error(
      `缺少或非法参数：--phase <p0|p1|p3|p4>\n示例：pnpm -s run harness:approve -- --phase p0 --id ${runId}`,
    );
  }

  const { evidencePath, content } = await readEvidence(normalized, runId);
  let next = content;

  if (normalized === 'P0' || normalized === 'P1') {
    next = replaceScalarLine(next, 'gateReady', 'YES');
  }

  if (normalized === 'P3') {
    next = replaceScalarLine(next, 'verifyPassed', 'YES');
    next = replaceScalarLine(next, 'userConfirmed', 'YES');
  }

  if (normalized === 'P4') {
    next = replaceScalarLine(next, 'knowledgeDone', 'YES');
    const status = flags.get('status');
    const path = flags.get('path');
    if (status) next = replaceScalarLine(next, 'status', status);
    if (path) next = replaceScalarLine(next, 'compoundEngineeringPath', path);
  }

  await fs.writeFile(evidencePath, next, 'utf8');
  process.stdout.write(`Evidence updated: ${evidencePath}\n`);
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
  const tasksPath = join(EVIDENCE_DIR, runId, 'TASKS.md');
  let content;
  try {
    content = await fs.readFile(tasksPath, 'utf8');
  } catch {
    throw new Error(`Tasks 未满足门禁：${tasksPath} 不存在`);
  }

  // check at least one task checkbox exists (not just template)
  if (!/\n- \[[ x]\] /.test(content)) {
    throw new Error(
      `Tasks 未满足门禁：${tasksPath} 中没有任务 checkbox，MUST 至少有一条 - [ ] 或 - [x]`,
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
  const tasksPath = join(EVIDENCE_DIR, runId, 'TASKS.md');

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

  await fs.mkdir(join(EVIDENCE_DIR, runId), { recursive: true });
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
  const env = flags.get('env') ?? 'dev';
  const buildMode = flags.get('build') ?? 'main';
  const buildScript = buildMode === 'full' ? 'build' : `build:main:${env}`;
  const lintEnabled =
    flags.get('lint') !== undefined && flags.get('lint') !== 'false';
  const quickMode = flags.get('quick') === 'true';

  const startedAt = new Date().toISOString();

  // ── layered execution: build → lint → typecheck ──
  const checkOrder = [
    {
      name: `pnpm -s run ${buildScript}`,
      cmd: 'pnpm',
      args: ['-s', 'run', buildScript],
      key: 'build',
    },
    ...(lintEnabled
      ? [
          {
            name: 'pnpm -s run lint',
            cmd: 'pnpm',
            args: ['-s', 'run', 'lint'],
            key: 'lint',
          },
        ]
      : []),
    {
      name: 'pnpm -s run check:type',
      cmd: 'pnpm',
      args: ['-s', 'run', 'check:type'],
      key: 'typecheck',
    },
  ];

  // quick mode: only re-run previously failed checks (read from state)
  let failedKeys = null;
  if (quickMode) {
    const state = await readState();
    failedKeys = state.p2FailedKeys ?? null;
  }

  const results = [];
  let stoppedEarly = false;

  for (const check of checkOrder) {
    // quick mode: skip checks that passed last time
    if (quickMode && failedKeys && !failedKeys.includes(check.key)) {
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
  const newRound = allPassed ? 0 : (state.p2ConvergenceRound || 0) + 1;
  await writeState({
    ...state,
    p2FailedKeys: allPassed ? null : failedKeysList,
    p2ConvergenceRound: newRound,
  });

  // ── generate evidence ──
  const p2Dir = join(EVIDENCE_DIR, runId);
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
    // full output for passing runs
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
    // slim output: only the failed command's error lines
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
      ...errorLines.map((l) => l.slice(0, 200)), // truncate long lines
      '```',
    );
  }

  md.push('');

  await fs.writeFile(evidencePath, md.join('\n'), 'utf8');

  // write errors-only file for convergence loop (agent reads this, not full evidence)
  if (allPassed) {
    // clean up previous error file
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
  // CLI-only: exit directly with pass/fail code for TOML gate consumption
  process.exit(allPassed ? 0 : 1);
}

function extractErrors(stdout, stderr, key) {
  const lines = [...stdout.split('\n'), ...stderr.split('\n')];
  const errorPatterns = [
    /error/i, // generic error
    /Error:/, // build errors
    /✖/, // lint errors
    /TS\d{4}:/, // TypeScript error codes
    /FAILED/, // test-like failures
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
    // error lines contain at least one known error pattern
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
  const checkTypeResult = await runCommand(
    'pnpm',
    ['-s', 'run', 'check:type'],
    ROOT,
  );
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
    ``,
    `### pnpm -s run check:type`,
    ``,
    `- exitCode: ${checkTypeResult.code}`,
    ``,
    `\`\`\`text`,
    `${(checkTypeResult.stdout ?? '').trim()}`,
    `${(checkTypeResult.stderr ?? '').trim()}`,
    `\`\`\``,
    ``,
  ].join('\n');

  const tweakDir = join(EVIDENCE_DIR, runId);
  await fs.mkdir(tweakDir, { recursive: true });
  const evidencePath = join(tweakDir, 'TWEAK.md');
  await fs.writeFile(evidencePath, md, 'utf8');

  process.stdout.write(`\nEvidence saved: ${evidencePath}\n`);
  // CLI-only: exit directly for TOML gate consumption
  process.exit(checkTypeResult.code === 0 ? 0 : 1);
}

// ── Gate state machine (inline replacement for pipeline-step.sh) ──

const GATE_SEQUENCE = ['P0', 'P1', 'P2', 'P3', 'DONE'];
const GATE_TEMPLATE = { P0: null, P1: null, P2: null, P3: null, DONE: null };

async function gateCheck(flags) {
  const phase = (flags.get('phase') ?? '').toUpperCase();
  const runId = await getRunId(flags);

  if (!GATE_SEQUENCE.includes(phase)) {
    throw new Error(`非法 phase: ${phase}，可选: ${GATE_SEQUENCE.join(', ')}`);
  }

  const state = await readState();
  const gates = state.gates ?? { ...GATE_TEMPLATE };

  // validate sequence: gate P[N] requires P[N-1] to exist
  const idx = GATE_SEQUENCE.indexOf(phase);
  if (idx > 0) {
    const prev = GATE_SEQUENCE[idx - 1];
    if (!gates[prev]) {
      throw new Error(`Gate 序列校验失败：${prev} 未声明，不能推进 ${phase}`);
    }
  }

  // record gate timestamp
  gates[phase] = new Date().toISOString();
  await writeState({ ...state, gates });

  process.stdout.write(`[GATE:${phase}] ✅ ${gates[phase]}\n`);
}

async function gateReset(flags) {
  const taskType = flags.get('type') ?? 'full';
  const VALID_TYPES = ['full', 'mandatory', 'auto-skip', 'user-skip'];
  if (!VALID_TYPES.includes(taskType)) {
    throw new Error(
      `非法 taskType: ${taskType}，可选: ${VALID_TYPES.join(', ')}`,
    );
  }
  const change = flags.get('id') || '';

  await writeState({
    taskType,
    gates: { ...GATE_TEMPLATE },
    ...(change ? { change } : {}),
    // 清除上一条流程的残留字段
    lastRunId: undefined,
    p2FailedKeys: undefined,
    p2ConvergenceRound: undefined,
  });

  process.stdout.write(`Gate reset: type=${taskType}\n`);
}

async function gateVerify(flags) {
  const runId = await getRunId(flags);
  const state = await readState();
  const gates = state.gates ?? {};

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

  const workflowByMode = {
    full: 'WF-FULL',
    hotfix: 'WF-HOTFIX',
    tweak: 'WF-TWEAK',
  };
  const workflowId = workflowByMode[mode] ?? workflowByMode.full;

  // task-type mapping
  const taskTypeByMode = {
    full: 'full',
    hotfix: 'mandatory',
    tweak: 'auto-skip',
  };
  const taskType = taskTypeByMode[mode] ?? 'full';

  if (!change.trim()) {
    throw new Error(
      `缺少参数：--change <name>\n示例：pnpm -s run devflow:start -- --mode ${mode} --change feat-xxx`,
    );
  }

  // gate-reset is the single source of truth for init — handled here, not in WF TOML
  const gateResetResult = await runCommand(
    'node',
    ['./scripts/harness.mjs', 'gate-reset', '--type', taskType, '--id', change],
    ROOT,
  );
  if (gateResetResult.code !== 0) {
    process.stderr.write(`gate-reset failed: ${gateResetResult.stderr}\n`);
    process.exit(1);
  }

  const steps = [
    ['pnpm', ['-s', 'run', 'devflow:select', '--', workflowId]],
    ['pnpm', ['-s', 'run', 'devflow:set', '--', 'change', change]],
    ['pnpm', ['-s', 'run', 'devflow:done']],
    ['pnpm', ['-s', 'run', 'devflow:done']],
    ['pnpm', ['-s', 'run', 'devflow:current']],
  ];

  for (const [cmd, args] of steps) {
    const r = await runCommand(cmd, args, ROOT);
    if (r.code !== 0) {
      process.exit(1);
    }
  }
}

function printHelp() {
  process.stdout.write(`harness.mjs

Usage:
  node scripts/harness.mjs p0 [--id <runId>] [--check] [--overwrite]
  node scripts/harness.mjs tasks [--id <runId>] [--overwrite] [--check]
  node scripts/harness.mjs p1 [--id <runId>] [--check] [--overwrite]
  node scripts/harness.mjs p2 [--id <runId>] [--env dev|qa|rc|prod] [--build main|full] [--lint] [--quick]
  node scripts/harness.mjs p3 [--id <runId>] [--check] [--overwrite]
  node scripts/harness.mjs p4 [--id <runId>] [--check] [--overwrite]
  node scripts/harness.mjs skip [--id <runId>] [--marker <marker>] [--reason <reason>]
  node scripts/harness.mjs tweak [--id <runId>]
  node scripts/harness.mjs approve --phase p0|p1|p3|p4 [--id <runId>] [--status written|skipped] [--path <compoundEngineeringPath>]
  node scripts/harness.mjs start --mode full|hotfix|tweak --change <name>
  node scripts/harness.mjs gate --phase p0|p1|p2|p3|done [--id <runId>]
  node scripts/harness.mjs gate-reset --type full|mandatory|auto-skip [--id <runId>]
  node scripts/harness.mjs gate-verify [--id <runId>]

Notes:
  - 所有产物写入 .devflow/（已在 .gitignore 忽略）
  - gate/gate-reset/gate-verify 替代 pipeline-step.sh（零外部依赖）
  - p0/p1/p3/p4 用于生成阶段证据模板，便于团队统一填充
  - p2 会运行 check:type + build（main/full 可选）并写 Evidence
  - skip/tweak 用于对齐 WF-TWEAK（AUTO-SKIP 路径）
  - start 用于“一键进入 DevFlow workflow”，会自动 select-workflow + set change + done 两次进入下一步
`);
}

async function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

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

  if (command === 'approve') {
    await approveGate(flags);
    return;
  }

  if (command === 'gate') {
    await gateCheck(flags);
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

  printHelp();
  process.exit(1);
}

main().catch((error) => {
  process.stderr.write(`${String(error?.stack ?? error)}\n`);
  process.exit(1);
});
