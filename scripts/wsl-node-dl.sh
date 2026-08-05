#!/bin/sh
# 修正: 提取 vX.Y.Z (去引号)
VER=$(awk 'match($0, /"version":"v([0-9.]+)"/){print substr($0, RSTART+11, RLENGTH-12)}' /tmp/node-index.json | head -1)
echo "VER=$VER"
cd /tmp
echo "=== 下载 .tar.gz ==="
curl -s -L -o node.tar.gz "https://nodejs.org/dist/$VER/node-$VER-linux-x64.tar.gz" --max-time 300
ls -la /tmp/node.tar.gz
echo "=== 解压 (gzip) ==="
tar xzf node.tar.gz -C /opt 2>&1 || echo "tar fail"
ls /opt/ 2>&1