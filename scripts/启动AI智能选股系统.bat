@echo off
chcp 65001 >nul
echo.
echo ===== AI 智能选股系统 =====
echo.

echo [1] Starting AI Stock Dashboard (port 4000) ...
cd /d "C:\Users\XIAOMI\Desktop\ai_stock"
start "AI-Stock" python app.py

echo [2] Starting Health Monitor (port 3998) ...
cd /d "C:\Users\XIAOMI\Desktop\ai_stock\health"
start "Health-Monitor" python health_monitor.py

timeout /t 3 /nobreak >nul

echo [3] Opening dashboards ...
start "" "http://localhost:4000"
start "" "http://localhost:3998"

echo.
echo    AI Stock:    http://localhost:4000
echo    Health:      http://localhost:3998
echo.
pause
