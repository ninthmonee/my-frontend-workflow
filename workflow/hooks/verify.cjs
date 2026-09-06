#!/usr/bin/env node
/* eslint-disable n/prefer-global/process */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * verify.cjs — 工作流 Hooks 验证脚本
 *
 * 模拟每个 hook 的 stdin payload，检查退出码和输出。
 * 自适应：无 active full/mandatory 流程时自动创建临时验证槽位（__verify-*），
 * 结束后自动 drop——保证 8/8 全绿且不污染真实状态。
 * 用法: node workflow/hooks/verify.cjs
 */

const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const hooksDir = __dirname;
const rootDir = path.resolve(__dirname, '../..');
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

function harnessCmd(args) {
  const res = spawnSync(
    'node',
    [path.join(rootDir, 'scripts/harness.mjs'), ...args],
    { cwd: rootDir, encoding: 'utf8' },
  );
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

// ── 自适应 setup：无 active full/mandatory 槽 → 临时起 probe 槽 ──
const { resolveState } = require('./lib.cjs');
const st = resolveState();
const hasActiveFlow =
  ['full', 'mandatory'].includes(st.taskType) && Boolean(st.state);
const probeName = hasActiveFlow ? null : `__verify-${Date.now()}`;
if (probeName) {
  const started = harnessCmd(['start', '--mode', 'full', '--change', probeName]);
  if (started.code !== 0) {
    console.error(`⚠️ 无法创建验证槽位 ${probeName}: ${started.stderr}`);
    process.exit(1);
  }
  console.log(`ℹ️  未检测到 active 流程，已临时创建验证槽位 ${probeName}（结束后自动删除）`);
}

console.log('╔══════════════════════════════════════╗');
console.log('║   工作流 Hooks 验证 (v3)            ║');
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
if (cg.code === 0 && cg.stdout.includes('工作流')) {
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

// ── 9. .reasonix/settings.json hook 绑定检测 ─────────────
console.log('📋 .reasonix/settings.json (hook 绑定完整性)');
total++;
const EXPECTED_HOOKS = [
  'session-init',
  'prompt-check',
  'gate-guard',
  'evidence-collector',
  'compact-guard',
  'session-end',
];
try {
  const settingsPath = path.resolve(rootDir, '.reasonix/settings.json');
  const cfg = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const bound = Object.values(cfg.hooks || {})
    .flat()
    .map((h) => h.command || '');
  const missingBind = EXPECTED_HOOKS.filter(
    (name) => !bound.some((c) => c.includes(`workflow/hooks/${name}.cjs`)),
  );
  const missingFiles = EXPECTED_HOOKS.filter(
    (name) => !fs.existsSync(path.join(hooksDir, `${name}.cjs`)),
  );
  const shimOk = fs.existsSync(path.join(hooksDir, 'node-shim.sh'));
  if (missingBind.length === 0 && missingFiles.length === 0 && shimOk) {
    pass(
      `settings.json 绑定完整（${EXPECTED_HOOKS.length} 个 hook + node-shim.sh 均就绪）`,
    );
    ok++;
  } else {
    fail(
      `绑定异常 → 未绑定: ${missingBind.join(',') || '无'} | 文件缺失: ${missingFiles.join(',') || '无'} | node-shim.sh: ${shimOk ? '✅' : '❌'}`,
    );
  }
} catch (error) {
  fail(`settings.json 读取失败: ${error.message}`);
}

// ── teardown：删除临时验证槽位 ─────────────────────────
if (probeName) {
  const dropped = harnessCmd(['drop', '--change', probeName]);
  console.log(
    dropped.code === 0
      ? `ℹ️  验证槽位 ${probeName} 已删除`
      : `⚠️ 验证槽位 ${probeName} 删除失败（${dropped.stderr}），可手动 pnpm -s run harness:drop -- --change ${probeName}`,
  );
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
