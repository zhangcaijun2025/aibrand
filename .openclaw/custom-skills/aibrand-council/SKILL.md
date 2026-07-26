---
name: aibrand-council
description: AiBrand Council Agent 协作系统。@部门负责人协同工作: @视觉部/@内容部/@数据部/@技术部/@质量部/@GEO部/@渠道部. 多 Agent 协作/任务分配/团队协同/Council 决策. Use when user mentions @视觉部/@内容部/@数据部/@技术部/@质量部/@GEO部/@渠道部/Council/多Agent/团队协作/Agent协同.
version: 0.1.0
author: AiBrand Studio
---

## When to Use

**触发条件**（满足任一即调用）：
- @视觉部/@内容部/@数据部/@技术部/@质量部/@GEO部/@渠道部
- @agent mention（任何 @ 开头的部门/角色）
- Council 会议/Council 决策/Council 协作
- 多 Agent 协作/团队协作/任务分配
- Agent 调度/Agent 派发/Agent 列表
- 视觉部/内容部/数据部/技术部/质量部/GEO部/渠道部 协助/处理/分析
- 部门负责人/部门协作

## How to Invoke

### 方式1: 通过 unified-chat（推荐，自动识别 @mention）

```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"<用户原始消息,保留@mention>","context":{"platform":"feishu","source":"openclaw","skill":"council"}}'
```

### 方式2: 直接调用 Council 端点

| 功能 | 端点 | 方法 |
|---|---|---|
| Council 总入口 | `/api/council` | POST |
| Council 发言 | `/api/council/speak` | POST |
| Agent 列表 | `/api/agents/list` | GET |
| Agent 初始化 | `/api/agents/init` | POST |
| Agent 调度 | `/api/agents/dispatch` | POST |
| 创建 Agent | `/api/create/agent` | POST |
| 链式 Agent | `/api/chain/agent` | POST |
| Agent 资产 | `/api/chain/agent/asset-ingested` | POST |
| Agent 索引 | `/api/chain/agent/index-batch` | POST |
| Agent 链接 | `/api/chain/links` | GET |
| Agent 预加载 | `/api/chain/preload` | POST |
| Agent 扫描 | `/api/chain/scan` | POST |
| Agent 搜索 | `/api/chain/search` | POST |
| AI 协调 | `/api/ai/coordination` | POST |
| AI 编排 | `/api/ai/orchestrate` | POST |
| OpenClaw Agents | `/api/openclaw/agents` | GET |

调用示例（@内容部写文案）：
```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"@内容部 帮我写一篇关于AI助手的小红书文案","context":{"platform":"feishu","source":"openclaw","skill":"council"}}'
```

## Council 部门职责

| 部门 | @mention | 职责 |
|---|---|---|
| 视觉部 | @视觉部 | 图片/视频/设计/视觉规范 |
| 内容部 | @内容部 | 文案/文章/脚本/内容策略 |
| 数据部 | @数据部 | 数据分析/报表/统计/KPI |
| 技术部 | @技术部 | 代码/系统/集成/API |
| 质量部 | @质量部 | 质量检查/质量监控/告警 |
| GEO部 | @GEO部 | 搜索优化/关键词/排名 |
| 渠道部 | @渠道部 | 多平台分发/账号管理/评论 |

## Response Handling

- 单部门响应 → 直接返回该部门的回复
- 多部门协作 → 整合各部门回复，标注来源
- Council 决策 → 列出各部门意见 + 最终决策

## Examples

**用户**：@内容部 协助写视频号脚本，主题是 AI 助手

**Action**：
```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"@内容部 协助写视频号脚本,主题是AI助手","context":{"platform":"feishu","source":"openclaw","skill":"council"}}'
```

**用户**：@数据部 @内容部 协同分析最近内容表现并给出优化建议

**Action**：
```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"@数据部 @内容部 协同分析最近内容表现并给出优化建议","context":{"platform":"feishu","source":"openclaw","skill":"council"}}'
```

## Related

- aibrand-content: 单纯内容创作（无 @mention 时）
- aibrand-dashboard: 数据查询
