# ============================================================
# AiBrand 开机自启兜底脚本
# 作用: 开机/登录后确保 Docker Desktop 启动, 并拉起所有 aibrand 容器
# 由计划任务 "AiBrand-AutoStart" 触发 (登录时运行)
# ============================================================

$logFile = "D:\king2046\logs\aibrand-autostart.log"
$dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$composeFile = "D:\king2046\docker-compose.yml"

function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "[$ts] $msg"
}

Write-Log "=== AiBrand autostart begin ==="

# 1. 确保日志目录存在
$logDir = Split-Path $logFile -Parent
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

# 2. 启动 Docker Desktop (如果没在运行)
if (-not (Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue)) {
    Write-Log "Docker Desktop not running, starting..."
    Start-Process $dockerExe
    Write-Log "Docker Desktop start requested"
} else {
    Write-Log "Docker Desktop already running"
}

# 2.5 启动 Hermes Host Bridge (Agent 联邦: 容器经 18791 调宿主机 Hermes CLI)
$bridgeProc = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { try { $_.CommandLine -match 'hermes-host-bridge' } catch {} }
if (-not $bridgeProc) {
    $bridgeScript = "D:\king2046\scripts\hermes-host-bridge.mjs"
    if (Test-Path $bridgeScript) {
        try {
            Start-Process "C:\nodejs-v24.18.0\node.exe" -ArgumentList "`"$bridgeScript`"" -WindowStyle Hidden
            Write-Log "Hermes Host Bridge start requested"
        } catch {
            Write-Log "Hermes Host Bridge start FAILED: $($_.Exception.Message)"
        }
    } else {
        Write-Log "Hermes Host Bridge script not found: $bridgeScript"
    }
} else {
    Write-Log "Hermes Host Bridge already running"
}

# 3. 等待 Docker 引擎就绪 (最多 180 秒)
$engineReady = $false
for ($i = 0; $i -lt 36; $i++) {
    Start-Sleep -Seconds 5
    try {
        $ping = docker info 2>$null
        if ($LASTEXITCODE -eq 0) { $engineReady = $true; break }
    } catch {}
    Write-Log "Waiting for Docker engine... ($($i * 5)s)"
}
if ($engineReady) {
    Write-Log "Docker engine ready after $($i * 5)s"
} else {
    Write-Log "ERROR: Docker engine did not become ready in 180s"
}

# 4. 拉起全部 compose 服务 (restart: unless-stopped 的容器也会自动恢复)
if ($engineReady) {
    Write-Log "Running docker compose up -d..."
    Push-Location D:\king2046
    $output = docker compose -f $composeFile up -d 2>&1
    Pop-Location
    Write-Log "Compose up result: $LASTEXITCODE"
    $output | ForEach-Object { Write-Log "  $_" }

    # 5. 额外拉起 aibrand-studio compose 的基础服务 (postgres/astrbot)
    #    使用 --no-recreate: 已存在的容器保持原样, 只启动缺失的 (避免每次开机重建 postgres)
    Write-Log "Running studio compose up -d (--no-recreate)..."
    Push-Location D:\king2046\project\aibrand-studio
    $output2 = docker compose up -d --no-recreate 2>&1
    Pop-Location
    Write-Log "Studio compose up result: $LASTEXITCODE"
    $output2 | ForEach-Object { Write-Log "  $_" }
}

# 6. 健康验证 3099
if ($engineReady) {
    Start-Sleep -Seconds 20
    try {
        $health = Invoke-WebRequest -Uri "http://127.0.0.1:3099/api/health" -UseBasicParsing -TimeoutSec 15
        Write-Log "3099 health check: HTTP $($health.StatusCode)"
    } catch {
        Write-Log "3099 health check failed: $($_.Exception.Message)"
    }
}

Write-Log "=== AiBrand autostart end ==="
