#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 进程存活确认 ==="
ps aux 2>/dev/null | grep -E "hermes serve" | grep -v grep
echo "=== /api/rpc 401 响应体 ==="
curl -s --max-time 5 -X POST http://127.0.0.1:9119/api/rpc -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}' 2>&1
echo ""
echo "=== hermes serve --status ==="
timeout 15 hermes serve --status 2>&1