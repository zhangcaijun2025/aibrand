#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 后台启动 gateway run ==="
nohup hermes gateway run > /tmp/hermes-gateway.log 2>&1 &
echo "GWPID=$!"
sleep 8
echo "=== gateway 日志 ==="
cat /tmp/hermes-gateway.log 2>&1 | head -25
echo "=== cron status 复查 ==="
timeout 15 hermes cron status 2>&1 | head -6