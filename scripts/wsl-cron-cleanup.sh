#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 清理测试 cron ==="
timeout 20 hermes cron remove 277a1ade2bcf 2>&1 | head -3
timeout 20 hermes cron list 2>&1 | head -8
echo "=== 保留常驻服务状态确认 ==="
timeout 15 hermes cron status 2>&1 | head -4
echo "=== serve 仍运行 ==="
curl -s -o /dev/null -w "serve 9119: %{http_code}\n" --max-time 5 http://127.0.0.1:9119/ 2>&1