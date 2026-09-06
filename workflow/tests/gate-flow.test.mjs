/**
 * Gate 推进自动证据校验（gate --phase）集成测试 — node:test
 *
 * 修复目标：gateCheck 只写时间戳不校验证据的协议漏洞——gate 推进前必须
 * 自动验证对应 Phase 产物（P0.md+TASKS.md / P1.md+TASKS.md / P2.md(allPassed)
 * / P3.md(userConfirmed) / P4.md(knowledgeDone)），证据缺失/占位符 → 拒绝推进。
 *
 * fixture 目录驱动真实 harness CLI（cwd 隔离），spawnSync 断言退出码，
 * 完全不影响真实 workflow/ 状态。运行：pnpm -s run harness:test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HARNESS = fileURLToPath(new URL('../../scripts/harness.mjs', import.meta.url));

const VALID_P0 = `# Evidence: P0
- runId: feat-t

## Scope (必填)
- allowedFiles:
  - apps/main-app/src/views/Foo.vue
- nonGoals:
  - 不改样式

## Risks (必填，≥1 条)
- 可能影响导出性能

## Tasks (可选)
- T-01: 加按钮 — 涉及文件: Foo.vue — 验证: typecheck

## Gate
- gateReady: YES
`;

const VALID_TASKS = `# Tasks: feat-t

## 1. Core

- [x] 1.1 加导出按钮
  - files: Foo.vue
  - verify: typecheck 通过
  - mapsTo: Risks

- [x] 1.2 接数据流
  - files: Foo.vue
  - verify: typecheck 通过
  - mapsTo: Scope
`;

const P2_TRUE = `# Evidence: P2

- runId: feat-t
- allPassed: true
- stoppedEarly: false
`;

const P2_FALSE = `# Evidence: P2

- runId: feat-t
- allPassed: false
- stoppedEarly: true
`;

function emptyGates() {
  return { P0: null, P1: null, P2: null, P3: null, DONE: null };
}

/** fixture 构造 + 跑 harness gate CLI。返回 {code,stdout,stderr,gatesAfter} */
function runGate(phase, { gates = emptyGates(), evidence = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wf-gateflow-'));
  try {
    const har = join(dir, 'workflow', 'harness');
    mkdirSync(har, { recursive: true });
    writeFileSync(
      join(har, 'state.json'),
      JSON.stringify({
        current: 'feat-t',
        slots: { 'feat-t': { taskType: 'full', change: 'feat-t', gates } },
      }),
    );
    const evDir = join(dir, 'workflow', 'evidence', 'feat-t');
    mkdirSync(evDir, { recursive: true });
    for (const [file, content] of Object.entries(evidence)) {
      writeFileSync(join(evDir, file), content);
    }
    const res = spawnSync(process.execPath, [HARNESS, 'gate', '--phase', phase], {
      cwd: dir,
      encoding: 'utf8',
    });
    const after = JSON.parse(
      readFileSync(join(har, 'state.json'), 'utf8'),
    );
    return {
      code: res.status,
      stdout: res.stdout,
      stderr: res.stderr,
      gates: after.slots['feat-t'].gates,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── P0 ─────────────────────────────────────────────────

test('gate p0：无 P0.md 证据 → 拒绝推进 exit 1', () => {
  const { code, stderr } = runGate('p0');
  assert.equal(code, 1);
  assert.match(stderr, /证据校验未通过/);
});

test('gate p0：P0.md 占位符（gateReady: TODO）→ 拒绝', () => {
  const { code } = runGate('p0', {
    evidence: {
      'P0.md': VALID_P0.replace('gateReady: YES', 'gateReady: TODO'),
      'TASKS.md': VALID_TASKS,
    },
  });
  assert.equal(code, 1);
});

test('gate p0：有 P0.md 但缺 TASKS.md → 拒绝', () => {
  const { code } = runGate('p0', { evidence: { 'P0.md': VALID_P0 } });
  assert.equal(code, 1);
});

test('gate p0：合法 P0.md + TASKS.md → 通过并写入 gates.P0', () => {
  const { code, stdout, gates } = runGate('p0', {
    evidence: { 'P0.md': VALID_P0, 'TASKS.md': VALID_TASKS },
  });
  assert.equal(code, 0);
  assert.match(stdout, /\[GATE:P0\] ✅/);
  assert.ok(gates.P0);
});

// ── P1 ─────────────────────────────────────────────────

test('gate p1：P0 已过但无 P1.md → 拒绝', () => {
  const g = emptyGates();
  g.P0 = 'ts';
  const { code } = runGate('p1', {
    gates: g,
    evidence: { 'P0.md': VALID_P0, 'TASKS.md': VALID_TASKS },
  });
  assert.equal(code, 1);
});

test('gate p1：P0 未过 → 序列校验先行拦截', () => {
  const { code, stderr } = runGate('p1');
  assert.equal(code, 1);
  assert.match(stderr, /序列校验失败/);
});

// ── P2 ─────────────────────────────────────────────────

test('gate p2：P2.md allPassed=false → 拒绝', () => {
  const g = emptyGates();
  g.P0 = 'ts';
  g.P1 = 'ts';
  const { code, stderr } = runGate('p2', {
    gates: g,
    evidence: { 'P2.md': P2_FALSE },
  });
  assert.equal(code, 1);
  assert.match(stderr, /allPassed/);
});

test('gate p2：P2.md allPassed=true → 通过', () => {
  const g = emptyGates();
  g.P0 = 'ts';
  g.P1 = 'ts';
  const { code, stdout, gates } = runGate('p2', {
    gates: g,
    evidence: { 'P2.md': P2_TRUE },
  });
  assert.equal(code, 0);
  assert.match(stdout, /\[GATE:P2\] ✅/);
  assert.ok(gates.P2);
});
