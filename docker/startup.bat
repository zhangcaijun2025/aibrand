@echo off
REM AiBrand Studio — 手动健康检查 & 恢复脚本
REM Docker Desktop 启动后自动拉起容器 (restart: unless-stopped)
REM Next.js dev server 由本脚本后台启动
REM Version: 2026-07-12 v2 (uses docker health checks)

echo [%date% %time%] AiBrand 启动检查...

REM ── 1. 等待 Docker 就绪（最多等 120 秒）──
set TRIES=0
:wait_docker
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 goto docker_ready
timeout /t 3 /nobreak >nul
set /a TRIES+=1
if %TRIES% LSS 40 goto wait_docker
echo [ERROR] Docker 未能在 120 秒内就绪，退出
exit /b 1

:docker_ready
echo [OK] Docker 已就绪

REM ── 2. 清理残留容器 + 启动所有服务 ──
echo [INFO] 清理残留容器...
docker rm -f aibrand-web aibrand-init aibrand-mongodb-rs-init aibrand-rustfs-init >nul 2>&1
docker compose down --remove-orphans --timeout 30 >nul 2>&1

echo [INFO] 启动 Docker Compose 服务...
docker compose up -d --remove-orphans

REM 等待容器初始化
timeout /t 10 /nobreak >nul

REM ── 3. 检查关键容器 ──
set CONTAINERS=aibrand-redis aibrand-mongodb aibrand-rustfs aibrand-server aibrand-ai aibrand-nginx
for %%c in (%CONTAINERS%) do (
    docker ps --filter name=%%c --filter status=running --format "{{.Names}}" | findstr "%%c" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo [WARN] %%c 未运行
    ) else (
        echo [OK] %%c 运行中
    )
)

REM ── 4. 等待后端就绪（HTTP + Docker health 双重检查）──
echo [INFO] 等待后端就绪...

REM 等待 aibrand-server (HTTP)
set TRIES2=0
:wait_api
timeout /t 3 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3002/health 2>nul | findstr "200" >nul
if %ERRORLEVEL% EQU 0 goto api_ok
set /a TRIES2+=1
if %TRIES2% LSS 20 goto wait_api
echo [WARN] aibrand-server HTTP health (port 3002) 超时，检查 Docker health...
docker inspect --format="{{.State.Health.Status}}" aibrand-server 2>nul | findstr "healthy" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] aibrand-server Docker health 正常
) else (
    echo [ERROR] aibrand-server 不健康！请运行: docker compose logs aibrand-server
)

:api_ok
if %TRIES2% LSS 20 echo [OK] 后端 API 就绪 (port 3002)

REM 等待 aibrand-ai (HTTP on port 3011)
echo [INFO] 等待 AI 服务就绪...
set TRIES4=0
:wait_ai
timeout /t 3 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:3011/health 2>nul | findstr "200" >nul
if %ERRORLEVEL% EQU 0 goto ai_ok
set /a TRIES4+=1
if %TRIES4% LSS 15 goto wait_ai
echo [WARN] aibrand-ai HTTP health (port 3011) 超时，检查 Docker health...
docker inspect --format="{{.State.Health.Status}}" aibrand-ai 2>nul | findstr "healthy" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] aibrand-ai Docker health 正常
) else (
    echo [ERROR] aibrand-ai 不健康！请运行: docker compose logs aibrand-ai
)

:ai_ok
if %TRIES4% LSS 15 echo [OK] AI 服务就绪 (port 3011)

REM ── 5. 启动 Next.js 前端 ──
echo [INFO] 启动 Next.js dev server (port 3001)...

REM 先杀旧进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001.*LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
    echo [INFO] 终止旧 Next.js 进程 (PID: %%a)
)

start "AiBrand-NextJS" /MIN cmd /c "cd /d D:\king2046\project\aibrand-studio && pnpm dev --port 3001 > D:\king2046\docker\logs\nextjs.log 2>&1"

REM ── 6. 最终验证 ──
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
echo [OK] nginx 入口 → http://localhost:3099/

:done
echo [%date% %time%] AiBrand 启动检查完成
