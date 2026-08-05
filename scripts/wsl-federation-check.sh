#!/bin/sh
export PATH="/root/.local/bin:$PATH"
export PATH="/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== WSL 数据目录独立性 ==="
ls ~/.hermes/ 2>&1 | head -8
echo "=== 宿主数据目录未被触碰 (经 /mnt/c) ==="
ls /mnt/c/Users/XIAOMI/AppData/Local/hermes/ 2>&1 | head -8
echo "=== WSL Hermes 完整能力清单 ==="
timeout 30 hermes --help 2>&1 | head -30