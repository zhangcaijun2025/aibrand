#!/bin/sh
echo "=== PID 1 ==="
ps -p 1 -o comm= 2>&1
echo "=== systemd 存在? ==="
command -v systemctl 2>&1
ls /usr/lib/systemd/system 2>/dev/null | head -3
echo "=== /etc/wsl.conf ==="
cat /etc/wsl.conf 2>&1
echo "=== init 系统 ==="
ls -la /sbin/init 2>&1