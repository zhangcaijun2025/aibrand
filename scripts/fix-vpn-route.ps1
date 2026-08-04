# 修复 LetsTAP 路由劫持 + DNS 污染
# 需要管理员权限执行

$logFile = 'd:\king2046\scripts\fix-vpn-route.log'
Start-Transcript -Path $logFile -Force | Out-Null

Write-Host '=== 修复 LetsTAP 路由劫持 ==='

# 1. 删除 LetsTAP 的默认路由
Write-Host '[1/4] 删除 LetsTAP 默认路由...'
try {
    $tapRoutes = Get-NetRoute -InterfaceAlias 'LetsTAP' -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue
    if ($tapRoutes) {
        $tapRoutes | Remove-NetRoute -Confirm:$false -ErrorAction Stop
        Write-Host '  已删除 LetsTAP 默认路由'
    } else {
        Write-Host '  LetsTAP 无默认路由（已清理）'
    }
} catch {
    Write-Host "  删除路由失败: $($_.Exception.Message)"
}

# 2. 禁用 LetsTAP 适配器
Write-Host '[2/4] 禁用 LetsTAP 适配器...'
try {
    $adapter = Get-NetAdapter -Name 'LetsTAP' -ErrorAction SilentlyContinue
    if ($adapter) {
        Disable-NetAdapter -Name 'LetsTAP' -Confirm:$false -ErrorAction Stop
        Write-Host '  LetsTAP 已禁用'
    } else {
        Write-Host '  LetsTAP 适配器不存在'
    }
} catch {
    Write-Host "  禁用适配器失败: $($_.Exception.Message)"
}

# 3. 刷新 DNS 缓存
Write-Host '[3/4] 刷新 DNS 缓存...'
ipconfig /flushdns | Out-Null
Write-Host '  DNS 缓存已刷新'

# 4. 验证路由表
Write-Host '[4/4] 验证路由表...'
$defaultRoutes = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Select-Object ifIndex, InterfaceAlias, NextHop, RouteMetric, InterfaceMetric
$defaultRoutes | Format-Table -AutoSize | Out-String | Write-Host

Write-Host ''
Write-Host '=== 修复完成，正在测试连通性 ==='

Write-Host '--- Google HTTPS ---'
try {
    $r = Invoke-WebRequest -Uri 'https://www.google.com' -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "Google OK: $($r.StatusCode)"
} catch {
    Write-Host "Google FAIL: $($_.Exception.Message)"
}

Write-Host '--- GitHub HTTPS ---'
try {
    $r = Invoke-WebRequest -Uri 'https://github.com' -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "GitHub OK: $($r.StatusCode)"
} catch {
    Write-Host "GitHub FAIL: $($_.Exception.Message)"
}

Write-Host '--- Baidu HTTPS ---'
try {
    $r = Invoke-WebRequest -Uri 'https://www.baidu.com' -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "Baidu OK: $($r.StatusCode)"
} catch {
    Write-Host "Baidu FAIL: $($_.Exception.Message)"
}

Write-Host ''
Write-Host '修复完成，窗口将在 3 秒后关闭...'
Stop-Transcript | Out-Null
Start-Sleep -Seconds 3
