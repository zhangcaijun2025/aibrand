#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 最终端到端: system_health → content_generate(文案) → quality_check ==="
timeout 240 hermes -z '请依次调用 aibrand MCP 工具完成三步并汇总:
1. system_health 检查平台健康
2. content_generate 生成主题"夏日清凉饮品推荐"的小红书文案 (platform=xhs, contentType=copywriting, style=清爽活泼, keywords=冷饮,柠檬茶,气泡水)
3. quality_check 对第2步返回的创作任务 prompt 文本做质量评分
用中文汇总三步结果, 如实说明每步成功/失败。' 2>&1 | Select-Object -Last 45
echo "EXIT=$?"