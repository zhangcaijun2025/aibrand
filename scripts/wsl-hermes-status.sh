#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== WSL Hermes systemd 服务 ==="
systemctl is-active hermes-gateway.service hermes-serve.service 2>&1
echo "=== 进程 ==="
ps aux 2>/dev/null | grep -E "hermes (gateway|serve)" | grep -v grep | awk '{print $2, $11, $12, $13, $14}'
echo "=== gateway cron 状态 ==="
timeout 15 hermes cron status 2>&1 | head -4
echo "=== MCP 连接 ==="
timeout 30 hermes mcp test aibrand 2>&1 | tail -3
echo "=== 宿主 bridge 可达性 ==="
curl -s -o /dev/null -w "host-bridge-18791: %{http_code}\n" --max-time 8 http://172.22.32.1:18791/ 2>&1
echo "=== 3099 可达性 ==="
curl -s -o /dev/null -w "aibrand-3099: %{http_code}\n" --max-time 8 http://172.22.32.1:3099/ 2>&1