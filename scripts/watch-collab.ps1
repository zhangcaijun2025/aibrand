# watch-collab.ps1 — 升级版协作监控
# 新增: 监控 .collab/progress.md 变化 + 紧急标记检测

$ErrorActionPreference = 'SilentlyContinue'
$logFile = 'D:\king2046\scripts\watch-collab.log'
$progressFile = 'D:\king2046\.collab\progress.md'

# 关键修复: Claude Code 会话日志可能存在多个目录
# - D--king2046 (根目录启动时)
# - C--Users-XIAOMI (从 aibrand-studio 子目录启动时, Claude 会用 home 目录映射)
# - D--king2046-project-aibrand-studio (可能的子目录映射)
$claudeProjectDirs = @(
    "$env:USERPROFILE\.claude\projects\D--king2046",
    "$env:USERPROFILE\.claude\projects\C--Users-XIAOMI",
    "$env:USERPROFILE\.claude\projects\D--king2046-project-aibrand-studio"
) | Where-Object { Test-Path $_ }

$watchDirs = @(
    'D:\king2046\project\aibrand-studio\src\lib\engines',
    'D:\king2046\project\aibrand-studio\src\app\api\agent',
    'D:\king2046\project\aibrand-studio\src\components\studio',
    'D:\king2046\project\aibrand-studio\src\components\create',
    'D:\king2046\config\openclaw',
    'D:\king2046\skills\openclaw',
    'D:\king2046\.collab',
    'D:\king2046\project\aibrand-studio\docs\comm'
)
$interval = 30

function Write-Log {
    param([string]$msg, [string]$level = 'INFO')
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] [$level] $msg"
    Add-Content -Path $logFile -Value $line
    Write-Host $line
}

# 初始状态: 扫描所有 Claude 项目目录
$lastClaudeFiles = @{}
foreach ($dir in $claudeProjectDirs) {
    Get-ChildItem $dir -Filter '*.jsonl' -ErrorAction SilentlyContinue | ForEach-Object {
        $key = "$($dir.Name)\$($_.Name)"
        $lastClaudeFiles[$key] = $_.LastWriteTime
    }
}
Write-Log "监控 Claude 目录: $($claudeProjectDirs.Count) 个"
foreach ($d in $claudeProjectDirs) { Write-Log "  → $d" }

$lastFileHash = @{}
foreach ($dir in $watchDirs) {
    if (Test-Path $dir) {
        Get-ChildItem $dir -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
            $lastFileHash[$_.FullName] = $_.LastWriteTime
        }
    }
}

$lastProgressMtime = if (Test-Path $progressFile) { (Get-Item $progressFile).LastWriteTime } else { $null }

Write-Log "=== Trae × Claude 协作监控 v2 启动 ==="
Write-Log "监控目录: $($watchDirs.Count) 个 | 共享进度: $progressFile"

$round = 0
while ($true) {
    $round++
    $changes = @()
    $urgent = $false

    # 1. Claude 会话变化 (扫描所有可能的目录)
    foreach ($dir in $claudeProjectDirs) {
        Get-ChildItem $dir -Filter '*.jsonl' -ErrorAction SilentlyContinue | ForEach-Object {
            $key = "$($dir.Name)\$($_.Name)"
            $prev = $lastClaudeFiles[$key]
            if (-not $prev -or $_.LastWriteTime -gt $prev) {
                # 提取 cwd 帮助识别 Claude 真实工作目录
                $cwd = ""
                try {
                    $lastLine = Get-Content $_.FullName -Tail 20 | Where-Object { $_ -match '"cwd"' } | Select-Object -Last 1
                    if ($lastLine -match '"cwd":"([^"]+)"') { $cwd = $matches[1] }
                } catch {}
                $cwdDisplay = if ($cwd) { " cwd=$($cwd.Replace('D:\king2046\',''))" } else { "" }
                $changes += "Claude[$($_.Name.Substring(0,8))] 活跃 ($($_.LastWriteTime.ToString('HH:mm:ss')))$cwdDisplay"
                $lastClaudeFiles[$key] = $_.LastWriteTime
            }
        }
    }

    # 2. 项目文件变化
    foreach ($dir in $watchDirs) {
        if (Test-Path $dir) {
            Get-ChildItem $dir -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
                $prev = $lastFileHash[$_.FullName]
                if (-not $prev -or $_.LastWriteTime -gt $prev) {
                    $relPath = $_.FullName.Replace('D:\king2046\', '')
                    $changes += "文件: $relPath"
                    $lastFileHash[$_.FullName] = $_.LastWriteTime
                }
            }
        }
    }

    # 3. 共享进度文件紧急标记检测 + Claude 响应检测
    if (Test-Path $progressFile) {
        $currentMtime = (Get-Item $progressFile).LastWriteTime
        if ($lastProgressMtime -and $currentMtime -gt $lastProgressMtime) {
            $lines = Get-Content $progressFile
            $hasClaudeResponse = $lines | Where-Object { $_ -match '^## 📝 Claude 进度更新' }
            if ($lines -match '🚨') {
                $urgent = $true
                $changes += "🚨 紧急标记! 立即读取 $progressFile"
            }
            if ($hasClaudeResponse) {
                $urgent = $true
                $changes += "🎉 Claude 已响应! 追加了进度更新章节"
            }
            if (-not $urgent) {
                $changes += "进度文件更新"
            }
            $lastProgressMtime = $currentMtime
        }
    }

    # 3b. 检测 Claude 会话文件增长(说明 Claude 在活动)
    foreach ($dir in $claudeProjectDirs) {
        Get-ChildItem $dir -Filter '*.jsonl' -ErrorAction SilentlyContinue | ForEach-Object {
            $key = "$($dir.Name)\$($_.Name)"
            $prev = $lastClaudeFiles[$key]
            if ($prev -and $_.LastWriteTime -gt $prev -and $_.LastWriteTime -gt (Get-Date).AddMinutes(-5)) {
                $changes += "🔥 Claude 活跃中: $($_.Name.Substring(0,8)) ($($dir.Name))"
            }
        }
    }

    # 4. Docker 状态
    $dockerUp = (docker ps --format '{{.Names}}' 2>$null | Measure-Object).Count
    $openclawRunning = docker ps --format '{{.Names}}' 2>$null | Select-String 'openclaw'

    # 5. 输出
    $status = if ($changes.Count -gt 0) {
        "变更 $($changes.Count): " + ($changes -join '; ')
    } else {
        "无变更"
    }

    $level = if ($urgent) { 'URGENT' } elseif ($changes.Count -gt 0) { 'CHANGE' } else { 'INFO' }
    Write-Log "Round $round | Docker=$dockerUp | OpenClaw=$($openclawRunning ? 'up' : 'stop') | $status" $level

    if ($changes.Count -gt 0) {
        foreach ($c in $changes) { Write-Log "  → $c" $level }
    }

    Start-Sleep -Seconds $interval
}
