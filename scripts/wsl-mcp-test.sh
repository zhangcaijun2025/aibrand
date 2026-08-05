#!/bin/sh
export PATH="/root/.local/bin:$PATH"
echo "=== mcp test aibrand ==="
timeout 60 hermes mcp test aibrand 2>&1
echo "EXIT=$?"
echo "=== mcp list ==="
timeout 30 hermes mcp list 2>&1