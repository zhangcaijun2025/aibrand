#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 创建 agent cron (30m 后) ==="
timeout 30 hermes cron create "30m" "P4-D 常驻验证: 请确认 WSL Hermes cron 调度正常, 用一句话回复" --name p4d-verify-agent --repeat 1 2>&1 | head -8
echo "=== 创建 watchdog 脚本 cron (每小时) ==="
mkdir -p ~/.hermes/scripts
echo "#!/bin/sh
echo 'P4-D watchdog OK at \$(date)'" > ~/.hermes/scripts/p4d-watchdog.sh
chmod +x ~/.hermes/scripts/p4d-watchdog.sh
timeout 30 hermes cron create "every 1h" "" --name p4d-watchdog --script p4d-watchdog.sh --no-agent --repeat 1 2>&1 | head -8
echo "=== cron list ==="
timeout 20 hermes cron list 2>&1 | head -15