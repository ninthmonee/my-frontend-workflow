#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable n/prefer-global/process */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * session-end.cjs — SessionEnd Hook: 工作流提醒 + 清理
 *
 * 接收 payload: { event, cwd }
 * - 检查工作流是否完成 → 完成则确认，未完成则输出提醒到 stderr
 * - 仅在流程 DONE 时清理临时文件
 */

const fs = require('node:fs');
const path = require('node:path');

const { ACTIVE_TYPES, resolveState } = require('./lib.cjs');

const ctx = resolveState();
if (!ctx.state || !ACTIVE_TYPES.includes(ctx.taskType)) {
  process.exit(0);
}

const name = ctx.changeName || '未命名';

if (ctx.phase >= 5) {
  console.log(`✅ 工作流 [${name}] 完成。`);
} else {
  console.log(
    `⚠️ 工作流 [${name}] 尚未完成 (Phase ${ctx.phase}/4)。下次打开此会话将自动恢复。`,
  );
}

// ── 仅在 DONE 时清理临时文件 ──────────────────────────
if (ctx.phase >= 5) {
  const harnessDir = path.resolve('workflow/harness');
  for (const f of ['last-check-errors.txt']) {
    try {
      fs.unlinkSync(path.resolve(`${harnessDir}/${f}`));
    } catch {}
  }
}

process.exit(0);
