# AiBrand MVP 开发日志

> 最后更新: 2026-06-06 00:10 | 当前阶段: 后端 Docker 全部修复 + 浏览器扩展实测 | 总进度 ~96%

---

## 十五、2026-06-05/06 — aibrand-server 容器修复完成

### 问题根因
aibrand-server 容器因多个依赖缺失导致启动失败，根本原因是 `package.json` 中未声明运行时实际需要的依赖。

### 修复内容

**1. package.json 新增依赖 (6个)**
- `@nestjs/mongoose: ^11.0.3` — agent/workflow/tools/credits/subscription 等模块直接使用
- `@yikart/ali-sms: workspace:*` — 阿里云短信模块
- `@yikart/channel-db: workspace:*` — 渠道数据库模块
- `mongoose: ^8.18.0` — 12个文件直接导入 (Types, Schema)
- `nanoid: ^5.1.6` — API Key 生成
- `qs: ^6.14.0` — Pinterest API 查询字符串
- `gaxios: ^7.0.0` — YouTube API 类型引用

**2. libs/ai-services/package.json 修复**
- `main` 字段: `"./index.js"` → `"./src/index.js"` (编译输出在 src/ 下)

**3. Dockerfile 简化**
- 移除 `pnpm add` hack (改为 package.json 声明依赖)
- 移除手动 symlink (pnpm workspace:* 自动处理)
- 添加 `--prod` 标志 (对齐 aibrand-ai 模式，减小镜像)

**4. config.js 补充**
- 新增 `newApi` 配置段，读取 `NEW_API_BASE_URL` / `NEW_API_TOKEN`
- 修复 `OneApiService` 未被注入的问题 (AiServicesModule 仅在 oneApi 配置存在时导出)

### 当前容器全景 (全部健康)
| 服务 | 状态 |
|------|:--:|
| MongoDB/Redis/RustFS | 🟢 |
| Dify 全家桶 (9容器) | 🟢 |
| n8n / langchain-bridge | 🟢 |
| aibrand-ai | 🟢 |
| aibrand-server | 🟢 |
| aibrand-web | 🟢 |
| aibrand-nginx | 🟢 |

---

## 十四、2026-06-05 会话成果

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

### ADR-5: 五层 AI 协同架构 (2026-06-03)
- L5 OpenClaw (通信网关) → L4 Dify (AI应用) → L3 LangChain (智能编排) → L2 n8n (自动化) → L1 Claude Code (研发)
- 刚性红线：每层禁止越界，API互通走REST，全链路X-Request-ID追踪
- 精简版(四层内测) vs 完整版(五层商用)
- 详见: `AI-COLLABORATION-RULES.md`

### ADR-6: Docker 卷策略 (2026-06-03)
- **问题**: Windows bind mount 导致容器内 SQLite 权限错误 (SQLITE_READONLY)
- **解决**: n8n 数据目录改用 Docker 命名卷 (`n8n_data`)
- **影响**: 所有需要持久写入的容器 (n8n, Dify, MongoDB) 优先使用命名卷

---

## 九、2026-06-03 会话成果

### 端到端联调
- ✅ 后端 Subscription API 上线 (GET /api/user/subscription/plans → 3个计划)
- ✅ AiServicesModule 部署 (DifyService + N8nService)
- ✅ QuotaGuard 创建 (源码 + 容器部署)
- ⚠️ CreditsModule 阻塞于 Docker 重建 (库版本不匹配)

### 前端页面
- ✅ /draft-box → 200 (53.7KB), DraftBoxCore 完整功能
- ✅ /admin → 200 (50.2KB), 管理仪表板 + 快捷入口

### LangChain Bridge v2.0
- ✅ 7 个 API 端点: /health, /chat, /dify/chat, /dify/search, /n8n/trigger, /agent/run, /eval
- ✅ 3 个 Agent 工具: search_knowledge_base, generate_content, trigger_workflow
- ✅ LangChain 1.3.1 create_agent API 适配
- ✅ AI 输出质量评测 (/eval) 多维度评分

### n8n 工作流
- ✅ 4 个 AI 增强工作流 JSON 就绪 (D:\king2046\n8n-workflows\)
- ⚠️ 需 Web UI 手动激活 (http://localhost:5678)
- ✅ DB 权限问题根因定位: Windows bind mount → 改用 Docker 命名卷

### 五层 AI 协同规范
- ✅ AI-COLLABORATION-RULES.md v2.0
- ✅ 4 条标准主链路 (简易/复杂/自动化/研发变更)
- ✅ 4 重硬性规则 (分流/API/权限/异常回流)
- ✅ 3 类标准化工作流 (业务/AI/研发验收)
- ✅ 模型分层 & 环境隔离 & 速查手册

---

## 十、2026-06-04 会话成果

### C: 盘深度清理 → D: 盘迁移
- ✅ **释放 C: 盘 ~4GB** (删除 AiToEarn 3.4GB 旧源码 + 安装包 400MB + 临时文件)
- ✅ **桌面 AiBrand 文档 20+ 文件** → `D:\king2046\docs\`
- ✅ **项目脚本 14 个** → `D:\king2046\scripts\`
- ✅ **n8n 工作流 24 个** → `D:\king2046\workflows\`
- ✅ Desktop: 从 ~75 项 → 44 项，**0 AiBrand 残留**

### 目录全面整理
- ✅ 根目录从 27 个散落文件 → 10 个约定文件
- ✅ 目录树重组：`docs/design/`, `docs/architecture/`, `docs/archive/`, `docs/deployment/`, `docs/reference/`, `docs/presentations/`, `docker/`, `assets/`, `workflows/`, `scripts/`

### Git 提交
- ✅ `c87d9672` — 298 文件, 37802+ insertions (目录重构 + Dashboard 真数据 + 诊断解锁)

### 后端验证
- ✅ 登录→Token→Dashboard 端到端通过
- ✅ TypeScript 零错误
- ✅ 17/23 后端 API 验证通过
- ✅ Docker 17 容器全部健康

### 前端当前状态
| 页面 | 状态 | 说明 |
|------|:--:|------|
| `/welcome` | ✅ | 品牌落地页 |
| `/auth/login` | ✅ | 邮箱验证码/Google登录 |
| `/dashboard` | ✅ | 真实数据驱动 (Agent+订阅+通知) |
| `/diagnosis` | ✅ | DeepSeek诊断已解锁 |
| `/create` | ⚠️ | AI创作页面，需前端重设计 |
| `/publish` | ⚠️ | 统一发布，需前端重设计 |
| `/accounts` | ⚠️ | 平台账号管理，待优化 |
| `/agent` | ⚠️ | Agent问候页 - 框架完成，视觉效果未达标 |
| `/draft-box` | ⚠️ | 草稿箱，需优化 |
| `/admin` | ⚠️ | 管理后台，需优化 |

### 下一步 — 前端优先级
1. **Agent 问候页重做** — 苏醒动画 + 暗色基调 (Pixso视觉定调 → Rive动画 → 代码实现)
2. **Dashboard 增强** — AI建议可点击执行、待办可操作
3. **AI 创作页** — AI编辑器产品化设计
4. **统一发布页** — 多平台一键发布工作流
5. **n8n 激活** — 打开 localhost:5678 设置管理员，导入 24 工作流

---

## 十一、2026-06-04 Day 1 — Agent 常驻感知层

### 策略
采用**方案 C (A+B 融合)**：先用方案 B 的速度建立 AI 存在感，再逐步切换到方案 A 的 WeChat AI-Native 模式。

### Git 提交
- ✅ `a7383da0` — Agent 常驻感知层 (9 文件, +805/-5)

### 新增文件
| 文件 | 用途 |
|------|------|
| `store/agent/agent-presence.ts` | Agent 常驻状态管理 (唤醒/心情/系统健康), persist 到 localStorage |
| `components/AgentPresence/AgentOrb.tsx` | 28px 呼吸球 (桌面:右下角渐变球体 移动端:顶部AI图标) 权限控制:非登录页自动隐藏 |
| `components/AgentPresence/AgentCommandBar.tsx` | Cmd+K 全局命令面板 (Agent建议+快捷命令+模糊搜索) 键盘导航支持 |
| `components/AgentPresence/index.ts` | 导出入口 |

### 修改文件
| 文件 | 变更 |
|------|------|
| `Providers.tsx` | 集成 AgentOrb + AgentCommandBar 到全局布局 |
| `AgentGreetingCore.tsx` | 记忆上下文展示 + 底部对话输入框 + Presence Store 数据同步 |
| `EmailLoginForm.tsx` | 默认跳转 `/` → `/agent` |
| `PhoneLoginForm.tsx` | 默认跳转 `/` → `/agent` |

### 用户体验变化
1. 登录后 → Agent 苏醒动画 (呼吸光点→睁眼线→问候语→记忆卡片)
2. 右下角 → 渐变呼吸球常驻 (● 在线·8/8组件·健康度93%)
3. 移动端 → 顶部AI图标 (触摸唤起命令面板)
4. Cmd+K/Ctrl+K → 弹出命令面板 (搜索+Agent建议+快捷跳转)
5. 问候完成后 → 底部对话输入框 "跟 Agent 说你想做什么..."

### 技术指标
- TypeScript: 零错误
- 新增代码: 805 行
- 依赖: framer-motion (已有), zustand (已有)
- 性能: Orb 动画使用 compositor-only 属性 (opacity/transform)

### Day 2 计划
- Dashboard AI 注入: 移除 mock 数据
- AI 建议可操作化 (每条带按钮)
- 系统状态横幅

---

## 十二、2026-06-04 Day 1 v2 — WeChat AI-Native 架构重构

### 策略变更
用户反馈 Day 1 v1 (AgentOrb + Cmd/K) **"完全没达到预期效果，跟整体脱节"**。
根因：方案B的渐进式策略在传统SaaS壳上挂AI插件，永远是外挂感。
**立即切换到方案A — WeChat AI-Native 底部4Tab架构。**

### Git
- `2b7240dd` — WeChat AI-Native 底部4Tab架构 + Codex风格AgentPet (11文件, +1031/-4)

### 新增核心组件
| 组件 | 用途 |
|------|------|
| TabLayout | 底部4Tab容器, Zustand状态管理, Cmd+K支持 |
| AiTabView | AI Tab: Agent消息流(问候+状态+简报+建议) + 聊天输入 |
| WorkTabView | 工作Tab: 快捷操作(创作/发布/诊断/分析) + Agent建议 + 今日概况 |
| AssetsTabView | 资产Tab: 平台账号 + 竞品监控 + 客户管理 |
| MeTabView | 我Tab: 订阅 + 积分 + 进化报告 + 设置 |
| AgentPet | Codex风格桌面宠物: 5种心情动画, 悬浮右下角, 点击跳转AI Tab |

### Codex Pet 设计参考
OpenAI Codex Pets: 桌面宠物是AI Agent的视觉状态指示器。
- idle→慢呼吸, greeting→跳跃, working→奔跑, thinking→歪头+粒子, alert→抖动+辉光
- 解决"沉默=不确定": 用户一眼就知道Agent在做什么
- 情感连接: 像素宠物比发光球更有亲和力

### 今日提交汇总
```
2b7240dd feat: WeChat AI-Native 底部4Tab架构 + Codex风格AgentPet
00d18cec docs: Day 1 交付简报 + 开发日志更新
a7383da0 feat: Day 1 — Agent 常驻感知层 (Orb + Cmd/K + 问候落地)
c87d9672 chore: D:\king2046 项目目录全面整理 + Dashboard真数据 + 诊断解锁
```

### Day 2 计划
- 底部4Tab打磨 (过渡动画、首次体验)
- 暗色宇宙主题统一
- 传统页面降级为Agent触发面板

---

## 十三、2026-06-04 Day 1 Final — 自建 OAuth Relay 服务器

### 问题
全部 14 个平台的 OAuth 都通过 `aitoearn.cn` Relay 中转——核心基础设施在竞品手上。

### 方案
自建 Relay 服务器，实现相同 API 协议。AiBrand 主代码改 **0 行**，只改 1 行 env：
```
RELAY_SERVER_URL=https://aitoearn.cn/api → http://localhost:4011
```

### 新增项目: `project/aibrand-relay/`
| 文件 | 用途 |
|------|------|
| `main.py` | FastAPI 应用 (OAuth授权 + API代理 + Token管理) |
| `platforms/base.py` | OAuth2 基类 (build_auth_url / exchange_code / refresh_token) |
| `platforms/youtube.py` | YouTube OAuth 实现 (Google OAuth2 + channel info) |
| `storage/token_store.py` | AES-256 加密 Token 存储 |
| `storage/models.py` | 数据模型 (PlatformToken / AuthState) |
| `Dockerfile` | 独立容器 (端口 4011) |

### 技术要点
- 复用 aitoearn.cn 的 Relay API 协议 (auth/proxy/callback)
- Token AES-256 加密存储 (Fernet)
- 自动 Token 刷新 (过期前刷新)
- 平台热插拔 (有凭证就注册，无需改代码)

### 待完成
- [ ] 注册 YouTube OAuth 凭据 (Google Cloud Console)
- [ ] 注册抖音开放平台 (需企业认证)
- [ ] 注册小红书开放平台 (需专业号认证)
- [ ] 切换到自建 Relay (改 .env RELAY_SERVER_URL)
- [ ] 端到端测试

---

## 十四、2026-06-05 会话成果

### AiBrand 统一浏览器扩展 v2.0
- ✅ **Fork MultiPost + 融合 AiBrand 独家能力** — `D:\king2046\project\aibrand-extension\`
- ✅ 30+ 平台一键发布（继承 MultiPost）+ 小红书 API 直连 + 抖音深度互动
- ✅ 5 语言国际化 (zh_CN / zh_TW / en / ja / ko)
- ✅ AiBrand 品牌设计系统 (Purple/Cyan 渐变 CSS 变量)
- ✅ 后端集成模块 (Auth / 账号同步 / 任务管理)
- ✅ Web App Bridge 重写 — 从错误的 `chrome.runtime.sendMessage` 改为标准 `window.postMessage` 协议
- ✅ 构建成功 (2.24 MB), 待用户加载到 Chrome 测试
- 📄 详细分析文档: `docs/analysis/multipost-vs-aibrand-extension-analysis.md`

### 新增文件统计
```
aibrand-extension/src/sync/interaction/  ← 11 文件 (互动模块)
aibrand-extension/src/sync/aibrand/       ← 3 文件 (后端集成)
aibrand-extension/src/sync/dynamic/rednote-api.ts ← API 发布器
aibrand-extension/locales/zh_TW,ja,ko/    ← 3 语言包
aitoearn-web/src/api/plat/bridge/extensionBridge.ts ← 完全重写
```

### Pixso 产品设计说明书
- ✅ `docs/design/aibrand-product-spec-for-pixso.md` — 完整的前端 UI 设计参考文档
  - 产品定位、设计哲学、品牌系统、信息架构、15 页面详细说明、组件库、用户流程、动画规范

### Multica 研发管理平台
- ✅ 评估 + 安装完成 — `http://localhost:3100` (验证码 888888)
- 用途: AiBrand 团队 Agent 任务管理，非产品功能集成

### Karpathy 行为指南插件
- ✅ 分析确认有价值，待用户安装: `/plugin marketplace add forrestchang/andrej-karpathy-skills`

### 后端 Docker 修复进展
- ✅ Docker 镜像源修复 (dockerpull.org 已从 Docker Desktop UI 移除)
- ✅ node:20-alpine 镜像成功拉取
- ✅ 后端 Nx 构建修复 (缺 execa、TS 类型错误)
- ✅ **aibrand-ai 容器健康运行** — pnpm Dockerfile + @nestjs/swagger 版本锁定
- ✅ docker-compose 配置路径修复 (aitoearn → aibrand)
- ⚠️ **aibrand-server 容器仍失败** — pnpm `--prod` 下 workspace 包的传递依赖漏装 (`@nestjs/mongoose`)
  - 最后一步: `pnpm add @nestjs/mongoose @nestjs/bullmq ...` 未能生效，需排查 pnpm add 为何未持久化到镜像
  - Dockerfile 路径: `apps/aibrand-server/Dockerfile` (已改为 pnpm 方案)
- ⚠️ nginx 仍无法启动 (依赖 aibrand-server)

### 当前容器全景
| 服务 | 状态 |
|------|:--:|
| MongoDB/Redis/RustFS | 🟢 |
| Dify 全家桶 (9容器) | 🟢 |
| n8n / langchain-bridge | 🟢 |
| aibrand-ai | 🟢 |
| aibrand-web | 🟢 (无端口映射) |
| Multica (Postgres+Backend+Frontend) | 🟢 |
| aibrand-server | 🔴 |
| nginx | 🔴 |

### Open-LLM-VTuber 评估
- ❌ 不适合集成到产品 (Python 桌面程序，无法嵌入 Web)
- ✅ 架构值得参考 (ASR→TTS 管道 + Live2D 表情驱动)
- 📋 后续: 在 Web 技术栈实现原生语音 Agent

### 下一步优先级
1. 🔴 aibrand-server 容器修复 (最后一步: pnpm add 未生效问题)
2. 🔴 浏览器扩展在 Chrome 实测
3. 🟡 扩展与 AiBrand Web App 联调 (postMessage 通信)
4. 🟡 Web 原生语音 Agent (参考 Open-LLM-VTuber 架构)
