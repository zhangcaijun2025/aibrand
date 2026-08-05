#!/bin/sh
export PATH="/root/.local/bin:$PATH"
export PATH="/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== WSL Hermes 调 AiBrand MCP 工具 (dashboard_overview) ==="
timeout 120 hermes -z '请使用 MCP 工具 aibrand 的 dashboard_overview 获取 AiBrand 平台仪表盘总览数据，然后简要汇报核心指标。' 2>&1
echo "EXIT=$?"