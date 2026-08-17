#!/usr/bin/env node

/* eslint-disable n/prefer-global/process */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * gate-guard.cjs — PreToolUse Hook: 工作流门禁阻断
 *
 * 接收 payload: { event, cwd, toolName, toolArgs }
 * - state.json 不存在 + 编辑源代码文件 → exit 2（必须先初始化工作流）
 * - state.json 损坏 → exit 2
 * - taskType 为 auto-skip/user-skip → 编辑放行
 * - taskType 为 full/mandatory/hotfix + 编辑工具 + P0 未过 → exit 2
 * - 危险 bash 命令 → exit 2
 * - 写入 workflow/ 下 → 放行
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
let state = null;
let hasState = false;
try {
  state = JSON.parse(
    fs.readFileSync(path.resolve('workflow/harness/state.json'), 'utf8'),
  );
  hasState = true;
} catch (error) {
  // ENOENT — 无活跃流程，继续但不放行（编辑源代码文件时将被拦截）
  if (error.code !== 'ENOENT') {
    // JSON 解析失败 — state.json 损坏 → block
    process.stderr.write(
      '⚠️ state.json 损坏，无法判定流程门禁状态。\n请运行 pnpm -s run harness:gate-reset -- --type full 修复。',
    );
    process.exit(2);
  }
}

const taskType = (state && state.taskType) || '';

// TWEAK / 跳过类型 → 全局放行（不检查编辑工具）
if (SKIP_TYPES.includes(taskType)) process.exit(0);

const editTools = [
  'edit_file',
  'write_file',
  'multi_edit',
  'delete_range',
  'move_file',
];

// ── 编辑工具: 多级门禁 ────────────────────────────────────
if (editTools.includes(toolName)) {
  const targetPath = toolArgs.path || toolArgs.source_path || '';
  const resolved = targetPath ? path.resolve(targetPath) : '';

  // workflow/ 证据文件 → 放行
  if (resolved.startsWith(path.resolve('workflow'))) process.exit(0);

  // 工作流基础设施文件 → 放行（改工作流自身不走工作流）
  const workflowFiles = [
    path.resolve('REASONIX.md'),
    path.resolve('AGENTS.md'),
    path.resolve('workflow.md'),
    path.resolve('scripts/harness.mjs'),
  ];
  if (resolved && workflowFiles.includes(resolved)) process.exit(0);

  // .reasonix/skills/ 下 → 放行
  if (resolved.startsWith(path.resolve('.reasonix/skills'))) process.exit(0);

  // ① 无工作流状态 → 拦截：必须先初始化工作流
  if (!hasState) {
    process.stderr.write(
      '❌ 未检测到工作流状态。\n' +
        '请先进行入口判断并初始化工作流（微弱改动用 TWEAK，一般/复杂用 FULL）。\n' +
        '初始化命令: pnpm -s run harness:start -- --mode tweak --change <change>\n' +
        '或使用 /workflow 斜杠命令',
    );
    process.exit(2);
  }

  // ② 非 active type → 放行（兜底：未知 taskType 不拦截）
  if (!ACTIVE_TYPES.includes(taskType)) process.exit(0);

  // ③ P0 Gate 检查
  const p0 = state.gates && state.gates.P0;
  if (gateIcon(p0) !== '✅') {
    process.stderr.write('❌ P0 门禁未通过，请先完成改前准备 (Phase 0)。');
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
