#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== cron status (systemd 托管的 gateway) ==="
timeout 15 hermes cron status 2>&1 | head -5
echo "=== serve 响应 ==="
curl -s -o /dev/null -w "serve 9119: %{http_code}\n" --max-time 5 http://127.0.0.1:9119/ 2>&1
echo "=== enabled 列表确认开机自启 ==="
systemctl is-enabled hermes-gateway.service 2>&1
systemctl is-enabled hermes-serve.service 2>&1
echo "=== 端口确认 ==="
ss -tlnp 2>/dev/null | grep -E "9119|18788" | head -4