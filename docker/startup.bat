@echo off
REM AiBrand Studio — 手动健康检查 & 恢复脚本
REM Docker Desktop 启动后自动拉起容器 (restart: unless-stopped)
REM Next.js dev server 由本脚本后台启动
REM Version: 2026-07-12 (fixed port, added backend health checks)

echo [%date% %time%] AiBrand 启动检查...

REM ── 1. 等待 Docker 就绪（最多等 60 秒）──
set TRIES=0
:wait_docker
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 goto docker_ready
timeout /t 3 /nobreak >nul
set /a TRIES+=1
if %TRIES% LSS 20 goto wait_docker
echo [WARN] Docker 未能在 60 秒内就绪，跳过容器检查
exit /b 1

:docker_ready
echo [OK] Docker 已就绪

REM ── 2. 确保关键容器全部运行 ──
set CONTAINERS=aibrand-redis aibrand-mongodb aibrand-rustfs aibrand-server aibrand-ai aibrand-nginx

for %%c in (%CONTAINERS%) do (
    docker ps --filter name=%%c --filter status=running --format "{{.Names}}" | findstr "%%c" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo [WARN] %%c 未运行，尝试启动...
        docker start %%c >nul 2>&1
    ) else (
        echo [OK] %%c 运行中
    )
)

REM ── 3. 等待后端就绪 ──
echo [INFO] 等待后端 API 就绪...
set TRIES2=0
:wait_api
timeout /t 3 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3002/health 2>nul | findstr "200" >nul
if %ERRORLEVEL% EQU 0 goto api_ok
set /a TRIES2+=1
if %TRIES2% LSS 10 goto wait_api
echo [WARN] 后端 API (port 3002) 未能在 30s 内就绪
goto skip_next

:api_ok
echo [OK] 后端 API 就绪

:skip_next
REM ── 4. 启动 Next.js 前端 (后台) ──
echo [INFO] 启动 Next.js dev server (port 3001)...
start "AiBrand-NextJS" /MIN cmd /c "cd /d D:\king2046\project\aibrand-studio && pnpm dev --port 3001 > D:\king2046\docker\logs\nextjs.log 2>&1"

REM ── 5. 最终验证 (nginx → Next.js) ──
echo [INFO] 等待前端就绪（最多 60s）...
set TRIES3=0
:wait_web
timeout /t 3 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3001/ 2>nul | findstr "200 301 302 307" >nul
if %ERRORLEVEL% EQU 0 goto web_ok
set /a TRIES3+=1
if %TRIES3% LSS 20 goto wait_web
echo [WARN] http://localhost:3001/ 未能在 60s 内就绪
goto done

:web_ok
echo [OK] 前端就绪 → http://localhost:3001/
echo [OK] 浏览器入口 → http://localhost:3099/

:done
echo [%date% %time%] AiBrand 启动检查完成
