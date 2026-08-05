#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== cron 子命令帮助 ==="
timeout 20 hermes cron --help 2>&1 | head -25
echo "=== acp --version ==="
timeout 15 hermes acp --version 2>&1