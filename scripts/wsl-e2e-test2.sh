#!/bin/sh
export PATH="/root/.local/bin:/opt/node-v26.6.0-linux-x64/bin:$PATH"
echo "=== 端到端: content_generate → quality_check 全链路 ==="
timeout 180 hermes -z '请调用 MCP 工具 aibrand 完成以下两步并汇总:
1. content_generate: 生成主题为"夏日清凉饮品推荐"的小红书文案 (platform=xhs)
2. quality_check: 用第一步返回的创作任务文案做质量评分
最后用中文总结两步结果(第2步如无法拿到文案就说明原因, 不要编造)。' 2>&1
echo "EXIT=$?"