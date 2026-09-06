#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * lib.cjs — Hooks 共享工具函数
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

// ── 状态文件路径 ─────────────────────────────────────────
const STATE_BAK_PATH = path.resolve('workflow/harness/state.bak.json');
const STATE_BAK_1_PATH = path.resolve('workflow/harness/state.bak.1.json');

/**
 * 读取状态备份（多代回退：state.bak.json → state.bak.1.json）。
 * 不存在/损坏返回 null。供 state.json 缺失/损坏时回退判定使用
 * （不写回，修复请用 harness:restore）。
 */
function readBackupState() {
  for (const bakPath of [STATE_BAK_PATH, STATE_BAK_1_PATH]) {
    try {
      const parsed = JSON.parse(fs.readFileSync(bakPath, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* 尝试下一代备份 */
    }
  }
  return null;
}

/**
 * 多槽位状态模型归一化（与 scripts/harness.mjs 中逻辑保持一致）。
 *
 * 新格式: { current: <slotId>, slots: { "<slotId>": { taskType, gates, ... } } }
 * 旧格式（v4 单槽）: { taskType, gates, change?, lastRunId?, ... }
 * → 迁移为单槽 registry；新格式 → 保证 current 有效。
 */
function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') raw = {};
  if (raw.slots && typeof raw.slots === 'object') {
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

// ── 核心函数: 读取工作流状态 ────────────────────────────
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

  // 读取 state.json（registry）并聚焦 current 槽
  const useSlot = (registry, fromBackup) => {
    const norm = normalizeState(registry);
    const slot = norm.slots?.[norm.current];
    if (!slot) return null;
    result.state = slot;
    result.taskType = slot.taskType || '';
    result.changeName = slot.change || '';
    if (fromBackup) {
      result.riskFlags.push(
        '⚠️ state.json 缺失/损坏，已临时使用 state.bak.json 判定。请运行 pnpm -s run harness:restore 修复。',
      );
    }
    const slotCount = Object.keys(norm.slots).length;
    if (slotCount > 1) {
      result.riskFlags.push(`📌 当前任务: ${norm.current}（另有 ${slotCount - 1} 个任务挂起，pnpm -s run harness:list 查看）`);
    }
    return slot;
  };

  try {
    const parsed = JSON.parse(
      fs.readFileSync(path.resolve('workflow/harness/state.json'), 'utf8'),
    );
    if (parsed && typeof parsed === 'object' && useSlot(parsed, false)) {
      /* 正常路径 */
    } else {
      // state.json 存在但无有效槽位（空 registry）
      return result;
    }
  } catch (error) {
    // state.json 缺失/损坏 → 尝试用备份判定（误删或损坏场景的自愈兜底）
    const backup = readBackupState();
    if (backup && useSlot(backup, true)) {
      return result;
    }
    // 无备份
    if (error.code === 'ENOENT') {
      // ENOENT + 无备份 — 从未初始化（正常）
      return result;
    }
    // 损坏 + 无备份
    result.riskFlags.push('⚠️ state.json 损坏且无备份，请运行 harness:gate-reset 重置');
    return result;
  }

  // 读取 TASKS 未完成项
  if (result.changeName) {
    try {
      const tasksPath = path.resolve(
        `workflow/evidence/${result.changeName}/TASKS.md`,
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
  readBackupState,
  normalizeState,
};
