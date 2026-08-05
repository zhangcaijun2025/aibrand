#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== serve 根路径响应 (之前确认过) ==="
curl -s --max-time 5 http://127.0.0.1:9119/ 2>&1
echo ""
echo "=== 探测常见端点 ==="
for p in /jsonrpc /api /api/rpc /ws /rpc/ /v1/rpc; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 4 -X POST http://127.0.0.1:9119$p -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}' 2>&1)
  echo "$p => $code"
done
echo "=== 日志追加内容 ==="
cat /tmp/hermes-serve.log 2>&1 | tail -5