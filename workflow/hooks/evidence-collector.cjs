#!/usr/bin/env node
/* eslint-disable n/prefer-global/process */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * evidence-collector.cjs — PostToolUse Hook: check:type/lint 结果自动捕获
 *
 * 接收 payload: { event, cwd, toolName, toolArgs, toolResult }
 * - bash 含 check:type / lint → 失败时写 last-check-errors.txt，通过时清理
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

const harnessDir = path.resolve('workflow/harness');

// ── check:type / lint 结果捕获 ──────────────────────────
if (toolName === 'bash') {
  const cmd = toolArgs.command || '';
  if (cmd.includes('check:type') || cmd.includes('lint')) {
    const errorsFile = path.resolve(`${harnessDir}/last-check-errors.txt`);

    // toolResult 可能是字符串（命令输出）或对象
    const result = payload.toolResult;
    // PostToolUse 下的 exitCode 需要通过 toolResult 推断
    // Reasonix 不直接传 exitCode，我们通过 stderr 内容判断
    const hasError =
      typeof result === 'string' &&
      (result.includes('error') ||
        result.includes('Error') ||
        result.includes('✖'));

    if (hasError) {
      const summary = [
        `check:type/lint 检测到错误`,
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
