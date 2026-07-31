@echo off
REM 小目标 · 启动脚本（Windows）
cd /d "%~dp0"
set PORT=3111
echo 🐤 正在启动小目标 (端口 %PORT%)...
node server.js --port %PORT%
pause
