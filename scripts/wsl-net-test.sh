#!/bin/sh
echo "=== 路由表 ==="
cat /proc/net/route
echo "=== 试 172.22.32.1 (宿主 docker 网段 IP) ==="
curl -s -o /dev/null -w 'bridge-172.22.32.1: %{http_code}\n' http://172.22.32.1:18791/health --max-time 6
curl -s -o /dev/null -w 'web-172.22.32.1: %{http_code}\n' http://172.22.32.1:3099/api/health --max-time 6
echo "=== 试 26.26.26.1 ==="
curl -s -o /dev/null -w 'bridge-26.26.26.1: %{http_code}\n' http://26.26.26.1:18791/health --max-time 6