# AiBrand Studio - Auto Startup Script
# Run at Windows login to start all AiBrand services
# Version: 2026-06-13

$ErrorActionPreference = "Continue"
$LogFile = "$env:USERPROFILE\.aibrand\startup.log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Ensure log directory
$LogDir = Split-Path $LogFile -Parent
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Log($msg) {
    $line = "[$Timestamp] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

Log "===== AiBrand Startup Begin ====="

# ── 1. Wait for Docker Desktop ──
Log "[1/3] Waiting for Docker Desktop..."
$MaxWait = 120
$Waited = 0
while ($Waited -lt $MaxWait) {
    $info = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Log "  Docker is ready (waited ${Waited}s)"
        break
    }
    Start-Sleep -Seconds 5
    $Waited += 5
}
if ($Waited -ge $MaxWait) {
    Log "  ERROR: Docker Desktop not available after ${MaxWait}s. Exiting."
    exit 1
}

# ── 2. Start Docker Compose services ──
Log "[2/3] Starting Docker services..."
Set-Location D:\king2046
docker compose up -d 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Log "  WARN: docker compose had issues, but may already be running"
} else {
    Log "  Docker services started"
}

# ── 3. Start Next.js Dev Server ──
Log "[3/3] Starting Next.js dev server on port 3099..."

# Check if already running
$existing = netstat -ano 2>$null | Select-String ":3099.*LISTENING"
if ($existing) {
    Log "  Port 3099 already in use, skipping frontend start"
} else {
    Set-Location D:\king2046\project\aibrand-studio
    $ProcessInfo = Start-Process -FilePath "pnpm" -ArgumentList "exec next dev --port 3099" -WindowStyle Minimized -PassThru
    Log "  Next.js dev server started (PID: $($ProcessInfo.Id))"
}

Log "===== AiBrand Startup Complete ====="
Log "  Frontend: http://localhost:3099"
Log "  API:      http://localhost:8080"
Log "  LiteLLM:  http://localhost:4000"
