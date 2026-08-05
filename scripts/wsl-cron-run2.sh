#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== cron run --help ==="
timeout 15 hermes cron run --help 2>&1 | head -12
echo "=== 用 job id 触发 watchdog ==="
timeout 40 hermes cron run 0b8203980875 2>&1 | head -10
echo "=== runs 历史 ==="
timeout 20 hermes cron runs 0b8203980875 2>&1 | head -12