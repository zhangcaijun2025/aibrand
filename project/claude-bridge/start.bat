@echo off
REM Claude Code HTTP Bridge — 宿主机启动脚本
REM 端口: 4020 | 提供 /claude/execute, /claude/agent 等接口

cd /d D:\king2046\project\claude-bridge

echo.
echo === Claude Code HTTP Bridge ===
echo   Port: 4020
echo   Docs: http://localhost:4020/docs
echo   Project: D:\king2046
echo.

pip install -q fastapi uvicorn httpx pydantic requests 2>nul

set PROJECT_ROOT=D:\king2046
set CLAUDE_CLI=claude
set CLAUDE_BRIDGE_PORT=4020

python -m uvicorn app:app --host 0.0.0.0 --port 4020 --reload
