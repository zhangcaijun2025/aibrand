#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== cron status ==="
timeout 20 hermes cron status 2>&1 | head -8
echo "=== 手动 tick (触发到期任务) ==="
timeout 30 hermes cron tick 2>&1 | head -10
echo "=== watchdog 任务手动 run ==="
timeout 30 hermes cron run --name p4d-watchdog 2>&1 | head -8 || timeout 30 hermes cron run p4d-watchdog 2>&1 | head -8