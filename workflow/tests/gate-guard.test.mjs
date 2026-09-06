/**
 * gate-guard.cjs（PreToolUse 门禁）集成测试 — node:test
 *
 * 用 mkdtemp fixture 构造 workflow/harness/{state,state.bak}.json，
 * spawnSync 子进程模拟 hook 的 stdin payload，断言退出码。完全不触碰真实 state。
 * 运行：pnpm -s run harness:test（= node --test workflow/tests/）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HOOK = fileURLToPath(new URL('../hooks/gate-guard.cjs', import.meta.url));
const require = createRequire(import.meta.url);
const { normalizeState: libNormalize } = require('../hooks/lib.cjs');

const SRC_FILE = '/repo/apps/main-app/src/views/x.vue';
const WF_FILE = 'workflow/harness/state.json'; // 相对 cwd → fixture 内

function emptyGates() {
  return { P0: null, P1: null, P2: null, P3: null, DONE: null };
}
function reg(current, slots) {
  return { current, slots };
}
function slot(taskType, gates) {
  return { taskType, change: taskType, gates };
}

/**
 * 在 fixture 目录运行 gate-guard。state/bak 为 undefined 时不创建文件（ENOENT 场景），
 * 为字符串时原样写入（可模拟损坏 JSON）。
 */
function run(toolName, toolArgs, { state, bak } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wf-gate-'));
  try {
    const h = join(dir, 'workflow', 'harness');
    mkdirSync(h, { recursive: true });
    const write = (name, content) => {
      if (content === undefined || content === null) return;
      writeFileSync(join(h, name), typeof content === 'string' ? content : JSON.stringify(content));
    };
    write('state.json', state);
    write('state.bak.json', bak);
    const payload = {
      event: 'PreToolUse',
      cwd: dir,
      toolName,
      toolArgs,
    };
    const res = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify(payload),
      cwd: dir,
      encoding: 'utf8',
    });
    return { code: res.status, stderr: res.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── 正常门禁判定（单槽） ──────────────────────────────

test('auto-skip 槽：编辑放行 exit 0', () => {
  const { code } = run('edit_file', { path: SRC_FILE }, {
    state: reg('t', { t: slot('auto-skip', emptyGates()) }),
  });
  assert.equal(code, 0);
});

test('auto-skip 槽：危险 bash 仍拦截 exit 2（跳过流程不豁免危险命令）', () => {
  const { code, stderr } = run('bash', { command: 'rm -rf /tmp/x' }, {
    state: reg('t', { t: slot('auto-skip', emptyGates()) }),
  });
  assert.equal(code, 2);
  assert.match(stderr, /危险命令/);
});

test('full 槽 P0 未过：编辑拦截 exit 2', () => {
  const { code, stderr } = run('edit_file', { path: SRC_FILE }, {
    state: reg('f', { f: slot('full', emptyGates()) }),
  });
  assert.equal(code, 2);
  assert.match(stderr, /P0/);
});

test('full 槽 P0 已过：编辑放行 exit 0', () => {
  const gates = emptyGates();
  gates.P0 = 'ts';
  const { code } = run('edit_file', { path: SRC_FILE }, {
    state: reg('f', { f: slot('full', gates) }),
  });
  assert.equal(code, 0);
});

test('危险 bash 命令拦截 exit 2（full 槽）', () => {
  const gates = emptyGates();
  gates.P0 = 'ts';
  const { code } = run('bash', { command: 'rm -rf /tmp/x' }, {
    state: reg('f', { f: slot('full', gates) }),
  });
  assert.equal(code, 2);
});

test('workflow/ 内写入放行 exit 0', () => {
  const { code } = run('write_file', { path: WF_FILE }, {
    state: reg('f', { f: slot('full', emptyGates()) }),
  });
  assert.equal(code, 0);
});

// ── 多槽：门禁只跟随 current ──────────────────────────

test('多槽：current 槽 P0 未过 → 拦截，即使另一槽 P0 已过', () => {
  const g1 = emptyGates();
  g1.P0 = 'ts';
  const { code } = run('edit_file', { path: SRC_FILE }, {
    state: reg('b', { a: slot('full', g1), b: slot('full', emptyGates()) }),
  });
  assert.equal(code, 2);
});

test('多槽：switch 后 current 为 P0 已过槽 → 放行', () => {
  const g1 = emptyGates();
  g1.P0 = 'ts';
  const { code } = run('edit_file', { path: SRC_FILE }, {
    state: reg('a', { a: slot('full', g1), b: slot('full', emptyGates()) }),
  });
  assert.equal(code, 0);
});

// ── state.json 缺失/损坏回退 ──────────────────────────

test('state.json 损坏 + 有效备份(auto-skip)：编辑放行 exit 0', () => {
  const { code, stderr } = run('edit_file', { path: SRC_FILE }, {
    state: '{{{corrupted',
    bak: reg('t', { t: slot('auto-skip', emptyGates()) }),
  });
  assert.equal(code, 0);
  assert.match(stderr, /state\.bak\.json/);
});

test('state.json 缺失(ENOENT) + 编辑源码：exit 2（要求初始化）', () => {
  const { code, stderr } = run('edit_file', { path: SRC_FILE });
  assert.equal(code, 2);
  assert.match(stderr, /初始化/);
});

test('state.json 缺失 + 无备份 + 只读工具：exit 0', () => {
  const { code } = run('read_file', { path: SRC_FILE });
  assert.equal(code, 0);
});

// ── 损坏无备份：自愈通道矩阵 ──────────────────────────

const corruptedNoBackup = { state: '{{{corrupted' };

test('损坏无备份 + 只读工具(read_file)：放行 exit 0', () => {
  const { code } = run('read_file', { path: SRC_FILE }, corruptedNoBackup);
  assert.equal(code, 0);
});

test('损坏无备份 + 源码编辑：拦截 exit 2', () => {
  const { code } = run('edit_file', { path: SRC_FILE }, corruptedNoBackup);
  assert.equal(code, 2);
});

test('损坏无备份 + workflow/ 内写入：放行 exit 0', () => {
  const { code } = run('write_file', { path: WF_FILE }, corruptedNoBackup);
  assert.equal(code, 0);
});

test('损坏无备份 + 普通 bash：拦截 exit 2', () => {
  const { code } = run('bash', { command: 'cat package.json' }, corruptedNoBackup);
  assert.equal(code, 2);
});

test('损坏无备份 + 修复命令(harness:restore)：放行 exit 0', () => {
  const { code } = run(
    'bash',
    { command: 'pnpm -s run harness:restore' },
    corruptedNoBackup,
  );
  assert.equal(code, 0);
});

test('损坏无备份 + 修复命令(harness.mjs gate-reset)：放行 exit 0', () => {
  const { code } = run(
    'bash',
    { command: 'node scripts/harness.mjs gate-reset --type auto-skip --id x' },
    corruptedNoBackup,
  );
  assert.equal(code, 0);
});

// ── lib.cjs 归一化与 hooks 共享逻辑 ───────────────────

test('lib.cjs normalizeState 与 harness 语义一致（空对象 → 空 registry）', () => {
  assert.deepEqual(libNormalize({}), { current: '', slots: {} });
  const migrated = libNormalize({
    taskType: 'full',
    change: 'c1',
    gates: { P0: null, P1: null, P2: null, P3: null, DONE: null },
  });
  assert.equal(migrated.current, 'c1');
  assert.equal(migrated.slots.c1.taskType, 'full');
});
