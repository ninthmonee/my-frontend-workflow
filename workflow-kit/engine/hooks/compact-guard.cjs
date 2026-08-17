#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable n/prefer-global/process */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * compact-guard.cjs — PreCompact Hook: 压缩时注入工作流核心上下文
 *
 * 接收 payload: { event, cwd, trigger }
 * stdout 会被 Reasonix 作为压缩摘要的额外指导使用。
 * 只对活跃工作流注入。
 */

const {
  ACTIVE_TYPES,
  resolveState,
  gateIcon,
} = require('./lib.cjs');

const ctx = resolveState();
if (!ctx.state || !ACTIVE_TYPES.includes(ctx.taskType)) {
  process.exit(0);
}

const gates = ctx.state.gates || {};
const lines = [
  `🔒 工作流压缩保护: ${ctx.changeName || '(未命名)'} | ${ctx.taskType} | Phase ${ctx.phase}`,
  `   Gate: P0${gateIcon(gates.P0)} P1${gateIcon(gates.P1)} P2${gateIcon(gates.P2)} P3${gateIcon(gates.P3)}`,
  ctx.pendingTasks ? `   ⏳ ${ctx.pendingTasks}` : '',
  ctx.riskFlags.length > 0 ? `   ${ctx.riskFlags.join(' | ')}` : '',
  `   ${ctx.coreConstraints}`,
]
  .filter(Boolean)
  .join('\n');

// PreCompact: stdout 直接作为压缩摘要的额外指导
console.log(lines);
process.exit(0);
