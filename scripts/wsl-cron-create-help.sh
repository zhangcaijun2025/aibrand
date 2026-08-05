#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== cron create 帮助 ==="
timeout 20 hermes cron create --help 2>&1 | head -30