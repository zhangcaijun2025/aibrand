# AiBrand Studio - Auto Startup Script
# Run at Windows login to start all AiBrand services
# Version: 2026-07-12 (hardened: health waits, error markers, proper logging)

$ErrorActionPreference = "Continue"
$LogFile = "$env:USERPROFILE\.aibrand\startup.log"
$ErrorFile = "$env:USERPROFILE\.aibrand\startup.error"
$LogDir = Split-Path $LogFile -Parent

# Ensure log + error directory
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
# Clear previous error marker
if (Test-Path $ErrorFile) { Remove-Item $ErrorFile -Force }

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

function MarkError($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Add-Content -Path $ErrorFile -Value $line
    Log "ERROR: $msg"
}

function Wait-Health($Name, $Url, $MaxSeconds) {
    Log "  Waiting for $Name ($Url)..."
    $waited = 0
    while ($waited -lt $MaxSeconds) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            if ($resp.StatusCode -eq 200) {
                Log "  [OK] $Name ready (waited ${waited}s)"
                return $true
            }
        } catch {
            # Still waiting...
        }
        Start-Sleep -Seconds 5
        $waited += 5
    }
    Log "  [WARN] $Name health check timed out after ${MaxSeconds}s"
    return $false
}

Log "===== AiBrand Startup Begin ====="

# ── 1. Wait for Docker Desktop ──
Log "[1/4] Waiting for Docker Desktop..."
$MaxWait = 120
$Waited = 0
while ($Waited -lt $MaxWait) {
    $info = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Log "  Docker ready (waited ${Waited}s)"
        break
    }
    Start-Sleep -Seconds 5
    $Waited += 5
}
if ($Waited -ge $MaxWait) {
    MarkError "Docker Desktop not available after ${MaxWait}s — services NOT started"
    exit 1
}

# ── 2. Start Docker Compose services ──
Log "[2/4] Starting Docker Compose services..."
Set-Location D:\king2046

# Remove orphaned containers from previous runs (avoids name conflicts after reboot)
$composeOutput = docker compose up -d --remove-orphans 2>&1 | Out-String
$exitCode = $LASTEXITCODE

# Show running containers regardless of exit code
$running = docker compose ps --filter "status=running" --format "table {{.Names}} {{.Status}}" 2>&1 | Out-String
Log "  Running containers:`n$running"

# Check critical containers — only fail if they're truly missing
$critical = @('aibrand-redis', 'aibrand-mongodb', 'aibrand-server', 'aibrand-ai', 'aibrand-nginx')
$missing = @()
foreach ($c in $critical) {
    $check = docker ps --filter "name=$c" --filter "status=running" --format "{{.Names}}" 2>&1
    if ($check -notmatch $c) { $missing += $c }
}

if ($missing.Count -gt 0) {
    Log "  WARN: docker compose exit code $exitCode"
    if ($exitCode -ne 0) { Log "  Output: $composeOutput" }
    Log "  WARN: Missing critical containers: $missing"
    Log "  Attempting to start individually..."
    foreach ($m in $missing) {
        docker compose up -d --no-start $m 2>&1 | Out-Null
        docker compose start $m 2>&1 | Out-Null
    }
    # Re-check after individual starts
    Start-Sleep -Seconds 5
    $stillMissing = @()
    foreach ($c in $critical) {
        $check = docker ps --filter "name=$c" --filter "status=running" --format "{{.Names}}" 2>&1
        if ($check -notmatch $c) { $stillMissing += $c }
    }
    if ($stillMissing.Count -gt 0) {
        MarkError "Critical containers failed to start: $stillMissing"
    } else {
        Log "  All critical containers now running"
    }
} else {
    Log "  All critical containers running"
}

# ── 3. Wait for backend services to be healthy ──
Log "[3/4] Waiting for backend services..."
$backendOk  = Wait-Health "aibrand-server" "http://localhost:3002/health" 120
$aiOk       = Wait-Health "aibrand-ai"      "http://localhost:3010/health" 120

# ── 4. Start Next.js Dev Server ──
Log "[4/4] Starting Next.js dev server..."

$existing = netstat -ano 2>$null | Select-String ":3001.*LISTENING"
if ($existing) {
    Log "  Port 3001 already in use — frontend already running"
} elseif ($backendOk -or $aiOk) {
    $ProcessInfo = Start-Process -FilePath "cmd" `
        -ArgumentList "/c pnpm dev --port 3001" `
        -WorkingDirectory "D:\king2046\project\aibrand-studio" `
        -WindowStyle Minimized -PassThru
    Log "  Next.js dev server started (PID: $($ProcessInfo.Id))"
} else {
    MarkError "Backend services NOT ready — Next.js NOT started. Check Docker health."
    Log "  Run 'docker compose ps' and 'docker compose logs aibrand-server' to diagnose."
    exit 1
}

Log "===== AiBrand Startup Complete ====="
Log "  Frontend : http://localhost:3001 (Next.js dev server)"
Log "  Backend  : http://localhost:3002/health"
Log "  AI       : http://localhost:3010"
Log "  nginx    : http://localhost:8080"
Log "  LiteLLM  : http://localhost:4000"
