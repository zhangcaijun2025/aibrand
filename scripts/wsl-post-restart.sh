#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 重启后服务进程 ==="
ps aux 2>/dev/null | grep -E "hermes (gateway|serve)" | grep -v grep
echo "=== cron status ==="
timeout 15 hermes cron status 2>&1 | head -4
echo "=== serve 9119 ==="
curl -s -o /dev/null -w "serve: %{http_code}\n" --max-time 5 http://127.0.0.1:9119/ 2>&1
echo "=== MCP 仍可用 ==="
timeout 30 hermes mcp test aibrand 2>&1 | head -6