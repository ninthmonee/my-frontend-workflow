#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * lib.cjs — Hooks 共享工具函数（v5 配置驱动）
 *
 * 所有 hook 脚本共享：
 * - resolveConfigSync(): 读取 workflow.config.json（缺省回退内置默认值）
 * - resolveState(): 读取状态 + TASKS + 推断 Phase
 * - 危险命令检查 / Gate 图标
 *
 * 配置查找顺序：$WORKFLOW_CONFIG → <cwd>/workflow.config.json → 内置默认值
 */

const fs = require('node:fs');
const path = require('node:path');

// ── 默认配置（与 engine/harness.mjs 保持一致） ────────────
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

// ── taskType 常量 ────────────────────────────────────────
// 活跃流程 (需完整门禁)
const ACTIVE_TYPES = ['full', 'mandatory', 'hotfix'];
// 跳过流程 (门禁全放行)
const SKIP_TYPES = ['auto-skip', 'user-skip'];

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

/**
 * 读取配置（同步版本，供 hooks 使用）
 */
function resolveConfigSync(cwd) {
  const candidates = [];
  if (process.env.WORKFLOW_CONFIG) {
    candidates.push(path.resolve(process.env.WORKFLOW_CONFIG));
  }
  candidates.push(path.resolve(cwd, 'workflow.config.json'));
  let fileConfig = {};
  for (const candidate of candidates) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      break;
    } catch {
      // 继续尝试下一个候选
    }
  }
  return deepMerge(DEFAULT_CONFIG, fileConfig);
}

/**
 * 由配置解析实际路径（绝对路径）
 */
function configPaths(config) {
  return {
    workflowDir: path.resolve(config.workflowDir),
    statePath: path.resolve(config.stateFile),
    evidenceDir: path.resolve(config.evidenceDir),
    skillsDir: path.resolve(config.skillsDir),
    infraFiles: (config.infraFiles ?? []).map((f) => path.resolve(f)),
  };
}

/**
 * 核心状态解析：读取 state.json + TASKS 未完成项 + 推断 Phase
 */
function resolveState() {
  const config = resolveConfigSync(process.cwd());
  const paths = configPaths(config);

  /** @type {object} */
  const result = {
    state: null,
    changeName: '',
    pendingTasks: '',
    phase: null,
    taskType: '',
    riskFlags: [],
    config,
    paths,
    coreConstraints:
      config.coreConstraints ||
      '🔒 核心约束: 最小改动 | 不猜 API 先查 skill | 证据优先 | 验证通过才算完成',
  };

  try {
    result.state = JSON.parse(
      fs.readFileSync(paths.statePath, 'utf8'),
    );
    result.taskType = result.state.taskType || '';
    result.changeName = result.state.change || '';
  } catch (error) {
    // ENOENT — 无活跃流程（正常）
    if (error.code === 'ENOENT') return result;
    // JSON 解析失败 — state.json 损坏
    result.riskFlags.push('⚠️ state.json 损坏，请运行 harness:gate-reset 重置');
    return result;
  }

  // 读取 TASKS 未完成项
  if (result.changeName) {
    try {
      const tasksPath = path.join(
        paths.evidenceDir,
        result.changeName,
        'TASKS.md',
      );
      const content = fs.readFileSync(tasksPath, 'utf8');
      const pending = content
        .split('\n')
        .filter((l) => l.match(/^\s*- \[ \]/))
        .map((l) => l.replace(/^\s*- \[ \] /, '').trim());
      result.pendingTasks =
        pending.length > 0
          ? `待完成: ${pending.slice(0, 3).join(' | ')}${pending.length > 3 ? ` ...共${pending.length}项` : ''}`
          : '所有任务已完成';
    } catch {
      /* TASKS 文件不存在 */
    }
  }

  // 推断当前 Phase
  const gates = result.state.gates || {};
  const gateOk = (g) =>
    !!(g && (g.status === 'passed' || typeof g === 'string' || g.timestamp));
  if (!gateOk(gates.P0)) result.phase = 0;
  else if (!gateOk(gates.P1)) result.phase = 1;
  else if (!gateOk(gates.P2)) result.phase = 2;
  else if (!gateOk(gates.P3)) result.phase = 3;
  else if (gateOk(gates.DONE)) {
    result.phase = 5;
  } else {
    result.phase = 4; // P3 passed, DONE pending
  }

  // P2 收敛中标记（含轮次）
  if (
    result.state.p2FailedKeys &&
    result.state.p2FailedKeys.length > 0 &&
    result.phase === 2
  ) {
    const round = result.state.p2ConvergenceRound || '?';
    result.riskFlags.push(
      `⚠️ P2 收敛第 ${round} 轮, 待修复: ${result.state.p2FailedKeys.join(', ')}`,
    );
  }

  return result;
}

// ── Gate 图标 ────────────────────────────────────────────
function gateIcon(g) {
  if (!g) return '⬜';
  const ok = g.status === 'passed' || typeof g === 'string' || g.timestamp;
  return ok ? '✅' : '⬜';
}

// ── 诊断: 验证 cwd 正确 ──────────────────────────────────
function diagnoseCwd() {
  try {
    const raw = fs.readFileSync(path.resolve('package.json'), 'utf8');
    JSON.parse(raw);
    return '';
  } catch {
    return '\n⚠️ cwd 可能不正确，hooks 可能未生效。请在项目根目录启动宿主。\n';
  }
}

// ── 危险命令检查 ─────────────────────────────────────────
const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\b/,
  /\bgit\s+push\s+(?:\S.*)?--force\b/,
  /\bgit\s+push\s+(?:\S.*)?-f\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bfind\b.*\b-delete\b/,
  /\bchmod\s+777\b/,
  /\bchmod\s+-R\s+777\b/,
];

function findDangerousCommand(cmd) {
  for (const p of DANGEROUS_PATTERNS) {
    if (p.test(cmd)) return p;
  }
  return null;
}

module.exports = {
  DEFAULT_CONFIG,
  ACTIVE_TYPES,
  SKIP_TYPES,
  resolveConfigSync,
  configPaths,
  resolveState,
  gateIcon,
  diagnoseCwd,
  DANGEROUS_PATTERNS,
  findDangerousCommand,
};
