# AiBrand 五层 AI 协同系统 — 操作使用手册

> 版本 1.0 | 2026-06-03 | 覆盖 OpenClaw + Dify + LangChain + n8n + Claude Code

---

## 一、系统架构速览

```
外部请求
  ├─ 人的请求 → L4 Dify (:5001)
  └─ 系统事件 → L2 n8n  (:5678) 【唯一中枢调度器】
                    │
       ┌────────────┼────────────┬────────────┐
       ▼            ▼            ▼            ▼
    L4 Dify      L3 LangChain  L1 Claude    L5 OpenClaw
    :5001        :4010         :4020        :19001
    知识库RAG     Agent编排     代码/部署    通信/RPA
       │            │            │            │
       └────────────┴────────────┴────────────┘
                    │ 回调 n8n
                    ▼
              n8n Task Callback Hub
                    │
                    ▼
              返回结果 + 通知 + 存档
```

---

## 二、各组件速查

| 组件 | 端口 | 地址 | 账号 | 用途 |
|------|:--:|------|------|------|
| **Dify** | 5001 | http://localhost:3010 | 2393162266@qq.com / admin123 | 知识库+AI应用 |
| **n8n** | 5678 | http://localhost:5678 | 同上 | 工作流自动化 |
| **LangChain Bridge** | 4010 | http://localhost:4010/docs | - | Agent编排+评测 |
| **Claude Bridge** | 4020 | http://localhost:4020/docs | - | 代码执行+审计 |
| **OpenClaw** | 19001 | CLI: `openclaw` | - | 通信+RPA |
| **Backend API** | 8080 | http://localhost:8080/api | - | 业务API |
| **Frontend** | 6060 | http://localhost:6060 | - | 用户界面 |
| **MongoDB** | 27017 | admin/password | - | 数据库 |
| **Redis** | 6379 | password | - | 缓存 |

---

## 三、启动与停止

### 3.1 启动全部服务

```bash
# 1. 启动 AiBrand 核心服务 (Docker)
cd D:\king2046
docker compose up -d

# 2. 启动 n8n (独立 compose)
cd C:\Users\XIAOMI\n8n-docker
docker compose up -d

# 3. 启动 LangChain Bridge (Docker 已自动启动)
# 验证: curl http://localhost:4010/health

# 4. 启动 Claude Code Bridge (宿主机)
cd D:\king2046\project\claude-bridge
start start.bat
# 验证: curl http://localhost:4020/health

# 5. 启动前端开发服务器
cd D:\king2046\project\aitoearn-web
pnpm dev

# 6. 验证全部健康
python D:\king2046\scripts\health-dashboard.py
```

### 3.2 停止全部服务

```bash
# 停止 Docker 服务
cd D:\king2046 && docker compose down
cd C:\Users\XIAOMI\n8n-docker && docker compose down

# 停止 Claude Bridge (关闭 CMD 窗口)
# 停止前端 (Ctrl+C)
```

### 3.3 常用重启

```bash
# 后端代码变更后重启
docker compose restart aitoearn-server

# LangChain Bridge 变更后重启
docker restart langchain-bridge

# n8n 变更后重启
docker restart n8n
```

---

## 四、核心操作流程

### 4.1 AI 内容生成

**方式 A: 通过 Dify Web UI (推荐非技术人员)**

1. 打开 http://localhost:3010 → 登录
2. 选择 "AiBrand Content Factory" 应用
3. 输入需求 → AI 生成内容

**方式 B: 通过 API (推荐开发人员)**

```bash
# 简单生成
curl -X POST http://localhost:5001/v1/chat-messages \
  -H "Authorization: Bearer app-yyqOFelScAqYi3v55LrEVKAB" \
  -H "Content-Type: application/json" \
  -d '{"query":"写一条小红书618促销文案","user":"test","response_mode":"blocking","inputs":{}}'

# 通过 LangChain Agent (支持多工具)
curl -X POST http://localhost:4010/agent/run-unified \
  -H "Content-Type: application/json" \
  -d '{"task_id":"t1","intent":"content","payload":{"task":"写文案","tools":["generate_content"]}}'
```

### 4.2 工作流触发

```bash
# 竞品分析
curl -X POST http://localhost:5678/webhook/aibrand/competitor-analysis \
  -H "Content-Type: application/json" \
  -d '{"keyword":"AI客服","platforms":["小红书","抖音"]}'

# 热搜话题
curl -X POST http://localhost:5678/webhook/aibrand/trending-topics \
  -H "Content-Type: application/json" \
  -d '{"platform":"小红书","category":"美妆"}'

# 或通过 LangChain Bridge (推荐)
curl -X POST http://localhost:4010/n8n/trigger \
  -H "Content-Type: application/json" \
  -d '{"webhook_path":"aibrand/competitor-analysis","payload":{"keyword":"AI客服"}}'
```

### 4.3 AI 质量评测

```bash
curl -X POST http://localhost:4010/eval \
  -H "Content-Type: application/json" \
  -d '{"input_text":"待评测的内容...","criteria":["accuracy","creativity"]}'
```

### 4.4 代码审查与部署

```bash
# Git 日志
curl -X POST http://localhost:4020/claude/execute \
  -H "Content-Type: application/json" \
  -d '{"task_id":"t1","action":"git_log","payload":{}}'

# 列出可用操作
curl http://localhost:4020/claude/actions

# 异步执行 (长时间任务，结果回调 n8n)
curl -X POST http://localhost:4020/claude/execute-async \
  -H "Content-Type: application/json" \
  -d '{"task_id":"t2","action":"code_review","payload":{"path":"."},"callback_webhook":"http://n8n:5678/webhook/aibrand/task-callback"}'
```

### 4.5 健康检查

```bash
# 全量探针
python D:\king2046\scripts\health-dashboard.py

# 单组件检查
curl http://localhost:4010/health   # LangChain (含 Dify+n8n 状态)
curl http://localhost:4020/health   # Claude Bridge
curl http://localhost:8080/api/health # Backend
```

---

## 五、n8n 工作流管理

### 5.1 工作流列表

| 工作流 | Webhook | 触发 | 状态 |
|--------|------|------|:--:|
| 竞品分析 | `aibrand/competitor-analysis` | Webhook | 📄 |
| 热搜话题 | `aibrand/trending-topics` | 定时+Webhook | 📄 |
| 发布追踪 | `aibrand/post-publish-tracking` | Webhook | 📄 |
| 账号健康 | `aibrand/account-health-check` | 定时+Webhook | 📄 |
| 中枢回调 | `aibrand/task-callback` | Webhook | 📄 |
| 配额校验 | `aibrand/quota-check` | Webhook | 📄 |
| 积分扣费 | `aibrand/credits-deduct` | Webhook | 📄 |
| Claude调度 | `aibrand/claude-execute` | Webhook | 📄 |
| 通知网关 | `aibrand/openclaw-notify` | Webhook | 📄 |

### 5.2 导入新工作流

1. 打开 http://localhost:5678 → 登录
2. 右上角 "Import from File"
3. 选择 `D:\king2046\n8n-workflows\*.json`
4. 点击右上角 Active 开关激活

---

## 六、故障排查

### 6.1 常见问题

| 症状 | 可能原因 | 解决 |
|------|------|------|
| Backend 502 | 容器崩溃 | `docker logs aitoearn-server --tail 30` |
| n8n webhook 404 | 工作流未激活 | Web UI 激活开关 |
| LangChain 500 | Python import 错误 | `docker logs langchain-bridge --tail 20` |
| Dify 超时 | 模型配置问题 | Web UI 检查模型设置 |
| SQLite 只读 | Windows 权限 | Docker 命名卷 (已修复) |
| Claude Bridge 不可达 | 进程未启动 | 运行 `start.bat` |
| Docker 网络超时 | 镜像源不可达 | 等待网络恢复 |

### 6.2 日志位置

```bash
docker logs aitoearn-server --tail 50    # 后端
docker logs langchain-bridge --tail 20   # LangChain
docker logs n8n --tail 20                # n8n
docker logs dify-api-1 --tail 20         # Dify
docker logs aitoearn-nginx --tail 20     # Nginx
```

### 6.3 紧急恢复

```bash
# 全部重启
cd D:\king2046 && docker compose restart
cd C:\Users\XIAOMI\n8n-docker && docker compose restart

# 单个容器重建
docker compose up -d --force-recreate aitoearn-server

# n8n 数据恢复 (如有备份)
docker cp n8n_data_backup.sqlite n8n:/home/node/.n8n/database.sqlite
docker restart n8n
```

---

## 七、统一消息 Schema

所有跨组件通信使用统一格式：

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
    "system_prompt": "你是AI运营专家"
  },
  "callback_webhook": "http://n8n:5678/webhook/aibrand/task-callback"
}
```

---

## 八、文件索引

| 文件 | 位置 | 用途 |
|------|------|------|
| 协同规范 | `D:/king2046/AI-COLLABORATION-RULES.md` | 五层架构+分工+规则 |
| 开发日志 | `D:/king2046/DEVELOPMENT_LOG.md` | 项目进度+架构决策 |
| 健康探针 | `D:/king2046/scripts/health-dashboard.py` | 全组件监控 |
| n8n 工作流 | `D:/king2046/n8n-workflows/` | 9个工作流JSON |
| LangChain Bridge | `D:/king2046/project/aitoearn-backend/tmp/` | v3源码 |
| Claude Bridge | `D:/king2046/project/claude-bridge/` | 源码+启动脚本 |
| 前端 | `D:/king2046/project/aitoearn-web/` | Next.js 14 |
| 后端 | `D:/king2046/project/aitoearn-backend/` | NestJS |

---

## 九、快速决策树

```
收到任务 →
  ├─ 简单问答/知识库/短文 → Dify直连Claude → 返回 (链路A)
  ├─ 多步骤/跨系统/复杂 → Dify→n8n→LangChain→回调→返回 (链路B)
  ├─ 定时/同步/批量 → n8n 直接执行 (链路C)
  ├─ 代码变更/部署 → n8n→Claude Bridge→回调→返回 (链路D)
  └─ 不确定 → 默认走链路B (保守策略)
```

---

> **系统就绪时间**: 2026-06-03 | **版本**: AiBrand MVP + 五层AI v3.1 | **状态**: 🟢 95% Ready
