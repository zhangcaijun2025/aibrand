# health-check.ps1 — AiBrand Studio 健康检查脚本
# 用法: .\health-check.ps1           # 基础检查
#       .\health-check.ps1 -Verbose  # 详细输出
#       .\health-check.ps1 -Json     # JSON 输出 (CI/CD)

param([switch]$Json, [switch]$Verbose)

$ErrorActionPreference = "Continue"
$results = @{}
$allOk = $true

function Check {
    param([string]$name, [scriptblock]$test)
    try {
        $result = & $test
        $results[$name] = $result
        if (-not $Json) {
            $icon = if ($result.ok) { "✅" } else { "❌" }
            Write-Host "$icon $name" -ForegroundColor $(if ($result.ok) { "Green" } else { "Red" })
            if ($Verbose -and $result.detail) {
                Write-Host "     $($result.detail)" -ForegroundColor Gray
            }
        }
        if (-not $result.ok) { $allOk = $false }
    } catch {
        $results[$name] = @{ ok = $false; detail = $_.Exception.Message }
        if (-not $Json) { Write-Host "❌ $name — $($_.Exception.Message)" -ForegroundColor Red }
        $allOk = $false
    }
}

# ── Docker ──
Check "Docker Engine" {
    $dockerOk = $false
    docker info 2>$null | Out-Null
    $dockerOk = ($LASTEXITCODE -eq 0)
    @{ ok = $dockerOk }
}

Check "aibrand-web" {
    $status = docker inspect aibrand-web --format='{{.State.Health.Status}}' 2>$null
    @{ ok = ($status -eq "healthy"); detail = "status=$status" }
}

Check "aibrand-server" {
    $status = docker inspect aibrand-server --format='{{.State.Health.Status}}' 2>$null
    @{ ok = ($status -eq "healthy"); detail = "status=$status" }
}

Check "aibrand-ai" {
    $status = docker inspect aibrand-ai --format='{{.State.Health.Status}}' 2>$null
    @{ ok = ($status -eq "healthy"); detail = "status=$status" }
}

Check "aibrand-redis" { @{ ok = ($null -ne (docker ps --format '{{.Names}}' 2>$null | Select-String "aibrand-redis")) } }
Check "aibrand-mongodb" { @{ ok = ($null -ne (docker ps --format '{{.Names}}' 2>$null | Select-String "aibrand-mongodb")) } }
Check "one-api" { @{ ok = ($null -ne (docker ps --format '{{.Names}}' 2>$null | Select-String "one-api")) } }
Check "n8n" { @{ ok = ($null -ne (docker ps --format '{{.Names}}' 2>$null | Select-String "n8n")) } }

# ── APIs ──
Check "Dev Server :3099" {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:3099/" -TimeoutSec 5 -UseBasicParsing
        @{ ok = ($res.StatusCode -eq 200); detail = "HTTP $($res.StatusCode)" }
    } catch { @{ ok = $false; detail = $_.Exception.Message } }
}

Check "Health API" {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:3099/api/health" -TimeoutSec 10 -UseBasicParsing
        $body = $res.Content | ConvertFrom-Json
        @{ ok = ($body.code -eq 0 -and $body.data.summary.ok -eq $body.data.summary.total); detail = "$($body.data.summary.ok)/$($body.data.summary.total) OK" }
    } catch { @{ ok = $false; detail = $_.Exception.Message } }
}

Check "Deep Health" {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:3099/api/create/health/deep" -TimeoutSec 10 -UseBasicParsing
        $body = $res.Content | ConvertFrom-Json
        @{ ok = ($body.code -eq 0 -and $body.data.overall -eq "healthy"); detail = "$($body.data.summary.ok)/$($body.data.summary.total) OK" }
    } catch { @{ ok = $false; detail = $_.Exception.Message } }
}

# ── n8n & Dify ──
Check "n8n :5678" {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:5678/healthz" -TimeoutSec 5 -UseBasicParsing
        @{ ok = ($res.StatusCode -eq 200); detail = "HTTP $($res.StatusCode)" }
    } catch { @{ ok = $false; detail = "unreachable" } }
}

Check "Dify :5001" {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:5001/" -TimeoutSec 5 -UseBasicParsing
        @{ ok = ($res.StatusCode -eq 200); detail = "HTTP $($res.StatusCode)" }
    } catch { @{ ok = $false; detail = "unreachable" } }
}

# ── Disk ──
Check "Disk Space" {
    $disk = Get-PSDrive D -ErrorAction SilentlyContinue
    $freeGB = if ($disk) { [math]::Round($disk.Free / 1GB, 1) } else { 0 }
    @{ ok = ($freeGB -gt 5); detail = "${freeGB}GB free" }
}

# ══════════════════════════════════════
if ($Json) {
    $results | ConvertTo-Json -Depth 2
} else {
    Write-Host ""
    $okCount = ($results.Values | Where-Object { $_.ok }).Count
    $totalCount = $results.Count
    if ($allOk) {
        Write-Host "══════════════════════════════════" -ForegroundColor Green
        Write-Host "  ALL HEALTHY: $okCount/$totalCount" -ForegroundColor Green
        Write-Host "══════════════════════════════════" -ForegroundColor Green
    } else {
        Write-Host "══════════════════════════════════" -ForegroundColor Red
        Write-Host "  $okCount/$totalCount PASSING" -ForegroundColor Yellow
        Write-Host "══════════════════════════════════" -ForegroundColor Red
    }
}

exit $(if ($allOk) { 0 } else { 1 })
