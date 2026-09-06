#!/usr/bin/env node
/**
 * install.mjs — workflow-kit 一键安装器（零第三方依赖，Node >= 18）
 *
 * 用法:
 *   node install.mjs --target <项目目录>                 # 交互式问答
 *   node install.mjs --yes --target <项目目录>           # 全部默认值
 *   node install.mjs --config <config.json> --target <目录>  # 用现成适配器配置
 *
 * 安装内容:
 *   1. scripts/harness.mjs                    — Gate 状态机
 *   2. workflow/hooks/*                       — 运行时 hooks（Reasonix 等）
 *   3. <skillsDir>/*                          — 通用 skills（占位符替换为真实值）
 *   4. workflow.config.json                   — 项目适配配置
 *   5. package.json 追加 harness:* scripts
 *   6. .reasonix/settings.json（Reasonix 宿主）
 *   7. workflow.md / AGENTS.md（缺失时从模板生成）
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = path.resolve(__dirname);

const HARNESS_SCRIPTS = {
  'harness:start': 'node ./scripts/harness.mjs start',
  'harness:p0': 'node ./scripts/harness.mjs p0',
  'harness:tasks': 'node ./scripts/harness.mjs tasks',
  'harness:p1': 'node ./scripts/harness.mjs p1',
  'harness:p2': 'node ./scripts/harness.mjs p2',
  'harness:p3': 'node ./scripts/harness.mjs p3',
  'harness:p4': 'node ./scripts/harness.mjs p4',
  'harness:skip': 'node ./scripts/harness.mjs skip',
  'harness:tweak': 'node ./scripts/harness.mjs tweak',
  'harness:gate': 'node ./scripts/harness.mjs gate',
  'harness:approve': 'node ./scripts/harness.mjs approve',
  'harness:gate-reset': 'node ./scripts/harness.mjs gate-reset',
  'harness:gate-verify': 'node ./scripts/harness.mjs gate-verify',
  'harness:restore': 'node ./scripts/harness.mjs restore',
  'harness:gc': 'node ./scripts/harness.mjs gc',
  'harness:switch': 'node ./scripts/harness.mjs switch',
  'harness:list': 'node ./scripts/harness.mjs list',
  'harness:drop': 'node ./scripts/harness.mjs drop',
};

const DEFAULT_SKILL_KEYS = [
  'workflow',
  'task-worker',
  'p2-verifier',
  'pipeline-guard',
  'ponytail-ladder',
  'verification-before-completion',
  'compound-engineering',
];

function parseArgs(argv) {
  const flags = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags.set(key, next);
        i += 1;
      } else {
        flags.set(key, 'true');
      }
    }
  }
  return flags;
}

function log(step, msg) {
  console.log(`  ${step} ${msg}`);
}

function ask(rl, question, def) {
  return new Promise((resolvePromise) => {
    rl.question(`${question} [${def}]: `, (ans) => {
      resolvePromise(ans.trim() || def);
    });
  });
}

function tokenize(text, tokens) {
  let out = String(text);
  for (const [key, value] of Object.entries(tokens)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function copyTreeWithTokens(src, dest, tokens) {
  fs.mkdirSync(dest, { recursive: true });
  for (const file of walk(src)) {
    const rel = path.relative(src, file);
    const target = path.join(dest, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const content = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(target, tokenize(content, tokens), 'utf8');
  }
}

function makeConfigFromAnswers(a) {
  const full = a.fullScripts
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const keyByIndex = ['build', 'format', 'lint', 'typecheck'];
  const verifyFull = full.map((script, i) => ({
    key: keyByIndex[i] ?? `check${i + 1}`,
    script,
  }));
  const lintEnabled = full.includes('lint');
  return {
    schemaVersion: 1,
    language: a.language,
    packageManager: a.pm,
    workflowDir: a.workflowDir,
    stateFile: a.stateFile,
    evidenceDir: a.evidenceDir,
    skillsDir: a.skillsDir,
    infraFiles: [
      'AGENTS.md',
      'REASONIX.md',
      'workflow.md',
      'scripts/harness.mjs',
      'workflow.config.json',
    ],
    maxConvergenceRounds: 3,
    verify: {
      lintEnabled,
      full: verifyFull,
      tweak: [{ key: 'typecheck', script: a.tweakScript }],
    },
  };
}

function mergePackageScripts(pkgPath, scripts) {
  let pkg = {};
  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch (error) {
      console.warn(`  ⚠️ 无法解析 ${pkgPath}（${error.message}），将新建 scripts 字段`);
      pkg = {};
    }
  }
  pkg.scripts = { ...(pkg.scripts ?? {}) };
  let added = 0;
  for (const [name, cmd] of Object.entries(scripts)) {
    if (!(name in pkg.scripts)) {
      pkg.scripts[name] = cmd;
      added += 1;
    }
  }
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return added;
}

function writeSettingsJson(target, workflowDir) {
  const hooks = [
    ['SessionStart', 'session-init.cjs', 3000],
    ['UserPromptSubmit', 'prompt-check.cjs', 2000],
    ['PreToolUse', 'gate-guard.cjs', 3000],
    ['PostToolUse', 'evidence-collector.cjs', 3000],
    ['PreCompact', 'compact-guard.cjs', 2000],
    ['SessionEnd', 'session-end.cjs', 3000],
  ];
  const settings = {
    hooks: Object.fromEntries(
      hooks.map(([event, script, timeout]) => [
        event,
        [
          {
            command: `sh ${workflowDir}/hooks/node-shim.sh ${workflowDir}/hooks/${script}`,
            timeout,
          },
        ],
      ]),
    ),
  };
  const settingsPath = path.join(target, '.reasonix', 'settings.json');
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return settingsPath;
}

function printHelp() {
  console.log(`workflow-kit install.mjs

Usage:
  node install.mjs [--target <dir>] [--yes] [--config <path>]

Flags:
  --target <dir>     安装目标目录（默认当前目录）
  --yes              跳过提问，使用默认值
  --config <path>    使用现成适配器配置（跳过提问，保留原文件）
  --help             显示本帮助`);
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.get('help')) {
    printHelp();
    return;
  }

  const target = path.resolve(flags.get('target') ?? process.cwd());
  const useConfig = flags.get('config');
  const yes = flags.get('yes') === 'true';

  // ── 收集答案 ───────────────────────────────────────────
  let answers;
  if (useConfig) {
    const cfgPath = path.resolve(useConfig);
    let cfg;
    try {
      cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    } catch (error) {
      console.error(`❌ 无法读取配置 ${cfgPath}: ${error.message}`);
      process.exit(1);
    }
    const tweakScript =
      cfg.verify?.tweak?.[0]?.script ??
      cfg.verify?.tweak?.[0]?.key ??
      'check:type';
    answers = {
      pm: cfg.packageManager ?? 'pnpm',
      language: cfg.language ?? 'zh-CN',
      workflowDir: cfg.workflowDir ?? 'workflow',
      stateFile: cfg.stateFile ?? 'workflow/harness/state.json',
      evidenceDir: cfg.evidenceDir ?? 'workflow/evidence',
      skillsDir: cfg.skillsDir ?? '.reasonix/skills',
      fullScripts: (cfg.verify?.full ?? [])
        .map((c) => c.script ?? c.key)
        .join(','),
      tweakScript,
      host: cfg.host ?? 'reasonix',
      domainSkills: cfg.domainSkills ?? '（按项目技术栈填写）',
    };
    log('📦', `使用适配器配置: ${cfgPath}`);
  } else if (yes) {
    answers = {
      pm: 'pnpm',
      language: 'zh-CN',
      workflowDir: 'workflow',
      stateFile: 'workflow/harness/state.json',
      evidenceDir: 'workflow/evidence',
      skillsDir: '.reasonix/skills',
      fullScripts: 'build,format,lint,check:type',
      tweakScript: 'check:type',
      host: 'reasonix',
      domainSkills: '（按项目技术栈填写）',
    };
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      answers = {
        pm: await ask(rl, '包管理器 (pnpm/npm/yarn/bun)?', 'pnpm'),
        language: await ask(rl, '语言 (zh-CN/en)?', 'zh-CN'),
        workflowDir: await ask(rl, '工作流目录?', 'workflow'),
        stateFile: await ask(rl, '状态文件路径?', 'workflow/harness/state.json'),
        evidenceDir: await ask(rl, '证据目录?', 'workflow/evidence'),
        skillsDir: await ask(rl, 'skill 库目录?', '.reasonix/skills'),
        fullScripts: await ask(
          rl,
          'FULL 验证脚本（逗号分隔，依次为 build/format/lint/typecheck）?',
          'build,format,lint,check:type',
        ),
        tweakScript: await ask(rl, 'TWEAK 验证脚本?', 'check:type'),
        host: await ask(rl, '宿主 (reasonix/none)?', 'reasonix'),
        domainSkills: await ask(rl, '领域 skill 路由表内容?', '（按项目技术栈填写）'),
      };
    } finally {
      rl.close();
    }
  }

  // ── 执行安装 ───────────────────────────────────────────
  console.log(`\n🚀 开始安装 workflow-kit → ${target}\n`);

  const tokens = {
    PM: answers.pm,
    LANGUAGE: answers.language,
    WORKFLOW_DIR: answers.workflowDir,
    STATE_FILE: answers.stateFile,
    EVIDENCE_DIR: answers.evidenceDir,
    SKILLS_DIR: answers.skillsDir,
    TWEAK_SCRIPT: answers.tweakScript,
    DOMAIN_SKILLS: answers.domainSkills,
    HOST: answers.host,
  };

  // 1. harness + hooks
  const scriptsDir = path.join(target, 'scripts');
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.copyFileSync(
    path.join(KIT_ROOT, 'engine', 'harness.mjs'),
    path.join(scriptsDir, 'harness.mjs'),
  );
  log('✅', `scripts/harness.mjs`);

  const hooksDest = path.join(target, answers.workflowDir, 'hooks');
  copyTreeWithTokens(path.join(KIT_ROOT, 'engine', 'hooks'), hooksDest, tokens);
  log('✅', `${answers.workflowDir}/hooks/ (${fs.readdirSync(hooksDest).length} 个文件)`);

  // 2. 通用 skills
  const skillsDest = path.join(target, answers.skillsDir);
  for (const key of DEFAULT_SKILL_KEYS) {
    const src = path.join(KIT_ROOT, 'engine', 'skills', key);
    if (fs.existsSync(src)) {
      copyTreeWithTokens(src, path.join(skillsDest, key), tokens);
    }
  }
  // compound-engineering 机制脚手架
  const ceRef = path.join(skillsDest, 'compound-engineering', 'references');
  const experiencesFile = path.join(ceRef, 'experiences.md');
  if (!fs.existsSync(experiencesFile)) {
    fs.mkdirSync(path.dirname(experiencesFile), { recursive: true });
    fs.writeFileSync(
      experiencesFile,
      `# 经验库汇总入口\n\n> 由 compound-engineering 流程维护：每个 domain 一个文件，链接见 INDEX.md。\n`,
      'utf8',
    );
  }
  log('✅', `${answers.skillsDir}/ (通用 skills: ${DEFAULT_SKILL_KEYS.join(', ')})`);

  // 3. 配置文件
  const config = useConfig
    ? JSON.parse(fs.readFileSync(path.resolve(useConfig), 'utf8'))
    : makeConfigFromAnswers(answers);
  const configPath = path.join(target, 'workflow.config.json');
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  log('✅', 'workflow.config.json');

  // 4. package.json scripts
  const pkgPath = path.join(target, 'package.json');
  const added = fs.existsSync(pkgPath)
    ? mergePackageScripts(pkgPath, HARNESS_SCRIPTS)
    : (() => {
        fs.writeFileSync(
          pkgPath,
          `${JSON.stringify({ name: 'workflow-kit-app', scripts: HARNESS_SCRIPTS }, null, 2)}\n`,
          'utf8',
        );
        return Object.keys(HARNESS_SCRIPTS).length;
      })();
  log('✅', `package.json 追加 ${added} 个 harness:* scripts`);

  // 5. Reasonix hooks 注册
  if (answers.host === 'reasonix') {
    const settingsPath = writeSettingsJson(target, answers.workflowDir);
    log('✅', `.reasonix/settings.json → ${settingsPath}`);
    log('ℹ️', 'Reasonix 首次使用需执行 /hooks trust 并重启桌面端');
  } else {
    log('ℹ️', '宿主=none：使用 AGENTS.md 纪律模式（无物理门禁）');
  }

  // 6. 文档
  const wfDoc = path.join(target, 'workflow.md');
  if (!fs.existsSync(wfDoc)) {
    fs.copyFileSync(
      path.join(KIT_ROOT, 'docs', 'workflow.template.md'),
      wfDoc,
    );
    const content = fs.readFileSync(wfDoc, 'utf8');
    fs.writeFileSync(wfDoc, tokenize(content, tokens), 'utf8');
    log('✅', 'workflow.md（模板生成）');
  } else {
    log('ℹ️', 'workflow.md 已存在，跳过');
  }

  const agentsDoc = path.join(target, 'AGENTS.md');
  if (!fs.existsSync(agentsDoc)) {
    fs.copyFileSync(
      path.join(KIT_ROOT, 'docs', 'AGENTS.template.md'),
      agentsDoc,
    );
    const content = fs.readFileSync(agentsDoc, 'utf8');
    fs.writeFileSync(agentsDoc, tokenize(content, tokens), 'utf8');
    log('✅', 'AGENTS.md（模板生成）');
  } else {
    log('ℹ️', 'AGENTS.md 已存在：请手动把「自动触发/入口判断/Phase 协议」合并进去（模板见 docs/AGENTS.template.md）');
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 安装完成：${target}

下一步：
  1. （Reasonix）执行 /hooks trust 并重启桌面端
  2. 运行验证: node ${answers.workflowDir}/hooks/verify.cjs
  3. 向 Agent 提一个真实需求，验证自动判断走 FULL/TWEAK
  4. 领域路由表填好后，把项目专属 skill 放进 ${answers.skillsDir}/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch((error) => {
  console.error(`❌ ${String(error?.stack ?? error)}`);
  process.exit(1);
});
