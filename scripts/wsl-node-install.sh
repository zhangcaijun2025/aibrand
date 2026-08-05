#!/bin/sh
echo "=== 复制到 WSL ==="
cp /mnt/d/king2046/scripts/backup/node-v26.6.0-linux-x64.tar.gz /tmp/node.tar.gz
ls -la /tmp/node.tar.gz
echo "=== 校验 ==="
tar tzf /tmp/node.tar.gz > /dev/null 2>&1 && echo "TAR OK" || echo "TAR FAIL"
echo "=== 解压到 /opt ==="
tar xzf /tmp/node.tar.gz -C /opt && echo "extract OK"
ls /opt/node-v26.6.0-linux-x64/bin/
echo "=== 验证 node 可执行 ==="
/opt/node-v26.6.0-linux-x64/bin/node --version