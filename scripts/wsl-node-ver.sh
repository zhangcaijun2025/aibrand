#!/bin/sh
echo "=== 获取 node 版本号 ==="
curl -s -L https://nodejs.org/dist/index.json --max-time 15 -o /tmp/node-index.json 2>&1
if [ -s /tmp/node-index.json ]; then
  echo "nodejs.org index OK (奇怪, 可能刚才超时)"
  wc -c /tmp/node-index.json
else
  echo "nodejs.org 不可达, 用 github 找版本"
fi
echo "=== github API 最新 release ==="
curl -s https://api.github.com/repos/nodejs/node/releases/latest --max-time 15 -o /tmp/gh-node.json 2>&1
if [ -s /tmp/gh-node.json ]; then
  grep -o '"tag_name": *"[^"]*"' /tmp/gh-node.json | head -1
else
  echo "github api 不可达"
fi