#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== WSL Hermes systemd ==="
systemctl is-active hermes-gateway.service hermes-serve.service 2>&1
echo "=== gateway cron ticker ==="
timeout 15 hermes cron status 2>&1 | head -4
echo "=== MCP ==="
timeout 30 hermes mcp test aibrand 2>&1 | tail -2
echo "=== serve 9119 ==="
curl -s -o /dev/null -w "serve: %{http_code}\n" --max-time 5 http://127.0.0.1:9119/ 2>&1