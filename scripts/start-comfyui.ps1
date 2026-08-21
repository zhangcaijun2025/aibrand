# ============================================================
# ComfyUI 本地引擎启动/守护脚本 v3 (2026-08-21 硬件适配)
#
# 硬件: Intel Core Ultra 5 125H (14C/18T) + Intel Arc iGPU 1024MB 共享
#       + 32GB RAM + DirectML (无 CUDA) + D盘 456GB
# 引擎: ComfyUI 0.7.0 + PyTorch 2.4.1+cpu + torch-directml
# 端口: 8188 (AiBrand 统一网关 /api/comfy + nginx /comfy/ 代理)
#
# 参数调优依据 (本机 1GB 显存实测):
#   --lowvram                 1GB 显存: 低显存模式 (SD1.5 fp16 够用)
#   --use-pytorch-cross-attention  DirectML 下 PyTorch 原生 attention 稳定
#   --cpu-vae                 VAE 解码放 CPU (1GB 显存不足时防止 OOM)
#   --windows-standalone-build 分离进程/后台运行的官方支持开关
#   --cache-none              关闭模型缓存, 省内存 (32GB 下可选)
#
# 使用:
#   .\start-comfyui.ps1              前台 (调试)
#   .\start-comfyui.ps1 -Daemon      后台 (Start-Process, 推荐)
#   .\start-comfyui.ps1 -Watch       循环守护 (进程退出自动拉起)
# ============================================================

param(
    [switch]$Daemon,
    [switch]$Watch
)

$comfyDir  = "D:\king2046\tools\comfyui"
$venvPy    = Join-Path $comfyDir "venv\Scripts\python.exe"
$logDir    = "D:\king2046\logs"
$stdoutLog = Join-Path $logDir "comfyui.out.log"
$stderrLog = Join-Path $logDir "comfyui.err.log"
$pidFile   = Join-Path $logDir "comfyui.pid"
$port      = 8188

# ── 硬件适配参数 (合法子集, 经 usage 校验) ──
$argsList = @(
    "main.py",
    "--listen", "0.0.0.0",
    "--port", "$port",
    "--directml",
    "--lowvram",
    "--use-pytorch-cross-attention",
    "--cpu-vae",
    "--windows-standalone-build",
    "--cache-none"
)

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path (Join-Path $logDir "comfyui-start.log") -Value "[$ts] $msg"
    Write-Host "[$ts] $msg"
}

# 幂等: 已监听则退出
$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    Write-Log "ComfyUI already listening on :$port (PID $($listening[0].OwningProcess)), skip"
    exit 0
}

if (-not (Test-Path $venvPy)) {
    Write-Log "ERROR: venv python not found: $venvPy"
    exit 1
}

# 清理失效 pid
if (Test-Path $pidFile) {
    $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($oldPid -and -not (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
        Remove-Item $pidFile -Force
        Write-Log "清理失效 pid: $oldPid"
    }
}

function Start-ComfyDaemon {
    Write-Log "Starting ComfyUI (daemon, port $port)..."
    $proc = Start-Process $venvPy `
        -ArgumentList $argsList `
        -WorkingDirectory $comfyDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog `
        -PassThru
    $proc.Id | Set-Content $pidFile
    Write-Log "ComfyUI daemon started, PID=$($proc.Id)"
    return $proc.Id
}

if ($Watch) {
    Write-Log "Watch mode enabled — 进程退出自动拉起"
    while ($true) {
        $newPid = Start-ComfyDaemon
        Write-Log "等待 ComfyUI (PID $newPid)..."
        while (Get-Process -Id $newPid -ErrorAction SilentlyContinue) {
            Start-Sleep -Seconds 5
        }
        Write-Log "ComfyUI (PID $newPid) 已退出, 5s 后重启..."
        Start-Sleep -Seconds 5
    }
}

if ($Daemon) {
    Start-ComfyDaemon
} else {
    # 前台调试
    Write-Log "Starting ComfyUI (foreground, port $port)..."
    Push-Location $comfyDir
    & $venvPy $argsList
    Pop-Location
}
