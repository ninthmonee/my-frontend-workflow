#!/bin/sh
# node-shim.sh — Reasonix Hooks Node.js 启动器
# Reasonix 的 sh -c 环境找不到 nvm 管理的 node，
# 本脚本按优先级查找 node 绝对路径并执行目标脚本。
#
# 用法: sh .devflow/hooks/node-shim.sh .devflow/hooks/gate-guard.cjs

TARGET="$1"
shift

# ── 按优先级查找 node ──
# 1. nvm 的 default 别名
if [ -s "$HOME/.nvm/alias/default" ]; then
  NODE_VER="$(cat "$HOME/.nvm/alias/default" 2>/dev/null)"
  NODE="$HOME/.nvm/versions/node/v$NODE_VER/bin/node"
  if [ -x "$NODE" ]; then exec "$NODE" "$TARGET" "$@"; fi
fi

# 2. nvm 最新版本号（倒序，优先用新版）
for d in $(ls -1dr "$HOME/.nvm/versions/node"/v*/bin/node 2>/dev/null); do
  if [ -x "$d" ]; then exec "$d" "$TARGET" "$@"; fi
done

# 3. 常见全局路径
for d in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
  if [ -x "$d" ]; then exec "$d" "$TARGET" "$@"; fi
done

# 4. 最后尝试 PATH（可能命中，也可能 127）
exec node "$TARGET" "$@"
