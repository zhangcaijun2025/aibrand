# start-dev.ps1 — AiBrand Studio 开发环境一键启动 (v2)
# 用法：右键 → "使用 PowerShell 运行" 或添加到 Windows 启动文件夹
# 特性：健康检查 + 重试 + 启动日志 + 优雅超时

$ErrorActionPreference = "Continue"
$host.UI.RawUI.WindowTitle = "AiBrand Studio — 启动中..."

$startTime = Get-Date
$logDir = "$env:USERPROFILE\.aibrand\logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$logFile = Join-Path $logDir "startup-$(Get-Date -Format 'yyyy-MM-dd').log"

function Write-Log {
    param([string]$msg, [string]$level = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss.fff"
    "$timestamp [$level] $msg" | Out-File -Append -FilePath $logFile -Encoding utf8
    if ($level -eq "ERROR") { Write-Host $msg -ForegroundColor Red }
    elseif ($level -eq "WARN") { Write-Host $msg -ForegroundColor Yellow }
    else { Write-Host $msg }
}

function Test-Health {
    param([string]$url, [int]$timeoutSec = 30)
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $res = Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            if ($res.StatusCode -eq 200) { return $true }
        } catch { Start-Sleep 2 }
    }
    return $false
}

# ══════════════════════════════════════
Write-Log "╔══════════════════════════════════════╗"
Write-Log "║   AiBrand Studio v2 — 开发环境启动   ║"
Write-Log "╚══════════════════════════════════════╝"
Write-Log "日志: $logFile"

# ── 1. Docker Desktop ──
Write-Log "[1/5] Docker Desktop..." -level "INFO"
$dockerProc = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $dockerProc) {
    Write-Log "  启动 Docker Desktop..." -level "INFO"
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Log "  等待 Docker Engine (最多 120s)..." -level "INFO"
    $timeout = 120
    while ($timeout -gt 0) {
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { break }
        Start-Sleep 3; $timeout -= 3
    }
    if ($timeout -le 0) {
        Write-Log "  Docker 启动超时!" -level "ERROR"
        pause; exit 1
    }
    Write-Log "  Docker Engine 就绪" -level "INFO"
} else {
    Write-Log "  Docker Desktop 已运行" -level "INFO"
}

# ── 2. Docker Compose 主服务 ──
Write-Log "[2/5] Docker Compose 主服务..." -level "INFO"
Set-Location D:\king2046
$running = docker ps --format "{{.Names}}" 2>$null | Select-String "aibrand-web"
if (-not $running) {
    docker compose up -d 2>&1 | Out-File -Append $logFile
    if ($LASTEXITCODE -ne 0) {
        Write-Log "  docker compose up 失败!" -level "ERROR"
    } else {
        Write-Log "  等待服务就绪..." -level "INFO"
        # Health check: wait for aibrand-web healthy
        $healthy = $false
        for ($i = 0; $i -lt 30; $i++) {
            $status = docker inspect aibrand-web --format='{{.State.Health.Status}}' 2>$null
            if ($status -eq "healthy") { $healthy = $true; break }
            Start-Sleep 3
        }
        if ($healthy) {
            Write-Log "  aibrand-web healthy" -level "INFO"
        } else {
            Write-Log "  aibrand-web 健康检查超时 (非致命)" -level "WARN"
        }
    }
} else {
    Write-Log "  Docker Compose 服务已运行" -level "INFO"
}

# ── 3. Dify AI 平台 ──
Write-Log "[3/5] Dify AI 平台..." -level "INFO"
$difyDir = "C:\Users\XIAOMI\dify"
if (Test-Path $difyDir) {
    Set-Location $difyDir
    $difyRunning = docker ps --format "{{.Names}}" 2>$null | Select-String "dify-api"
    if (-not $difyRunning) {
        docker compose up -d 2>&1 | Out-File -Append $logFile
        Write-Log "  Dify 已启动" -level "INFO"
    } else {
        Write-Log "  Dify 已运行" -level "INFO"
    }
} else {
    Write-Log "  Dify 目录不存在, 跳过" -level "WARN"
}

# ── 4. Next.js Dev Server ──
Write-Log "[4/5] Next.js Dev Server (:3099)..." -level "INFO"
$projectDir = "D:\king2046\project\aibrand-studio"
Set-Location $projectDir

# Check if there's already a process on port 3099
$portCheck = netstat -ano 2>$null | Select-String ":3099.*LISTENING"
if ($portCheck) {
    Write-Log "  Port 3099 已被占用, 跳过启动" -level "WARN"
} else {
    # Check if compiled; if not, skip (don't block startup)
    $nextRunning = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "next dev" }
    if (-not $nextRunning) {
        Write-Log "  启动 Next.js Turbo..." -level "INFO"
        $pwshPath = (Get-Command powershell.exe).Source
        Start-Process $pwshPath -ArgumentList @(
            "-NoExit",
            "-Command",
            "Set-Location '$projectDir'; Write-Host 'AiBrand Next.js Dev Server' -ForegroundColor Cyan; npx next dev -p 3099"
        ) -WindowStyle Minimized
        Write-Log "  Next.js :3099 启动中 (窗口最小化)" -level "INFO"
    } else {
        Write-Log "  Next.js 已运行" -level "INFO"
    }
}

# ── 5. n8n Workflow Engine ──
Write-Log "[5/5] n8n (:5678)..." -level "INFO"
$n8nRunning = docker ps --format "{{.Names}}" 2>$null | Select-String "n8n"
if (-not $n8nRunning) {
    Write-Log "  n8n 未运行 (需要单独启动)" -level "WARN"
} else {
    Write-Log "  n8n 已运行" -level "INFO"
}

# ══════════════════════════════════════
Write-Log ""
Write-Log "╔══════════════════════════════════════╗"
Write-Log "║   AiBrand Studio 启动完成!           ║"
Write-Log "╚══════════════════════════════════════╝"
Write-Log "  Next.js : http://localhost:3099"
Write-Log "  API     : http://localhost:3002"
Write-Log "  n8n     : http://localhost:5678"
Write-Log "  Dify    : http://localhost:5001"
Write-Log "  Redis   : localhost:6379"
Write-Log "  耗时    : $((Get-Date) - $startTime)"
Write-Log "  日志    : $logFile"
Write-Log ""

# Wait for user to see output
Start-Sleep -Seconds 5
