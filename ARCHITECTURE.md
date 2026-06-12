# AiBrand Architecture

> 全模态自进化 AI 内容智造平台 — 架构文档  
> Last updated: 2026-06-12

## Quick Start

```bash
# Start all services
docker compose -f deploy/docker-compose.prod.yml up -d

# Start frontend (dev)
cd project/aibrand-studio && npx next dev --port 3099

# Start ComfyUI (visual engine)
cd deploy/comfyui && python main.py --listen 0.0.0.0 --cpu --port 8188
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| aibrand-studio | 3099 | Next.js Frontend |
| aibrand-server | 8080 | NestJS Backend |
| aibrand-mongodb | 27017 | Primary Database |
| aibrand-redis | 6379 | Cache / Sessions / Queue |
| aibrand-litellm | 4000 | AI Model Gateway (11 models) |
| aibrand-comfyui | 8188 | Visual Workflow Engine |
| aibrand-dify | 5001 | AI Workflow Platform |
| aibrand-n8n | 5678 | Automation Engine |
| aibrand-nginx | 80/443 | Reverse Proxy |

## Architecture Layers

```
1. Terminal (终端应用层)
   Pages: 14 routes (/, /workspace, /visual, /workflows, /developers...)

2. Gateway (统一网关层)
   LiteLLM (11 models) + ComfyUI Gateway + Dify RAG

3. Orchestration (任务编排层)
   n8n Workflows ←→ ComfyUI Workflow Engine (dual-engine)

4. Models (模型资源池)
   Qwen×3, GLM×2, DeepSeek×2, Claude×3, Ollama + Seedream 4.0/4.5

5. Storage (存储媒体层)
   MongoDB + Redis + Workflow Library + Version Snapshots

6. Evolution (自进化中枢)
   7 Probes + 4 Scanners + 6 Agents + Sandbox + Grayscale Deploy

7. Observability (数据观测层)
   Full-dimension metrics + Visual metrics + Attribution

8. Compliance (风控合规层)
   Text + Image + Video + GEO 4-dimension compliance
```

## Key API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/visual` | Visual generation (Seedream 4.0) |
| `/api/visual?batch=1` | Multi-platform batch covers |
| `/api/geo/visual` | GEO regional visual covers |
| `/api/templates` | Template marketplace |
| `/api/intel` | Competitor intelligence + predictions |
| `/api/lifeform` | Content lifeform + AIGC sandbox |
| `/api/paas/visual` | External PaaS API |
| `/api/paas/keys` | API key management |
| `/api/webhooks` | Event webhook system |
| `/api/auth` | User authentication |
| `/api/billing` | Subscription & payment |
| `/api/monitor` | System health & alerts |
| `/api/ops` | CI/CD + backup + errors |
| `/api/qa` | Tests (smoke/perf/security) |
| `/api/docs` | API documentation |

## n8n Workflows

10+ automated workflows:
- **Super Pipeline**: LiteLLM → ComfyUI → Seedream → Publish
- **Lifeform Auto-Pilot**: Daily autonomous content generation
- **Fission Engine**: Cross-platform content propagation
- **Smart Cover**: Single-image AI cover generation
- **Batch Cover**: Multi-platform batch generation
- **GEO Batch**: Multi-city regional covers
- **Daily Cover**: Scheduled daily auto-cover
- **Smart Reply**: AI comment reply
- **Quota Check**: Usage monitoring
- **Credits Deduct**: Credit management

## Self-Evolution System

```
External Signals → Scanners (4 visual) → Probes (7 visual) 
→ Evolution Engine → Agents (6 visual) → Sandbox Replay 
→ Grayscale Deploy → Production → Feedback Loop
```

## Tech Stack

- **Frontend**: Next.js 16 (Turbopack), React, TypeScript
- **Backend**: NestJS, Node.js
- **Database**: MongoDB 7, Redis 7
- **AI**: LiteLLM (11 models), Seedream 4.0, ComfyUI (778 nodes)
- **Automation**: n8n 1.107.4, Dify 1.13.3
- **Infrastructure**: Docker, Docker Compose, Nginx

## Directory Structure

```
king2046/
├── project/aibrand-studio/     # Next.js Frontend
│   └── src/
│       ├── app/                # 16 page routes + 45 API routes
│       ├── components/         # UI components
│       │   ├── visual/         # CoverGenerator, Dashboard, Market, WorkflowCenter
│       │   ├── dashboard/      # RecommendWidget, Calendar, Health, Charts
│       │   ├── docs/           # DocSite
│       │   ├── landing/        # LandingPage
│       │   └── onboarding/     # Wizard
│       └── lib/
│           ├── engines/        # visual-gateway, model-gateway, evolution-*
│           ├── evolution/      # visual-probes/scanners/agents, geo-*
│           ├── visual/         # comfyui-gateway, workflow-sandbox, cache
│           ├── analytics/      # competitor-intel, effect-predictor, data-warehouse
│           ├── auth/           # user-system, team-collab, compliance, white-label
│           ├── payment/        # billing
│           ├── notifications/  # center
│           ├── integrations/   # connectors
│           ├── i18n/           # 4 locales
│           ├── seo/            # metadata
│           ├── ops/            # ci-cd, backup-dr, error-tracker
│           ├── qa/             # perf-test, security-scan, smoke-test
│           ├── store/          # mongo-db, redis-client
│           ├── media/          # asset-library
│           └── content/        # version-manager
├── deploy/
│   ├── docker-compose.prod.yml # Production orchestration
│   ├── litellm/config.yaml     # 11-model gateway config
│   ├── comfyui/                # ComfyUI source + custom nodes
│   └── n8n/                    # n8n workflow scripts
└── apps/aibrand-server/        # NestJS Backend
```

## Environment Variables

```bash
# AI Models
SEEDREAM_API_KEY=ark-xxx        # Volcano Engine ARK
GLM_API_KEY=xxx                  # Zhipu AI
QWEN_API_KEY=sk-xxx              # Alibaba Bailian
ANTHROPIC_API_KEY=sk-ant-xxx    # (optional)

# Infrastructure
MONGODB_URI=mongodb://aibrand-mongodb:27017/aibrand
REDIS_HOST=aibrand-redis
REDIS_PORT=6379

# Services
LITELLM_BASE=http://aibrand-litellm:4000
COMFYUI_BASE_URL=http://aibrand-comfyui:8188
N8N_LICENSE_KEY=xxx
```
