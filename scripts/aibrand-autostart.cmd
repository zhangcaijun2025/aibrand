@echo off
REM AiBrand 开机自启 - 启动 Docker Desktop 并拉起容器
REM 由 Windows 启动文件夹触发 (Shell:Startup)
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\king2046\scripts\aibrand-autostart.ps1"
