# sync-claude.ps1 — Trae↔Claude 实时双向同步守护进程
# 主动监测 + 主动推送 + 自动 git pull + 消息自动响应
# 设计: 短轮询 5s + 长轮询 git pull 30s + Redis Pub/Sub 即时推送

$ErrorActionPreference = 'SilentlyContinue'
$root = 'D:\king2046\project\aibrand-studio'
$commDir = "$root\docs\comm"
$inboxClaude = "$commDir\inbox-claude"      # Trae → Claude
$inboxTrae = "$commDir\inbox-trae"          # Claude → Trae
$statusFile = "$commDir\STATUS.md"
$logFile = 'D:\king2046\scripts\sync-claude.log'
$claudeDirs = @(
    "$env:USERPROFILE\.claude\projects\D--king2046",
    "$env:USERPROFILE\.claude\projects\C--Users-XIAOMI",
    "$env:USERPROFILE\.claude\projects\D--king2046-project-aibrand-studio"
) | Where-Object { Test-Path $_ }

$interval = 5          # 短轮询间隔 (秒)
$gitPullInterval = 30  # git pull 间隔 (秒)
$lastGitPull = [DateTime]::MinValue
$claudeActiveNotifyWindow = 300  # 同会话 5 分钟内只通知一次活跃事件

function Write-Log {
    param([string]$msg, [string]$level = 'INFO')
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] [$level] $msg"
    Add-Content -Path $logFile -Value $line
    Write-Host $line
}

function Send-RedisNotify {
    param([string]$channel, [string]$message)
    try {
        docker exec aibrand-redis redis-cli -a password PUBLISH $channel $message 2>$null | Out-Null
    } catch {}
}

function Get-ClaudeLatestActivity {
    param([int]$withinMinutes = 5)
    foreach ($dir in $claudeDirs) {
        $latest = Get-ChildItem $dir -Filter '*.jsonl' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latest -and $latest.LastWriteTime -gt (Get-Date).AddMinutes(-$withinMinutes)) {
            return $latest
        }
    }
    return $null
}

function Get-NewMessages {
    param([string]$dir, [hashtable]$knownHash)
    $new = @()
    if (Test-Path $dir) {
        Get-ChildItem $dir -Filter '*.json' -ErrorAction SilentlyContinue | ForEach-Object {
            $key = $_.Name
            if (-not $knownHash.ContainsKey($key)) {
                $new += $_
                $knownHash[$key] = $_.LastWriteTime
            } elseif ($_.LastWriteTime -gt $knownHash[$key]) {
                $new += $_
                $knownHash[$key] = $_.LastWriteTime
            }
        }
    }
    return $new
}

function Invoke-GitPull {
    try {
        Push-Location $root
        $result = git pull --rebase origin master 2>&1
        Pop-Location
        if ($LASTEXITCODE -eq 0 -and $result -notmatch 'Already up to date|已经是最新') {
            Write-Log "🔄 git pull 拉取到新提交" 'GIT'
            return $true
        }
        return $false
    } catch {
        Write-Log "git pull 失败: $_" 'WARN'
        return $false
    }
}

function Send-CommMessage {
    param(
        [string]$to,
        [string]$subject,
        [string]$body,
        [string]$priority = 'P2',
        [string]$replyTo = ''
    )
    $date = Get-Date -Format 'yyyyMMdd'
    $existing = Get-ChildItem $inboxClaude -Filter "msg-$date-trae-*.json" -ErrorAction SilentlyContinue
    $seq = $existing.Count + 1
    $id = "msg-$date-trae-$($seq.ToString('000'))"
    $msg = @{
        id = $id
        from = 'trae'
        to = $to
        subject = $subject
        body = $body
        priority = $priority
        timestamp = (Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz')
        status = 'sent'
        channels = @('file','redis')
    }
    if ($replyTo) { $msg.replyTo = $replyTo }
    $path = "$inboxClaude\$id.json"
    $msg | ConvertTo-Json -Depth 10 | Out-File -FilePath $path -Encoding utf8
    # 追加 log.md
    Add-Content -Path "$commDir\log.md" -Value "- [$(Get-Date -Format 'yyyy-MM-dd HH:mm')] trae → ${to}: ${id} ${subject}"
    # Redis 通知
    Send-RedisNotify 'aibrand:claude' "${id} ${subject}"
    Write-Log "📤 已发送 ${id}: ${subject}" 'SEND'
    return $id
}

# ============================================
# 主循环
# ============================================

Write-Log "═══════════════ Trae↔Claude 实时同步守护启动 ═══════════════" 'START'
Write-Log "监控: Claude 会话($($claudeDirs.Count) 目录) + inbox-trae + git" 'START'
Write-Log "短轮询 ${interval}s | git pull ${gitPullInterval}s" 'START'

# 初始化已知消息哈希
$knownTraeInbox = @{}      # inbox-trae (Claude → Trae) 的已知消息
$knownClaudeInbox = @{}    # inbox-claude (Trae → Claude) 的已知消息
$knownClaudeSessions = @{}      # 会话 LastWriteTime
$claudeActiveLastNotify = @{}   # 会话上次活跃通知时间 (去重用)

foreach ($dir in $claudeDirs) {
    Get-ChildItem $dir -Filter '*.jsonl' -ErrorAction SilentlyContinue | ForEach-Object {
        $knownClaudeSessions["$($dir.Name)\$($_.Name)"] = $_.LastWriteTime
    }
}
Get-NewMessages $inboxTrae $knownTraeInbox | Out-Null
Get-NewMessages $inboxClaude $knownClaudeInbox | Out-Null

$round = 0
while ($true) {
    $round++
    $events = @()

    # ── 1. 主动监测 Claude 会话活动 (5s 短轮询, 去重通知) ──
    $claudeActiveEvents = @()  # 仅活跃事件, 不写入 STATUS.md
    foreach ($dir in $claudeDirs) {
        Get-ChildItem $dir -Filter '*.jsonl' -ErrorAction SilentlyContinue | ForEach-Object {
            $key = "$($dir.Name)\$($_.Name)"
            $prev = $knownClaudeSessions[$key]
            if (-not $prev -or $_.LastWriteTime -gt $prev) {
                $elapsed = ((Get-Date) - $_.LastWriteTime).TotalMinutes
                if ($elapsed -lt 2) {
                    # 去重: 同会话 5 分钟内只通知一次
                    $lastNotify = $claudeActiveLastNotify[$key]
                    $shouldNotify = -not $lastNotify -or ((Get-Date) - $lastNotify).TotalSeconds -ge $claudeActiveNotifyWindow
                    if ($shouldNotify) {
                        $claudeActiveEvents += "🔥 Claude 活跃: $($_.Name.Substring(0,8)) ($($dir.Name)) $([math]::Round($elapsed,1))分钟前"
                        try {
                            $lastLine = Get-Content $_.FullName -Tail 100 | Where-Object { $_ -match '"cwd"' } | Select-Object -Last 1
                            if ($lastLine -match '"cwd":"([^"]+)"') {
                                $claudeActiveEvents += "   cwd: $($matches[1])"
                            }
                            $lastUser = Get-Content $_.FullName -Tail 30 | Where-Object { $_ -match '"type":"user"' -and $_ -match '"text":"' } | Select-Object -Last 1
                            if ($lastUser -match '"text":"([^"]{1,200})') {
                                $claudeActiveEvents += "   最后用户消息: $($matches[1].Substring(0,[Math]::Min(100,$matches[1].Length)))..."
                            }
                        } catch {}
                        $claudeActiveLastNotify[$key] = Get-Date
                    }
                }
                $knownClaudeSessions[$key] = $_.LastWriteTime
            }
        }
    }
    # 活跃事件仅写入日志, 不加入 $events (不污染 STATUS.md)
    foreach ($e in $claudeActiveEvents) { Write-Log $e 'ACTIVE' }

    # ── 2. 主动监测 inbox-trae 新消息 (Claude → Trae) ──
    $newClaudeMsgs = Get-NewMessages $inboxTrae $knownTraeInbox
    foreach ($msg in $newClaudeMsgs) {
        try {
            $obj = Get-Content $msg.FullName -Raw | ConvertFrom-Json
            $events += "📨 Claude 新消息: $($msg.Name)"
            $events += "   主题: $($obj.subject)"
            $events += "   优先级: $($obj.priority)"
            # Redis 即时通知自己(可选,因为已经直接处理)
        } catch {}
    }

    # ── 3. 主动 git pull 拉取 Claude 推送 (30s) ──
    $gitElapsed = ((Get-Date) - $lastGitPull).TotalSeconds
    if ($gitElapsed -ge $gitPullInterval) {
        $pulled = Invoke-GitPull
        if ($pulled) {
            $events += "🔄 git pull 拉取到 Claude 新提交"
            # 重新扫描 inbox-trae
            $newAfterPull = Get-NewMessages $inboxTrae $knownTraeInbox
            foreach ($msg in $newAfterPull) {
                try {
                    $obj = Get-Content $msg.FullName -Raw | ConvertFrom-Json
                    $events += "📨 git pull 后发现新消息: $($msg.Name) - $($obj.subject)"
                } catch {}
            }
        }
        $lastGitPull = Get-Date
    }

    # ── 4. 输出事件 ──
    if ($events.Count -gt 0) {
        foreach ($e in $events) { Write-Log $e 'EVENT' }
        # 仅 📨 消息事件写入 STATUS.md (🔥 活跃事件已单独处理)
        $urgentEvents = $events | Where-Object { $_ -match '📨|P0' }
        if ($urgentEvents.Count -gt 0) {
            $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
            $statusUpdate = "`n## 🔄 实时事件 ($ts)`n" + ($urgentEvents | ForEach-Object { "- $_" }) -join "`n"
            try {
                Add-Content -Path $statusFile -Value $statusUpdate
                Write-Log "STATUS.md 已更新实时事件" 'UPDATE'
            } catch {}
        }
    } elseif ($round % 12 -eq 0) {
        # 每分钟输出一次心跳
        $activeCount = $claudeActiveEvents.Count
        Write-Log "Round $round | 心跳正常 | 活跃事件: $activeCount | 消息事件: 0" 'HEARTBEAT'
    }

    Start-Sleep -Seconds $interval
}
