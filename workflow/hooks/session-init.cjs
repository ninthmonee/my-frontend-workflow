#!/usr/bin/env node

/* eslint-disable n/prefer-global/process */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * session-init.cjs — SessionStart Hook: 工作流诊断
 *
 * SessionStart 的 stdout 不会注入模型上下文（仅 PreCompact/PostLLMCall 有此能力）。
 * 本 hook 仅做诊断——cwd 验证 + state.json 损坏检测，异常时输出到 stderr。
 * 状态恢复依赖 AGENTS.md 协议 + Agent 主动读取 state.json。
 */

const { resolveState, diagnoseCwd } = require('./lib.cjs');

const diag = diagnoseCwd();
if (diag) process.stderr.write(diag);

const ctx = resolveState();
if (ctx.riskFlags.length > 0) {
  process.stderr.write(`${ctx.riskFlags.join('\n')}\n`);
}

process.exit(0);
