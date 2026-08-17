#!/usr/bin/env node

/* eslint-disable n/prefer-global/process */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * prompt-check.cjs — UserPromptSubmit Hook: 阻断跳过流程声明
 *
 * 接收 payload: { event, cwd, prompt, turn }
 * - 无活跃工作流 → 放行（无流程可跳过）
 * - 有活跃工作流 + 跳过关键词 → exit 2 (阻断)
 * - 其余 → exit 0 (放行)
 */

const { resolveState } = require('./lib.cjs');

const ctx = resolveState();

// 无活跃工作流 → 放行（没东西可跳）
if (!ctx.state) process.exit(0);

// 已完成或跳过类型 → 放行
const taskType = ctx.state.taskType || '';
const gates = ctx.state.gates || {};
if (gates.DONE || !['full', 'hotfix', 'mandatory'].includes(taskType)) {
  process.exit(0);
}

const fs = require('node:fs');

const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const prompt = (payload.prompt || '').toLowerCase();

const skipPatterns = [
  /不走流程/,
  /跳过流程/,
  /直接改/,
  /不用管规则/,
  /帮我改就行/,
  /别管那个/,
  /忽略\s*(agents|规则|流程)/,
];

for (const pattern of skipPatterns) {
  if (pattern.test(prompt)) {
    process.stderr.write(
      '工作流规则不允许跳过流程。\n如确需跳过，请回复「确认跳过」触发跳过协议。',
    );
    process.exit(2);
  }
}

process.exit(0);
