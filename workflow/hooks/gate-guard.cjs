#!/usr/bin/env node

/* eslint-disable n/prefer-global/process */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * gate-guard.cjs — PreToolUse Hook: 工作流门禁阻断
 *
 * 接收 payload: { event, cwd, toolName, toolArgs }
 * - state.json 不存在/损坏 + 存在有效备份 → 用备份 (state.bak.json/.bak.1.json) 判定并提示修复
 * - state.json 不存在（无备份） + 编辑源代码文件 → exit 2（必须先初始化工作流）
 * - state.json 损坏（无备份） → 只读工具 / workflow/ 内写入 / harness:restore|gate-reset
 *   修复命令放行（自愈通道），修改类工具 exit 2
 * - taskType 为 auto-skip/user-skip → 编辑放行
 * - taskType 为 full/mandatory/hotfix + 编辑工具 + P0 未过 → exit 2
 * - 危险 bash 命令 → exit 2
 * - 写入 workflow/ 下 → 放行
 *
 * fail-open 策略：hook 自身异常（代码 bug / lib 缺失 / stdin 非法）时放行并显著告警，
 * 避免"门禁脚本崩溃导致用户被锁死"。状态类判定（损坏无备份等）仍按语义拦截。
 */

// fail-open：自身异常绝不锁死用户（须在 require/主逻辑之前注册）
process.on('uncaughtException', (error) => {
  process.stderr.write(
    `⚠️ gate-guard 自身异常（fail-open 放行）: ${String(error?.message ?? error)}\n`,
  );
  process.exit(0);
});

const fs = require('node:fs');
const path = require('node:path');

const {
  SKIP_TYPES,
  ACTIVE_TYPES,
  gateIcon,
  findDangerousCommand,
  readBackupState,
  normalizeState,
} = require('./lib.cjs');

const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const toolName = payload.toolName || '';
const toolArgs = payload.toolArgs || {};

// 只读/无副作用工具：state.json 损坏无备份时放行（避免 Agent 连读文件、求助都被锁死）
const READ_ONLY_TOOLS = [
  'read_file',
  'grep',
  'ls',
  'bash_output',
  'wait',
  'ask',
  'todo_write',
];
// 修复命令：损坏时允许跑 restore / gate-reset 让 Agent 自愈
const REPAIR_CMD_RE = /(harness\.mjs\s+(restore|gate-reset)|harness:(restore|gate-reset))/;
const editTools = [
  'edit_file',
  'write_file',
  'multi_edit',
  'delete_range',
  'move_file',
];

// ── 读取 state.json（registry）并聚焦 current 槽 ───────
let raw = null;
let hasState = false;
try {
  raw = JSON.parse(
    fs.readFileSync(path.resolve('workflow/harness/state.json'), 'utf8'),
  );
  hasState = true;
} catch (error) {
  // state.json 缺失/损坏 → 尝试用备份 (state.bak.json) 判定，避免误伤源码编辑
  const backup = readBackupState();
  if (backup) {
    raw = backup;
    hasState = true;
    process.stderr.write(
      '⚠️ state.json 缺失/损坏，已临时使用 state.bak.json 判定。\n请运行 pnpm -s run harness:restore 修复。\n',
    );
  } else if (error.code !== 'ENOENT') {
    // JSON 解析失败 + 无备份 — state.json 损坏
    // ── 自愈通道：只读工具 / workflow 目录写入 / 修复命令 放行 ──
    if (READ_ONLY_TOOLS.includes(toolName)) {
      process.stderr.write(
        '⚠️ state.json 损坏且无备份（只读工具放行）。\n请运行 pnpm -s run harness:restore 或 harness:gate-reset 修复。\n',
      );
      process.exit(0);
    }
    if (toolName === 'bash' && REPAIR_CMD_RE.test(toolArgs.command || '')) {
      process.stderr.write(
        '⚠️ state.json 损坏且无备份（修复命令放行，正在执行自愈）。\n',
      );
      process.exit(0);
    }
    if (editTools.includes(toolName)) {
      const targetPath = toolArgs.path || toolArgs.source_path || '';
      const resolved = targetPath ? path.resolve(targetPath) : '';
      if (resolved && resolved.startsWith(path.resolve('workflow'))) {
        process.stderr.write(
          '⚠️ state.json 损坏且无备份（workflow/ 内写入放行，用于修复状态或写证据）。\n',
        );
        process.exit(0);
      }
    }
    process.stderr.write(
      '⚠️ state.json 损坏且无备份，无法判定流程门禁状态。\n请运行 pnpm -s run harness:gate-reset -- --type full 修复。',
    );
    process.exit(2);
  }
  // ENOENT + 无备份 → 保持 hasState=false（未初始化 → 编辑被拦要求先初始化）
}

// 归一化 registry，取出当前槽位作为判定依据（门禁只跟随 current 槽）
let state = null;
if (hasState && raw && typeof raw === 'object') {
  const registry = normalizeState(raw);
  state = registry.slots?.[registry.current] ?? null;
  if (!state && Object.keys(registry.slots).length === 0) hasState = false;
}

const taskType = (state && state.taskType) || '';

// ── 编辑工具: 多级门禁 ────────────────────────────────────
if (editTools.includes(toolName)) {
  const targetPath = toolArgs.path || toolArgs.source_path || '';
  const resolved = targetPath ? path.resolve(targetPath) : '';

  // workflow/ 证据文件 → 放行
  if (resolved.startsWith(path.resolve('workflow'))) process.exit(0);

  // TWEAK / 跳过类型 → 编辑放行（bash 危险命令检查仍在下方执行，不随跳过流程豁免）
  if (SKIP_TYPES.includes(taskType)) process.exit(0);

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
