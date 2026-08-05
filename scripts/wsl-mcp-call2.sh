#!/bin/sh
export PATH="/root/.local/bin:$PATH"
export PATH="/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 交叉验证: system_health + quality_alerts ==="
timeout 120 hermes -z '请使用 MCP 工具 aibrand 分别调用 system_health 和 quality_alerts，汇报 15 模块健康状态与当前质量预警。' 2>&1
echo "EXIT=$?"