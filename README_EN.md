# AiBrand Studio

> AI-powered content growth & monetization platform — Create · Publish · Engage · Monetize

AiBrand uses AI agents to help one-person companies, creators, and brands build, distribute, and monetize content across major platforms.

## Key Capabilities

- **Create**: AI content generation (text/image/video, batch production, multi-model)
- **Publish**: one-click multi-platform distribution and scheduling
- **Engage**: automated engagement, comment mining, brand monitoring
- **Monetize**: content marketplace with CPS / CPE / CPM settlement models

## Repository Layout

| Directory | Description |
|-----------|-------------|
| `project/aibrand-studio` | Frontend & business APIs (Next.js 16 + React 19 + Prisma + BullMQ) |
| `project/aibrand-backend` | Backend Nx monorepo (aibrand-server + aibrand-ai + 18 shared libs) |
| `evolution-engine` | Python federated self-evolving engine (8-phase loop) |
| `claude-bridge` | Claude Code bridge service |
| `deploy/` | Deployment assets (docker-compose, LiteLLM, n8n, ComfyUI) |
| `docs/` | Architecture & design docs |

## Quick Start

```bash
# One-click deployment (databases + AI services)
docker compose up -d

# Frontend development
cd project/aibrand-studio
pnpm install && pnpm dev

# Backend development
cd project/aibrand-backend
pnpm install
pnpm nx serve aibrand-server
```

See [ARCHITECTURE.md](ARCHITECTURE.md) and sub-project docs for details.

## Tech Stack

Next.js 16 · React 19 · NestJS 11 · Prisma · PostgreSQL · MongoDB · Redis · LangChain · LiteLLM · BullMQ · Docker

## License

MIT
