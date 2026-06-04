@echo off
chcp 65001 >nul
echo.
echo ===== AI 工作台 · 全服务启动器 =====
echo.

echo [1/4] Starting AI 智能选股系统 (port 4000) ...
cd /d "C:\Users\XIAOMI\Desktop\ai_stock"
start "AI-Stock" python app.py

echo [2/4] Starting 健康监控器 (port 3998) ...
cd /d "C:\Users\XIAOMI\Desktop\ai_stock\health"
start "Health-Monitor" python health_monitor.py

echo [3/4] Starting AiToEarn 前端开发 (port 6060) ...
cd /d "C:\Users\XIAOMI\AiToEarn\project\aitoearn-web"
start "AiToEarn-Web" cmd /c "npm run dev"

echo [4/4] Opening dashboards ...
timeout /t 3 /nobreak >nul
start "" "http://localhost:4000"
start "" "http://localhost:3998"
start "" "http://localhost:6060/zh-CN"

echo.
echo  All services started.
echo    AI Stock:       http://localhost:4000
echo    Health Monitor: http://localhost:3998
echo    AiToEarn Web:   http://localhost:6060/zh-CN
echo    N8N:            http://localhost:5678
echo    Dify:           http://localhost:8082
echo.
