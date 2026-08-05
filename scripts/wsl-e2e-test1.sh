#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 端到端测试 1: 综合任务 (健康+内容生成+质检) ==="
timeout 180 hermes -z '请依次完成以下任务并汇总:
1. 调用 MCP 工具 aibrand 的 system_health 检查平台健康状态
2. 调用 content_generate 生成一篇主题为"夏日清凉饮品推荐"的小红书文案(platform=xhs)
3. 调用 quality_check 对生成的文案做质量评分
最后用中文总结三步结果。' 2>&1
echo "EXIT=$?"