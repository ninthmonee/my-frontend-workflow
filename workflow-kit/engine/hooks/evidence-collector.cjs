#!/usr/bin/env node
/* eslint-disable n/prefer-global/process */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * evidence-collector.cjs — PostToolUse Hook: 验证结果自动捕获（v5 配置驱动）
 *
 * 接收 payload: { event, cwd, toolName, toolArgs, toolResult }
 * - bash 含验证命令（来自 workflow.config.json 的 verify 脚本）→
 *   失败时写 last-check-errors.txt，通过时清理
 */

const fs = require('node:fs');
const path = require('node:path');

const { resolveState } = require('./lib.cjs');

const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const toolName = payload.toolName || '';
const toolArgs = payload.toolArgs || {};

// 无活跃流程 → 不处理
const ctx = resolveState();
if (!ctx.state) process.exit(0);

const harnessDir = path.join(ctx.paths.workflowDir, 'harness');
const checks = [
  ...(ctx.config.verify?.full ?? []),
  ...(ctx.config.verify?.tweak ?? []),
];
const watchPatterns = new Set(
  checks
    .map((c) => String(c.script ?? c.key ?? '').replaceAll('{env}', 'dev'))
    .filter(Boolean),
);
watchPatterns.add('lint');

// ── 验证命令结果捕获 ─────────────────────────────────────
if (toolName === 'bash') {
  const cmd = toolArgs.command || '';
  const watched = [...watchPatterns].some((p) => cmd.includes(p));
  if (watched) {
    const errorsFile = path.resolve(`${harnessDir}/last-check-errors.txt`);

    // toolResult 可能是字符串（命令输出）或对象
    const result = payload.toolResult;
    // PostToolUse 下通过 toolResult 内容推断错误
    const hasError =
      typeof result === 'string' &&
      (result.includes('error') ||
        result.includes('Error') ||
        result.includes('✖'));

    if (hasError) {
      const summary = [
        `验证命令检测到错误`,
        `output:\n${String(result).slice(0, 2000)}`,
      ].join('\n');
      try {
        fs.mkdirSync(harnessDir, { recursive: true });
      } catch {}
      fs.writeFileSync(errorsFile, summary);
    } else {
      try {
        fs.unlinkSync(errorsFile);
      } catch {}
    }
  }
}

process.exit(0);
