#!/bin/sh
echo "=== apt update (快速) ==="
timeout 60 apt-get update 2>&1 | tail -5
echo "=== 装 libatomic1 ==="
timeout 90 apt-get install -y libatomic1 2>&1 | tail -5
echo "EXIT=$?"
echo "=== 验证 ==="
ldconfig -p 2>/dev/null | grep atomic
/opt/node-v26.6.0-linux-x64/bin/node --version 2>&1