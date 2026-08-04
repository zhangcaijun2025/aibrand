# 添加 github.com hosts 映射 + 尝试 push
$logFile = 'd:\king2046\scripts\fix-hosts-and-push.log'
Start-Transcript -Path $logFile -Force | Out-Null

Write-Host '=== 添加 github.com hosts 映射 ==='

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$hostsContent = Get-Content $hostsPath -Raw -ErrorAction SilentlyContinue

# 检查是否已存在
if ($hostsContent -match 'github\.com') {
    Write-Host 'hosts 文件已包含 github.com 映射，跳过添加'
} else {
    $entries = @"
# === GitHub IP 映射 (added by fix-hosts-and-push.ps1) ===
20.205.243.166 github.com
20.205.243.168 api.github.com
20.205.243.166 ssh.github.com
"@
    Add-Content -Path $hostsPath -Value $entries -Encoding ASCII
    Write-Host '已添加 github.com / api.github.com / ssh.github.com 的 hosts 映射'
}

# 刷新 DNS 缓存
ipconfig /flushdns | Out-Null
Write-Host 'DNS 缓存已刷新'

# 验证解析
Write-Host '--- 验证 DNS 解析 ---'
$githubIP = (Resolve-DnsName github.com -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
Write-Host "github.com -> $githubIP"

Write-Host ''
Write-Host '=== 测试 HTTPS 连通性 ==='
Write-Host '--- github.com HTTPS ---'
try {
    $r = Invoke-WebRequest -Uri 'https://github.com' -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    Write-Host "github.com OK: $($r.StatusCode)"
} catch {
    Write-Host "github.com FAIL: $($_.Exception.Message)"
}

Write-Host ''
Write-Host '=== 尝试 git push aibrand-studio ==='
Set-Location 'd:\king2046\project\aibrand-studio'
git remote set-url origin https://github.com/zhangcaijun2025/aibrand-studio.git
$env:GIT_HTTP_LOW_SPEED_LIMIT = '1000'
$env:GIT_HTTP_LOW_SPEED_TIME = '30'
git push origin master 2>&1
Write-Host "aibrand-studio push exit: $LASTEXITCODE"

Write-Host ''
Write-Host '=== 尝试 git push aibrand ==='
Set-Location 'd:\king2046'
git remote set-url origin https://github.com/zhangcaijun2025/aibrand.git
git push origin main 2>&1
Write-Host "aibrand push exit: $LASTEXITCODE"

Write-Host ''
Write-Host '完成，3 秒后关闭...'
Stop-Transcript | Out-Null
Start-Sleep -Seconds 3
