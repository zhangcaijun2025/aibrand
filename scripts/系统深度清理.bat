@echo off
echo ======================================
echo  Windows 深度清理 & 系统加速
echo  双击运行，全程自动，请勿关闭窗口
echo ======================================
echo.

echo [1/10] 启动磁盘清理工具
cleanmgr

echo.
echo [2/10] 扫描并修复系统文件
sfc /scannow

echo.
echo [3/10] 修复系统映像
DISM /Online /Cleanup-Image /RestoreHealth

echo.
echo [4/10] 清理用户临时文件
del /f /s /q "%temp%\*" 2>nul

echo.
echo [5/10] 清理系统临时文件
del /f /s /q "C:\Windows\Temp\*" 2>nul

echo.
echo [6/10] 重置 Windows 更新缓存
net stop wuauserv
rd /s /q "C:\Windows\SoftwareDistribution\Download" 2>nul
net start wuauserv

echo.
echo [7/10] 重启资源管理器（界面秒刷新）
taskkill /f /im explorer.exe
start explorer.exe

echo.
echo [8/10] 关闭休眠文件，释放C盘空间
powercfg -h off

echo.
echo [9/10] 深度清理系统冗余组件
DISM /Online /Cleanup-Image /StartComponentCleanup

echo.
echo ======================================
echo  清理完成！建议重启电脑效果更佳
echo ======================================
echo.
pause