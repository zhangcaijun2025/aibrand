#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== JSON-RPC ping ==="
echo '{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}' | curl -s --max-time 8 -X POST http://127.0.0.1:9119/rpc -H "Content-Type: application/json" -d @- 2>&1 | head -3
echo "=== 尝试 status 方法 ==="
echo '{"jsonrpc":"2.0","id":2,"method":"server.info","params":{}}' | curl -s --max-time 8 -X POST http://127.0.0.1:9119/rpc -H "Content-Type: application/json" -d @- 2>&1 | head -3
echo "=== 宿主能否访问 (经 172.22.32.1) ==="
curl -s -o /dev/null -w "host->9119: %{http_code}\n" --max-time 5 http://172.22.32.1:9119/ 2>&1