# AI 智能选股系统 · 架构说明

## 系统架构

```
┌──────────┬──────────────────────────────┬──────────┐
│ 左侧导航  │       中央核心仪表盘          │ 右侧辅助  │
│ 200px    │       flex: 1                │  400px   │
│          │  📊 市场全景 & 系统状态        │ 🤖 AI决策│
│ [Logo]   │  🔥 TOP5选股池 + 雷达图       │ 📈 市场情绪│
│ 📊 总览  │  🤖 AI推理看板                │ 📰 实时快讯│
│ 📁 策略  │                              │ 📋 工作流 │
│ ...      │                              │          │
│ 👤 军哥  │                              │          │
└──────────┴──────────────────────────────┴──────────┘

          ┌──────────────────────┐
          │  health_monitor.py   │ ← 独立进程，探活所有服务
          │  port 3998           │
          └──────────────────────┘
```

## 项目结构

```
ai_stock/                          # AI 选股仪表盘 (Flask @4000)
├── app.py                         # 入口文件 (13行)
├── config/
│   └── settings.py                # 配置管理
├── routes/
│   ├── dashboard.py                # 仪表盘路由 (4个)
│   └── analysis.py                 # 分析报告路由 (2个)
├── services/
│   ├── stock_engine.py             # 评分/情绪/新闻引擎
│   └── dashboard_data.py           # 数据构建层
├── health/
│   ├── health_monitor.py           # 健康监控服务 (Flask @3998)
│   └── service_registry.json       # 服务注册中心
├── templates/
│   └── index.html                  # 三栏仪表盘模板
├── static/
│   ├── style.css                   # 样式
│   └── scripts.js                  # 前端交互
├── tests/
│   └── test_basic.py               # 基础测试 (6个)
├── pyproject.toml                  # Python 工具配置
└── .prettierrc                     # 前端格式配置

AiToEarn/
├── project/
│   ├── aitoearn-web/               # 前端 Web (Next.js @6060)
│   ├── aitoearn-electron/           # Electron 桌面端
│   └── aitoearn-backend/           # Go 后端
├── docker-compose.yml               # Docker 编排 (port 8080)
├── nginx/                          # Nginx 配置
└── go-stock/                       # Go 股票服务

InspirationNote/                     # 灵感笔记 (Flask @8088)
└── inspiration_server.py
```

## 服务清单

| 服务 | 端口 | 访问地址 | 依赖 |
|------|------|---------|------|
| AI 选股仪表盘 | 4000 | http://localhost:4000 | Flask |
| 健康监控器 | 3998 | http://localhost:3998 | Flask (独立) |
| AiToEarn Web | 6060 | http://localhost:6060/zh-CN | Next.js |
| AiToEarn 后端 | 8080 | http://localhost:8080 | Docker |
| N8N 工作流 | 5678 | http://localhost:5678 | Docker |
| Dify AI | 8082 | http://localhost:8082 | Docker |
| PraisonAI | 8086 | http://localhost:8086 | Docker |
| 灵感笔记 | 8088 | http://localhost:8088 | Flask |
| 电销系统 | - | 桌面双击 main.py | PyQt6 |

## 快速启动

```bash
# 一键启动所有服务
桌面\启动AI工作台.bat

# 或手动启动核心服务
cd ai_stock && python app.py              # 仪表盘
cd ai_stock/health && python health_monitor.py  # 监控
cd AiToEarn/project/aitoearn-web && npm run dev  # 前端
```

## 开发规范

- Python: black (格式化) + pylint (检查) + pytest (测试)
- TypeScript: eslint + prettier + strict mode
- Git: 功能分支 → PR → main
- 所有新服务需在 `service_registry.json` 注册
