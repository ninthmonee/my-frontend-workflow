#!/usr/bin/env node

/* eslint-disable n/prefer-global/process */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * gate-guard.cjs — PreToolUse Hook: DevFlow 门禁阻断
 *
 * 接收 payload: { event, cwd, toolName, toolArgs }
 * - taskType 为 auto-skip/user-skip → 放行 (exit 0)
 * - state.json 不存在 → 放行
 * - taskType 为 full/mandatory/hotfix + 编辑工具 + P0 未过 → exit 2
 * - 危险 bash 命令 → exit 2
 * - 写入 .devflow/ 下 → 放行
 */

const fs = require('node:fs');
const path = require('node:path');

const {
  SKIP_TYPES,
  ACTIVE_TYPES,
  gateIcon,
  findDangerousCommand,
} = require('./lib.cjs');

const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const toolName = payload.toolName || '';
const toolArgs = payload.toolArgs || {};

// ── 读取 state.json ──────────────────────────────────────
let state;
try {
  state = JSON.parse(
    fs.readFileSync(path.resolve('.devflow/harness/state.json'), 'utf8'),
  );
} catch (error) {
  // ENOENT — 无活跃流程（正常）
  if (error.code === 'ENOENT') process.exit(0);
  // JSON 解析失败 — state.json 损坏 → block
  process.stderr.write(
    '⚠️ state.json 损坏，无法判定流程门禁状态。\n请运行 pnpm -s run harness:gate-reset -- --type full 修复。',
  );
  process.exit(2);
}

const taskType = state.taskType || '';

// TWEAK / 跳过 → 放行
if (SKIP_TYPES.includes(taskType)) process.exit(0);

const editTools = [
  'edit_file',
  'write_file',
  'multi_edit',
  'delete_range',
  'move_file',
];

// ── 编辑工具: P0 检查 ────────────────────────────────────
if (editTools.includes(toolName)) {
  const targetPath = toolArgs.path || toolArgs.source_path || '';
  const resolved = targetPath ? path.resolve(targetPath) : '';

  // .devflow/ 证据文件 → 放行
  if (resolved.startsWith(path.resolve('.devflow'))) process.exit(0);

  // 非 active type → 放行
  if (!ACTIVE_TYPES.includes(taskType)) process.exit(0);

  // P0 Gate 检查（gateIcon 同时处理对象和裸字符串 timestamp）
  const p0 = state.gates && state.gates.P0;
  if (gateIcon(p0) !== '✅') {
    process.stderr.write(
      '❌ P0 门禁未通过，请先完成改前准备 (Phase 0)。\n使用 /devflow full <change-name> 启动完整流程。',
    );
    process.exit(2);
  }
}

// ── bash 危险命令检查 ────────────────────────────────────
if (toolName === 'bash') {
  const cmd = toolArgs.command || '';
  if (findDangerousCommand(cmd)) {
    process.stderr.write('⚠️ 检测到危险命令。请确认此操作的必要性后重试。');
    process.exit(2);
  }
}

process.exit(0);
