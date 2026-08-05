#!/bin/sh
echo "=== 测 nodejs.org ==="
curl -s -o /dev/null -w 'nodejs.org: %{http_code}\n' https://nodejs.org/dist/latest/ --max-time 10
echo "=== 测 npmmirror ==="
curl -s -o /dev/null -w 'npmmirror: %{http_code}\n' https://registry.npmmirror.com/-/binary/node/latest/ --max-time 10
echo "=== 测 github node releases ==="
curl -s -o /dev/null -w 'github-node: %{http_code}\n' -L https://github.com/nodejs/node/releases/latest --max-time 10