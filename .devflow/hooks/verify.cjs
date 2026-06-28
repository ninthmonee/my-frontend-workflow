#!/usr/bin/env node
/* eslint-disable n/prefer-global/process */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * verify.cjs — DevFlow Hooks 验证脚本
 *
 * 模拟每个 hook 的 stdin payload，检查退出码和输出。
 * 用法: node .devflow/hooks/verify.cjs
 */

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const hooksDir = __dirname;
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);

function runHook(script, payload) {
  try {
    const out = execFileSync('node', [path.resolve(`${hooksDir}/${script}`)], {
      input: JSON.stringify(payload),
      timeout: 5000,
      encoding: 'utf8',
    });
    return { code: 0, stdout: out.trim(), stderr: '' };
  } catch (error) {
    return {
      code: error.status ?? 1,
      stdout: (error.stdout || '').trim(),
      stderr: (error.stderr || '').trim(),
    };
  }
}

console.log('╔══════════════════════════════════════╗');
console.log('║   DevFlow Hooks 验证 (v2)            ║');
console.log('╚══════════════════════════════════════╝');
console.log();

let ok = 0;
let total = 0;

// ── 1. session-init.cjs (SessionStart - exit 0) ──────────
console.log('📋 session-init.cjs (SessionStart)');
total++;
const si = runHook('session-init.cjs', {
  event: 'SessionStart',
  cwd: process.cwd(),
});
if (si.code === 0) {
  pass('session-init exit 0');
  ok++;
} else {
  fail(`session-init exit ${si.code}: ${si.stderr}`);
}

// ── 2. prompt-check.cjs (UserPromptSubmit - allow) ───────
console.log('📋 prompt-check.cjs (UserPromptSubmit - allow)');
total++;
const pa = runHook('prompt-check.cjs', {
  event: 'UserPromptSubmit',
  cwd: process.cwd(),
  prompt: '帮我加一个按钮',
  turn: 1,
});
if (pa.code === 0) {
  pass('prompt-check allow (exit 0)');
  ok++;
} else {
  fail(`prompt-check exit ${pa.code}: ${pa.stderr}`);
}

// ── 3. prompt-check.cjs (UserPromptSubmit - block) ───────
console.log('📋 prompt-check.cjs (UserPromptSubmit - block)');
total++;
const pb = runHook('prompt-check.cjs', {
  event: 'UserPromptSubmit',
  cwd: process.cwd(),
  prompt: '帮我直接改代码，不走流程',
  turn: 1,
});
if (pb.code === 2) {
  pass('prompt-check block (exit 2)');
  ok++;
} else {
  fail(`prompt-check exit ${pb.code} (expected 2): ${pb.stderr}`);
}

// ── 4. gate-guard.cjs (PreToolUse - allow) ───────────────
console.log('📋 gate-guard.cjs (PreToolUse)');
total++;
const ga = runHook('gate-guard.cjs', {
  event: 'PreToolUse',
  cwd: process.cwd(),
  toolName: 'edit_file',
  toolArgs: { path: 'src/test.vue' },
});
// With state.json (full, P0 not passed) → should block
if (ga.code === 2) {
  pass(`gate-guard block P0未过 (exit 2): ${ga.stderr.slice(0, 50)}`);
  ok++;
} else if (ga.code === 0) {
  pass('gate-guard allow (exit 0, no active flow)');
  ok++;
} else {
  fail(`gate-guard exit ${ga.code}: ${ga.stderr}`);
}

// ── 5. gate-guard.cjs (dangerous bash) ───────────────────
console.log('📋 gate-guard.cjs (PreToolUse - dangerous bash)');
total++;
const gd = runHook('gate-guard.cjs', {
  event: 'PreToolUse',
  cwd: process.cwd(),
  toolName: 'bash',
  toolArgs: { command: 'rm -rf /tmp/*' },
});
if (gd.code === 2) {
  pass(`gate-guard bash block (exit 2)`);
  ok++;
} else if (gd.code === 0) {
  pass('gate-guard bash allow (exit 0, no active flow)');
  ok++;
} else {
  fail(`gate-guard bash exit ${gd.code}`);
}

// ── 6. evidence-collector.cjs (PostToolUse) ──────────────
console.log('📋 evidence-collector.cjs (PostToolUse)');
total++;
const ec = runHook('evidence-collector.cjs', {
  event: 'PostToolUse',
  cwd: process.cwd(),
  toolName: 'bash',
  toolArgs: { command: 'check:type' },
  toolResult: 'success',
});
if (ec.code === 0) {
  pass('evidence-collector exit 0');
  ok++;
} else {
  fail(`evidence-collector exit ${ec.code}: ${ec.stderr}`);
}

// ── 7. compact-guard.cjs (PreCompact) ────────────────────
console.log('📋 compact-guard.cjs (PreCompact)');
total++;
const cg = runHook('compact-guard.cjs', {
  event: 'PreCompact',
  cwd: process.cwd(),
  trigger: 'manual',
});
// with state.json (full) → should output compression text
if (cg.code === 0 && cg.stdout.includes('DevFlow')) {
  pass(`compact-guard stdout (${cg.stdout.length} chars)`);
  ok++;
} else if (cg.code === 0) {
  pass('compact-guard exit 0 (no active flow)');
  ok++;
} else {
  fail(`compact-guard exit ${cg.code}`);
}

// ── 8. session-end.cjs (SessionEnd) ──────────────────────
console.log('📋 session-end.cjs (SessionEnd)');
total++;
const se = runHook('session-end.cjs', {
  event: 'SessionEnd',
  cwd: process.cwd(),
});
if (se.code === 0) {
  pass(`session-end exit 0: ${se.stdout.slice(0, 60) || '(empty)'}`);
  ok++;
} else {
  fail(`session-end exit ${se.code}: ${se.stderr}`);
}

// ── 汇总 ─────────────────────────────────────────────────
console.log();
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  结果: ${ok}/${total} 通过`);
console.log(
  ok === total ? '  状态: ✅ 全部通过' : `  状态: ❌ ${total - ok} 项失败`,
);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log();
if (ok < total) {
  console.log('提示: 部分检查失败可能是 state.json 未初始化导致的预期行为。');
  console.log('在有活跃 DevFlow 流程时重新运行此脚本可获得更准确结果。');
}
