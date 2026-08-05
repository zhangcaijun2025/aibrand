#!/bin/sh
cd /tmp
echo "=== 续传下载 (C -) ==="
curl -s -L -C - -o node.tar.gz "https://nodejs.org/dist/v26.6.0/node-v26.6.0-linux-x64.tar.gz" --max-time 600 --retry 3
echo "curl done: $?"
ls -la /tmp/node.tar.gz
echo "=== 完整性校验 (tar tzf 首 5 行) ==="
tar tzf node.tar.gz 2>&1 | head -5
echo "=== 解压 ==="
tar xzf node.tar.gz -C /opt 2>&1 && echo "extract OK"
ls /opt/node-v26.6.0-linux-x64/bin/ 2>&1