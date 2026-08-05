#!/bin/sh
echo "=== daemon-reload + enable ==="
systemctl daemon-reload 2>&1
systemctl enable hermes-gateway.service 2>&1
systemctl enable hermes-serve.service 2>&1
echo "=== 停掉手动进程 (1420 gateway / 1176 serve) ==="
kill 1420 2>/dev/null; sleep 2
kill 1176 2>/dev/null; sleep 2
ps aux 2>/dev/null | grep -E "hermes (gateway|serve)" | grep -v grep | head -3
echo "=== systemd 启动 ==="
systemctl start hermes-gateway.service 2>&1
systemctl start hermes-serve.service 2>&1
sleep 5
echo "=== 状态 ==="
systemctl status hermes-gateway.service 2>&1 | head -8
systemctl status hermes-serve.service 2>&1 | head -8