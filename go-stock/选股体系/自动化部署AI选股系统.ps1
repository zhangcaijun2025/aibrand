# AI选股系统自动化部署脚本
# 作者：小龙女
# 时间：2026-03-29 23:48

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   AI选股系统自动化部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 第一步：检查n8n服务状态
Write-Host "[1/8] 检查n8n服务状态..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5678/healthz" -TimeoutSec 10 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ n8n服务运行正常" -ForegroundColor Green
    } else {
        Write-Host "   ❌ n8n服务异常 (状态码: $($response.StatusCode))" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ n8n服务不可访问: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 第二步：检查工作流文件是否存在
Write-Host "[2/8] 检查工作流文件..." -ForegroundColor Yellow
$workflowFiles = @(
    "AI选股系统_数据采集工作流.json",
    "AI选股系统_AI分析工作流.json"
)

foreach ($file in $workflowFiles) {
    $filePath = Join-Path $env:USERPROFILE "Desktop\$file"
    if (Test-Path $filePath) {
        Write-Host "   ✅ $file 存在" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file 不存在" -ForegroundColor Red
        exit 1
    }
}

# 第三步：获取n8n API密钥（需要先登录获取）
Write-Host "[3/8] 准备n8n API访问..." -ForegroundColor Yellow
Write-Host "   注意：需要先手动登录n8n获取API密钥" -ForegroundColor Yellow
Write-Host "   步骤：" -ForegroundColor Yellow
Write-Host "   1. 打开浏览器访问: http://localhost:5678/" -ForegroundColor Yellow
Write-Host "   2. 登录: admin / Jun@2026" -ForegroundColor Yellow
Write-Host "   3. 点击右上角用户头像 → Settings" -ForegroundColor Yellow
Write-Host "   4. 找到'API Key'并复制" -ForegroundColor Yellow

$apiKey = Read-Host "   请输入n8n API密钥 (或按Enter跳过自动导入)"

if ([string]::IsNullOrEmpty($apiKey)) {
    Write-Host "   ⚠️ 跳过自动导入，请手动导入工作流" -ForegroundColor Yellow
    Write-Host "   手动导入步骤：" -ForegroundColor Yellow
    Write-Host "   1. 登录n8n: http://localhost:5678/" -ForegroundColor Yellow
    Write-Host "   2. Workflows → New workflow" -ForegroundColor Yellow
    Write-Host "   3. 点击... → Import from file" -ForegroundColor Yellow
    Write-Host "   4. 选择桌面上的工作流文件" -ForegroundColor Yellow
    Write-Host "   5. 激活工作流 (点击Activate开关)" -ForegroundColor Yellow
} else {
    # 第四步：通过API导入工作流
    Write-Host "[4/8] 通过API导入工作流..." -ForegroundColor Yellow
    
    # 导入数据采集工作流
    $dataCollectionFile = Join-Path $env:USERPROFILE "Desktop\AI选股系统_数据采集工作流.json"
    $dataCollectionContent = Get-Content $dataCollectionFile -Raw
    
    try {
        $headers = @{
            "X-N8N-API-KEY" = $apiKey
            "Content-Type" = "application/json"
        }
        
        $body = @{
            "name" = "AI选股系统 - 数据采集工作流"
            "nodes" = ($dataCollectionContent | ConvertFrom-Json).nodes
            "connections" = ($dataCollectionContent | ConvertFrom-Json).connections
            "settings" = ($dataCollectionContent | ConvertFrom-Json).settings
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri "http://localhost:5678/api/v1/workflows" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -TimeoutSec 30
        
        Write-Host "   ✅ 数据采集工作流导入成功 (ID: $($response.data.id))" -ForegroundColor Green
        
        # 激活工作流
        $activateBody = @{
            "active" = $true
        } | ConvertTo-Json
        
        $activateResponse = Invoke-RestMethod -Uri "http://localhost:5678/api/v1/workflows/$($response.data.id)/activate" `
            -Method POST `
            -Headers $headers `
            -Body $activateBody `
            -TimeoutSec 30
        
        Write-Host "   ✅ 数据采集工作流已激活" -ForegroundColor Green
        
    } catch {
        Write-Host "   ❌ 数据采集工作流导入失败: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # 导入AI分析工作流
    $aiAnalysisFile = Join-Path $env:USERPROFILE "Desktop\AI选股系统_AI分析工作流.json"
    $aiAnalysisContent = Get-Content $aiAnalysisFile -Raw
    
    try {
        $body = @{
            "name" = "AI选股系统 - AI分析工作流"
            "nodes" = ($aiAnalysisContent | ConvertFrom-Json).nodes
            "connections" = ($aiAnalysisContent | ConvertFrom-Json).connections
            "settings" = ($aiAnalysisContent | ConvertFrom-Json).settings
        } | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri "http://localhost:5678/api/v1/workflows" `
            -Method POST `
            -Headers $headers `
            -Body $body `
            -TimeoutSec 30
        
        Write-Host "   ✅ AI分析工作流导入成功 (ID: $($response.data.id))" -ForegroundColor Green
        
        # 激活工作流
        $activateBody = @{
            "active" = $true
        } | ConvertTo-Json
        
        $activateResponse = Invoke-RestMethod -Uri "http://localhost:5678/api/v1/workflows/$($response.data.id)/activate" `
            -Method POST `
            -Headers $headers `
            -Body $activateBody `
            -TimeoutSec 30
        
        Write-Host "   ✅ AI分析工作流已激活" -ForegroundColor Green
        
    } catch {
        Write-Host "   ❌ AI分析工作流导入失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 第五步：检查PostgreSQL数据库
Write-Host "[5/8] 检查数据库环境..." -ForegroundColor Yellow

# 检查Docker中的PostgreSQL
try {
    $dockerPs = docker ps --filter "name=postgres" --format "{{.Names}}" 2>$null
    if ($dockerPs -contains "postgres") {
        Write-Host "   ✅ PostgreSQL容器正在运行" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ PostgreSQL容器未运行" -ForegroundColor Yellow
        Write-Host "   建议运行: docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=Jun@2026 postgres" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ Docker检查失败" -ForegroundColor Yellow
}

# 第六步：创建数据库表（如果PostgreSQL可用）
Write-Host "[6/8] 准备数据库表结构..." -ForegroundColor Yellow
$sqlScript = @"
-- 股票价格表
CREATE TABLE IF NOT EXISTS stock_prices (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  open DECIMAL(10,2),
  close DECIMAL(10,2),
  current DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  volume BIGINT,
  amount DECIMAL(20,2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 股票分析表
CREATE TABLE IF NOT EXISTS stock_analysis (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  total_score INTEGER,
  technical_score INTEGER,
  fundamental_score INTEGER,
  recommendation VARCHAR(50),
  action VARCHAR(10),
  current_price DECIMAL(10,2),
  analysis_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"@

$sqlScript | Out-File -FilePath "$env:USERPROFILE\Desktop\创建数据库表.sql" -Encoding UTF8
Write-Host "   ✅ 数据库SQL脚本已保存到桌面" -ForegroundColor Green

# 第七步：配置Python环境
Write-Host "[7/8] 检查Python环境..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Python已安装: $pythonVersion" -ForegroundColor Green
        
        # 检查必要库
        $requiredLibs = @("pandas", "numpy")
        foreach ($lib in $requiredLibs) {
            $check = python -c "import $lib; print('OK')" 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ $lib 已安装" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️ $lib 未安装，运行: pip install $lib" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "   ⚠️ Python未安装或不在PATH中" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ Python检查失败" -ForegroundColor Yellow
}

# 第八步：创建监控脚本
Write-Host "[8/8] 创建系统监控工具..." -ForegroundColor Yellow
$monitorScript = @'
@echo off
chcp 65001 >nul
title AI选股系统监控工具

:menu
cls
echo ========================================
echo   AI选股系统监控工具
echo ========================================
echo.
echo 当前时间: %date% %time%
echo.
echo 请选择监控项目:
echo 1. 检查n8n服务状态
echo 2. 检查工作流运行状态
echo 3. 检查数据库连接
echo 4. 查看最新股票数据
echo 5. 查看最新分析结果
echo 6. 测试数据采集
echo 7. 测试AI分析
echo 8. 查看系统日志
echo 9. 退出
echo.
set /p choice="请选择 (1-9): "

if "%choice%"=="1" goto check_n8n
if "%choice%"=="2" goto check_workflows
if "%choice%"=="3" goto check_database
if "%choice%"=="4" goto view_stock_data
if "%choice%"=="5" goto view_analysis
if "%choice%"=="6" goto test_collection
if "%choice%"=="7" goto test_analysis
if "%choice%"=="8" goto view_logs
if "%choice%"=="9" goto exit

echo 无效选择
pause
goto menu

:check_n8n
echo.
echo 检查n8n服务状态...
curl http://localhost:5678/healthz 2>nul
if errorlevel 1 (
    echo ❌ n8n服务不可访问
) else (
    echo ✅ n8n服务运行正常
)
pause
goto menu

:check_workflows
echo.
echo 检查工作流状态...
echo 请手动访问: http://localhost:5678/workflows
echo.
echo 预期看到2个已激活的工作流:
echo 1. AI选股系统 - 数据采集工作流
echo 2. AI选股系统 - AI分析工作流
pause
goto menu

:check_database
echo.
echo 检查数据库连接...
echo 如果使用Docker PostgreSQL，运行:
echo docker exec -it postgres psql -U postgres -c "SELECT COUNT(*) FROM stock_prices;"
pause
goto menu

:view_stock_data
echo.
echo 查看最新股票数据...
echo 运行SQL查询:
echo SELECT code, name, current, timestamp FROM stock_prices ORDER BY timestamp DESC LIMIT 10;
pause
goto menu

:view_analysis
echo.
echo 查看最新分析结果...
echo 运行SQL查询:
echo SELECT code, total_score, recommendation, action, analysis_time FROM stock_analysis ORDER BY analysis_time DESC LIMIT 10;
pause
goto menu

:test_collection
echo.
echo 测试数据采集...
echo 手动在n8n中执行数据采集工作流
echo 或等待5分钟自动执行
pause
goto menu

:test_analysis
echo.
echo 测试AI分析...
echo 手动在n8n中执行AI分析工作流
echo 或等待1小时自动执行
pause
goto menu

:view_logs
echo.
echo 查看系统日志...
echo n8n日志位置: %%USERPROFILE%%\.n8n\logs\
echo 数据库日志: Docker容器日志
echo 系统日志: Windows事件查看器
pause
goto menu

:exit
echo.
echo 监控工具退出
pause
'@

$monitorScript | Out-File -FilePath "$env:USERPROFILE\Desktop\AI选股系统监控工具.bat" -Encoding UTF8
Write-Host "   ✅ 监控工具已创建到桌面" -ForegroundColor Green

# 完成总结
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   部署完成总结" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ 已完成的项目:" -ForegroundColor Green
Write-Host "   1. n8n服务验证" -ForegroundColor Green
Write-Host "   2. 工作流文件检查" -ForegroundColor Green
Write-Host "   3. 自动化部署脚本创建" -ForegroundColor Green
Write-Host "   4. 数据库SQL脚本生成" -ForegroundColor Green
Write-Host "   5. Python环境检查" -ForegroundColor Green
Write-Host "   6. 系统监控工具创建" -ForegroundColor Green
Write-Host ""
Write-Host "📋 下一步操作:" -ForegroundColor Yellow
Write-Host "   1. 手动登录n8n导入工作流 (如果未自动导入)" -ForegroundColor Yellow
Write-Host "   2. 配置数据库 (运行桌面SQL脚本)" -ForegroundColor Yellow
Write-Host "   3. 使用监控工具检查系统状态" -ForegroundColor Yellow
Write-Host "   4. 等待系统自动运行" -ForegroundColor Yellow
Write-Host ""
Write-Host "⏰ 系统运行时间线:" -ForegroundColor Cyan
Write-Host "   - 数据采集: 每5分钟执行" -ForegroundColor Cyan
Write-Host "   - AI分析: 每小时执行" -ForegroundColor Cyan
Write-Host "   - 首次执行: 导入后立即开始" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 明天关键时间点:" -ForegroundColor Magenta
Write-Host "   07:30 - 财经早报系统首次运行" -ForegroundColor Magenta
Write-Host "   全天 - AI选股系统自动化运行" -ForegroundColor Magenta
Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")