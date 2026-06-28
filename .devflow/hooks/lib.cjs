#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * lib.js — DevFlow Hooks 共享工具函数
 *
 * 被所有 hook 脚本引用，消除重复代码。
 * 用法: const { getState, gateIcon, ACTIVE_TYPES, SKIP_TYPES, resolveState } = require('./lib');
 */

const fs = require('node:fs');
const path = require('node:path');

// ── taskType 常量 ────────────────────────────────────────
// 活跃流程 (需完整门禁)
const ACTIVE_TYPES = ['full', 'mandatory', 'hotfix'];
// 跳过流程 (门禁全放行)
const SKIP_TYPES = ['auto-skip', 'user-skip'];

// ── 核心约束文本 (SessionStart / PreCompact 共享) ────────
const CORE_CONSTRAINTS =
  '🔒 核心约束: 最小改动 | antdv-next≠ant-design-vue | 零测试 | 不猜API先查skill | 证据优先';

// ── 核心函数: 读取 DevFlow 状态 ────────────────────────────
function resolveState() {
  /** @type {{ state: object|null, changeName: string, pendingTasks: string, phase: number|null, taskType: string }} */
  const result = {
    state: null,
    changeName: '',
    pendingTasks: '',
    phase: null,
    taskType: '',
    riskFlags: [],
  };

  // 读取 state.json
  try {
    result.state = JSON.parse(
      fs.readFileSync(path.resolve('.devflow/harness/state.json'), 'utf8'),
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
      const tasksPath = path.resolve(
        `.devflow/evidence/${result.changeName}/TASKS.md`,
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
    return '\n⚠️ cwd 可能不正确，hooks 可能未生效。请在项目根目录启动 Reasonix。\n';
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
  ACTIVE_TYPES,
  SKIP_TYPES,
  resolveState,
  gateIcon,
  diagnoseCwd,
  DANGEROUS_PATTERNS,
  CORE_CONSTRAINTS,
  findDangerousCommand,
};
