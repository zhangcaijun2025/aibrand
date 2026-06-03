@echo off
REM Evolution Engine — AiBrand 自愈系统
REM 端口: 4030 | 五步闭环: Observe→Diagnose→Decide→Act→Learn

cd /d D:\king2046\project\evolution-engine

echo === Evolution Engine ===
echo   Port: 4030
echo   Docs: http://localhost:4030/docs

pip install -q fastapi uvicorn pydantic requests 2>nul

set CLAUDE_BRIDGE=http://localhost:4020
set LANGCHAIN_BRIDGE=http://localhost:4010
set DIFY_BASE=http://localhost:5001
set EVOLUTION_PORT=4030

python -m uvicorn app:app --host 0.0.0.0 --port 4030 --reload
