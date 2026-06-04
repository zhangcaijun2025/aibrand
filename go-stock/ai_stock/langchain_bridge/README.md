# LangChain 与 OpenClaw / Dify / N8N 四层互通架构

> 部署日期：2026-05-26
> 端口：4010 | 网络：ai-platform

---

## 架构总览

```
                    ┌─────────────────────────────────────┐
                    │         用户交互层                    │
                    │  飞书  ·  微信  ·  Web  ·  API       │
                    └────────────┬────────────────────────┘
                                 │
                    ┌────────────▼────────────────────────┐
                    │       OpenClaw (小智 / 研究助手)     │
                    │    Agent 调度 · 工具调用 · 会话管理   │
                    └────────────┬────────────────────────┘
                                 │ 调用 lc_* 工具
                    ┌────────────▼────────────────────────┐
                    │      LangChain Bridge :4010          │ ← 新增！
                    │   LLM编排 · Agent · RAG · 工具链     │
                    └────┬──────────┬──────────┬──────────┘
                         │          │          │
              ┌──────────▼──┐ ┌─────▼────┐ ┌──▼──────────┐
              │  Dify :8082 │ │N8N :5678 │ │ Ollama :11434│
              │  AI应用开发  │ │ 自动化中枢 │ │ 本地大模型   │
              │  知识库RAG  │ │300+集成   │ │ 开源LLM     │
              └─────────────┘ └──────────┘ └─────────────┘
```

---

## 四层互通的 6 种协作模式

### 模式 1：OpenClaw → LangChain（工具调用）

小智（OpenClaw Agent）通过 lc_* 工具调用 LangChain Bridge：

```
小智收到："帮我搜索知识库中关于XX的资料，然后触发N8N发送报告"

1. lc_dify_search("XX")  →  Dify 知识库检索
2. lc_trigger_n8n("send-report", {...}) → N8N 发送报告
3. lc_chat(...) → LangChain LLM 汇总结果
```

**已在 `openclaw_tools.py` 中注册 7 个工具。**

### 模式 2：LangChain → Dify（AI 能力调用）

LangChain 通过 Dify API 调用已搭建的 AI 应用：
- `/dify/chat` — 调用 Dify 对话型应用
- `/dify/search` — 搜索 Dify 知识库（RAG）

适用：LangChain Agent 需要访问企业知识库时。

### 模式 3：LangChain → N8N（自动化触发器）

LangChain 通过 N8N Webhook 触发工作流：
- `/n8n/trigger` — 触发指定 Webhook
- `/n8n/workflows` — 发现所有可用工作流

适用：AI Agent 需要执行邮件发送、数据同步、工单创建等操作。

### 模式 4：Dify → LangChain（HTTP 节点）

在 Dify Agent 中配置 HTTP 请求节点调用 LangChain Bridge：
```
URL: http://langchain-bridge:4010/chat
Body: {"message": "{{sys.query}}", "model": "ollama/qwen2.5:7b"}
```

适用：Dify 工作流中需要 LangChain 的复杂编排能力。

### 模式 5：N8N → LangChain（HTTP Request 节点）

在 N8N 工作流中配置 HTTP Request 节点：
```
URL: http://langchain-bridge:4010/agent/run
Method: POST
Body: {"task": "分析数据并生成报告"}
```

适用：N8N 自动化流程中需要 AI 分析/生成能力。

### 模式 6：LangChain ↔ Ollama（本地推理）

LangChain Bridge 支持切换本地模型：
```
POST /chat
{"message": "你好", "model": "ollama/qwen2.5:7b"}
```

适用：私有化场景，不依赖外部 API。

---

## API 端点一览

| 方法 | 路径 | 说明 | 主要调用方 |
|:----:|------|------|:---------:|
| GET | `/health` | 健康检查（含下游状态） | 监控系统/OpenClaw |
| POST | `/chat` | LLM 对话 | OpenClaw/Dify/N8N |
| POST | `/dify/chat` | 调用 Dify 对话 | OpenClaw/LangChain |
| POST | `/dify/search` | 搜索 Dify 知识库 | OpenClaw/LangChain |
| POST | `/n8n/trigger` | 触发 N8N 工作流 | OpenClaw/LangChain |
| GET | `/n8n/workflows` | 列出 N8N 工作流 | OpenClaw |
| POST | `/agent/run` | 运行 LangChain Agent | Dify/N8N |
| GET | `/docs` | Swagger API 文档 | 开发者 |

---

## 启动方式

### 方式一：Docker 部署（推荐，加入 ai-platform 网络）

```bash
cd C:\Users\XIAOMI\Desktop\ai_stock\langchain_bridge
docker compose up -d
```

### 方式二：直接运行（调试用）

```bash
cd C:\Users\XIAOMI\Desktop\ai_stock\langchain_bridge
python app.py
```

---

## OpenClaw 集成（让 小智 能用）

在 openclaw.json 的 tool 配置中添加 `openclaw_tools.py` 中定义的 7 个工具，
小智就能理解并调用：
- `lc_chat` — LLM 对话
- `lc_dify_chat` — Dify 对话
- `lc_dify_search` — 知识库搜索
- `lc_trigger_n8n` — 触发自动化
- `lc_agent_run` — Agent 任务
- `lc_list_n8n_workflows` — 工作流清单
- `lc_health` — 健康检查

---

## 注册到健康监控

将以下配置添加到 `service_registry.json` 的 `services` 数组：

```json
{
  "id": "langchain-bridge",
  "name": "LangChain Bridge",
  "port": 4010,
  "type": "web",
  "health_url": "http://localhost:4010/health",
  "tags": ["ai", "langchain", "bridge"]
}
```
