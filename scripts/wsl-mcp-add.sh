#!/bin/sh
export PATH="/root/.local/bin:$PATH"
echo "n" | timeout 90 hermes mcp add aibrand --url "http://172.22.32.1:3099/api/mcp" 2>&1
echo "EXIT=$?"
echo "=== list ==="
timeout 30 hermes mcp list 2>&1