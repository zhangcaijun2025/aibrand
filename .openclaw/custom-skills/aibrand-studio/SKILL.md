---
name: aibrand-studio
description: Invoke AiBrand Studio business capabilities (content creation, data analysis, GEO optimization, brand management, Council Agents collaboration) via unified-chat API. Use when user mentions 品牌/内容/数据/GEO/SEO/发布/Council/Agent 协作/运营/Dashboard etc.
version: 0.1.0
author: AiBrand Studio
---

# AiBrand Studio Business Skill

将 AiBrand Studio 的业务引擎能力暴露给 OpenClaw Agent。当用户从 IM 平台（飞书/钉钉/企业微信）发送业务指令时，调用 AiBrand unified-chat API 获取业务回复。

## When to Use

**触发条件**（满足任一即调用）：

- 用户提到**内容创作**：写文案/写文章/公众号/视频号/抖音/小红书/营销文案/广告文案
- 用户提到**数据分析**：运营数据/Dashboard/报表/统计/数据看板/KPI
- 用户提到 **GEO/SEO 优化**：品牌搜索/地理搜索/本地搜索/搜索引擎优化/搜索排名
- 用户提到**品牌管理**：品牌资产/视觉规范/品牌策略/品牌定位
- 用户提到**一键发布**：多平台分发/同步发布/群发到各平台
- 用户提到 **Council Agent 协作**：@视觉部/@内容部/@数据部/@技术部/@质量部/@GEO部/@渠道部 等部门负责人
- 用户提到**项目状态**：aibrand-studio/Phase 进度

**不触发的场景**（让 OpenClaw 自行处理）：

- 纯闲聊（你好/谢谢/再见）
- 通用代码执行（执行 dir/ls/python 脚本）
- 网页搜索（搜一下今天的新闻）
- 文件操作（读取/编辑本地文件）
- 系统控制（打开浏览器/控制面板）

## How to Invoke

调用 AiBrand unified-chat API（通过 `exec curl` 工具，因为 web_fetch 对 POST 支持有限）：

```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"<用户原始消息>","context":{"platform":"feishu","source":"openclaw","session_id":"<feishu open_id>","user_id":"<feishu open_id>"}}'
```

**参数说明**：
- `127.0.0.1:3099` — AiBrand Web 容器（nginx → Next.js API route），OpenClaw Gateway 在主机运行直接访问本机
- `aibrand_token=dev_auto_login_token` — 开发模式自动登录 token（生产环境需替换为真实用户 token）
- `message` — 用户的原始消息文本（保留 @mention 等格式）
- `context.platform` — 来源平台（feishu/dingtalk/wecom）
- `context.source` — 固定为 "openclaw"（标识为 OpenClaw 网关来源，触发平台感知路由）
- `context.session_id` / `context.user_id` — 用户的飞书 open_id

## Response Handling

API 响应格式：

```json
{
  "code": 0,
  "data": {
    "reply": "<业务回复文本>",
    "intent": "<识别的意图>",
    "source": "local" | "openclaw",
    "meta": {
      "suggestions": ["建议1", "建议2"],
      "routeTarget": "local" | "openclaw",
      "latencyMs": 123
    }
  }
}
```

**处理规则**：

1. **成功**（`code === 0` 且 `data.reply` 非空）：
   - 提取 `data.reply` 作为主要回复
   - 如果 `data.meta.suggestions` 非空，追加 `\n\n💡 建议：\n- 建议1\n- 建议2`
   - 如果 `data.source === "openclaw"`，追加 `\n\n_⚙️ via AiBrand → OpenClaw_`
   - 直接返回给用户

2. **空回复**（`code === 0` 但 `data.reply` 为空）：
   - 说明 AiBrand 判定为闲聊，不处理
   - 告诉 OpenClaw 自行用 LLM 回复用户

3. **API 错误**（`code !== 0` 或 HTTP 非 200）：
   - 告诉用户："AiBrand 业务引擎暂时不可用，我先用通用能力回复您。"
   - 让 OpenClaw 用内置工具继续处理

4. **网络超时**（10 秒）：
   - 同 API 错误处理

## Examples

### Example 1: 内容创作

**用户**：帮我写一篇关于 AI 品牌的公众号文章，主题是"AI 重塑品牌增长"

**Action**：
```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"帮我写一篇关于 AI 品牌的公众号文章,主题是\"AI 重塑品牌增长\"","context":{"platform":"feishu","source":"openclaw","session_id":"ou_xxx","user_id":"ou_xxx"}}'
```

**Response**：提取 `data.reply` 返回用户，可能包含完整文章草稿。

### Example 2: 数据查询

**用户**：查看今天的运营数据

**Action**：同上，message 改为"查看今天的运营数据"

**Response**：返回今日 KPI 摘要 + 趋势分析。

### Example 3: Council Agent 协作

**用户**：@视觉部 帮我设计一个科技感的 Logo

**Action**：同上，message 保留 "@视觉部 帮我设计一个科技感的 Logo"

**Response**：视觉部负责人（Council Agent）的回复，可能包含设计建议、参考图、ComfyUI 生成参数。

### Example 4: 多平台发布

**用户**：把这篇文章发到公众号、视频号、抖音

**Action**：同上，message 改为"把这篇文章发到公众号、视频号、抖音"

**Response**：渠道部负责人确认发布任务已创建，返回任务 ID 和预计完成时间。

## Fallback Strategy

如果 AiBrand API 连续 2 次失败：

1. 第一次失败：告知用户"AiBrand 业务引擎暂时无法连接，正在重试..."
2. 第二次失败：降级到 OpenClaw 内置能力
   - 用 `web_search` 搜索相关信息
   - 用 `exec` 执行本地命令
   - 用 LLM 通用知识回复
3. 告知用户："AiBrand 业务引擎暂时不可用，已用通用能力回复。完整业务功能恢复后会通知您。"

## Notes

- AiBrand unified-chat 内部已有 intent-router 智能路由，会自动判断走 local（业务引擎）还是 openclaw（LLM）
- IM 来源的消息会优先走 local（platform 感知路由）
- 如果 local 返回空，main.py 会降级到 AstrBot LLM；本 Skill 跳过这层，直接返回空给 OpenClaw
- 用户的飞书 open_id 可从 `event.unified_msg_origin` 或 `event.get_sender_id()` 获取

## Related

- AiBrand Studio 项目：`D:\king2046\project\aibrand-studio`
- unified-chat 端点：`src/app/api/agent/unified-chat/route.ts`
- intent-router：`src/lib/engines/intent-router.ts`
- Council Agents：`src/ai/agent-roles.ts`（15 个部门负责人）
