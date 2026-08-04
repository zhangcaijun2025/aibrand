# diagnose-comm.ps1 — Trae↔Claude 通信全链路诊断
$ErrorActionPreference = 'SilentlyContinue'

Write-Output "═══════════════ Trae↔Claude 通信全链路诊断 ═══════════════"
Write-Output ""

Write-Output "[1] Claude 进程状态"
$claudeProc = Get-Process -Name "claude" -ErrorAction SilentlyContinue
if ($claudeProc) {
    $claudeProc | Select-Object Name, Id, CPU, @{N='MemMB';E={[math]::Round($_.WorkingSet/1MB,1)}}, StartTime | Format-Table -AutoSize
    Write-Output "  ✅ Claude 进程运行中"
} else {
    Write-Output "  ❌ Claude 进程未运行"
}

Write-Output ""
Write-Output "[2] Claude settings.json hooks"
$settingsPath = "C:\Users\XIAOMI\.claude\settings.json"
if (Test-Path $settingsPath) {
    $obj = Get-Content $settingsPath -Raw | ConvertFrom-Json
    if ($obj.hooks) {
        Write-Output "  ✅ hooks 配置存在"
        $obj.hooks.PSObject.Properties | ForEach-Object {
            $hookName = $_.Name
            Write-Output "    $hookName :"
            $_.Value | ForEach-Object {
                if ($_.matcher) { Write-Output "      matcher: $($_.matcher -join ', ')" }
                if ($_.hooks) {
                    $_.hooks | ForEach-Object { Write-Output "      cmd: $($_.command)" }
                }
            }
        }
    } else { Write-Output "  ⚠️ 无 hooks" }
} else { Write-Output "  ❌ settings.json 不存在" }

Write-Output ""
Write-Output "[3] Claude 项目会话 (扫描所有可能目录)"
$claudeDirs = @(
    "C:\Users\XIAOMI\.claude\projects\D--king2046",
    "C:\Users\XIAOMI\.claude\projects\C--Users-XIAOMI",
    "C:\Users\XIAOMI\.claude\projects\D--king2046-project-aibrand-studio"
) | Where-Object { Test-Path $_ }

$allSessions = @()
foreach ($dir in $claudeDirs) {
    Get-ChildItem $dir -Filter "*.jsonl" -ErrorAction SilentlyContinue | ForEach-Object {
        $allSessions += $_
    }
}
$allSessions = $allSessions | Sort-Object LastWriteTime -Descending
if ($allSessions.Count -gt 0) {
    $latest = $allSessions[0]
    $elapsed = (Get-Date) - $latest.LastWriteTime
    Write-Output "  监控目录数: $($claudeDirs.Count)"
    foreach ($d in $claudeDirs) { Write-Output "    → $($d.Replace('C:\Users\XIAOMI\.claude\projects\',''))" }
    Write-Output "  最新会话: $($latest.Name.Substring(0,8))"
    Write-Output "  所在目录: $($latest.Directory.Name)"
    Write-Output "  最后活动: $($latest.LastWriteTime.ToString('HH:mm:ss')) ($([math]::Round($elapsed.TotalMinutes,1))分钟前)"
    Write-Output "  文件大小: $([math]::Round($latest.Length/1KB,1))KB"

    # 提取 cwd 帮助识别 Claude 真实工作目录
    try {
        $lastLine = Get-Content $latest.FullName -Tail 50 | Where-Object { $_ -match '"cwd"' } | Select-Object -Last 1
        if ($lastLine -match '"cwd":"([^"]+)"') {
            Write-Output "  工作目录: $($matches[1])"
        }
    } catch {}
} else { Write-Output "  ❌ 无会话文件" }

Write-Output ""
Write-Output "[4] D:\king2046\.claude 本地配置"
if (Test-Path "D:\king2046\.claude") {
    Get-ChildItem "D:\king2046\.claude" -Recurse -File | ForEach-Object {
        Write-Output "  $($_.FullName.Replace('D:\king2046\.claude\','')) | $($_.LastWriteTime.ToString('HH:mm:ss'))"
    }
} else { Write-Output "  ⚠️ 不存在" }

Write-Output ""
Write-Output "[5] CLAUDE.md 项目记忆"
if (Test-Path "D:\king2046\CLAUDE.md") {
    $f = Get-Item "D:\king2046\CLAUDE.md"
    Write-Output "  ✅ $([math]::Round($f.Length/1KB,1))KB | $($f.LastWriteTime.ToString('HH:mm:ss'))"
} else { Write-Output "  ❌ 不存在" }

Write-Output ""
Write-Output "[6] watch-collab.ps1 监控进程"
$watchProc = Get-WmiObject Win32_Process -Filter "Name='pwsh.exe'" | Where-Object { $_.CommandLine -match 'watch-collab' }
if ($watchProc) {
    Write-Output "  ✅ 运行中 PID=$($watchProc.ProcessId)"
} else {
    Write-Output "  ❌ 未运行,正在重启..."
    Start-Process pwsh -ArgumentList '-NoProfile','-File','D:\king2046\scripts\watch-collab.ps1' -WindowStyle Hidden
    Start-Sleep 2
    Write-Output "  ✅ 已重启"
}

Write-Output ""
Write-Output "[7] 共享进度文件"
$progressPath = "D:\king2046\.collab\progress.md"
if (Test-Path $progressPath) {
    $f = Get-Item $progressPath
    Write-Output "  ✅ 最后更新 $($f.LastWriteTime.ToString('HH:mm:ss'))"
    # 精确匹配行首的章节标题(避免匹配说明文字中的提及)
    $lines = Get-Content $progressPath
    $hasClaudeResponse = $lines | Where-Object { $_ -match '^## 📝 Claude 进度更新' }
    if ($hasClaudeResponse) {
        Write-Output "  ✅ Claude 已追加进度更新章节"
    } else {
        Write-Output "  ⚠️ Claude 未追加进度更新章节(等待用户粘贴指令到 Claude CLI)"
    }
} else { Write-Output "  ❌ 不存在" }

Write-Output ""
Write-Output "[8] Docker 容器状态"
docker ps --format "{{.Names}}|{{.Status}}" | Select-String "openclaw|aibrand-web|aibrand-nginx" | ForEach-Object {
    $parts = $_.ToString() -split '\|'
    Write-Output "  $($parts[0]) | $($parts[1])"
}

Write-Output ""
Write-Output "═══════════════ 诊断完成 ═══════════════"
