---
name: aibrand-studio
description: AiBrand Studio 业务能力总入口。当用户提到 品牌/内容/数据/GEO/SEO/发布/Council/Agent 协作/运营/Dashboard/视觉/视频/打开组件 等业务需求时调用。也可作为统一路由入口,会自动分发到 aibrand-content/aibrand-dashboard/aibrand-geo/aibrand-publish/aibrand-council/aibrand-visual/aibrand-navigation 子 skill.
version: 0.2.0
author: AiBrand Studio
---

## When to Use

**触发条件**（满足任一即调用）：
- 任何与 AiBrand Studio 业务相关的请求
- 用户提到 品牌/内容/数据/GEO/SEO/发布/Council/视觉/视频/编辑器/Dashboard 等关键词
- 不确定走哪个子 skill 时,先走本总入口

## How to Invoke

调用 AiBrand unified-chat API（OpenClaw 在主机运行直接访问本机）:

```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"<用户原始消息>","context":{"platform":"feishu","source":"openclaw","session_id":"<feishu open_id>","user_id":"<feishu open_id>"}}'
```

**参数说明**：
- `127.0.0.1:3099` — AiBrand Web 容器（nginx → Next.js API route）
- `aibrand_token=dev_auto_login_token` — 开发模式自动登录 token
- `message` — 用户原始消息（保留 @mention 等格式）
- `context.platform` — 来源平台（feishu/dingtalk/wecom）
- `context.source` — 固定 "openclaw"（触发平台感知路由）

## 子 Skill 路由表

unified-chat 端点会自动路由到对应业务模块。如果需要直接调用子 skill，参考下表：

| 子 Skill | 触发关键词 | 主要能力 |
|---|---|---|
| aibrand-content | 写文案/文章/脚本/广告/营销 | 内容创作、改写、润色 |
| aibrand-dashboard | 运营数据/Dashboard/报表/KPI | 数据查询、质量监控、系统监控 |
| aibrand-geo | GEO/SEO/搜索排名/关键词 | 搜索优化、权威度、情绪监控 |
| aibrand-publish | 发布/分发/多平台/一键发布 | 多平台发布、任务管理、评论 |
| aibrand-council | @部门/Council/多 Agent/协作 | 团队协作、Agent 调度 |
| aibrand-visual | 生成图片/视频/配音/ComfyUI | 视觉生成、编辑器 |
| aibrand-navigation | 打开/跳转到 Dashboard/编辑器 | 组件打开、深度链接 |

## Response Handling

API 响应格式：

```json
{
  "code": 0,
  "data": {
    "reply": "<业务回复文本>",
    "intent": "<识别的意图>",
    "source": "local" | "openclaw",
    "meta": { "routeTarget": "local"|"openclaw", "latencyMs": 123 }
  }
}
```

**处理规则**：
1. **成功**（`code === 0` 且 `data.reply` 非空）：提取 `data.reply` 返回用户
2. **空回复**（`data.reply` 为空）：说明 AiBrand 判定为闲聊，OpenClaw 自行用 LLM 回复
3. **API 错误**（`code !== 0` 或 HTTP 非 200）：告诉用户 "AiBrand 业务引擎暂时不可用，我先用通用能力回复您"
4. **网络超时**（10 秒）：同 API 错误处理

## Examples

**用户**：帮我写一篇关于 AI 品牌的公众号文章

**Action**：
```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"帮我写一篇关于 AI 品牌的公众号文章","context":{"platform":"feishu","source":"openclaw"}}'
```

**Response**：提取 `data.reply` 返回用户，可能包含完整文章草稿。

## Related Skills

- aibrand-content: 内容创作
- aibrand-dashboard: 数据看板
- aibrand-geo: GEO/SEO 优化
- aibrand-publish: 多平台发布
- aibrand-council: Council Agent 协作
- aibrand-visual: 视觉/视频生成
- aibrand-navigation: 组件打开/页面导航

## Related

- [OpenClaw Skills 文档](https://docs.openclaw.ai/cli/skills)
