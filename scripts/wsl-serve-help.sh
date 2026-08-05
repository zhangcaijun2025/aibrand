#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== hermes serve --help ==="
timeout 20 hermes serve --help 2>&1 | head -25
echo "=== hermes gateway --help ==="
timeout 20 hermes gateway --help 2>&1 | head -15