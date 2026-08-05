#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 重写 watchdog 脚本 (正确转义) ==="
printf '#!/bin/sh\necho "P4-D watchdog OK at $(date)"\n' > ~/.hermes/scripts/p4d-watchdog.sh
cat ~/.hermes/scripts/p4d-watchdog.sh
echo "=== 手动执行 ==="
sh ~/.hermes/scripts/p4d-watchdog.sh 2>&1
echo "=== cron list 看 job 状态 ==="
timeout 20 hermes cron list 2>&1 | head -20
echo "=== cron status ==="
timeout 15 hermes cron status 2>&1 | head -5