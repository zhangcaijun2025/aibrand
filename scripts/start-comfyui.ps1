# ============================================================
# ComfyUI 本地引擎启动脚本 (P1)
# 引擎: SD1.5 + PyTorch DirectML (Intel Arc iGPU, 无 CUDA)
# 端口: 8188 (AiBrand 统一网关 /api/comfy + nginx /comfy/ 代理)
# 幂等: 端口已监听则直接退出, 不重复拉起
# ============================================================

$comfyDir = "D:\king2046\tools\comfyui"
$venvPy = Join-Path $comfyDir "venv\Scripts\python.exe"
$logDir = "D:\king2046\logs"
$stdoutLog = Join-Path $logDir "comfyui.out.log"
$stderrLog = Join-Path $logDir "comfyui.err.log"
$pidFile = Join-Path $logDir "comfyui.pid"
$port = 8188

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path (Join-Path $logDir "comfyui-start.log") -Value "[$ts] $msg"
}

# 已运行则跳过
$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    Write-Log "ComfyUI already listening on :$port, skip start"
    exit 0
}

if (-not (Test-Path $venvPy)) {
    Write-Log "ERROR: venv python not found: $venvPy"
    exit 1
}

# 清理旧 pid (进程已退出)
if (Test-Path $pidFile) {
    $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($oldPid -and -not (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
        Remove-Item $pidFile -Force
    }
}

Write-Log "Starting ComfyUI (DirectML, port $port)..."
$proc = Start-Process $venvPy `
    -ArgumentList "main.py", "--directml", "--port", "$port", "--use-pytorch-cross-attention", "--lowvram" `
    -WorkingDirectory $comfyDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

$proc.Id | Set-Content $pidFile
Write-Log "ComfyUI started, PID=$($proc.Id), log=$stdoutLog"
