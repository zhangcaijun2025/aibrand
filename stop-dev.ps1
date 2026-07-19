# stop-dev.ps1 — AiBrand Studio 开发环境一键停止 (v2)
# 特性：优雅关闭 + 资源清理 + 日志

$ErrorActionPreference = "Continue"

$logDir = "$env:USERPROFILE\.aibrand\logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$logFile = Join-Path $logDir "shutdown-$(Get-Date -Format 'yyyy-MM-dd').log"

function Write-Log {
    param([string]$msg, [string]$level = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss.fff"
    "$timestamp [$level] $msg" | Out-File -Append -FilePath $logFile -Encoding utf8
    Write-Host $msg
}

Write-Log "╔══════════════════════════════════════╗"
Write-Log "║   AiBrand Studio — 停止开发环境      ║"
Write-Log "╚══════════════════════════════════════╝"

# ── 1. Next.js Dev Server ──
Write-Log "[1/4] Next.js Dev Server..." -level "INFO"
$nextProcs = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    try { $_.CommandLine -match "next dev" } catch { $false }
}
if ($nextProcs) {
    $nextProcs | ForEach-Object {
        Write-Log "  停止 PID $($_.Id)..." -level "INFO"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep 2
    Write-Log "  Next.js 已停止" -level "INFO"
} else {
    Write-Log "  Next.js 未在运行" -level "INFO"
}

# Kill any remaining processes on port 3099
$portPid = netstat -ano 2>$null | Select-String ":3099.*LISTENING" | ForEach-Object {
    ($_ -split '\s+')[-1]
}
if ($portPid) {
    Write-Log "  清理端口 3099 (PID $portPid)..." -level "INFO"
    Stop-Process -Id $portPid -Force -ErrorAction SilentlyContinue
}

# ── 2. Dify ──
Write-Log "[2/4] Dify AI 平台..." -level "INFO"
$difyDir = "C:\Users\XIAOMI\dify"
if (Test-Path $difyDir) {
    Set-Location $difyDir
    docker compose stop 2>&1 | Out-File -Append $logFile
    Write-Log "  Dify 已停止" -level "INFO"
} else {
    Write-Log "  Dify 目录不存在, 跳过" -level "INFO"
}

# ── 3. 主 Docker Compose (graceful stop) ──
Write-Log "[3/4] Docker Compose 主服务..." -level "INFO"
Set-Location D:\king2046
docker compose stop 2>&1 | Out-File -Append $logFile
Write-Log "  Docker Compose 服务已停止" -level "INFO"

# ── 4. Docker Desktop (optional) ──
Write-Log "[4/4] Docker Desktop — 保持运行" -level "INFO"

# ══════════════════════════════════════
Write-Log ""
Write-Log "  所有服务已停止" -level "INFO"
Write-Log "  日志: $logFile"
Write-Log ""

Start-Sleep -Seconds 3
