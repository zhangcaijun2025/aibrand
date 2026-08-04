# Claude 进度实时监控脚本
# 每 60 秒检查一次：Claude 会话变化 / DeepSeek API / 项目端点 / Docker 容器
# 用法: powershell -File D:\king2046\scripts\watch-claude.ps1
# 停止: Ctrl+C

$ErrorActionPreference = 'SilentlyContinue'
$sessionDir = "C:\Users\XIAOMI\.claude\projects\D--king2046"
$logFile = "D:\king2046\scripts\watch-claude.log"
$interval = 60  # 秒
$claudeToken = "sk-8e74a749e14740209ec38475601c1187"
$projectToken = $env:OPENAI_API_KEY  # 容器内 key, 本地可能为空

function Write-Log {
    param([string]$msg, [string]$level = 'INFO')
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] [$level] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

function Get-SessionState {
    $files = Get-ChildItem "$sessionDir\*.jsonl" -ErrorAction SilentlyContinue
    if (-not $files) { return @{ count = 0; latest = $null; size = 0 } }
    $latest = $files | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    return @{
        count = $files.Count
        latestName = $latest.Name
        latestTime = $latest.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')
        size = $latest.Length
    }
}

function Test-DeepSeekApi {
    $body = '{"model":"deepseek-v4-pro","messages":[{"role":"user","content":"ping"}],"max_tokens":10}'
    try {
        $r = Invoke-WebRequest -Uri "https://api.deepseek.com/v1/chat/completions" -Method Post `
            -Headers @{ "Authorization" = "Bearer $claudeToken"; "Content-Type" = "application/json" } `
            -Body $body -TimeoutSec 10 -UseBasicParsing
        return @{ ok = $true; status = $r.StatusCode }
    } catch {
        return @{ ok = $false; err = $_.Exception.Message }
    }
}

function Test-ProjectEndpoint {
    param([string]$url, [string]$name)
    try {
        $r = Invoke-WebRequest -Uri $url -TimeoutSec 8 -UseBasicParsing
        return @{ ok = $true; status = $r.StatusCode; name = $name }
    } catch {
        return @{ ok = $false; err = $_.Exception.Message; name = $name }
    }
}

function Get-DockerState {
    try {
        $out = docker ps --format "{{.Names}}|{{.Status}}" 2>&1
        $lines = $out -split "`n" | Where-Object { $_ -match 'aibrand|dify|n8n|langchain|one-api' }
        $down = $lines | Where-Object { $_ -notmatch 'Up.*healthy' -and $_ -match 'aibrand' }
        return @{
            total = $lines.Count
            downCount = ($down | Measure-Object).Count
            downList = ($down | ForEach-Object { ($_ -split '\|')[0] }) -join ','
        }
    } catch {
        return @{ total = 0; err = $_.Exception.Message }
    }
}

function Get-LastPrompt {
    param([string]$file)
    if (-not (Test-Path $file)) { return $null }
    try {
        $last = Get-Content $file -Tail 5 | Where-Object { $_ -match '"lastPrompt"' } | Select-Object -First 1
        if ($last) {
            $match = [regex]::Match($last, '"lastPrompt":"([^"]+)"')
            if ($match.Success) { return $match.Groups[1].Value }
        }
        # 也尝试从 user message 提取
        $userMsg = Get-Content $file -Tail 20 | Where-Object { $_ -match '"type":"user".*"content":"' } | Select-Object -Last 1
        if ($userMsg) {
            $match = [regex]::Match($userMsg, '"content":"([^"]{1,80})')
            if ($match.Success) { return $match.Groups[1].Value + '...' }
        }
    } catch {}
    return $null
}

# ── 主循环 ──
Write-Log "=== Claude 进度监控启动 (interval=${interval}s) ==="
Write-Log "会话目录: $sessionDir"
Write-Log "日志文件: $logFile"

$prevState = Get-SessionState
Write-Log "初始状态: 会话数=$($prevState.count), 最新=$($prevState.latestName), 时间=$($prevState.latestTime), 大小=$($prevState.size)B"

$round = 0
while ($true) {
    $round++
    Start-Sleep -Seconds $interval

    $now = Get-Date -Format 'HH:mm:ss'
    $alerts = @()

    # 1. Claude 会话变化检测
    $curState = Get-SessionState
    if ($curState.count -ne $prevState.count) {
        $alerts += "会话数变化: $($prevState.count) -> $($curState.count)"
    }
    if ($curState.latestName -ne $prevState.latestName) {
        $alerts += "新会话: $($curState.latestName)"
    }
    if ($curState.latestTime -ne $prevState.latestTime -or $curState.size -ne $prevState.size) {
        $lastPrompt = Get-LastPrompt "$sessionDir\$($curState.latestName)"
        $alerts += "会话更新: $($curState.latestName) | 最后提示: $lastPrompt"
    }

    # 2. DeepSeek API 健康检查 (每 5 轮检查一次, 节省 API 调用)
    if ($round % 5 -eq 0) {
        $ds = Test-DeepSeekApi
        if (-not $ds.ok) {
            $alerts += "DeepSeek API 异常: $($ds.err)"
        }
    }

    # 3. 项目端点健康 (每 3 轮检查一次)
    if ($round % 3 -eq 0) {
        $health = Test-ProjectEndpoint "http://localhost:3099/api/health" "health"
        if (-not $health.ok) {
            $alerts += "/api/health 异常: $($health.err)"
        }
        $agents = Test-ProjectEndpoint "http://localhost:3099/api/openclaw/agents" "openclaw-agents"
        if (-not $agents.ok) {
            $alerts += "/api/openclaw/agents 异常: $($agents.err)"
        }
    }

    # 4. Docker 容器状态
    $docker = Get-DockerState
    if ($docker.downCount -gt 0) {
        $alerts += "Docker 容器异常: $($docker.downList)"
    }

    # 输出
    if ($alerts.Count -gt 0) {
        foreach ($a in $alerts) { Write-Log $a 'ALERT' }
    } else {
        Write-Log "[$now] Round $round 正常 | 会话=$($curState.count) | Docker=$($docker.total) up"
    }

    $prevState = $curState
}
