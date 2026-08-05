#!/bin/sh
echo "=== which uv ==="
command -v uv 2>&1
command -v hermes 2>&1
echo "=== /usr/local/bin ==="
ls /usr/local/bin/ 2>&1
echo "=== ~/.local/bin ==="
ls /root/.local/bin/ 2>&1
echo "=== uv 位置 ==="
ls -la /usr/local/bin/uv /usr/local/bin/uvx 2>&1