# AiBrand Studio

> AI 内容增长与变现平台 — Create · Publish · Engage · Monetize

AiBrand 通过 AI Agent 自动化，帮助 OPC（一人公司）、创作者与品牌完成内容的生产、分发、互动与变现闭环。

## 核心能力

- **Create**：AI 内容创作 — 图文/视频生成、批量生产、多模型选择
- **Publish**：多平台一键分发与日历排期
- **Engage**：自动化互动、评论挖掘、品牌监测
- **Monetize**：内容交易与 CPS / CPE / CPM 多种结算模式

## 仓库结构

| 目录 | 说明 |
|------|------|
| `project/aibrand-studio` | 前端与业务 API（Next.js 16 + React 19 + Prisma + BullMQ） |
| `project/aibrand-backend` | 后端 Nx monorepo（aibrand-server + aibrand-ai + 18 个共享库） |
| `evolution-engine` | Python 联邦自进化引擎（8 阶段闭环） |
| `claude-bridge` | Claude Code 桥接服务 |
| `deploy/` | 部署资产（docker-compose、LiteLLM、n8n、ComfyUI） |
| `docs/` | 架构与设计文档 |

## 快速开始

```bash
# 一键部署（含数据库与 AI 服务）
docker compose up -d

# 前端开发
cd project/aibrand-studio
pnpm install && pnpm dev

# 后端开发
cd project/aibrand-backend
pnpm install
pnpm nx serve aibrand-server
```

更多说明见 [ARCHITECTURE.md](ARCHITECTURE.md) 与各子项目文档。

## 技术栈

Next.js 16 · React 19 · NestJS 11 · Prisma · PostgreSQL · MongoDB · Redis · LangChain · LiteLLM · BullMQ · Docker

## License

MIT
