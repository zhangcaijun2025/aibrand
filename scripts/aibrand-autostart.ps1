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

# 2.6 启动 OpenClaw Host Bridge (Agent 联邦: 容器经 18792 调宿主机 OpenClaw Gateway, 获得宿主机操作能力)
$ocBridgeProc = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { try { $_.CommandLine -match 'openclaw-host-bridge' } catch {} }
if (-not $ocBridgeProc) {
    $ocBridgeScript = "D:\king2046\scripts\openclaw-host-bridge.mjs"
    if (Test-Path $ocBridgeScript) {
        try {
            Start-Process "C:\nodejs-v24.18.0\node.exe" -ArgumentList "`"$ocBridgeScript`"" -WindowStyle Hidden
            Write-Log "OpenClaw Host Bridge start requested"
        } catch {
            Write-Log "OpenClaw Host Bridge start FAILED: $($_.Exception.Message)"
        }
    } else {
        Write-Log "OpenClaw Host Bridge script not found: $ocBridgeScript"
    }
} else {
    Write-Log "OpenClaw Host Bridge already running"
}

# 2.7 启动 Evolution Engine (系统自愈引擎 :4030 — Phase 1: 持久化 MongoDB + stats 端点)
$evoListening = Get-NetTCPConnection -LocalPort 4030 -State Listen -ErrorAction SilentlyContinue
if (-not $evoListening) {
    $evoDir = "D:\king2046\project\evolution-engine"
    if (Test-Path (Join-Path $evoDir "app.py")) {
        try {
            # Dify 数据集凭据从环境变量继承 (不硬编码, 避免泄露)
            Start-Process "C:\Python314\python.exe" -ArgumentList "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4030" -WorkingDirectory $evoDir -WindowStyle Hidden
            Write-Log "Evolution Engine start requested (:4030)"
        } catch {
            Write-Log "Evolution Engine start FAILED: $($_.Exception.Message)"
        }
    } else {
        Write-Log "Evolution Engine app.py not found: $evoDir"
    }
} else {
    Write-Log "Evolution Engine already running (:4030)"
}

# 2.8 启动 Claude Code Bridge (自愈执行引擎 :4020 — heal 自动修复依赖)
$claudeListening = Get-NetTCPConnection -LocalPort 4020 -State Listen -ErrorAction SilentlyContinue
if (-not $claudeListening) {
    $claudeDir = "D:\king2046\project\claude-bridge"
    if (Test-Path (Join-Path $claudeDir "app.py")) {
        try {
            $env:PROJECT_ROOT = "D:\king2046"
            $env:CLAUDE_CLI = "claude"
            $env:CLAUDE_BRIDGE_PORT = "4020"
            Start-Process "C:\Python314\python.exe" -ArgumentList "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "4020" -WorkingDirectory $claudeDir -WindowStyle Hidden
            Write-Log "Claude Code Bridge start requested (:4020)"
        } catch {
            Write-Log "Claude Code Bridge start FAILED: $($_.Exception.Message)"
        }
    } else {
        Write-Log "Claude Code Bridge app.py not found: $claudeDir"
    }
} else {
    Write-Log "Claude Code Bridge already running (:4020)"
}

# 2.9 启动 ComfyUI 本地生成引擎 (宿主 :8188, DirectML)
# 独立于 Docker, 先于 compose 拉起 (首次加载 SD1.5 模型需要时间)
$comfyListening = Get-NetTCPConnection -LocalPort 8188 -State Listen -ErrorAction SilentlyContinue
if (-not $comfyListening) {
    $comfyScript = "D:\king2046\scripts\start-comfyui.ps1"
    if (Test-Path $comfyScript) {
        try {
            Start-Process "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$comfyScript`"" -WindowStyle Hidden
            Write-Log "ComfyUI start requested (:8188)"
        } catch {
            Write-Log "ComfyUI start FAILED: $($_.Exception.Message)"
        }
    } else {
        Write-Log "ComfyUI start script not found: $comfyScript"
    }
} else {
    Write-Log "ComfyUI already running (:8188)"
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
