# AiBrand 五层 AI 协同工作流规范 v3.1

> 最后更新: 2026-06-03 | v3.0 + 审阅修正
> 覆盖: OpenClaw + Dify + LangChain + n8n + Claude Code

---

## 一、架构定版：n8n 中枢调度模型

```
                        外部世界 (用户 / 定时器 / Webhook / 外部系统回调)
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
      [人的请求]       [系统事件]       [外部系统回调]
            │                │                │
            ▼                ▼                │
    ┌──────────────┐  ┌─────────────────────┐ │
    │ Layer 4      │  │ Layer 2             │◄┘
    │ Dify         │  │ n8n 【中枢调度层】  │
    │ :5001        │─►│ :5678               │
    │ 对话UI+RAG   │  │ 唯一有权编排跨组件  │
    │ 知识库·模型网关│  │ 定时·重试·分支      │
    │ Prompt托管   │  │ 回调接收·错误处理    │
    └──────────────┘  │ 统一消息Schema      │
                      └──────┬──────┬───────┘
                             │      │
              ┌──────────────┘      └───────────────┐
              ▼                                     ▼
    ┌──────────────────┐                 ┌──────────────────┐
    │ Layer 3          │                 │ Layer 5          │
    │ LangChain Bridge │                 │ OpenClaw         │
    │ :4010            │                 │ :19001           │
    │ Agent 编排       │                 │ 通信网关(企微)    │
    │ 复杂推理+工具调度│                 │ RPA/GUI 执行     │
    │ 高级RAG+评测     │                 │ 操作无API系统     │
    │ 多源聚合         │                 │ 会话持久化        │
    └────────┬─────────┘                 └────────┬─────────┘
             │                                    │
             └──────────────┬─────────────────────┘
                            │ 涉及代码/配置变更
                            ▼
                   ┌──────────────────┐
                   │ Layer 1          │
                   │ Claude Code      │
                   │ (via HTTP Bridge) │
                   │ 代码·部署·审计   │
                   │ 架构·重构·安全   │
                   └──────────────────┘
```

---

## 二、各层刚性权责红线

| 层级 | 组件 | 端口 | 必做 | 禁止（越界红线） |
|:--:|------|:--:|------|------|
| L4 | **Dify** | :5001 | 用户对话UI、知识库RAG、轻量QA、意图识别分流、模型网关 | ❌不做复杂多步Agent ❌不做定时批量调度 ❌不做跨系统数据同步 ❌不操作GUI |
| L2 | **n8n (中枢)** | :5678 | 跨组件任务编排调度、定时/事件触发、400+系统集成、异步回调接收、重试/超时/错误处理、统一消息路由 | ❌不做大模型推理 ❌不做知识库存储 ❌不做代码变更 ❌不面向终端用户做对话UI |
| L3 | **LangChain** | :4010 | Agent多步推理、工具智能路由、高级RAG检索、AI输出评测、多源结果聚合 | ❌不面向终端用户 ❌不配置可视化工作流 ❌不做定时调度 ❌不直接写文件/改代码 ❌不调度其他组件 |
| L5 | **OpenClaw** | :19001 | 企微/飞书消息路由、跨会话持久记忆、RPA/GUI自动化(操作无API遗留系统)、桌面/浏览器操作、异常通知中转 | ❌不做AI生成 ❌不编排工作流 ❌不执行代码变更 ❌不做知识库管理 |
| L1 | **Claude Code** (via Bridge) | 内部 | 代码生成与修改、架构设计、安全审计、容器部署、代码重构 | ❌不直接对接前端 ❌不接收终端用户提问 ❌不做工作流调度 ❌不做GUI操作 |

---

## 三、工具豁免条款（LangChain → Dify）

> **v3.1 新增**：LangChain Agent 的工具白名单中存在对 Dify 的直接 HTTP 调用，此为"工具内部实现细节"，不作为跨组件调度违规。但需严格限定范围。

| LangChain 工具 | 调用目标 | 调用方式 | 豁免原因 |
|------|------|------|------|
| `search_knowledge_base` | Dify `POST /v1/datasets/retrieve` | HTTP (只读查询) | 工具实现细节，非跨组件调度 |
| `generate_content` | Dify `POST /v1/chat-messages` | HTTP (内容生成) | 工具实现细节，非跨组件调度 |
| `trigger_workflow` | n8n `POST /webhook/*` | HTTP (触发) | **通过 n8n 回调，符合中枢调度** |
| `evaluate_content` | LangChain 本地 `/eval` | 内部调用 | 自身能力 |

**豁免的明确边界**：
```
✅ LangChain 可以:
   - 通过 search_knowledge_base 调用 Dify RAG 检索接口 (只读)
   - 通过 generate_content 调用 Dify 对话生成接口 (内容生成)
   - 工具执行完毕后聚合结果回调 n8n

❌ LangChain 不可以:
   - 调用 Dify 的 Console/管理 API (知识库增删改、应用配置)
   - 直接调度 n8n 工作流做后续动作 (必须通过回调)
   - 直接调用 Claude Code、OpenClaw
   - 调用其他 LangChain Agent 实例 (防止递归爆炸)
```

---

## 四、Claude Code HTTP Bridge 规范

> **v3.1 新增**：Claude Code 是 CLI 工具，不能直接被 n8n HTTP 调用。需通过轻量包装层暴露。

```
n8n Workflow
   │
   │ POST /claude/code-exec (via Execute Command 或 微服务)
   ▼
┌─────────────────────────┐
│ Claude Code HTTP Bridge │  ← 端口 :4020 (建议)
│ 接受统一消息 Schema     │
│ 转换为 CLI 指令         │
│ 返回结构化结果          │
└──────────┬──────────────┘
           │ CLI
           ▼
      Claude Code
      (代码·审计·部署)
```

**Bridge 接口规范**：
```
POST /claude/execute
{
  "task_id": "uuid",
  "action": "code_review | security_audit | deploy | lint | type_check",
  "payload": { "path": "...", "options": {...} },
  "callback_webhook": "https://n8n/webhook/aibrand/task-callback"
}

Response (同步，<30s 任务):
{
  "task_id": "uuid",
  "status": "completed",
  "result": { "output": "...", "issues": [...], "passed": true }
}
```

**当前实现策略**：n8n Execute Command 节点直接执行 Claude Code CLI。后续可升级为独立微服务。

---

## 五、标准主链路（四条）

### 链路 A：简易问答（高频、低延迟）

```
用户 → Dify (对话UI) → Dify RAG/Claude → 返回用户
                        (complexity < 3 且 steps == 1)
```
- Dify 直连 Claude，毫秒级响应
- 不经过 n8n，不经过 LangChain

**复杂度判定量化规则（v3.1 新增）**：
```
Dify 代码节点判定逻辑:
  score = 0
  if 涉及两个以上数据源 → score += 1
  if 需要对比、分析、生成多段结构化内容 → score += 1
  if 用户指定跨平台或多步骤操作 → score += 1
  if 涉及文件/代码/配置变更 → score += 2
  if score >= 3 → 走链路 B (n8n 调度)
  if score < 3  → 走链路 A (Dify 直连)
  兜底策略: 不确定时默认走链路 B (保守)
```

### 链路 B：复杂多步骤 Agent（n8n 中枢调度）

```
用户 → Dify (意图识别 → complexity >= 3)
  → n8n Webhook (统一入口)
    → n8n 调度 (严格中枢模式):
      ① RAG 检索: n8n → Dify API → n8n 拿到结果
      ② AI 推理: n8n → LangChain Agent (含①的结果) → 回调 n8n
         注: LangChain Agent 内部可通过工具调 Dify，但这是工具实现细节(见第三章豁免)
      ③ 数据查询: n8n 数据库/HTTP 节点
      ④ 跨系统同步: n8n 400+ 集成
      ⑤ 代码/配置变更: n8n → Claude Code Bridge → 回调 n8n
    → n8n 汇总结果 → Webhook 回调 Dify
  → Dify 格式化 → 返回用户
```
- **n8n 是唯一调度者**：所有组件调用由 n8n 发起，非组件间直接互调
- **异步优先**：>30s 任务走 webhook 回调
- LangChain 的工具调 Dify RAG 属豁免范围（第三章），但调度权仍在 n8n

### 链路 C：业务自动化（定时/事件驱动）

```
n8n 定时触发器 (Cron/Event)
  → n8n 调度:
    → Dify AI 内容生成
    → LangChain /eval 质量评测
      ├── 评分 ≥ 7 → 数据入库 → OpenClaw 通知
      └── 评分 < 7 → LangChain 重新生成 → 再评测 (max 3次)
  → n8n 记录执行日志
```

### 链路 D：研发变更（代码/配置/部署）

```
n8n/LangChain 触发变更请求
  → Claude Code Bridge: 开发实现
  → Claude Code Bridge: 安全审计
  → OpenClaw: 预检 (消息通道/会话/权限)
  → Claude Code Bridge: 容器部署
  → n8n: E2E 全链路复测
  → OpenClaw: 通知 + 存档
```

---

## 六、四重硬性协同规则

### 规则 1：任务分流判定（路由决策矩阵）

| 任务类型 | 入口 | 主链路 | 判断依据 |
|------|:--:|------|------|
| 单轮问答、查知识库、短文生成 | Dify | A | `complexity_score < 3` 且 `steps == 1` |
| 多步串联 (查+分析+生成+发布) | Dify→n8n | B | `complexity_score >= 3` 或 `steps >= 2` |
| 定时执行、批量同步、跨平台推送 | n8n 直接 | C | `trigger ∈ {cron, event, webhook}` |
| 代码/配置/数据库变更 | n8n→Claude | D | `type ∈ {code, infra, db}` |
| 安全应急 | 任意→n8n→Claude | D | `severity >= HIGH` |
| GUI 操作 (无API遗留系统) | n8n→OpenClaw | B | `target.has_api == false` |
| 不确定 | Dify→n8n | B | **默认走复杂链路 (保守策略)** |

### 规则 2：统一消息 Schema

所有跨组件请求体**必须**采用统一格式：

```json
{
  "task_id": "uuid-v4",
  "intent": "competitor_analysis",
  "payload": {
    "keyword": "AI客服系统",
    "platforms": ["小红书", "抖音"],
    "tools": ["search_knowledge_base"]
  },
  "context": {
    "user_id": "xxx",
    "session_id": "xxx",
    "previous_results": {},
    "system_prompt": "..."
  },
  "callback_webhook": "https://n8n/webhook/aibrand/task-callback"
}
```

**强制要求**：
```
✅ 全链路携带 X-Request-ID (值与 task_id 一致)
✅ 全组件日志挂载 request_id → 故障可全链路溯源
✅ 异步优先：预计耗时 >30s 的任务走 webhook 回调
✅ n8n 是唯一回调接收者，其他组件不互相回调
✅ 所有 API 调用记录 trace (timestamp + component + method + status + latency_ms)
✅ Claude Code 通过 HTTP Bridge 暴露，统一走本 Schema
❌ 禁止组件间本地文件硬耦合
❌ 禁止容器目录直读直写
❌ 禁止组件间共享数据库直连
❌ 禁止绕过 n8n 的双向调用 (LangChain ↔ Dify 的管理类互调)
❌ 禁止 LangChain Agent 间互相调用 (防止递归爆炸)
```

### 规则 3：权限管控

```
🔴 Docker exec/stop/restart/rm/build     → 逐次审批
🔴 Python/Shell 脚本执行                   → 逐次审批
🔴 数据库结构变更 (DDL)                    → 逐次审批 + Claude 审计
🟡 数据库数据变更 (DML)                    → Claude 审计后执行
🟡 环境变量修改 / .env 变更               → Claude 审计后执行
🟢 只读查询 (API GET / SELECT)            → 自动放行
❌ 禁止全局永久放行高危指令
```

**n8n 环境隔离**：
```
✅ 测试工作流: webhook-test/* → 自由修改
🔴 生产工作流: webhook/* → 配置变更必须 Claude 审计 + OpenClaw 预检
```

### 规则 4：异常回流闭环

```
任一组件调用失败:
  Step 1: 异常信息（X-Request-ID + stack trace + component）→ n8n 捕获
  Step 2: n8n 错误处理节点 → 分诊路由:
    - 包含 "timeout"/"ECONNREFUSED"     → 网络/服务不可达 → 指数退避重试
    - 包含 "Unauthorized"/"403"/"401"    → 认证/权限问题 → Claude 检查配置
    - 包含 "SQLITE"/"database"/"mongo"   → 数据库异常 → Claude 修复
    - 包含 "import"/"module"/"not found" → 依赖缺失 → Claude 修复
    - GUI 操作截图非预期内容             → OpenClaw 重试 → 仍失败则人工介入
    - 无法判定                            → LangChain /diagnose (轻量) → n8n 按建议路由
  
  Step 3: Claude Code 修复 或 n8n 降级策略
  Step 4: n8n 重新调度 → 全链路复测
  Step 5: OpenClaw 通知相关方 + 异常记录入知识库

重试策略:
  最大重试: 3 次
  退避算法: 指数退避 (1s → 4s → 16s)
  降级策略: 链路 B → 链路 A (简化执行)

超时上限:
  Dify 30s / LangChain Agent 120s / n8n 单步 120s / Claude Code 300s / OpenClaw GUI 60s

OpenClaw RPA 失败特殊处理:
  ① OpenClaw 截图当前 GUI 状态 → 存储到 OSS → 返回截图 URL
  ② n8n 企微通知: "RPA 任务 {task_id} 执行失败，截图: {url}，需人工介入"
  ③ n8n 暂停该工作流节点，等待人工确认恢复
  ④ 人工在企微回复 "重试 {task_id}" → OpenClaw → n8n 恢复执行
```

---

## 七、三类标准化工作流（SOP）

### 类型 1：业务工作流（n8n 画布）

**已有** (D:\king2046\n8n-workflows\):
| 工作流 | Webhook 路径 | 触发方式 | AI节点 |
|--------|------|------|:--:|
| 竞品分析 | `aibrand/competitor-analysis` | Webhook POST | Dify API |
| 热搜话题 | `aibrand/trending-topics` | 定时+h + Webhook | Dify API |
| 发布追踪 | `aibrand/post-publish-tracking` | Webhook POST | Dify API |
| 账号健康 | `aibrand/account-health-check` | 定时8h + Webhook | Dify API |

**Phase 3 新增**:
| 工作流 | Webhook 路径 | 用途 |
|------|------|------|
| 中枢回调 | `aibrand/task-callback` | 异步任务结果路由 |
| 配额校验 | `aibrand/quota-check` | QuotaGuard + 升级引导 |
| 积分扣费 | `aibrand/credits-deduct` | 风控 + 扣费记录 |

### 类型 2：AI 智能工作流（LangChain 三段式模板）

```
Phase 1: 需求结构化拆解 → 输出 subtasks + tools_required
Phase 2: 工具智能路由 (白名单) → search_knowledge_base | generate_content | trigger_workflow | evaluate_content
         Agent 禁止动态新增外部工具、禁止调用其他 Agent
Phase 3: 多源结果聚合评测 → /eval → 评分 <7 自动重试(max 3) → 评分 ≥7 回调 n8n
```

### 类型 3：研发验收工作流（五道门禁）

```
Gate 1: 代码语法校验 (0 errors)
Gate 2: 依赖安全审计 (0 CRITICAL/HIGH)
Gate 3: 容器权限 & 健康探测 (all healthy)
Gate 4: E2E 全链路压测 (100% 成功率, P95<120s)
Gate 5: OpenClaw 预检 (消息/会话/通知通道)

任一 FAIL → 退回到 Claude Code → 从 Gate 1 重新走
```

---

## 八、模型分层与成本管控

| 层级 | 组件 | 推荐模型 | 月预算占比 | 优化策略 |
|:--:|------|------|:--:|------|
| L4 | Dify | **Haiku** | 30% | 高频轻量，90%场景够用 |
| L3 | LangChain | **Haiku (分解) → Sonnet (推理)** | 40% | Agent 第一步用 Haiku 做意图分解，复杂推理再切 Sonnet |
| L1 | Claude Code | **Opus** | 20% | 低频、需最深推理 |
| L5 | OpenClaw | **Haiku** | 10% | 极高频、轻量路由 |

**扩容**：新增 DeepSeek 等模型 → 仅在 Dify 模型网关新增 → 上下游零改动。

---

## 九、环境隔离矩阵

| 环境 | Dify | n8n | LangChain | Claude Bridge | OpenClaw | DB |
|------|:--:|:--:|:--:|:--:|:--:|:--:|
| **开发** | :5001 | :5678 | :4010 | :4020 | :19001 | local |
| **测试** | 待部署 | 待部署 | :4011 | :4021 | :19002 | test-db |
| **生产** | 待部署 | 待部署 | :4012 | :4022 | :19003 | prod-db |

```
端口分配 (开发环境):
  :4010 → LangChain Bridge
  :4020 → Claude Code HTTP Bridge
  :5001 → Dify API
  :5678 → n8n
  :8080 → AiBrand Nginx (API入口)
  :19001 → OpenClaw Gateway
```

---

## 十、速查手册

### 决策树

```
收到一个任务 →
  ├─ 是人的请求吗？
  │   ├─ 是 → Dify 接手
  │   │   ├─ complexity < 3 → Dify 直连 Claude → 返回
  │   │   └─ complexity >= 3 → Dify 调 n8n → n8n 调度链路 B
  │   └─ 否 → n8n 接手
  │       ├─ 定时任务/数据同步 → n8n 直接执行 (链路 C)
  │       ├─ 需要 AI 推理 → n8n → LangChain → 回调 n8n
  │       ├─ 需要改代码 → n8n → Claude Bridge → 回调 n8n
  │       ├─ 需要操作 GUI → n8n → OpenClaw → 回调 n8n
  │       └─ 不确定 → 默认走复杂链路 B
  └─ 异常 → n8n 分诊 → Claude 修复 → 重试 → OpenClaw 通知
```

### 故障处理

| 症状 | 排查 | 修复 |
|------|------|------|
| Dify 超时 | `docker logs dify-api-1 --tail 20` | 重启 dify-api + dify-worker |
| n8n webhook 404 | `docker logs n8n \| grep unknown` | Web UI 激活工作流 |
| LangChain 500 | `docker logs langchain-bridge --tail 20` | 检查 Python import / API key |
| Backend 502 | `docker logs aitoearn-server --tail 20` | 检查 app.module.js |
| n8n SQLITE_READONLY | `docker exec n8n ls -la ~/.n8n/` | 确认 Docker 命名卷 |
| OpenClaw 不可达 | `openclaw config get gateway.remote.url` | 重启 OpenClaw 网关 |

---

> **核心原则**: n8n 是唯一中枢——它调度万物，万物不互相调度。简单走捷径(Dify直连)，复杂走中枢(n8n调度)。异步优先(>30s必回调)。严守红线。LangChain 工具调 Dify 属豁免，但调度权始终在 n8n。
