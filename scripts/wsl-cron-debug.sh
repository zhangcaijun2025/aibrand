#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 脚本内容确认 ==="
cat ~/.hermes/scripts/p4d-watchdog.sh 2>&1
echo "=== 手动执行脚本 ==="
sh ~/.hermes/scripts/p4d-watchdog.sh 2>&1
echo "EXIT=$?"
echo "=== 再触发一次带详情 ==="
timeout 40 hermes cron run 0b8203980875 2>&1 | head -8
echo "=== runs 详细 ==="
timeout 20 hermes cron runs 0b8203980875 2>&1 | head -20