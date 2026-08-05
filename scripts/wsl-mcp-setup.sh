#!/bin/sh
echo "=== 配 PATH 持久化 ==="
echo 'export PATH="/opt/node-v26.6.0-linux-x64/bin:$PATH"' >> /root/.bashrc
export PATH="/opt/node-v26.6.0-linux-x64/bin:$PATH"
node --version
echo "=== 复制 aibrand-mcp-server.mjs ==="
mkdir -p /root/scripts
cp /mnt/d/king2046/scripts/aibrand-mcp-server.mjs /root/scripts/
ls -la /root/scripts/
echo "=== 检查脚本头部 ==="
head -20 /root/scripts/aibrand-mcp-server.mjs 2>&1 || awk 'NR<=20' /root/scripts/aibrand-mcp-server.mjs