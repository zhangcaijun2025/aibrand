# AiBrand Studio - Install/Uninstall Boot Auto-Start Shortcut
# Creates a .lnk in the Windows Startup folder pointing to the VBS launcher
# Usage:
#   .\install-autostart.ps1            # Install
#   .\install-autostart.ps1 -Uninstall # Remove

param([switch]$Uninstall)

$ErrorActionPreference = "Stop"

$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath  = Join-Path $startupFolder 'AiBrand AutoStart.lnk'
$vbsPath       = 'D:\king2046\scripts\aibrand-autostart.vbs'

if ($Uninstall) {
    if (Test-Path $shortcutPath) {
        Remove-Item $shortcutPath -Force
        Write-Host "Removed startup shortcut:" -ForegroundColor Green
        Write-Host "  $shortcutPath" -ForegroundColor Cyan
    } else {
        Write-Host "Not installed (no shortcut found):" -ForegroundColor Yellow
        Write-Host "  $shortcutPath" -ForegroundColor Cyan
    }
    exit 0
}

# ── Install ──
if (-not (Test-Path $vbsPath)) {
    Write-Host "ERROR: VBS launcher not found: $vbsPath" -ForegroundColor Red
    exit 1
}

$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($shortcutPath)
$lnk.TargetPath       = 'wscript.exe'
$lnk.Arguments        = "`"$vbsPath`""
$lnk.WorkingDirectory = 'D:\king2046\scripts'
$lnk.WindowStyle      = 7   # minimized
$lnk.Description      = 'AiBrand Studio Full Stack Auto-Start'
$lnk.IconLocation     = 'shell32.dll,13'
$lnk.Save()

Write-Host "Created startup shortcut:" -ForegroundColor Green
Write-Host "  $shortcutPath" -ForegroundColor Cyan
Write-Host "  -> $vbsPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run with -Uninstall to remove." -ForegroundColor Yellow
Write-Host ""

Write-Host "Current Startup folder entries:" -ForegroundColor Yellow
Get-ChildItem -Path $startupFolder | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
