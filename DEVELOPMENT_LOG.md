# AiBrand MVP 开发日志

> 最后更新: 2026-06-03 | 当前阶段: Phase 4 进行中，总进度 ~75%

---

## 一、项目概述

基于 [AiToEarn](https://github.com/yikart/AiToEarn) (MIT 许可) 打造的 **AI 全域运营平台**。

**目标客户**: 超级个体、一人公司、中小微企业  
**商业模式**: SaaS 订阅 + 私有化部署双轨  
**产品定位**: AI 内容创作 + 多平台一键发布 + 客户互动管理 + 数据洞察

---

## 二、目录与仓库结构

> **2026-06-03 更新**: 所有项目文件已从 C 盘迁移至 `D:\king2046\`。

| 路径 | 用途 |
|------|------|
| `D:\king2046\` | 🔧 **AiBrand 统一工作区** — 源码 + 文档 + Docker + 脚本 |
| `D:\king2046\project\aitoearn-web\` | 🖥️ 前端 (Next.js 14, 端口 6060) |
| `D:\king2046\project\aitoearn-backend\` | ⚙️ 后端 (NestJS Nx monorepo) |
| `D:\king2046\project\openmontage-bridge\` | 🎬 视频制作桥接 (Python FastAPI, 端口 8001) |

---

## 三、运行环境

### 本地服务 (Docker)

| 服务 | 端口 | 状态 |
|------|------|------|
| aitoearn-nginx | 8080 (API), 9000 (OSS) | ✅ healthy |
| aitoearn-mongodb | 27017 | ✅ healthy |
| aitoearn-redis | 6379 | ✅ healthy |
| aitoearn-server | 3002 (内部) | ✅ healthy |
| aitoearn-ai | 3010 (内部) | ✅ healthy |
| aitoearn-rustfs | 9001 | ✅ healthy |
| aitoearn-web | 3000 (内部) | ✅ healthy |

### 前端开发服务器

```bash
cd D:\king2046\project\aitoearn-web
pnpm dev          # 端口 6060，热重载
```

### 本地域名

```
127.0.0.1 aibrand.local api.aibrand.local   (在 C:\Windows\System32\drivers\etc\hosts)
```

### 关键凭据 (本地开发)

```
MongoDB:   mongodb://admin:password@localhost:27017
Redis:     redis://:password@localhost:6379
API Base:  http://localhost:8080/api
AI URL:    http://localhost:8080/api/ai
RustFS:    http://localhost:9000 (access_key: rustfsadmin, secret: rustfsadmin)
```

### Node.js 版本

```
20.18.3  (通过 fnm 管理, .node-version 自动切换)
fnm use 20.18.3   # 手动切换命令
```

---

## 四、已完成的变更

### 提交 1: 后端订阅模块
```
c17c4a7b feat: add subscription module with plan/quotas API
```
**新增文件 (7)**:
- `apps/aitoearn-server/src/core/subscription/subscription.module.ts`
- `apps/aitoearn-server/src/core/subscription/subscription.controller.ts`
- `apps/aitoearn-server/src/core/subscription/subscription.service.ts`
- `apps/aitoearn-server/src/core/subscription/subscription.repository.ts`
- `apps/aitoearn-server/src/core/subscription/subscription.schema.ts` — 3个 MongoDB 模型
- `apps/aitoearn-server/src/core/subscription/subscription.dto.ts`
- `apps/aitoearn-server/src/core/subscription/subscription.vo.ts`

**修改文件 (3)**:
- `apps/aitoearn-server/src/app.module.ts` — 注册 SubscriptionModule
- `libs/common/src/enums/response-code.enum.ts` — 4个新错误码
- `libs/common/src/i18n/messages.ts` — 对应的中/英/日消息

**API 端点**:
- `GET  /api/user/subscription/plans` — 获取所有订阅计划
- `GET  /api/user/subscription` — 获取我的订阅状态
- `POST /api/user/subscription/subscribe` — 创建订阅
- `DELETE /api/user/subscription` — 取消订阅

---

### 提交 2: 品牌化改造
```
837758d2 feat: AiBrand rebranding + MVP route control + i18n simplification
```
**变更 (7 文件)**:
- `src/middleware.ts` — 新增 MVP 路由隐藏 (ai-social/brand-promotion/diagnosis 等 → welcome)
- `src/lib/i18n/languageConfig.ts` — 语言精简为 zh-CN + en，默认中文
- `src/app/[lng]/auth/login/.../LoginContent/index.tsx` — AiToEarn → AiBrand
- `src/app/[lng]/(welcome)/welcome/WelcomePageContent.tsx` — 品牌名替换
- `src/app/[lng]/(welcome)/welcome/.../BeliefsSection.tsx` — 品牌名替换
- `src/app/i18n/locales/zh-CN/welcome.json` — SEO 元数据更新
- `src/app/i18n/locales/en/welcome.json` — 英文 SEO 同步

---

### 提交 3: 落地页与 SEO
```
8a4eca6a feat: landing page + SEO + subscription UI components
```
**新增文件 (9)**:
- `src/app/[lng]/(welcome)/welcome/.../HeroSection.tsx` — Hero 区块
- `src/app/[lng]/(welcome)/welcome/.../StructuredData.tsx` — JSON-LD
- `src/app/[lng]/pricing/page.tsx` — 定价页 (含订阅计划卡片)
- `src/app/sitemap.ts` — sitemap.xml 生成
- `src/app/robots.ts` — robots.txt 生成
- `src/api/subscription.ts` — 前端订阅 API 封装
- `src/hooks/useSubscription.ts` — 订阅状态 Hook
- `src/components/Onboarding/index.tsx` — 4步新手引导
- `src/components/QuotaBar/index.tsx` — 配额进度条

---

### 提交 4-7: AI 平台搭建 + 功能扩展 (2026-06-02/03)
```
ae05fc38 feat: integrate AiServicesModule into app.module.ts
baf65564 feat: frontend feature expansion — AI assistant, new pages, payments
56ab258a feat: AI platform services — Dify + n8n integration + credits orders
3ccba7a8 feat: rebrand welcome page and app layout to AiBrand
c4fe1894 refactor: rebrand i18n strings — AiToEarn/Aitoearn → AiBrand
4bfda7b5 feat: AiBrand brand design system — purple/cyan identity
3adf4819 fix: extract API keys from docker-compose.yml to .env
```

**新增 (关键)**:
- **AI 服务库**: `libs/ai-services/` — DifyService (RAG/Agent/知识库) + N8nService (Webhook/工作流)
- **AI 助理组件**: `AiAssistantWidget/` — 右下角悬浮 AI 对话 + 微信咨询
- **Dify 平台**: 9 容器部署 (localhost:5001/3010/8082), 3 个知识库
- **n8n 工作流**: 4 个自动化工作流 (竞品分析/热搜话题/发布追踪/账号健康)
- **积分订单**: credits-order 模块 (controller/dto/schema/service/webhook)
- **新页面**: admin/analytics/content/create/customers/dashboard/knowledge/publish/bridge-publish
- **支付**: 本地支付服务 + Stripe Dialog + API 代理
- **品牌**: CSS 变量/渐变/阴影系统, shadcn 主题品牌化, 全局 i18n 替换
- **安全**: 密钥从 docker-compose.yml 移到 .env

---

## 五、MVP 页面路由 (当前状态)

| 路由 | 状态 | 说明 |
|------|:--:|------|
| `/` | ✅ | 自动重定向到 /zh-CN/welcome |
| `/zh-CN/welcome` | ✅ | 落地页 (Hero + Features + Reviews) |
| `/zh-CN/pricing` | ✅ | 定价页 (订阅计划 + 积分充值) |
| `/zh-CN/auth` | ✅ | 登录/注册 |
| `/zh-CN/accounts` | ✅ | 平台账号管理 |
| `/zh-CN/chat` | ✅ | AI 对话式创作 |
| `/zh-CN/draft-box` | ❌ | 缺 page.tsx (待开发) |
| `/zh-CN/admin` | ❌ | 缺 page.tsx (待开发) |
| `/zh-CN/ai-social` | 🔒 | 隐藏 (重定向 → welcome) |
| `/zh-CN/brand-promotion` | 🔒 | 隐藏 |
| `/zh-CN/diagnosis` | 🔒 | 隐藏 |
| `/zh-CN/tasks-history` | 🔒 | 隐藏 |
| `/zh-CN/websit` | 🔒 | 隐藏 |

---

## 六、待完成任务

### Phase 2 剩余 (阻塞于外部依赖)
- [ ] T2.3 — Stripe 支付集成 (需 Stripe 账号 + 配置价格)
- [ ] T2.4 — 支付宝支付集成 (需开放平台应用注册)
- [ ] T2.5 — 后端配额 Guard (代码已准备，需后端构建验证)

### Phase 4 (测试与部署)
- [ ] T4.1 — E2E 测试核心流程
- [ ] T4.2 — 安全加固 (Rate Limiting, CSP, 依赖审计)
- [ ] T4.3 — CI/CD (GitHub Actions)
- [ ] T4.4 — 生产环境部署 (需服务器 + 域名)
- [ ] T4.5 — 上线 Checklist

---

## 七、常用命令速查

```bash
# ── 环境 ──
fnm use 20.18.3                                     # 切换 Node 版本
docker ps                                            # 查看运行中的容器
docker compose -f D:/king2046/docker-compose.yml up -d   # 启动全部服务

# ── 前端开发 ──
cd D:\king2046\project\aitoearn-web
pnpm dev                                             # 启动 dev server (:6060)
pnpm lint                                            # ESLint 检查
pnpm type-check                                      # TypeScript 类型检查

# ── 后端开发 ──
cd D:\king2046\project\aitoearn-backend
pnpm nx serve aitoearn-server                        # 启动后端 dev
pnpm nx serve aitoearn-ai                            # 启动 AI 服务 dev

# ── Docker 重建 (代码变更后) ──
cd D:\king2046
docker compose build --no-cache aitoearn-server      # 重建后端镜像
docker compose up -d --force-recreate aitoearn-server # 重启容器

# ── Git ──
git log --oneline -8                                  # 查看提交历史

# ── 测试 ──
# 域名: curl http://aibrand.local:6060/zh-CN/welcome
# API:  curl http://localhost:8080/api/_nhealth
```

---

## 八、架构决策记录

### ADR-1: 双仓库策略
- **AiToEarn 仓库**: 存放所有源码，Docker 编排从该目录运行
- **D:\king2046**: 仅存放项目管理文档、任务拆解、定制脚本
- **原因**: 避免破坏运行中的 Docker 环境，源码与项目管理工作分离

### ADR-2: 订阅模型
- MVP 使用硬编码的 3 个计划 (free/pro/enterprise)
- V2 迁移到数据库驱动 + 管理后台配置
- **原因**: 快速上线，初期计划不会频繁变动

### ADR-3: 多平台 OAuth Relay
- 使用 AiToEarn 官方 Relay 机制，避免独立申请 14 个平台开发者账号
- **原因**: 每个平台审批周期 1-4 周，14 个平台总耗时 6-12 个月

### ADR-4: 国际化精简
- MVP 仅保留 zh-CN + en
- 翻译文件保留在仓库中 (ja/de/fr/ko)，代码未删除
- **原因**: V2 可快速恢复多语言支持
