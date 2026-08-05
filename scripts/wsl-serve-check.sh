#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== hermes 版本 ==="
hermes --version 2>&1
echo "=== 当前监听端口 ==="
ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo "无 ss/netstat"
echo "=== 进程 ==="
ps aux 2>/dev/null | grep -i hermes | grep -v grep | head -5