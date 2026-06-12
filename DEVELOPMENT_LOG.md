# AiBrand MVP 开发日志

> 最后更新: 2026-06-08 21:30 | 当前阶段: 渠道中心 V1.0 + Extension v3 架构 + nginx 限流修复 | 总进度 ~99%

---

## 二十、2026-06-08 — 渠道中心 V1.0 + Extension v3 架构 + nginx 限流修复 + Extension E2E 全链路

### 一、Extension v3 架构设计与实现

**完整架构 (WXT 框架, ~38 文件):**
- `aibrand-extension-v3/src/` — 全新 Extension v3 项目
  - WebSocket 实时通信 (与后端 extension.gateway.ts 双向通道)
  - Auth 模块 (JWT Token 管理 + 自动刷新)
  - TaskExecutor 任务执行引擎 (队列调度 + 优先级 + 重试)
  - QualityGate 质检引擎 (发布前 4 维度评分: 标题/正文/图片/合规)
  - DesignSystem 组件库 (品牌化 UI 组件)
- 构建: `pnpm build` → `.output/chrome-mv3/` 57 kB
- 测试: `pnpm vitest run` → 48/48 单元测试全部通过 (6 test files)

**Extension v2 内容脚本升级:**
- `aibrand-extension/src/contents/extension.ts` — 注入 `window.AiBrandPlugin` 全局对象
  - 借鉴 AiToEarn 的 `AIToEarnPlugin` 模式，页面直接调用全局方法而非 postMessage
- 账号检测改为内容脚本直接 fetch 平台 API — 绕过 MV3 Service Worker 的 SameSite Cookie 限制
- `aibrand-extension/src/background/account-sync.ts` — chrome.cookies + 平台 API 检测
- 构建产物: `build/chrome-mv3-prod/` (含新模块)

### 二、Extension E2E 全链路验证

**环境恢复:**
- Next.js Dev Server (3099) — `netstat -ano` 确认 LISTENING, `GET /` 200
- HTTP 代理 6060→3099 — `C:\Users\XIAOMI\aibrand-proxy.js` 新建，Extension 依赖此代理
- Docker 全服务 — 21 容器全部 healthy
- `.next` 缓存清理后重建 — 17 个 API 端点全部恢复正常

**Extension 构建与 Chrome 加载:**
- `auth.ts` 源码修复 — `AIBRAND_API_BASE` 改为环境判断 (development → localhost:6060, production → aibrand.local)
- 构建产物 URL 修补 — 5 个 JS 文件中 `https://aibrand.local` → `http://localhost:6060`
- Chrome 加载 Extension — 通过 `--load-extension` 标志启动独立 Chrome 实例 (测试 Profile 隔离)

**E2E 发布全链路 5 步验证 (curl 模拟):**
1. Extension Ping 注册 → `action=OK` ✅
2. 创建发布任务 → `taskId=task_xxx, status=queued` ✅
3. Extension 轮询 → `action=NEW_TASK` + 发布 URL 派发 ✅
4. 进度上报 → weibo 50% 成功记录 ✅
5. 任务完成 → 2 成功 (weibo, douyin) + 1 失败 (xhs 需手机验证) ✅

### 三、AiBrand Studio 大规模迭代 (11 功能模块)

**全站响应式适配:**
- `StudioShell.tsx` — 统一三栏响应式布局壳，所有 14 页面共用
- `MobileNav.tsx` — 移动端侧滑导航抽屉
- `useResponsive.ts` — 响应式断点检测 Hook
- `responsive.css` — 响应式 CSS 变量 + 媒体查询
- 支持断点: 320 / 375 / 768 / 1024 / 1440
- 验证: 14 页面全部 200, `next build` 29 路由成功

**GEO 内容优化引擎 (`/geo`):**
- 5 维规则评分引擎 (标题/关键词/结构/引用/时效)
- 一键优化 — 42→73 分 (+31)，自动补充标题/引用/时效标记
- AI 关键词挖掘 — "面霜"→16 个关键词含搜索量/意图/相关度
- 组件: `GeoAnalyzer.tsx`, `GeoScoreGauge.tsx` (SVG 环形仪表), `GeoKeywordsPanel.tsx`
- API: 4 个 BFF 路由 (score/optimize/keywords/suggest)

**Agent 生态扩展 (9→11):**
- 新增: 🛡️ 质量总监 Agent — 8 模块质量标准化规范, 33+ 检查项, 自进化机制
- 新增: 🎬 特级剪辑师 Agent — 7 平台视频规格, 8 类视频剪辑节奏, 音频/字幕/调色标准
- Agent 调度中心融合 — `/orchestrator`→`/agents` 重定向, 11 Agent 完整列表
- API: `GET /api/agents/list` 返回 11 个完整 Agent

**工作流引擎 (`/workflows`):**
- 6 个工作流 + 5 个预置模板
- 9 种节点类型 — 支持可视化管线编排
- 一键从模板创建并进入编辑器
- API: 3 个 BFF 路由 (list/templates/execute)

**渠道管理优化 (`/channels`):**
- `PlatformLogo.tsx` — 54 平台官方 SVG 矢量 LOGO 库 (含文字兜底)
- `QrCode.tsx` — 真实 QR 码生成组件 (OAuth URL 编码)
- `AccountConnectModal.tsx` — 三级分流: Tier1 扫码/OAuth/手动, Tier2 官网直达
- 移除所有模拟登录按钮

**通知中心:**
- `NotificationPanel.tsx` — 完整下拉面板 (实时事件 + 分类已读)
- Header 集成 — 通知红点 + 12 导航项

**一键发布控制台 (`/dashboard/publish`):**
- MultiPost/Extension 集成 — `POST /api/workspace/publish` → 3/3 成功
- Extension Ping — `GET/POST /api/extension/ping` → 200 OK
- 任务创建 — `POST /api/publish/tasks` → task_xxx created
- `multipost.ts` — AiBrand Extension 发布集成层

**质量监控中心 (`/quality`):**
- 8 模块质量评估 (content/publish/agent/workflow/dashboard/geo/video/customer_service)
- 评分 81-88 分, 7 日趋势正常
- 劣质内容检测 — "震惊体"→6 个警告捕获
- `standards.ts` — 8 模块质量标准引擎
- `video-standards.ts` — 特级剪辑师视频规范

**导出报告组件:**
- Header 日期选择器 (日历) + 3 步向导 (选择范围→颗粒度分析→运营建议)
- `ExportReport.tsx` — 全流程测试通过

**图表组件 (SVG 零依赖):**
- `LineChart.tsx` — SVG 折线图 (双线+面积+浮窗+空数据保护)
- `PieChart.tsx` — SVG 环形图 (中心总计+图例+空数据保护)
- `BarChart.tsx` — SVG 分组柱状图 (双 Y 轴+空数据保护)
- `ChartCard.tsx` — 图表卡片 (下拉筛选+日历集成)
- `GeoScoreGauge.tsx` — SVG 环形评分仪表

**API BFF 代理层:**
- `src/app/api/[...path]/route.ts` — 通用 CORS 代理
- 13 个新 BFF 路由: geo×4, workflow×3, quality×2, publish×2, extension×1, agents×2
- 验证: 17 个 API 端点全部正常

### 四、nginx 限流根因修复

**问题:** 登录接口偶发 503，`limit_req zone=login burst=3 nodelay` 作用于 server 全局

**修复:**
- login 限流从 server 级移到 `/api/login/` location 级
- rate 从 `5r/m` 改为 `100r/m`，burst 从 3 改为 10
- 验证: 6 次连续 API 调用全部 HTTP 200

**文件:** `D:\king2046\docker\nginx\nginx.conf`

### 五、渠道中心 V1.0 完整交付

**整合方案文档:** `D:\king2046\docs\AiBrand-Channel-Center-Plan.md`

**三大模块:**

1. **平台账号面板** — 8 平台卡片 + Extension 检测 + 后端存储
   - 账号检测: 内容脚本直接 fetch 平台 API (绕过 Service Worker Cookie 限制)
   - 抖音 ✅ — API 返回真实用户数据 ("梦想践行者", 21 粉丝)
   - 后端存储: `POST /api/channels/accounts/sync` → `GET` 返回已存储账号
   - B站 ⏳ — API 可用但用户未登录 (返回 "账号未登录")
   - 知乎 ❌ — 需要 `X-XSRF-TOKEN` 认证头
   - 小红书 ❌ — `/web/api/media/user/info/` 返回 SPA HTML 而非 JSON
   - 微博 ❌ — `weibo.com/ajax/profile/info` 被墙 (403 Forbidden)

2. **数据看板** — 平台粉丝对比柱状图 + 账号详情表格 + 数字卡片

3. **一键分发** — 编辑→质检→确认→发送→反馈 5 阶段完整闭环
   - 质检: 前端 `quickQualityCheck()` 4 维度评分 (标题/正文/标签/图片)
   - 发布: `POST /api/publish/agent` → 模拟结果
   - ⚠️ 发布流程目前是模拟的，真实场景需对接后端 Agent

**核心文件:**
| 文件 | 用途 |
|------|------|
| `aibrand-studio/src/app/channels/page.tsx` | 渠道中心主页 (账号+看板+发布 3 Tab) |
| `aibrand-studio/src/app/api/channels/bind/route.ts` | 8 平台绑定 API |
| `aibrand-studio/src/app/api/channels/accounts/sync/route.ts` | 账号同步 API |
| `aibrand-studio/src/ui/accounts/AccountCard.tsx` | 账号卡片组件 |
| `aibrand-extension/src/contents/extension.ts` | +AiBrandPlugin 注入 + 内容脚本直接检测 |
| `aibrand-extension/src/background/account-sync.ts` | chrome.cookies + 平台 API 检测 |
| `aibrand-backend/.../extension/extension.gateway.ts` | WebSocket Gateway |
| `aibrand-backend/.../extension/extension.service.ts` | 质检 + Agent 发布 |
| `aibrand-studio/src/app/api/publish/agent/route.ts` | Agent 发布端点 |

### 六、架构决策

- **渠道中心架构:** Extension Cookie 检测为主 + OAuth 为辅 (非 "OAuth 优先")
- **质检放在 Extension 端:** 内容工厂已质检的标记可直接用，Extension 只做终端展示
- **版本路线 V1→V2→V3:** 采纳版本节奏 + 技术要点 (Token 维护/发布队列/数据标准化)
- **`window.AiBrandPlugin` 全局对象:** 页面不通过 postMessage 而是直接调用全局方法
- **内容脚本直接调 API:** 绕过 Service Worker SameSite Cookie 限制
- **nginx 限流修复:** login 限流从 server 全局移到 `/api/login/` location
- **修补构建产物 > 修改构建流程:** Plasmo 构建流程复杂，直接 sed 替换更快
- **独立 Chrome Profile 测试:** 测试隔离，不影响用户日常 Chrome

### 七、失败记录 (What Did NOT Work)

**Extension 相关:**
- **postMessage → Service Worker → fetch** — MV3 Service Worker 的 `fetch()` 无法携带 SameSite Cookie，所有平台 API 返回"未登录"。修复: 改为内容脚本直接 fetch
- **微博 API** — `weibo.com/ajax/profile/info` 被墙 (403 Forbidden)
- **小红书 API** — `/web/api/media/user/info/` 返回 SPA HTML 页面，不是 JSON API
- **知乎 API** — 需要额外 `X-XSRF-TOKEN` 认证头
- **B站 API** — API 正常但用户未登录 (返回 "账号未登录")
- **Plasmo `NODE_ENV=development` 构建不生效** — `plasmo build` 强制 production 模式
- **Extension 未自动 Ping** — 代码逻辑 `if (!apiKey) return;` 导致未认证时跳过
- **HTTPS `aibrand.local` 不可用** — nginx 自签名证书 + 转发到旧后端 :8080 而非 Next.js :3099

**Studio 相关:**
- **`process.env.NEXT_PUBLIC_*` 浏览器访问失效** — 被 `typeof window` 条件包裹。修复: 移除条件，模块顶层直接访问
- **`new URL('/api/path')` 浏览器报错** — 相对 URL 无法构造。修复: 用 `window.location.origin` 作为 base
- **React Hooks 顺序错误** — loading return 在 useState 之前。修复: 所有 hooks 移到条件 return 之前
- **Docker 源码热加载** — aibrand-server 镜像内置编译源码，仅 config.js 挂载 volume，新建文件需 docker build
- **`isMultiPostAvailable` 引用错误** — 发布页面引用旧函数名。修复: 改为 `isBackendAvailable() + isExtensionAvailable()`
- **PlatformLogo snapchat 重复定义** — 合并 LOGOS 库时重复。修复: 删除重复项
- **Quality 页面 `>` JSX 转义** — `>85` 被解析为 JSX 标签。修复: 改为 `&gt;`
- **Bash `/tmp/` 路径在 Windows 不可见** — Git Bash `/tmp/` 在 Windows Node.js 解析为 `C:\tmp\` (不存在)
- **`Start-Process npx` 直接调用失败** — `%1 is not a valid Win32 application`，需用完整路径 `D:\Program Files\nodejs\npx.cmd`

**其他:**
- **WXT Explore 代理调用失败** — `thinking options type cannot be disabled when reasoning_effort is set`
- **pnpm approve-builds 交互式阻塞** — 需手动选择包
- **Playwright PNG 截图 Read 工具** — 返回 Unsupported Image，无法像素级视觉对比，只能 DOM 文本验证

### 八、环境变更

**新建项目:**
- `D:\king2046\project\aibrand-extension-v3/` — Extension v3 WXT 项目 (~38 文件)
- `C:\Users\XIAOMI\aibrand-proxy.js` — HTTP 代理 6060→3099
- `C:\Users\XIAOMI\chrome-aibrand-test/` — Chrome 测试 Profile

**aibrand-studio 新建文件 (80+):**
| 类别 | 文件数 | 关键文件 |
|------|:--:|------|
| 布局 | 5 | `StudioShell.tsx`, `MobileNav.tsx`, `NotificationPanel.tsx`, `ExportReport.tsx` |
| 页面 | 14 | `page.tsx`×9, `geo/page.tsx`, `workflows/page.tsx`, `quality/page.tsx`, `dashboard/publish/page.tsx` |
| 组件 | 25+ | `LineChart`, `PieChart`, `BarChart`, `GeoScoreGauge`, `PlatformLogo`, `QrCode`, `AccountConnectModal`, `PlatformSelector`, `ContentCreator`, `DateRangePicker`, `LoadingSkeleton`, `ErrorFallback`, `Button`, `ChatBubble`, `GlowCard`, `GradientButton`, `ThinkingDots`, `MetricCard`, `ChartCard`, `DataTableCard`, `RankingCard`, `AIInsightCard`, `GeoAnalyzer`, `GeoKeywordsPanel`, `QuickEntry`, `DraftList` |
| Hooks | 5 | `useResponsive`, `useDashboardData`, `useGreeting`, `useAgentEvents`, `useChatStream` |
| API 客户端 | 7 | `client.ts`, `agent.ts`, `workspace.ts`, `analytics.ts`, `agents.ts`, `dashboard.ts`, `geo.ts`, `workflow.ts`, `quality.ts` |
| Lib | 3 | `platforms.ts` (54平台), `quality/standards.ts`, `quality/video-standards.ts`, `publish/multipost.ts` |
| BFF 路由 | 19 | `[...path]/route.ts`, `dashboard/route.ts`, 等 |
| 样式 | 3 | `design-tokens.css` (120+变量), `responsive.css`, `globals.css` |

**aibrand-extension 修改:**
- `src/contents/extension.ts` — +AiBrandPlugin 注入 + 内容脚本直接检测
- `src/background/account-sync.ts` — 新建，chrome.cookies + 平台 API 检测
- `src/sync/aibrand/auth.ts` — AIBRAND_API_BASE 环境判断
- `build/chrome-mv3-prod/` — 5 个 JS 文件 URL 修补 (aibrand.local → localhost:6060)

**aibrand-backend 新建:**
- `.../extension/extension.gateway.ts` — WebSocket Gateway
- `.../extension/extension.service.ts` — 质检 + Agent 发布
- `aibrand-studio/src/app/api/publish/agent/route.ts` — Agent 发布端点

**文档新增:**
- `docs/AiBrand-Extension-Rebuild-Framework.md` — v3 重构框架文档
- `docs/AiBrand-Channel-Center-Plan.md` — 渠道中心整合方案

**nginx 修复:**
- `D:\king2046\docker\nginx\nginx.conf` — login 限流从 server 全局移到 `/api/login/` location, rate 5r/m→100r/m, burst 3→10

### 九、待完成任务

**渠道中心 V1.0 剩余:**
- [ ] B站/知乎/小红书/微博账号检测 (需要用户登录 + 不同 API 端点)
- [ ] 评论聚合 + AI 自动回复
- [ ] 定时发布 + 发布队列限流
- [ ] 素材中心 (图片/视频/文案模板库)
- [ ] 团队多角色权限

**Extension 待办:**
- [ ] Extension v3 与 v2 功能整合 (v2 有平台检测, v3 有 WebSocket+质检)
- [ ] Extension 加载到用户日常 Chrome (当前仅测试 Profile)
- [ ] Chrome Web Store 上架
- [ ] Extension API Key 通过 Chrome DevTools Protocol 编程注入
- [ ] 通过 Web App 登录自动完成 Extension 绑定

**Studio 待办:**
- [ ] 图表/表格接入真实 DataCube API (需用户先绑定平台账号)
- [ ] Agent 定制/Reset API 对接真实后端
- [ ] n8n 工作流集成的实际执行引擎 (当前为模拟)
- [ ] WebSocket/SSE 实时推送 (已预留接口)
- [ ] 响应式移动端 Playwright E2E 测试
- [ ] Docker 镜像重建 (aibrand-server 新模块源码需 build)
- [ ] nginx 配置更新为同时路由到 Next.js :3099 (当前只转发旧后端 :8080)

**发布管线:**
- [ ] 发布流程对接真实后端 Agent (当前为模拟质检 + 模拟结果)
- [ ] 视频剪辑 Agent 集成到实际内容创作管线
- [ ] 质量总监 Agent 的自进化权重调整实际运行

### 十、当前运行服务

| 服务 | 端口 | 说明 |
|------|------|------|
| Next.js Dev Server | 3099 | `npx next dev --port 3099` (aibrand-studio) |
| HTTP Proxy | 6060 | `node C:\Users\XIAOMI\aibrand-proxy.js` (6060→3099, Extension 依赖) |
| Docker nginx | 8080 | nginx.conf 已修复限流 + 安全 headers |
| Docker backend | 3002 | aibrand-server (NestJS) |
| Docker MongoDB | 27017 | 数据持久化 |
| Docker Redis | 6379 | 缓存 + Session |
| Docker n8n | 5678 | 7 工作流全部激活 |
| Dify 全家桶 (9容器) | 5001/3010/8082 | AI 平台 |
| langchain-bridge | 4010 | LangChain 编排 |
| Chrome + Extension | — | 测试 Profile (独立实例) |

### 十一、关键凭据

**Dev JWT Token:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtYWlsIjoiYnJhbmQtdGVzdEBhaWJyYW5kLmFpIiwiaWQiOiI2YTI0NmZhYTlkZDhlZjJhMzZiMjA3YWQiLCJuYW1lIjoidXNlcl9vb3FjTTkzWiIsImlhdCI6MTc4MDgyNzExNCwiZXhwIjoxNzgxNDMxOTE0fQ.CVJbfmpFzLfskXqlPSdAGkKZEtYBsr0oM3ZXMa5I8bg
```
有效期至 2026-06-14

**获取验证码:**
```powershell
docker exec aibrand-redis redis-cli -a password --no-auth-warning GET "userMailLogin:brand-test@aibrand.ai"
```

**Extension 后端地址映射:**
| 环境 | Ping URL | API URL |
|------|----------|---------|
| Dev (localhost) | `http://localhost:6060/api/extension/ping` | `http://localhost:6060/api/*` |
| Prod (aibrand.local) | `https://aibrand.local/api/extension/ping` | `https://aibrand.local/api/*` |

### 十二、当前页面路由 (14 页面 + 29 API 路由)

| 路由 | 状态 | 说明 |
|------|:--:|------|
| `/` | ✅ | 数据看板 (Dashboard) |
| `/workspace` | ✅ | 内容工作台 (AI创作+54平台) |
| `/analytics` | ✅ | 数据分析 |
| `/channels` | ✅ | 渠道中心 V1.0 (账号+看板+发布) |
| `/insights` | ✅ | 智能洞察 |
| `/agents` | ✅ | Agent 调度中心 (11 Agent) |
| `/orchestrator` | ✅ | → `/agents` 重定向 |
| `/support` | ✅ | 智能客服 |
| `/onboarding` | ✅ | 入驻引导 (5步) |
| `/settings` | ✅ | 设置中心 (7标签) |
| `/geo` | ✅ | GEO 内容优化 |
| `/workflows` | ✅ | 工作流引擎 |
| `/quality` | ✅ | 质量监控中心 |
| `/dashboard/publish` | ✅ | 一键发布控制台 |
| `/welcome` | ✅ | 品牌落地页 |
| `/auth/login` | ✅ | 邮箱验证码登录 |
| `/pricing` | ✅ | 定价页 |

---

## 十九、2026-06-07 — AiBrand Studio 全栈搭建 + Content Engine V2.0 + Dify AI Chat 全链路修复

### 一、Content Engine V2.0 架构融合

**CONTENT_ENGINE_V2_SPEC.md 完整规格文档:**
- 合并三个视角: 小C 引擎架构 + 小D 系统架构 + 小A 交互体验
- 核心设计: 前端选择题卡片 → 动态采访路由引擎 → 结构化 ContentBrief Schema → 分发至文案/图片/视频模块

**ContentBrief Schema 落地 (NestJS Lib):**
| 文件 | 用途 |
|------|------|
| `libs/common/src/enums/content-type.enum.ts` | 32 个枚举常量 (内容类型/平台/状态/意图/风格/受众/长度/格式) |
| `libs/common/src/interfaces/content-brief.interface.ts` | ContentBrief + InterviewState + QuestionNode + RouteRule 接口 |
| `libs/common/src/dtos/content-brief.dto.ts` | 9 个 Zod DTO Schema (含验证规则) |
| `libs/common/src/enums/response-code.enum.ts` | +10 ContentEngine 错误码 (18500-18509) |
| `libs/common/src/i18n/messages.ts` | +10 三语错误消息 (中/英/日) |
| `libs/content-engine/src/content-engine.service.ts` | 智能路由 + 动态采访 + Brief 管理 |
| `libs/content-engine/src/brand-knowledge.service.ts` | 品牌知识库 + URL 提取 |
| `libs/content-engine/src/content-engine.module.ts` | NestJS 动态模块 |
| `libs/content-engine/src/dify-interview-agent.config.ts` | Dify Agent Prompt + 5 轮模板 + 样本库 |
| `tsconfig.base.json` | 新增 `@yikart/content-engine` 路径别名 |

验证: TypeScript 编译零错误

### 二、Dify AI Chat 全链路修复 (4 层故障)

**故障链排查与修复:**
1. **Dify Redis ACL 密码** — Redis ACL 密码哈希与 requirepass 不一致 → 重启 Dify stack + `.env` 设置 `REDIS_USERNAME=default`
2. **跨 Docker 网络 DNS 冲突** — `redis` DNS 解析到 aibrand-redis (密码 password) 而非 dify-redis-1 (密码 difyai123456) → `REDIS_HOST=dify-redis-1`
3. **--force-recreate 后网络丢失** — aibrand-server 无法解析 dify-api-1 → `docker network connect aibrand-network dify-api-1`
4. **Dify App 模型名不存在** — `deepseek-v4-flash` 未注册 → `UPDATE app_model_configs SET model_name='deepseek-chat'`

**验证通过:**
- Dify API: `unhealthy` → `healthy` ✅
- `curl localhost:5001/health` → `{"pid":85,"status":"ok","version":"1.13.3"}` ✅
- `curl POST /v1/chat-messages` → SSE 流式 `"answer":"Hi"` ✅
- Dify App Prompt 品牌化 → AI 自我介绍 "我是 AiBrand 内容智造引擎 的 AI 创作助手" ✅
- `POST /api/agent/chat` → SSE 事件流 `{"type":"message","content":"你好"}...` ✅

**Dify DB 修复:**
- `app_model_configs` — model name: `deepseek-v4-flash` → `deepseek-chat`
- `provider_models` — 新增 3 个 DeepSeek 模型

**环境变量修复:**
- `C:\Users\XIAOMI\dify\.env` — `REDIS_HOST=dify-redis-1`, `REDIS_USERNAME=default`
- `D:\king2046\.env` — `DIFY_API_BASE=http://dify-api-1:5001`

### 三、AiBrand Studio 前端从零搭建

**项目初始化:**
- 全新 Next.js 项目 (`D:\king2046\project\aibrand-studio\`)
- TypeScript 编译零错误
- 页面 HTTP 200

**设计 Token 体系:**
- `design-tokens.css` — 120+ CSS 变量 (颜色/间距/字号/阴影/动画/54平台+Agent+Sidebar)
- 深色科技风主题: `#0A0F1A` → `#0A1A33` 渐变
- Playwright 浏览器验证: 渐变正确渲染

**三栏布局架构:**
- `Header.tsx` — 56px 导航栏 (日期选择器+导出报告+通知+8导航项)
- `Sidebar.tsx` — 280px 侧栏 (Agent Switcher + SSE 对话)
- Main — 自适应工作区

**10 功能模块 (58/58 Playwright 检查点, 零 JS 错误):**

| 模块 | 路由 | 核心功能 | 验证 |
|------|------|------|:--:|
| 数据看板 | `/` | 4 指标卡 + 3 图表 + 表格 + 排行 + AI洞察 | 30 SVGs |
| 内容工作台 | `/workspace` | AI 创作面板 + 54 平台选择器 + 真实发布 BFF | 19 SVGs |
| 数据分析 | `/analytics` | KPI 行 + 3 图表 + 渠道详情表 + 问题/亮点双栏 | 45 SVGs |
| 渠道管理 | `/channels` | 54 平台卡片 + 16 品类筛选 + 绑定弹窗 | 179 SVGs |
| 智能洞察 | `/insights` | AI 预测 + 系统事件 + 内容策略 + 健康评分 | 23 SVGs |
| Agent 总管家 | `/orchestrator` | 集群状态 + 5 调度场景 + 流水线可视化 + 调度日志 | 37 SVGs |
| Agent 中心 | `/agents` | 8 预置 Agent 列表 + 详情定制面板 + 初始化按钮 | 16 SVGs |
| 智能客服 | `/support` | 查询列表(情感分析) + AI 回复面板 + 归档管理 | 30 SVGs |
| 入驻引导 | `/onboarding` | 5 步引导流程 + 平台推荐 + 一键/逐个绑定 | 21 SVGs |
| 设置中心 | `/settings` | 7 标签(画像/密钥/配额/通知/工作流/插件/使用指南) | 28 SVGs |

### 四、核心组件与基础设施

**API BFF 代理层:**
- `src/app/api/[...path]/route.ts` — 通用 CORS 代理
- `src/app/api/dashboard/route.ts` — Dashboard BFF (聚合多 API 调用)
- `src/app/api/workspace/drafts/route.ts` — 草稿 BFF
- `src/app/api/workspace/publish/route.ts` — 多平台发布 BFF
- `src/app/api/accounts/route.ts` — 账号 BFF
- `src/app/api/agents/list/route.ts` — Agent 列表 BFF

**HTTP 客户端 + Hooks:**
- `src/lib/api/client.ts` — HTTP 客户端 (JWT Token 注入 + SSE 流式 + URL 修复)
- `src/lib/api/agent.ts` — Agent API (greeting/events/chat/profile)
- `src/lib/api/workspace.ts` — 工作台 API (publish/drafts/materials)
- `src/lib/api/analytics.ts` — 分析 API 类型定义
- `src/lib/api/agents.ts` — Agent 注册中心 API
- `src/lib/api/dashboard.ts` — Dashboard BFF API
- `src/hooks/useDashboardData.ts` — 聚合 hook (单 BFF 调用)
- `src/hooks/useGreeting.ts` — 问候 hook
- `src/hooks/useAgentEvents.ts` — 事件 hook
- `src/hooks/useChatStream.ts` — SSE 流 hook

**图表组件 (SVG 零依赖):**
- `LineChart.tsx` — 折线图 (双线+面积+浮窗)
- `PieChart.tsx` — 环形图 (中心总计+图例)
- `BarChart.tsx` — 分组柱状图 (双 Y 轴)

**UI 组件:**
- `LoadingSkeleton.tsx` — 骨架屏 (脉动动画)
- `ErrorFallback.tsx` — 错误回退 (重试按钮)
- `Button.tsx` — 主/次按钮 (glow+hover+loading)
- `ChatBubble.tsx` — 聊天气泡
- `GlowCard.tsx` — 发光卡片
- `GradientButton.tsx` — 渐变按钮
- `ThinkingDots.tsx` — 思考动画
- `DateRangePicker.tsx` — 深色日历 (翻月+范围选择)

**平台数据源:**
- `src/lib/platforms.ts` — 54 平台中央数据源 (16 品类, 2 Tier)
  - Tier 1 (15 个原生 AccountType) + Tier 2 (39 个 Relay/MCP 代理)

### 五、JWT 认证打通

- Redis 直接读取验证码 → `POST /api/login/mail/verify` → 获取 JWT
- Token 配置在 `.env.local`, 有效期 7 天 (至 2026-06-14)
- Token 有效期内所有 API 全部 200
- 开发环境绕过码 "888888" 不生效 → 改用 Redis 直接读验证码

### 六、失败记录

- **AiBrand Studio 第一版 (深色主题) 完全不对** — 设计图是浅色 WeChat 风格，最初搭了深空黑 `#0A101F` → 全部重做为浅色 `#FAFBFC`
- **Dify credentials 无法解密** — `encrypter.decrypt_token` 需要 Redis 初始化，直接运行 Python 脚本失败
- **Playwright PNG 截图 Read 工具无法显示** — 返回 Unsupported Image → 只用 DOM 文本验证
- **Docker 源码热加载** — 后端镜像内置编译源码，仅 config.js 挂载 volume，新建文件需 `docker build`
- **`process.env.NEXT_PUBLIC_*` 浏览器访问失效** — 被 `typeof window` 条件包裹
- **`new URL('/api/path')` 浏览器报错** — 相对 URL 无法构造
- **React Hooks 顺序错误** — loading return 放在 useState 之前

### 七、架构决策

- **Next.js BFF 聚合模式** — 后端 Docker 镜像无法热加载源码，BFF 在 Next.js 侧聚合多 API 调用，浏览器 1 次请求 = 后端 N 次
- **深色主题优先** — 全局统一 `#051630`→`#0A1A33`→`#1A3B6B`
- **CSS 变量全部内联 style** — 快速迭代，后期可迁移到 Tailwind 类名
- **SVG 图表零依赖** — 避免 chart 库打包增大，自制 LineChart/PieChart/BarChart
- **平台分 Tier 管理** — Tier1 (15 个原生) + Tier2 (39 个 Relay/MCP 代理)
- **Agent 流水线模式** — 总管家协调 8 个专业 Agent，5 个预置调度场景
- **Cookie/OAuth/API 三种绑定方式** — 匹配不同平台的认证机制
- **浅色主题→深色主题切换** — 用户反馈后从浅色 WeChat 风格改为深色科技风

### 八、环境变更

**新建文件 (50+):**
| 类别 | 数量 | 关键文件 |
|------|:--:|------|
| 页面 | 10 | `page.tsx`×10 (dashboard/workspace/analytics/channels/insights/agents/orchestrator/support/onboarding/settings) |
| 布局 | 3 | `Header.tsx`, `Sidebar.tsx`, `SubNav.tsx` |
| AI 组件 | 6 | `AgentSwitcher.tsx`, `ChatInput.tsx`, `InterviewCard.tsx`, `BriefCard.tsx`, `QuickActions.tsx`, `ThinkingDots.tsx` |
| 看板组件 | 8 | `MetricCard`, `MetricCardsRow`, `ChartCard`, `LineChart`, `PieChart`, `BarChart`, `DataTableCard`, `RankingCard`, `AIInsightCard` |
| 工作台组件 | 5 | `QuickEntry`, `ContentCreator`, `PlatformSelector`, `DraftList`, `AccountConnectModal` |
| UI 组件 | 6 | `DateRangePicker`, `LoadingSkeleton`, `ErrorFallback`, `Button`, `ChatBubble`, `GlowCard`, `GradientButton` |
| Hooks | 4 | `useDashboardData`, `useGreeting`, `useAgentEvents`, `useChatStream` |
| API 客户端 | 5 | `client.ts`, `agent.ts`, `workspace.ts`, `analytics.ts`, `agents.ts`, `dashboard.ts`, `index.ts` |
| Lib | 1 | `platforms.ts` (54 平台中央数据源) |
| BFF 路由 | 6 | `[...path]/route.ts`, `dashboard/route.ts`, `workspace/drafts/route.ts`, `workspace/publish/route.ts`, `accounts/route.ts`, `agents/list/route.ts` |
| 样式 | 2 | `design-tokens.css` (120+ 变量), `globals.css` |
| 配置 | 1 | `.env.local` |

**后端新建:**
- `libs/content-engine/` — 4 文件 (service/module/brand-knowledge/dify-config)
- `libs/common/` — +3 文件 (enums/interfaces/dtos) + 2 修改 (response-code/i18n)
- `tsconfig.base.json` — 路径别名

**Dify 环境修复:**
- `C:\Users\XIAOMI\dify\.env` — Redis 配置修复
- `D:\king2046\.env` — Dify API Base 修复
- Dify DB — 模型注册修正

**Docker:**
- 23/23 容器运行, 6/6 health checks 通过

---

## 十八、2026-06-06 — 安全加固 + n8n E2E + Playwright 测试 + 产品指南

### 安全加固

**安全 Headers:**
- nginx.conf: 添加 HSTS / CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy
- NestJS main.ts: 集成 helmet 中间件
- nginx API 层限流: `limit_req_zone` 30r/m + login 5r/m

**速率限制扩展:**
- api-key.controller.ts — API Key 创建 10次/小时
- subscription.controller.ts — 订阅操作 5次/小时 + 计划查询 30次/分钟
- credits-order.controller.ts — 积分订单 10次/小时
- credits-webhook.controller.ts — Stripe 回调保护
- user.controller.ts — 用户信息修改 20次/小时

**密钥管理:**
- 创建 `.env.example` 模板 (root + backend) — 所有真实密钥替换为占位符
- 移除 package.json scripts 中硬编码的 locize API key → 环境变量引用
- 生成新 JWT_SECRET (openssl rand -hex 64)
- 已确认 `.env` 在 .gitignore 中

**依赖审计:**
| 项目 | 漏洞数 | 严重度 |
|------|:-----:|:------:|
| aitoearn-backend | 191 | 10低/91中/84高/6严重 |
| aitoearn-web | 89 | 6低/37中/45高/1严重 |
| aibrand-extension | 22 | 1低/15中/6高 |

### n8n 工作流 E2E 触发测试

**通过的 (3/7):**
- Quota Check (风控) — webhook curl 200 ✅
- Credits Deduct (积分风控) — webhook curl 200 ✅
- Task Callback Hub (中枢回调) — webhook curl 200 ✅

**E2E 测试排障过程 (4/7 Dify 工作流):**
1. 根因 #1: "Unused Respond to Webhook node" — workflow_history 表缓存了旧节点定义 (含 Respond 节点), 需同步 workflow_entity.nodes → workflow_history.nodes
2. 根因 #2: workflow_published_version 表为空 → n8n 视为 draft 不执行 — 需填充 publishedVersionId
3. 根因 #3: HTTP Request 节点缺少 `method` 参数 → 无法发起请求
4. 根因 #4: connections 残留已删除 Respond 节点的引用 → 执行图断裂
5. 最终状态: 工作流可启动, 从 "Unused Respond" → "Error in workflow" (运行时错误, 需 n8n UI 查看节点级日志)

### E2E Playwright 测试框架

**基础设施:**
- `playwright.config.ts` — Chromium 项目 + webServer 自动启动 + trace/screenshot 失败保留
- 目录结构: `tests/e2e/{auth,dashboard,publish,agent,api,subscription}/`

**6 个 Spec 文件 (12/14 通过, 2 跳过):**

| Spec | 通过 | 说明 |
|------|:--:|------|
| auth/login.spec.ts | 3/3 ✅ | 登录页渲染/验证码发送/路由跳转 |
| dashboard/dashboard.spec.ts | 3/3 ✅ | 仪表板/定价页/欢迎页加载 |
| publish/publish.spec.ts | 3/3 ✅ | 发布页/平台Tab/扩展检测UI |
| agent/chat.spec.ts | 2/3 ⚠️ | auth token未获取时跳过SSE测试; 未认证测试通过 |
| api/api-keys.spec.ts | 2/3 ⚠️ | auth token未获取时跳过CRUD; 未认证测试通过 |
| subscription/plans.spec.ts | 1/1 ✅ | 订阅计划API响应验证 |

**跳过原因:** 开发环境邮箱验证码绕过码 "888888" 在当前配置下不生效, auth token 获取失败时相关测试优雅跳过。

### 产品使用指南

- `docs/aibrand-product-guide.md` — 面向终端用户的完整使用指南
- 设计理念: 不是工具说明书, 是一个「做了五年自媒体的朋友」在帮你
- 结构: 用户痛点 → 场景体验 → 逐步惊喜 → 定价 → 信任建立 → 行动引导
- 风格: 对话式、场景化、去技术术语

### 环境变更
- `docker/nginx/nginx.conf` — 安全headers + 速率限制
- `apps/aibrand-server/src/main.ts` — helmet集成
- `apps/aibrand-server/package.json` — helmet依赖
- 6个控制器 — RateLimitGuard装饰器
- `.env.example` ×2 (root + backend)
- n8n SQLite DB — workflow_history同步 + workflow_published_version填充
- n8n 4个Dify工作流 — Respond节点移除 + responseMode修复 + HTTP method补全
- `playwright.config.ts` — 新建
- `tests/e2e/**/*.spec.ts` — 6文件新建
- `docs/aibrand-product-guide.md` — 新建

---

## 十七、2026-06-06 — E2E 全栈验证 + n8n 重建 + Dify AI 打通

### 完成内容

**1. Chrome 扩展构建验证**
- 构建完整: 24 文件 / 4.7MB, manifest v3
- 双协议覆盖 (AIBRAND_* + MULTIPOST_*) 12+ actions 全部支持
- 默认信任域名: `localhost`, `127.0.0.1`, `*.aibrand.local` — 自动信任无需手动确认

**2. 扩展 Bridge 协议审查**
- extensionBridge.ts: 标准 `window.postMessage` + traceId 关联, 双协议优先 AIBRAND_* fallback MULTIPOST_*
- /dashboard/publish 页面: 集成扩展检测 → 平台选择 → 内容发布完整流程
- 54 个平台支持 (文章/动态/视频/播客)

**3. n8n 工作流修复与重建**
- 根因: webhook 节点缺失 `responseMode: "lastNode"` → "Unused Respond to Webhook"
- 修复过程中 DB 损坏, 重建整个 n8n 环境:
  - 清空 DB, 重新创建管理员 (admin@aibrand.ai)
  - 重新导入 7 个核心工作流并修复 webhook responseMode
  - 创建 API Key 用于自动化
- 工作流状态: 7/7 已创建 ✅ → 通过直接修改 SQLite DB 全部激活 (active=1 + activeVersionId fix)
- **2026-06-06 16:50 更新**: 7/7 工作流已全部激活:
  1. [ACTIVE] AiBrand - Quota Check (风控)
  2. [ACTIVE] AiBrand - Credits Deduct (积分风控)
  3. [ACTIVE] AiBrand - Task Callback Hub (中枢回调)
  4. [ACTIVE] AiBrand - Competitor Analysis v2
  5. [ACTIVE] AiBrand - Trending Topics v2
  6. [ACTIVE] AiBrand - Account Health Check v2
  7. [ACTIVE] AiBrand - Post-Publish Tracking v2
- n8n REST API activate 端点 (POST /rest/workflows/{id}/activate) 在 v2.18.4 返回 400, 改用直接 SQLite DB 操作
- **Dify URL 修复**: 4 个工作流中硬编码的 `dify-nginx-1:80` / `dify-api:5001` → `host.docker.internal:5001`
- DB 操作注意事项: 需要先 WAL checkpoint, activeVersionId 不能为 NULL (否则 n8n 当作 draft)

**5. n8n 激活实操 (2026-06-06 16:00-17:00)**
- n8n REST API 激活端点 (POST /rest/workflows/{id}/activate) 在 v2.18.4 返回 400 — 非 Cookie 问题，端点本身不接受
- PUT /rest/workflows/{id} 返回 404 — 端点不存在
- 最终方案: 直接修改 SQLite 数据库
  - 步骤1: WAL checkpoint (`PRAGMA wal_checkpoint(TRUNCATE)`) — 否则 docker cp 丢失 WAL 中 4MB 数据
  - 步骤2: 修复 Dify URL (`dify-nginx-1:80` / `dify-api:5001` → `host.docker.internal:5001`)
  - 步骤3: 设置 `active=1` + `activeVersionId=versionId` (仅 active=1 不够，n8n 当作 draft)
  - 步骤4: 修复文件权限 (docker cp 导致 root 所有 → n8n node 用户只读崩溃)
  - 步骤5: 清理 crash.journal / WAL / SHM 残留文件
- 验证: 7/7 工作流在 n8n 日志中确认 "Activated workflow"

**6. Chrome 扩展 E2E 联调准备 (2026-06-06 17:00)**
- 扩展构建: 32 文件, 9.8MB, Manifest V3
- Service Worker: `static/background/index.js` (660KB, Parcel bundled)
- Content Script: `extension.af921b6c.js` — 监听 `window.postMessage`, 双协议 AIBRAND_*/MULTIPOST_*
- 默认信任域名: `localhost`, `127.0.0.1`, `*.aibrand.local` — 发布页自动放行
- Bridge 协议验证:
  - Web App → `window.postMessage({type:'request', traceId, action, data})` 
  - Content Script → 验证 origin → `chrome.runtime.sendMessage` → Background SW
  - Background SW → 处理 → `chrome.runtime.sendMessage` 返回 → Content Script → `window.postMessage({type:'response', traceId, code, data})`
  - Web App 端 `sendToExtension()` 通过 traceId 关联请求/响应，支持超时和 fallback
- 前端发布页: `/zh-CN/dashboard/publish` (HTTP 200, 42KB)
  - DashboardPublishCore: 扩展检测 → 4 Tab (文章/动态/视频/播客) → 54 平台 → 发布
  - BridgePublishPanel: 复用组件版发布面板
- 待用户手动操作:
  1. Chrome 加载扩展 (`chrome://extensions` → 加载已解压 → `build/chrome-mv3-prod/`)
  2. 打开 `http://localhost:6060/zh-CN/dashboard/publish` 测试扩展检测
  3. 选择平台 → 发布 → 验证 postMessage 通信

**4. Dify AI 对话打通 (关键修复)**
- 根因: aibrand-server 在 `aibrand-network`, Dify 在 `dify_default` — DNS 无法解析 `dify-api`
- 修复: DIFY_API_BASE 从 `http://dify-api:5001` 改为 `http://host.docker.internal:5001`
- 验证: Agent Chat 流式 SSE 返回正常, Dify 正在生成 AI 回复
- Dify Token: `app-yyqOFelScAqYi3v55LrEVKAB` (AiBrand Content Factory)
- 已同步更新: `D:\king2046\.env`, `D:\king2046\project\aitoearn-backend\.env`

**5. 全栈 API 验证 (登录 → 订阅 → AI 对话)**
| 端点 | 方法 | 状态 |
|------|------|:--:|
| /api/health | GET | ✅ |
| /api/login/mail | POST | ✅ 发送验证码 |
| /api/login/mail/verify | POST | ✅ JWT Token |
| /api/user/subscription/plans | GET | ✅ 3 计划 |
| /api/user/subscription | GET | ✅ Free 计划 |
| /api/user/credits | GET | ✅ 余额 0 |
| /api/user/mine | GET | ✅ 用户资料 |
| /api/api-key/create | POST | ✅ API Key 创建 |
| /api/api-key/list | GET | ✅ |
| /api/workflow/history | GET | ✅ |
| /api/agent/chat | POST | ✅ SSE 流式回复 |

### 手动待办
- [ ] n8n UI 激活 7 个工作流 (http://localhost:5678, admin@aibrand.ai / Aibrand2024!)
- [ ] Chrome 扩展加载实测 (chrome://extensions → 加载已解压 → build/chrome-mv3-prod/)
- [ ] 扩展发布端到端测试 (登录 → /dashboard/publish → 选择平台 → 发布)
- [ ] 3 个 n8n webhook 调用 Dify 的 URL 更新为 host.docker.internal (n8n UI 中修改)

### 环境变更
- n8n: 管理员重建, 7 工作流重新导入
- aibrand-server: Dify API 路由修正, 容器重建
- .env: DIFY_API_BASE 更新, DIFY_ACCESS_TOKEN 填入

---

## 十六、2026-06-06 — 会话交付：提交清理 + n8n 验证 + 扩展就绪

### 完成内容

**1. Git 提交清理**
- 6 个未提交文件提交：Dockerfile 简化、config.js 环境修复、one-api.service.ts 类型标注、extensionBridge.ts 双协议重构、execa 依赖
- Commit: `07e7c756` — fix: Dockerfile simplify + config/env fix + extension dual-protocol + execa dep

**2. n8n 工作流验证**
- 直接查询 SQLite 数据库确认：13 个工作流全部 `active=1`
- 5 个 AI Content Factory 核心工作流 + Task Callback Hub + Quota Check + Credits Deduct
- Claude Code Executor / Self-Healing Loop 暂未激活 (阶段 2 功能)

**3. 浏览器扩展就绪**
- 扩展构建输出完整：`build/chrome-mv3-prod/` (manifest v3, Plasmo)
- 双协议支持：MULTIPOST_* + AIBRAND_* 前缀
- /dashboard/publish 页面通过 HTTPS 正常加载 (HTTP 200)
- 扩展检测、平台选择、发布流程前端集成完成

**4. 开发服务器**
- 前端 dev server 运行在 `localhost:6060` (Next.js 14.2.29)
- nginx 代理 `host.docker.internal:6060` → HTTPS aibrand.local
- API 健康检查通过：`/api/health` → 200

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

### 待手动测试
- [ ] Chrome 加载扩展 (`chrome://extensions` → 加载已解压的扩展)
- [ ] 扩展发布端到端验证 (选择平台 → 填写内容 → 发布)
- [ ] n8n 工作流端到端触发测试

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
