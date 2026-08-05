#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 重启 gateway 服务 ==="
systemctl restart hermes-gateway.service 2>&1
sleep 8
echo "=== 新状态 ==="
systemctl is-active hermes-gateway.service 2>&1
timeout 15 hermes cron status 2>&1 | head -5
echo "=== 进程 ==="
ps aux 2>/dev/null | grep "hermes gateway" | grep -v grep | awk '{print $2}'