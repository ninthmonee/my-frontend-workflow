#!/usr/bin/env node

/* eslint-disable n/prefer-global/process */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * prompt-check.cjs — UserPromptSubmit Hook: 阻断跳过流程声明
 *
 * 接收 payload: { event, cwd, prompt, turn }
 * - 匹配跳过流程关键词 → exit 2 (阻断)
 * - 其余 → exit 0 (放行)
 *
 * 注意: UserPromptSubmit 的 stdout 不会注入到模型上下文，
 * 所以无法像之前设计的那样注入 DevFlow 状态前缀。
 * 状态注入改为依赖 SessionStart 时 AGENTS.md 的已有约束。
 */

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
      'DevFlow 规则不允许跳过流程。\n如确需跳过，请回复「确认跳过」触发跳过协议。',
    );
    process.exit(2);
  }
}

process.exit(0);
