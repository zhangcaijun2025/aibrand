---
name: aibrand-content
description: AiBrand 内容创作能力。写文案/文章/脚本/广告/营销文案/公众号/视频号/抖音/小红书/播客脚本。Use when user mentions 写文案/写文章/写脚本/公众号/视频号/抖音/小红书/营销文案/广告文案/播客/rewrite/改写/润色/扩写/缩写.
version: 0.1.0
author: AiBrand Studio
---

## When to Use

**触发条件**（满足任一即调用）：
- 写文案/写文章/写脚本/写广告/写营销文案
- 公众号文章/视频号脚本/抖音文案/小红书文案/快手文案/B站文案
- 改写/润色/扩写/缩写/重写/rewrite
- 内容策略/内容模板/内容风格
- 播客脚本/视频脚本/直播脚本
- 文案完整性检查/内容提取

## How to Invoke

调用 AiBrand unified-chat API，message 字段携带用户原始消息：

```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"<用户原始消息>","context":{"platform":"feishu","source":"openclaw","skill":"content","session_id":"<feishu open_id>","user_id":"<feishu open_id>"}}'
```

## Direct API Endpoints (高级用法)

如需直接调用具体端点（绕过路由）：

| 功能 | 端点 | 方法 |
|---|---|---|
| 内容生成 | `/api/content/generate` | POST |
| 内容改写 | `/api/content/rewrite` | POST |
| 内容策略 | `/api/content/strategy` | POST |
| 内容风格 | `/api/content/style` | POST |
| 内容模板 | `/api/content/templates` | GET |
| 内容提取 | `/api/content/extract` | POST |
| 完整性检查 | `/api/content/completeness` | POST |
| 文案编辑器 | `/api/editor/copywriting` | POST |
| 上传内容 | `/api/content/upload` | POST |

调用示例：
```
exec curl -s -X POST http://127.0.0.1:3099/api/content/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"type":"wechat_article","topic":"<主题>","style":"<风格>","length":"<字数>"}'
```

## Response Handling

成功时提取 `data.reply` 返回用户。如果返回内容包含完整文章/脚本，用 markdown 格式化输出。

## Examples

**用户**：帮我写一篇关于 AI 助手的公众号文章，主题是"AI 重塑品牌增长"

**Action**：
```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"帮我写一篇关于 AI 助手的公众号文章,主题是AI重塑品牌增长","context":{"platform":"feishu","source":"openclaw","skill":"content"}}'
```

## Related

- aibrand-dashboard: 查看内容数据表现
- aibrand-publish: 内容写完后一键发布
- aibrand-visual: 配图/视频生成
