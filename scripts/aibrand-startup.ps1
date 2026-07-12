# AiBrand Studio - Auto Startup Script
# Run at Windows login to start all AiBrand services
# Version: 2026-07-12 v2 (lock file, pre-cleanup, docker health fallback, retries, stale cleanup)

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

    # Check critical containers
    $critical = @('aibrand-redis', 'aibrand-mongodb', 'aibrand-server', 'aibrand-ai', 'aibrand-nginx')
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

# ── 4. Wait for backend services to be healthy ──
Log "[4/5] Waiting for backend services..."

# aibrand-server: has port 3002 mapped to host, use HTTP health check
$backendOk = Wait-Health "aibrand-server" "http://localhost:3002/health" 120
if (-not $backendOk) {
    # Fallback to Docker health status
    Log "  Falling back to Docker health check for aibrand-server..."
    $backendOk = Wait-DockerHealthy "aibrand-server" 60
}

# aibrand-ai: check via HTTP on port 3011 (host:3011 → container:3010)
$aiOk = Wait-Health "aibrand-ai" "http://localhost:3011/health" 120
if (-not $aiOk) {
    # Fallback to Docker health status (works even without port mapping)
    Log "  Falling back to Docker health check for aibrand-ai..."
    $aiOk = Wait-DockerHealthy "aibrand-ai" 60
}

# Verify nginx is healthy too
$nginxOk = Wait-DockerHealthy "aibrand-nginx" 30
if (-not $nginxOk) {
    Log "  [WARN] nginx not healthy — frontend routing may not work"
}

# ── 5. Start Next.js Dev Server ──
Log "[5/5] Starting Next.js dev server..."

# Check port 3001 — if in use, kill the old process (could be zombie from last boot)
$portCheck = netstat -ano 2>$null | Select-String ":3001.*LISTENING"
if ($portCheck) {
    # Take the first match (IPv4) and extract PID safely
    $firstMatch = if ($portCheck -is [array]) { $portCheck[0] } else { $portCheck }
    $line = $firstMatch.ToString().Trim()
    $parts = $line -split '\s+' | Where-Object { $_ -ne '' }
    $existingPid = [int]$parts[-1]
    $proc = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq "node") {
        Log "  Killing stale Next.js process (PID: $existingPid)..."
        Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Log "  Stale process terminated"
    } elseif ($proc) {
        Log "  Port 3001 in use by $($proc.ProcessName) (PID: $existingPid) — skipping kill"
    } else {
        Log "  Port 3001 in use by PID $existingPid (process not found) — port may be stale"
    }
}

# Re-check port after cleanup
$portCheck = netstat -ano 2>$null | Select-String ":3001.*LISTENING"
if ($portCheck) {
    Log "  Port 3001 still in use — frontend already running"
} elseif ($backendOk -or $aiOk) {
    $ProcessInfo = Start-Process -FilePath "cmd" `
        -ArgumentList "/c pnpm dev --port 3001" `
        -WorkingDirectory "D:\king2046\project\aibrand-studio" `
        -WindowStyle Minimized -PassThru
    Log "  Next.js dev server started (PID: $($ProcessInfo.Id))"

    # Quick verify: wait for Next.js to be ready
    $w = 0
    while ($w -lt 60) {
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            if ($r.StatusCode -eq 200) {
                Log "  [OK] Next.js ready (waited ${w}s)"
                break
            }
        } catch {}
        Start-Sleep -Seconds 3
        $w += 3
    }
    if ($w -ge 60) { Log "  [WARN] Next.js did not respond within 60s" }
} else {
    MarkError "Backend services NOT ready — Next.js NOT started. Check Docker health."
    Log "  Run 'docker compose ps' and 'docker compose logs aibrand-server' to diagnose."
    Remove-Item $LockFile -Force -ErrorAction SilentlyContinue
    exit 1
}

Log "===== AiBrand Startup Complete ====="
Log "  Browser  : http://localhost:3099 (nginx → Next.js)"
Log "  Frontend : http://localhost:3001 (Next.js dev direct)"
Log "  Backend  : http://localhost:3002/health"
Log "  AI       : http://localhost:3011/health"
Log "  LiteLLM  : http://localhost:4000"

# Clean up lock file
Remove-Item $LockFile -Force -ErrorAction SilentlyContinue
