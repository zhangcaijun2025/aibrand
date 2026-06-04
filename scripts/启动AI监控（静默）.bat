@echo off
chcp 65001 >nul
title AI 服务监控（静默运行）
echo 🔇 AI 服务健康监控 · 静默运行中
echo.
echo 仪表盘已打开，可最小化此窗口。
echo 关闭此窗口不会关闭浏览器。
echo.
start /MIN msedge "file:///C:/Users/XIAOMI/Desktop/AI%20%E5%B7%A5%E4%BD%9C%E5%8F%B0.html"
timeout /t 5 >nul
exit
