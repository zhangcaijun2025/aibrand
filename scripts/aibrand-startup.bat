@echo off
:: AiBrand Studio Auto-Start Launcher
:: Runs on Windows login, launches PowerShell startup script minimized
chcp 65001 >nul
start "" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\king2046\scripts\aibrand-startup.ps1"
