---
name: aibrand-navigation
description: AiBrand 组件/页面导航。打开 Dashboard/编辑器/发布台/GEO/Council/演化引擎/设置/AI助手. 在电脑浏览器打开对应功能页面. Use when user mentions 打开/跳转到/进入/前往/显示 Dashboard/编辑器/发布台/GEO/Council/演化/设置/页面.
version: 0.1.1
author: AiBrand Studio
---

## When to Use

**触发条件**（满足任一即调用）：
- 打开 Dashboard/数据看板/仪表盘
- 打开编辑器/写文案/创作台
- 打开发布台/发布中心/多平台发布
- 打开 GEO/SEO/搜索优化
- 打开 Council/团队协作/Agent 协作
- 打开视觉/视频/图片编辑器
- 打开设置/AI 助手设置/平台绑定
- 跳转到/进入/前往 任何 AiBrand 功能页面

## How to Invoke

OpenClaw 不能直接控制用户浏览器，但可以返回可点击的深度链接（基于 AiBrand Studio 实际 Next.js 路由），用户在飞书 PC 端点击即在浏览器打开对应页面。

### 直接返回链接（无需 API 调用）

根据用户意图，直接构造对应页面的 URL 并返回给用户。

## AiBrand Studio 页面路由表

| 功能 | 路由路径 | 完整 URL |
|---|---|---|
| Dashboard 首页 | `/` | http://localhost:3099/ |
| 创建内容 | `/create` | http://localhost:3099/create |
| Dashboard 发布 | `/dashboard/publish` | http://localhost:3099/dashboard/publish |
| 工作区 | `/workspace` | http://localhost:3099/workspace |
| GEO 优化 | `/geo` | http://localhost:3099/geo |
| Council 协作 | `/council` | http://localhost:3099/council |
| 编排器 | `/orchestrator` | http://localhost:3099/orchestrator |
| 视觉创作 | `/visual` | http://localhost:3099/visual |
| 视觉批量 | `/visual/batch` | http://localhost:3099/visual/batch |
| 视觉模型 | `/visual/models` | http://localhost:3099/visual/models |
| 视觉工作室 | `/visual/studio` | http://localhost:3099/visual/studio |
| 视频编辑 | `/visual/video` | http://localhost:3099/visual/video |
| 质量监控 | `/quality` | http://localhost:3099/quality |
| Prometheus | `/quality/prometheus` | http://localhost:3099/quality/prometheus |
| 频道管理 | `/channels` | http://localhost:3099/channels |
| 分析洞察 | `/insights` | http://localhost:3099/insights |
| 数据分析 | `/analytics` | http://localhost:3099/analytics |
| Brief | `/brief` | http://localhost:3099/brief |
| 工作流 | `/workflows` | http://localhost:3099/workflows |
| Agent 列表 | `/agents` | http://localhost:3099/agents |
| 开发者 | `/developers` | http://localhost:3099/developers |
| 设置 | `/settings` | http://localhost:3099/settings |
| 文档 | `/docs` | http://localhost:3099/docs |
| 登录 | `/login` | http://localhost:3099/login |
| 入驻引导 | `/onboarding` | http://localhost:3099/onboarding |

## Response Handling

OpenClaw 应直接返回可点击的链接给用户，格式：

```
📍 已为您打开 [功能名]:

👉 [点击进入](http://localhost:3099/<path>)

(链接将在电脑浏览器中打开 AiBrand Studio 对应功能)
```

**特殊情况**：
- 如果用户在飞书 PC 端，链接会直接在浏览器打开
- 如果用户在飞书手机端，AiBrand 在本机 localhost，手机无法直接访问 — 此时提示用户在电脑上点击链接，或提示用户配置内网穿透/远程访问

## Examples

**用户**：打开 Dashboard

**Response**（无需 API 调用）：
```
📍 已为您打开 Dashboard:

👉 [点击进入](http://localhost:3099/)

(链接将在电脑浏览器中打开 AiBrand Studio Dashboard)
```

**用户**：打开内容创作

**Response**：
```
📍 已为您打开内容创作:

👉 [点击进入](http://localhost:3099/create)

(链接将在电脑浏览器中打开 AiBrand Studio 内容创作台)
```

**用户**：打开 GEO 优化

**Response**：
```
📍 已为您打开 GEO 优化:

👉 [点击进入](http://localhost:3099/geo)

(链接将在电脑浏览器中打开 AiBrand Studio GEO 优化面板)
```

**用户**：打开 Council 协作

**Response**：
```
📍 已为您打开 Council 协作:

👉 [点击进入](http://localhost:3099/council)

(链接将在电脑浏览器中打开 AiBrand Studio Council 协作面板)
```

**用户**：打开视觉创作

**Response**：
```
📍 已为您打开视觉创作:

👉 [点击进入](http://localhost:3099/visual)

(链接将在电脑浏览器中打开 AiBrand Studio 视觉创作台)
```

**用户**：打开设置

**Response**：
```
📍 已为您打开设置:

👉 [点击进入](http://localhost:3099/settings)

(链接将在电脑浏览器中打开 AiBrand Studio 设置面板)
```

## Related

- 所有其他 aibrand-* skill: 导航到对应功能后,可用其他 skill 执行具体操作
