#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== hermes cron list ==="
timeout 20 hermes cron list 2>&1 | head -10
echo "=== 添加测试 cron (1次性提醒) ==="
timeout 30 hermes cron add --name "p4d-verify" --at "2026-08-05 17:00" --message "P4-D 常驻验证 cron 测试" 2>&1 | head -10
echo "=== ACP 子命令可用性 ==="
timeout 20 hermes acp --help 2>&1 | head -12