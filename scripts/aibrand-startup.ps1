# AiBrand Studio - Auto Startup Script
# Run at Windows login to start all AiBrand services
# Version: 2026-07-17 v3 (pure container mode — removed host pnpm dev dependency)

$ErrorActionPreference = "Continue"
$LogFile = "$env:USERPROFILE\.aibrand\startup.log"
$ErrorFile = "$env:USERPROFILE\.aibrand\startup.error"
$LockFile = "$env:USERPROFILE\.aibrand\startup.lock"
$LogDir = Split-Path $LogFile -Parent

# Ensure log directory
if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

# ── Mutex: prevent concurrent startup runs ──
if (Test-Path $LockFile) {
    $lockAge = [int]((Get-Date) - (Get-Item $LockFile).LastWriteTime).TotalSeconds
    $lockPid = Get-Content $LockFile -ErrorAction SilentlyContinue
    $proc = Get-Process -Id $lockPid -ErrorAction SilentlyContinue
    if ($proc -and $lockAge -lt 600) {
        # Previous startup still running (or within 10 min)
        $msg = "Startup script already running (PID $lockPid, started ${lockAge}s ago). Exiting."
        Add-Content -Path $LogFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] SKIP: $msg"
        exit 0
    }
    # Stale lock — previous run likely crashed
    Add-Content -Path $LogFile -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] WARN: Removing stale lock file (age: ${lockAge}s)"
    Remove-Item $LockFile -Force -ErrorAction SilentlyContinue
}
$currentPid = [System.Diagnostics.Process]::GetCurrentProcess().Id
$currentPid | Out-File -FilePath $LockFile -Force

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

# Health check via HTTP (for services with exposed ports)
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
    Log "  [WARN] $Name HTTP health check timed out after ${MaxSeconds}s"
    return $false
}

# Health check via Docker health status (for services without host port mapping)
function Wait-DockerHealthy($Name, $MaxSeconds) {
    Log "  Waiting for $Name (Docker health check)..."
    $waited = 0
    while ($waited -lt $MaxSeconds) {
        $status = docker inspect --format='{{.State.Health.Status}}' $Name 2>&1
        if ($status -eq "healthy") {
            Log "  [OK] $Name healthy (waited ${waited}s)"
            return $true
        }
        if ($status -match "unhealthy") {
            Log "  [WARN] $Name is UNHEALTHY — check docker logs $Name"
            return $false
        }
        Start-Sleep -Seconds 5
        $waited += 5
    }
    $final = docker inspect --format='{{.State.Health.Status}}' $Name 2>&1
    Log "  [WARN] $Name health status after ${MaxSeconds}s: $final"
    return ($final -eq "healthy")
}

Log "===== AiBrand Startup Begin ====="

# ── 1. Wait for Docker Desktop ──
Log "[1/5] Waiting for Docker Desktop..."
$MaxWait = 180
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
    Remove-Item $LockFile -Force -ErrorAction SilentlyContinue
    exit 1
}

# ── 2. Pre-cleanup: remove stale containers to avoid name conflicts ──
Log "[2/5] Cleaning up stale containers..."
Set-Location D:\king2046

# Force-remove known conflicting containers that may persist across reboots
$staleContainers = @('aibrand-web', 'aibrand-init', 'aibrand-mongodb-rs-init', 'aibrand-rustfs-init')
foreach ($c in $staleContainers) {
    $exists = docker ps -a --filter "name=$c" --format "{{.Names}}" 2>&1
    if ($exists -match $c) {
        docker rm -f $c 2>&1 | Out-Null
        Log "  Removed stale container: $c"
    }
}

# Down + up fresh to ensure clean state
Log "  Running docker compose down --remove-orphans..."
docker compose down --remove-orphans --timeout 30 2>&1 | Out-Null
Log "  Cleanup complete"

# ── 3. Start Docker Compose services ──
Log "[3/5] Starting Docker Compose services..."
$maxRetries = 3
$retryCount = 0
$allRunning = $false

while ($retryCount -lt $maxRetries -and -not $allRunning) {
    if ($retryCount -gt 0) {
        $backoff = 10 * $retryCount
        Log "  Retry $retryCount/$maxRetries after ${backoff}s backoff..."
        Start-Sleep -Seconds $backoff
        # Re-down before retry
        docker compose down --remove-orphans --timeout 30 2>&1 | Out-Null
    }

    $composeOutput = docker compose up -d --remove-orphans 2>&1 | Out-String
    $exitCode = $LASTEXITCODE

    # Wait briefly for containers to initialize
    Start-Sleep -Seconds 10

    $running = docker compose ps --filter "status=running" --format "table {{.Names}} {{.Status}}" 2>&1 | Out-String
    Log "  Running containers:`n$running"

    # Check critical containers (aibrand-web added — pure container mode)
    $critical = @('aibrand-redis', 'aibrand-mongodb', 'aibrand-server', 'aibrand-ai', 'aibrand-web', 'aibrand-nginx')
    $missing = @()
    foreach ($c in $critical) {
        $check = docker ps --filter "name=$c" --filter "status=running" --format "{{.Names}}" 2>&1
        if ($check -notmatch $c) { $missing += $c }
    }

    if ($missing.Count -eq 0) {
        $allRunning = $true
        Log "  All critical containers running"
    } else {
        $retryCount++
        Log "  WARN: Retry $retryCount — missing: $missing"
        if ($exitCode -ne 0) { Log "  Compose output (last 500 chars): $($composeOutput.Substring([Math]::Max(0, $composeOutput.Length - 500)))" }
    }
}

if (-not $allRunning) {
    MarkError "Critical containers failed to start after $maxRetries retries: $missing"
    Log "  Check: docker compose ps -a"
    Remove-Item $LockFile -Force -ErrorAction SilentlyContinue
    exit 1
}

# ── 4. Wait for all services to be healthy (pure container mode) ──
Log "[4/5] Waiting for all services to be healthy..."

# aibrand-server: has port 3002 mapped to host, use HTTP health check
$backendOk = Wait-Health "aibrand-server" "http://localhost:3002/health" 120
if (-not $backendOk) {
    Log "  Falling back to Docker health check for aibrand-server..."
    $backendOk = Wait-DockerHealthy "aibrand-server" 60
}

# aibrand-ai: check via HTTP on port 3011 (host:3011 → container:3010)
$aiOk = Wait-Health "aibrand-ai" "http://localhost:3011/health" 120
if (-not $aiOk) {
    Log "  Falling back to Docker health check for aibrand-ai..."
    $aiOk = Wait-DockerHealthy "aibrand-ai" 60
}

# aibrand-web: wait for Docker health (no host port mapping, internal 3000 only)
$webOk = Wait-DockerHealthy "aibrand-web" 90
if (-not $webOk) {
    MarkError "aibrand-web NOT healthy — frontend will not work. Check: docker logs aibrand-web"
}

# nginx: final gateway, must be healthy
$nginxOk = Wait-DockerHealthy "aibrand-nginx" 30
if (-not $nginxOk) {
    MarkError "nginx NOT healthy — gateway down. Check: docker logs aibrand-nginx"
}

# ── 5. Verify end-to-end via nginx (replaces old dev server startup) ──
Log "[5/5] Verifying end-to-end (nginx → aibrand-web)..."
$e2eOk = Wait-Health "nginx→web" "http://localhost:3099/api/health" 60
if ($e2eOk) {
    Log "  [OK] http://localhost:3099 is responding"
} else {
    MarkError "http://localhost:3099/api/health not responding after 60s"
}

Log "===== AiBrand Startup Complete ====="
Log "  Browser  : http://localhost:3099 (nginx → aibrand-web container)"
Log "  Backend  : http://localhost:3002/health"
Log "  AI       : http://localhost:3011/health"
Log "  Mode     : Pure container (no host dev server needed)"

# Clean up lock file
Remove-Item $LockFile -Force -ErrorAction SilentlyContinue
