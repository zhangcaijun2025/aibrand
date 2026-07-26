---
name: aibrand-publish
description: AiBrand 多平台一键发布。发布到公众号/视频号/抖音/小红书/快手/B站/知乎/微博. 多平台分发/同步发布/群发/定时发布/发布规则/发布任务管理. Use when user mentions 发布/分发/推送/同步到/群发/多平台/一键发布/publish/发布到公众号/发布到抖音.
version: 0.1.0
author: AiBrand Studio
---

## When to Use

**触发条件**（满足任一即调用）：
- 发布到公众号/视频号/抖音/小红书/快手/B站/知乎/微博
- 一键发布/多平台发布/同步发布/批量发布
- 群发/广播/分发到各平台
- 定时发布/发布任务/发布计划
- 发布规则/发布策略/智能发布
- 发布确认/发布进度/发布历史
- 自动发布/发布管道

## How to Invoke

### 方式1: 通过 unified-chat（推荐）

```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"<用户原始消息>","context":{"platform":"feishu","source":"openclaw","skill":"publish"}}'
```

### 方式2: 直接调用发布端点

| 功能 | 端点 | 方法 |
|---|---|---|
| 发布总入口 | `/api/publish` | POST |
| 智能发布 | `/api/publish/smart` | POST |
| 自动发布 | `/api/publish/auto` | POST |
| 发布确认 | `/api/publish/confirm` | POST |
| 发布管道 | `/api/publish/pipeline` | POST |
| 发布规则 | `/api/publish/rules` | GET/POST |
| 发布任务 | `/api/publish/tasks` | GET/POST |
| 任务进度 | `/api/publish/tasks/{id}/progress` | GET |
| 任务完成 | `/api/publish/tasks/{id}/complete` | POST |
| Agent 发布 | `/api/publish/agent` | POST |
| 工作区草稿 | `/api/workspace/drafts` | GET/POST |
| 草稿操作 | `/api/workspace/drafts/{id}` | GET/PUT/DELETE |
| 工作区发布 | `/api/workspace/publish` | POST |
| 发布记录 | `/api/workspace/publish-records` | GET |
| 频道账号 | `/api/channels/accounts` | GET |
| 绑定频道 | `/api/channels/bind` | POST |
| 同步账号 | `/api/channels/accounts/sync` | POST |
| 评论管理 | `/api/channels/comments` | GET |
| 回复评论 | `/api/channels/comments/reply` | POST |
| 发评论 | `/api/channels/comments/send` | POST |
| 评论规则 | `/api/channels/comments/rules` | GET/POST |
| 评论统计 | `/api/channels/comments/stats` | GET |

调用示例：
```
exec curl -s -X POST http://127.0.0.1:3099/api/publish/smart \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"content":"<内容>","platforms":["wechat","douyin","xiaohongshu"],"schedule":"now"}'
```

## Response Handling

- 发布成功 → "✅ 已发布到: 公众号、抖音、小红书"
- 发布失败 → "❌ [平台] 失败原因: xxx"
- 部分成功 → "⚠️ 成功: X, 失败: Y, 详情: ..."
- 任务创建 → "📋 任务 ID: xxx, 进度: 0%, 完成后会通知"

## Examples

**用户**：把这篇文案发布到公众号和抖音

**Action**：
```
exec curl -s -X POST http://127.0.0.1:3099/api/publish \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"content":"<内容>","platforms":["wechat","douyin"]}'
```

**用户**：查看发布任务状态

**Action**：
```
exec curl -s -H "Cookie: aibrand_token=dev_auto_login_token" http://127.0.0.1:3099/api/publish/tasks
```

## Related

- aibrand-content: 发布前先创作内容
- aibrand-dashboard: 查看发布后的数据表现
