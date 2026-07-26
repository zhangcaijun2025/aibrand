---
name: aibrand-visual
description: AiBrand 视觉/视频生成。生成图片/视频/播客/配音. ComfyUI 工作流/视觉模型/视频编译/图片编辑/播客生成. Use when user mentions 生成图片/生成视频/画图/配图/做视频/视频编译/播客/配音/ComfyUI/视觉生成/图片编辑.
version: 0.1.0
author: AiBrand Studio
---

## When to Use

**触发条件**（满足任一即调用）：
- 生成图片/画图/配图/AI 作图/作画
- 生成视频/做视频/视频生成/视频编译
- 播客/配音/音频生成/TTS
- 图片编辑/视频编辑/编辑器
- ComfyUI/工作流/视觉模型
- 视觉任务/视觉生成/视觉健康
- 批量生成/质量检查

## How to Invoke

### 方式1: 通过 unified-chat（推荐）

```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"<用户原始消息>","context":{"platform":"feishu","source":"openclaw","skill":"visual"}}'
```

### 方式2: 直接调用视觉端点

| 功能 | 端点 | 方法 |
|---|---|---|
| 视觉总入口 | `/api/visual` | GET/POST |
| 生成图片 | `/api/visual/generate` | POST |
| 视觉健康 | `/api/visual/health` | GET |
| 视觉任务 | `/api/visual/tasks` | GET/POST |
| 任务详情 | `/api/visual/tasks/{id}` | GET |
| 任务事件 | `/api/visual/tasks/{id}/events` | GET |
| 模型 Provider | `/api/visual/models/providers` | GET |
| 模型工作流 | `/api/visual/models/workflows` | GET |
| 工作流详情 | `/api/visual/models/workflows/{id}` | GET |
| ComfyUI 批量 | `/api/comfy/batch` | POST |
| ComfyUI Prompt | `/api/comfy/prompt/enhance` | POST |
| ComfyUI 质量 | `/api/comfy/quality/check` | POST |
| ComfyUI 视频 | `/api/comfy/video/compile` | POST |
| 图片编辑器 | `/api/editor/image` | POST |
| 视频编辑器 | `/api/editor/video` | POST |
| 播客编辑器 | `/api/editor/podcast` | POST |
| 编辑器总入口 | `/api/editor` | GET/POST |
| 媒体资源 | `/api/media` | GET |
| 测试视觉 | `/api/test/visual` | GET |
| PaaS 视觉 | `/api/paas/visual` | GET/POST |
| 视觉资产 | `/api/paas/visual` | GET |

调用示例（生成图片）：
```
exec curl -s -X POST http://127.0.0.1:3099/api/visual/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"prompt":"<图片描述>","provider":"comfyui","workflow":"default"}'
```

## Response Handling

- 生成成功 → "✅ 已生成,任务 ID: xxx" + 如有 URL 提供访问链接
- 异步任务 → "⏳ 任务已提交, ID: xxx, 可用 '查看任务 xxx' 查询进度"
- 任务完成 → "✅ 完成, 图片: [URL]"
- 任务失败 → "❌ 失败原因: xxx"

## Examples

**用户**：帮我生成一张 AI 助手的封面图

**Action**：
```
exec curl -s -X POST http://127.0.0.1:3099/api/visual/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"prompt":"AI 助手封面图,未来感,蓝色调","provider":"comfyui"}'
```

**用户**：查看视觉任务状态

**Action**：
```
exec curl -s -H "Cookie: aibrand_token=dev_auto_login_token" http://127.0.0.1:3099/api/visual/tasks
```

## Related

- aibrand-content: 内容文案配合视觉
- aibrand-publish: 视觉素材发布
