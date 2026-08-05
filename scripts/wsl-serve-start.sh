#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 启动 hermes serve (后台, 9119) ==="
nohup hermes serve --port 9119 --skip-build > /tmp/hermes-serve.log 2>&1 &
echo "PID=$!"
sleep 6
echo "=== 日志 ==="
cat /tmp/hermes-serve.log 2>&1 | head -20
echo "=== 端口确认 ==="
ss -tlnp 2>/dev/null | grep 9119
echo "=== 本地健康检查 ==="
curl -s -o /dev/null -w "http://127.0.0.1:9119/health => %{http_code}\n" --max-time 5 http://127.0.0.1:9119/health 2>&1
curl -s --max-time 5 http://127.0.0.1:9119/ 2>&1 | head -5