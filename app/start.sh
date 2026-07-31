#!/bin/sh
# 小目标 · 启动脚本（macOS/Linux）
cd "$(dirname "$0")"
PORT="${1:-3111}"
echo "🐤 正在启动小目标 (端口 $PORT)..."
exec node server.js --port "$PORT"
