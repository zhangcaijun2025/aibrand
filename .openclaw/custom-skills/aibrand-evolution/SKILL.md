---
name: aibrand-evolution
description: AiBrand 自进化引擎控制台。当用户提到 进化/evolution/tick/提案/proposal/健康分/health score/回滚/rollback/紧急停止/emergency/遥测/telemetry/instinct/学习成果 等关键词时调用。支持查询引擎状态、触发 Tick、审批提案、部署/回滚、紧急停止。同时作为进化引擎部署指令的接收目录(overrides.json)。
version: 0.1.0
author: AiBrand Evolution Engine
---

## When to Use

**触发条件**（满足任一即调用）：
- 查看/触发进化引擎：进化状态/evolution status/run tick/跑一次进化/启动引擎/停止引擎
- 提案管理：提案/proposal/审批/approve/拒绝/reject/查看提案/待处理提案
- 部署与回滚：部署/deploy/回滚/rollback/紧急停止/emergency stop/恢复进化
- 指标查询：健康分/health score/遥测/telemetry/metrics/性能快照
- Instinct 同步：instinct/学习成果/导出/导入 (L3 层, 端点待补齐)
- 进化事件订阅：订阅进化事件/notify channel (L4 层, 端点待补齐)

## How to Invoke

调用对应 AiBrand evolution API (OpenClaw 在主机运行直接访问本机):

```
exec curl -s -X <METHOD> http://127.0.0.1:3099/api/evolution/<endpoint> \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  [-d '<JSON body>']
```

**通用参数**：
- `127.0.0.1:3099` — AiBrand Web 容器
- `aibrand_token=dev_auto_login_token` — 开发模式自动登录 token

## API 端点表

### 1. 引擎状态 (status)

#### 查询引擎状态
```
exec curl -s http://127.0.0.1:3099/api/evolution/status \
  -H "Cookie: aibrand_token=dev_auto_login_token"
```

返回：engine state + pendingProposals + findings + intelligence + visual + council

#### 触发引擎动作 (POST)
```
exec curl -s -X POST http://127.0.0.1:3099/api/evolution/status \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"action":"<ACTION>"}'
```

**支持的 action**：
- `start_engine` — 启动进化引擎
- `stop_engine` — 停止进化引擎
- `run_tick` — 立即执行一次进化 Tick (Acquire→Diagnose→Propose→Validate→Deploy→Measure→Learn)
- `run_probe` — 运行单个诊断探针 (需额外参数 `probeId`)
- `run_all_probes` — 运行所有诊断探针
- `run_scanner` — 运行单个扫描器 (需额外参数 `scannerId`)
- `run_geo_scanners` — 运行 GEO 扫描器

**示例：立即执行一次进化 Tick**
```
exec curl -s -X POST http://127.0.0.1:3099/api/evolution/status \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"action":"run_tick"}'
```

### 2. 提案管理 (proposals)

#### 查询待处理提案
```
exec curl -s http://127.0.0.1:3099/api/evolution/proposals \
  -H "Cookie: aibrand_token=dev_auto_login_token"
```

#### 查询全部提案历史
```
exec curl -s "http://127.0.0.1:3099/api/evolution/proposals?all=1" \
  -H "Cookie: aibrand_token=dev_auto_login_token"
```

#### 审批/拒绝/验证提案 (POST)
```
exec curl -s -X POST http://127.0.0.1:3099/api/evolution/proposals \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"action":"<ACTION>","id":"<PROPOSAL_ID>","reason":"<可选原因>"}'
```

**支持的 action**：
- `approve` — 审批并验证部署 (id 必填)
- `reject` — 拒绝提案 (id 必填, reason 可选)
- `validate` — 仅验证不部署 (id 必填)
- `create` — 创建新提案 (需 targetType/propAction/description/expectedBenefit 等字段)

#### 创建新提案示例
```
exec curl -s -X POST http://127.0.0.1:3099/api/evolution/proposals \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"action":"create","targetType":"routing_rule","targetId":"intent_xxx","propAction":"update","description":"优化 XXX 路由","expectedBenefit":"提升匹配准确率 5%","risk":"low"}'
```

### 3. 部署与回滚 (deploy)

#### 查询部署历史
```
exec curl -s http://127.0.0.1:3099/api/evolution/deploy \
  -H "Cookie: aibrand_token=dev_auto_login_token"
```

#### 部署/回滚/紧急停止 (POST)
```
exec curl -s -X POST http://127.0.0.1:3099/api/evolution/deploy \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"action":"<ACTION>","id":"<PROPOSAL_ID>","reason":"<可选原因>"}'
```

**支持的 action**：
- `deploy` — 部署指定提案 (id 必填)
- `rollback` — 回滚指定提案 (id 必填)
- `emergency_stop` — 紧急停止所有自动变更 (reason 可选)
- `emergency_resume` — 恢复自动变更

**示例：紧急停止进化引擎**
```
exec curl -s -X POST http://127.0.0.1:3099/api/evolution/deploy \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"action":"emergency_stop","id":"manual","reason":"用户通过飞书手动停止"}'
```

### 4. 指标查询 (metrics)

#### 聚合快照 (默认 24h)
```
exec curl -s http://127.0.0.1:3099/api/evolution/metrics \
  -H "Cookie: aibrand_token=dev_auto_login_token"
```

#### 指定时间窗口
```
exec curl -s "http://127.0.0.1:3099/api/evolution/metrics?window=1h" \
  -H "Cookie: aibrand_token=dev_auto_login_token"
```

**支持的 window**: `1h` / `24h` (默认) / `7d`

#### 查询原始遥测记录
```
exec curl -s "http://127.0.0.1:3099/api/evolution/metrics?raw=1&limit=50" \
  -H "Cookie: aibrand_token=dev_auto_login_token"
```

### 5. OpenClaw 遥测上报 (telemetry/openclaw)

OpenClaw skill 每次调用 AiBrand 业务 API 后,必须上报 telemetry:

```
exec curl -s -X POST http://127.0.0.1:3099/api/evolution/telemetry/openclaw \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"agentId":"main","agentName":"OpenClaw","taskType":"openclaw_skill_exec","status":"completed","latency":<实际延迟ms>,"confidence":0.75,"inputPreview":"<输入前100字>","outputPreview":"<回复前200字>","skillName":"aibrand-evolution","platform":"feishu"}'
```

**失败时也要上报** (status 改为 "failed", confidence 改为 0)。

## 部署指令接收 (L2 提案驱动层)

本 skill 目录 (`~/.openclaw/custom-skills/aibrand-evolution/`) 同时作为进化引擎部署路由规则变更的写入位置。

**机制**：
- AiBrand evolution-openclaw-deployer.ts 在执行 `targetType=routing_rule` 类提案时,会将变更内容写入本目录的 `overrides.json`
- intent-router 启动时读取此文件,合并到路由配置中
- 每次提案的覆盖以 `proposal_<id>` 为 key 存储,便于追溯和回滚

**文件示例** (overrides.json):
```json
{
  "proposal_prop_20260727_xxx": {
    "targetType": "routing_rule",
    "targetId": "intent_search",
    "action": "update",
    "description": "优化搜索意图匹配正则",
    "appliedAt": "2026-07-27T10:00:00.000Z"
  }
}
```

## Response Handling

API 响应统一格式：

```json
{
  "code": 0,
  "data": { ... },
  "message": "可选说明"
}
```

**处理规则**：
1. **成功** (`code === 0`)：提取 `data` 字段并按用户友好格式返回
2. **失败** (`code !== 0` 或 HTTP 非 200)：告诉用户"进化引擎 API 调用失败: <message>"
3. **网络错误**：告诉用户"AiBrand 业务引擎暂时不可用,请稍后再试"
4. **认证失败** (HTTP 401)：检查 Cookie 是否携带 `aibrand_token=dev_auto_login_token`

## 常用对话示例

### 示例 1: 查看进化状态

**用户**：进化引擎现在状态怎么样？

**Action**：
```
exec curl -s http://127.0.0.1:3099/api/evolution/status \
  -H "Cookie: aibrand_token=dev_auto_login_token"
```

**Response 处理**：提取 `data.engine` 显示运行状态、`data.proposals.pending` 显示待处理提案数、`data.findings` 显示最近发现的问题。

### 示例 2: 立即跑一次进化

**用户**：跑一次进化 Tick

**Action**：
```
exec curl -s -X POST http://127.0.0.1:3099/api/evolution/status \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"action":"run_tick"}'
```

**Response 处理**：返回 tickId / status / proposals 数 / healthDelta。

### 示例 3: 查看待处理提案并审批

**用户**：看看有没有待处理的提案,有的话帮我审批第一个

**Step 1**：
```
exec curl -s http://127.0.0.1:3099/api/evolution/proposals \
  -H "Cookie: aibrand_token=dev_auto_login_token"
```

**Step 2** (取第一个提案 id 后)：
```
exec curl -s -X POST http://127.0.0.1:3099/api/evolution/proposals \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"action":"approve","id":"<PROPOSAL_ID>"}'
```

### 示例 4: 紧急停止进化

**用户**：立即停止所有自动进化变更！

**Action**：
```
exec curl -s -X POST http://127.0.0.1:3099/api/evolution/deploy \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"action":"emergency_stop","id":"manual","reason":"用户通过飞书紧急停止"}'
```

## Related Skills

- aibrand-studio: 业务能力总入口 (本 skill 专注于进化引擎控制台,不处理业务请求)
- aibrand-dashboard: 数据看板 (进化指标可在 Dashboard 中可视化)

## Related

- [AiBrand Evolution Engine 设计文档](file:///d:/king2046/project/aibrand-studio/src/lib/engines/evolution-engine.ts)
- [OpenClaw Deployer 实现](file:///d:/king2046/project/aibrand-studio/src/lib/engines/evolution-openclaw-deployer.ts)
