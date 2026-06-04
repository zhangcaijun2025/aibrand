# AiBrand 产品施工图 · 完整蓝图

> **从地基到封顶 —— 每一行代码的位置，每一个设计决策的原因**
> 版本 1.0 | 2026-06-04 | 基于 AiBrand MVP 实际代码架构

---

## 施工图索引

### 第一卷：项目起源与演化
- 1.1 起点：AiToEarn Fork
- 1.2 品牌化改造（17 次提交全记录）
- 1.3 AI 平台搭建（Dify + n8n + Agent）
- 1.4 前端框架扩展
- 1.5 Agent 感知层交付
- 1.6 当前状态总览

### 第二卷：前端全景施工图
- 2.1 目录结构全览
- 2.2 路由地图（31 个页面）
- 2.3 组件清单（120+ 组件）
- 2.4 Store 清单（10 个 Zustand Store）
- 2.5 API 层清单（30+ API 文件）
- 2.6 Hook 清单
- 2.7 工具层清单
- 2.8 中间件与配置

### 第三卷：后端全景施工图
- 3.1 Nx Monorepo 结构
- 3.2 aitoearn-server 模块地图
- 3.3 aitoearn-ai 模块地图
- 3.4 Libs 库地图
- 3.5 Agent 运行时架构

### 第四卷：设计系统施工图
- 4.1 色彩系统
- 4.2 渐变体系
- 4.3 字体系统
- 4.4 间距与圆角
- 4.5 阴影层级
- 4.6 动画定义
- 4.7 暗/亮双主题

### 第五卷：交互体验施工图
- 5.1 Agent 苏醒仪式
- 5.2 SSE 流式对话
- 5.3 Evolution Engine
- 5.4 Agent 精灵系统
- 5.5 微交互系统
- 5.6 引导系统

### 第六卷：数据模型全览
- 6.1 MongoDB 主库 Schema
- 6.2 Channel DB Schema
- 6.3 Redis 缓存策略

### 第七卷：API 接口目录
- 7.1 业务 API（Server）
- 7.2 AI API（aitoearn-ai）
- 7.3 Agent API
- 7.4 Next.js API Routes

### 第八卷：DevOps 基础设施
- 8.1 Docker 编排
- 8.2 Nginx 路由
- 8.3 环境变量
- 8.4 本地域名

### 第九卷：构建与发布
- 9.1 前端构建
- 9.2 后端构建
- 9.3 Docker 构建

### 第十卷：待建工程
- 10.1 已完成 / 进行中 / 待完成
- 10.2 技术债务清单

---

# 第一卷：项目起源与演化

## 1.1 起点：AiToEarn Fork

**上游仓库**：[yikart/AiToEarn](https://github.com/yikart/AiToEarn) — MIT 许可  
**Fork 日期**：2026-05 末  
**初始状态**：多平台内容发布 SaaS 工具（NestJS + Next.js + MongoDB）

上游提供的能力基线：
- 14 个社交平台的 OAuth 连接管理
- 基础内容发布流水线
- 订阅 + 积分的计费骨架
- i18n 国际化框架（zh-CN / en / ja / de / fr / ko）

**Fork 决策**：上游已具备完整的「管道」（账号连接、发布流水线、计费），但缺少「大脑」（AI 驱动的智能层）。这正好是我们差异化建设的起点。

## 1.2 品牌化改造（提交 1-5）

### 提交 1：密钥安全化
```
3adf4819 — fix: extract API keys from docker-compose.yml to .env
```
- 变更：docker-compose.yml、.env.example
- 影响：消除硬编码密钥风险，所有敏感值外部化

### 提交 2-3：品牌设计系统
```
4bfda7b5 — feat: AiBrand brand design system (purple/cyan identity)
c4fe1894 — refactor: rebrand i18n (AiToEarn → AiBrand, 95 files)
```
- 变更文件：`src/app/var.css`（新建）、`src/app/globals.css`（重写）、95 个 i18n 文件
- 设计决策：选择 OKLCH 色彩空间作为品牌基础（感知均匀性优于 RGB/HSL）
- 品牌色定义：
  ```css
  --brand-purple: oklch(55.8% 0.288 302.321);
  --brand-cyan:   oklch(54.6% 0.245 262.881);
  ```
- i18n 变更量：95 个 JSON 文件，覆盖 23 个命名空间 × 6 语言

### 提交 4：欢迎页改造
```
3ccba7a8 — feat: rebrand welcome page and app layout
```
- 新建：HeroSection、BeliefsSection、ReviewsSection、StructuredData
- 修改：LayoutSidebar、WelcomePageContent、Navbar、Footer

### 提交 5：订阅 UI + SEO + Onboarding
```
8a4eca6a — feat: landing page + SEO + subscription UI components
```
- 新建 9 文件：Hero 区块、定价页、sitemap/robots 生成、订阅 API 封装、新手引导、配额栏

## 1.3 AI 平台搭建（提交 6-9）

### 提交 6：AI 服务集成
```
56ab258a — feat: AI platform services (Dify + n8n + credits orders)
```
- 新建：`libs/ai-services/`（DifyService + N8nService）
- 新建：credits-order 模块（controller/dto/schema/service/webhook）
- 基础设施：Dify CE 9 容器 + n8n 4 工作流部署
- API 端点：
  - DifyService：RAG 检索、Agent 运行、知识库管理、文档管理
  - N8nService：Webhook 触发、工作流列表、竞品分析、热搜话题、发布追踪、账号健康

### 提交 7：前端功能扩展
```
baf65564 — feat: frontend feature expansion (AI assistant, new pages, payments)
```
- 新建：AiAssistantWidget（右下角悬浮 AI 助理）
- 新建页面：admin、analytics、content、create、customers、dashboard、knowledge、publish、bridge-publish
- 新建：本地支付服务 + Stripe Dialog
- 新建：知识库种子数据（commands/cases/workflows）

### 提交 8：模块集成
```
ae05fc38 — feat: integrate AiServicesModule into app.module.ts
```
- 将 AI 服务库注册到主 App Module

### 提交 9：开发日志更新
```
ee053621 — docs: update DEVELOPMENT_LOG for migration
```

## 1.4 Agent 感知层交付（提交 10-17，2026-06-03→06-04）

这是项目从「SaaS 工具」到「AI 原生平台」的分水岭。8 次提交，~3500 行后端代码，24 个 API。

### Phase A：Agent 问候 API（提交 10-11）
```
c93bf85e — feat: Agent 感知层后端 — 问候API + 对话SSE + QuotaGuard
```
- 新建 4 个 MongoDB Schema：
  - `SystemEvent`：系统事件（healing/insight/milestone/evolution）
  - `UserContext`：用户上下文（竞品/项目/偏好）
  - `UserProfile`：用户画像（行业/角色/成长曲线）
  - `UserBehavior`：行为事件流
- 新建 Agent 控制器：`agent.controller.ts`、`agent-chat.controller.ts`
- 问候 API：时间感知 + 系统状态 + 每日简报 + 个性化欢迎语
- 对话 SSE：Dify 流式代理 + 事件翻译（step_start/step_done/message）

### Phase B：Evolution Engine（提交 12）
```
d1d24a92 — feat: Evolution Engine — 行为分析 + 自适应排序
```
- 新建：`evolution.service.ts`（533 行）
- 四因子加权排序：频率 40% + 新近度 30% + 上下文 20% + 完成率 10%
- Kendall Tau 布局调整检测（>30% 触发建议）
- 自动偏好学习：拒绝检测、平台偏好、工作时间、内容风格

### Phase C：Agent 精灵 + 组件市场（提交 13）
```
d5e18520 — feat: Agent精灵框架 + 组件注册中心
```
- 新建 3 个 MongoDB Schema：
  - `AgentDefinition`：8 个预置 Agent（策略师/文案/视觉/数据/发布/合规/互动/增长）
  - `ComponentDefinition`：组件市场定义
  - `UserInstalledComponent`：用户安装记录
- 操作：CRUD + quickConfig + reset + reorder + match

### Phase D：Docker 部署（提交 14）
```
3e9255ec — fix: Docker部署 — 依赖+配置+DI 启动成功
```
- node:lts-alpine 基础镜像
- 17 个 @yikart 工作区符号链接
- nginx 路由：`/api/agent/*` → 全外部可达
- 24 API 全部验证通过

### Phase E：前端 Agent 问候页（提交 15-16）
```
465e2da1 — feat: Agent问候增强 — memoryContext + 首次/适应期标记 + 异步任务状态
7717e81e — fix: nginx 路由 — Agent API 从外部可访问
25b08bf6 — fix: Agent Init — ComponentDefinition author 必填字段
a846e43e — feat: Agent 问候页 — 苏醒仪式 + 状态机 + 光点三色
```
- 新建：`src/app/[lng]/agent/page.tsx`、`AgentGreetingCore.tsx`（575 行）
- 5 状态机：IDLE → WAKING → READY / SLOW / DEGRADED
- 动画时间线：呼吸光点(600ms) → 睁眼线(1200ms) → 逐字问候(2000ms) → 卡片浮现(3000ms) → 就绪(4000ms)
- 前端组件：EyeLine、TypewriterText、StatusBadge、BriefCardItem、SuggestionButton、StatusDot、MorningBrief、DegradedFallback

## 1.5 当前状态总览

| 维度 | 数据 |
|------|------|
| 总提交数 | 17 |
| 前端文件数 | 865 |
| 后端文件数 | 530+ |
| 容器数 | 17 |
| API 端点 | 34+（24 Agent + 10+ 业务） |
| MongoDB Schema | 35+（7 主库 Agent + 28 主库业务 + 6 Channel DB） |
| i18n 语言 | zh-CN / en（ja/de/fr/ko 数据存在但未激活） |
| 支持平台数 | 14 |
| 品牌化文件 | 95 |
| MVP 总体进度 | ~95% |

---

# 第二卷：前端全景施工图

## 2.1 目录结构全览

```
src/
├── api/                          # API 请求层 (30+ 文件)
│   ├── plat/                     # 平台 API (16 文件)
│   │   ├── bridge/               # 浏览器扩展桥接
│   │   └── types/                # 发布/平台类型
│   └── types/                    # API 响应类型 (17 文件)
├── app/                          # Next.js App Router
│   ├── [lng]/                    # 国际化路由 (31 页面)
│   ├── api/                      # Next.js API Routes (9 端点)
│   ├── config/                   # 平台配置 (3 文件)
│   ├── diagnosis/                # 诊断工作流引擎
│   ├── hooks/                    # 应用级 Hooks
│   ├── i18n/                     # i18n 系统
│   ├── layout/                   # 全局布局
│   └── var.css / globals.css     # 设计 Token
├── assets/                       # 静态资源
│   ├── fonts/                    # 字体 (DIN + 思源)
│   └── svgs/plat/                # 15 个平台图标
├── components/                   # 组件库 (120+ 组件)
├── data/                         # 静态数据 (中国地理/国家代码)
├── hooks/                        # 通用 Hooks (10 个)
├── lib/                          # 工具库
├── services/                     # AI 服务层
├── store/                        # Zustand 状态管理 (10 个 Store)
├── types/                        # 全局类型
└── utils/                        # 工具函数 (20+ 文件)
```

## 2.2 路由地图

### 公开路由（无需登录）

| 路由 | 文件 | 行数 | 用途 |
|------|------|:--:|------|
| `/` | middleware.ts | 83 | 自动重定向到 /zh-CN/welcome |
| `/[lng]/welcome` | `(welcome)/welcome/page.tsx` | — | 品牌落地页 |
| `/[lng]/pricing` | `pricing/page.tsx` | ~200 | 订阅定价 |
| `/[lng]/auth/login` | `auth/login/page.tsx` | ~50 | 登录（Google/邮箱/手机） |

### 已激活应用路由

| 路由 | 文件 | 行数 | 用途 |
|------|------|:--:|------|
| `/[lng]/` | `page.tsx` | 38 | 首页（草稿箱） |
| `/[lng]/agent` | `agent/page.tsx` | 27 | **Agent 苏醒仪式** |
| `/[lng]/dashboard` | `dashboard/DashboardCore.tsx` | ~200 | 运营仪表盘 |
| `/[lng]/accounts` | `accounts/accountCore.tsx` | ~200 | 账号管理 |
| `/[lng]/chat` | `chat/page.tsx` | — | 对话列表 |
| `/[lng]/chat/[taskId]` | `chat/[taskId]/page.tsx` | ~200 | **Agent 对话详情** |
| `/[lng]/create` | `create/CreateCore.tsx` | ~200 | AI 智能创作 |
| `/[lng]/content` | `content/ContentCore.tsx` | ~200 | 内容中心 |
| `/[lng]/draft-box` | `draft-box/DraftBoxCore.tsx` | ~150 | 草稿箱 |
| `/[lng]/analytics` | `analytics/AnalyticsCore.tsx` | ~200 | 数据分析 |
| `/[lng]/publish` | `publish/PublishCore.tsx` | ~200 | 发布中心 |
| `/[lng]/customers` | `customers/CustomersCore.tsx` | ~200 | 客户服务 |
| `/[lng]/ai-console` | `ai-console/AiConsoleCore.tsx` | ~200 | AI 控制台 |
| `/[lng]/admin` | `admin/AdminDashboard.tsx` | ~100 | 管理后台 |
| `/[lng]/knowledge/workflows` | `knowledge/workflows/WorkflowsCore.tsx` | ~100 | 工作流模板 |
| `/[lng]/knowledge/cases` | `knowledge/cases/CasesCore.tsx` | ~100 | 案例库 |
| `/[lng]/knowledge/commands` | `knowledge/commands/CommandsCore.tsx` | ~200 | 提示词指令库 |
| `/[lng]/content/calendar` | `content/calendar/CalendarCore.tsx` | — | 内容日历 |
| `/[lng]/customers/replies` | `customers/replies/RepliesCore.tsx` | — | 手动回复 |
| `/[lng]/customers/support` | `customers/support/SupportCore.tsx` | — | AI 知识库客服 |
| `/[lng]/customers/wework` | `customers/wework/WeWorkCore.tsx` | — | 企业微信 |

### MVP 隐藏路由（middleware 重定向到 /welcome）

| 路由 | 状态 |
|------|:--:|
| `/[lng]/ai-social` | 🔒 |
| `/[lng]/brand-promotion` | 🔒 |
| `/[lng]/diagnosis/*` (12 个子页面) | 🔒 |
| `/[lng]/tasks-history` | 🔒 |
| `/[lng]/bridge-publish` | 🔒 |
| `/[lng]/agent-assets` | 🔒 |
| `/[lng]/websit/*` (5 个页面) | 🔒 |

### 特殊路由

| 路由 | 文件 | 用途 |
|------|------|------|
| `/healthz` | `healthz/page.tsx` | 健康检查 |
| `/shortLink` | `shortLink/page.tsx` | 抖音深度链接跳转 |
| `/robots.txt` | `robots.ts` | SEO robots |
| `/sitemap.xml` | `sitemap.ts` | SEO sitemap |

## 2.3 组件清单（核心组件）

### AiAssistantWidget（AI 悬浮助理）
**路径**：`src/components/AiAssistantWidget/`
```
├── index.tsx                       # 浮动按钮组入口 (119 行)
├── AiAssistantWidgetWrapper.tsx     # 路由感知包装器 (22 行)
├── AiChatPanel.tsx                  # AI 对话面板 (168 行)
├── AiContactPanel.tsx               # 微信联系面板 (93 行)
└── AiAssistantWidget.module.scss    # 样式 (299 行)
```
- 主按钮：品牌渐变 + CSS `pulse-ring` 呼吸光环
- 面板类型：Chat / Contact / null
- FAQ 匹配引擎：关键词检索 + 模糊匹配
- 面板动画：cubic-bezier(0.16, 1, 0.3, 1) 滑出
- 条件显示：welcome 和 auth 页面自动隐藏
- 设计参考：growthman.cn

### Chat（对话系统）
**路径**：`src/components/Chat/`
```
├── index.tsx                       # 主对话组件
├── ChatInput/index.tsx             # 输入框（标准/紧凑模式）
├── ChatMessage/
│   ├── index.tsx                   # 消息气泡（含思考动画）
│   ├── ChatMessage.module.scss     # 消息样式
│   ├── MediaGallery.tsx            # 媒体画廊
│   ├── WorkflowComponents.tsx      # 工作流步骤 UI（可展开卡片）
│   ├── ToolDetailModal.tsx         # 工具详情弹窗
│   ├── PluginPublishCard/          # 插件发布卡片
│   └── PublishDetailCard/          # 发布详情卡片
├── TaskCard/                       # 任务卡片
├── MediaUpload/                    # 媒体上传
├── ActionCard/                     # 操作卡片
└── Rating/                         # 评分组件
```

### ChannelManager（频道管理器）
**路径**：`src/components/ChannelManager/`
```
├── index.tsx                       # 弹窗入口（三视图状态机）
├── channelManagerStore.ts          # Zustand Store（含 OAuth 轮询）
├── types.ts                        # 类型定义
├── components/
│   ├── MainPage.tsx                # 频道主页
│   ├── ChannelSidebar.tsx          # 平台侧边栏
│   ├── ChannelItem.tsx             # 频道行
│   ├── SpaceItem.tsx               # 空间项
│   ├── ConnectChannelList.tsx      # 连接列表
│   ├── AuthLoadingPage.tsx         # 授权加载态
│   ├── CreateSpaceSection.tsx      # 创建空间
│   ├── DeleteConfirmDialog.tsx     # 删除确认
│   ├── SpaceListSkeleton.tsx       # 骨架屏
│   └── UnifiedChannelSpaceList.tsx # 统一列表
```

### PublishDialog（发布对话框）
**路径**：`src/components/PublishDialog/`（~50 文件，全平台最复杂的组件）
```
├── index.tsx                       # 主对话框入口
├── usePublishDialog.ts             # 核心发布逻辑 Hook
├── usePublishDialogData.ts         # 数据管理 Hook
├── usePublishDialogStorageStore.tsx # 持久化 Store
├── publishDialog.type.ts           # 类型定义
├── hooks/ (8 个)
│   ├── useAISync.ts                # AI 同步
│   ├── usePublishActions.ts        # 发布动作
│   ├── usePublishState.ts          # 发布状态
│   ├── useAccountClickHandler.ts   # 账号点击
│   ├── usePlatformAuth.ts          # 平台授权
│   ├── usePubParamsVerify.ts       # 参数验证
│   ├── useUploadSync.ts            # 上传同步
│   └── useCloseDialog.ts           # 关闭处理
├── compoents/
│   ├── AccountSelector/            # 账号选择器
│   ├── DesktopPublishContent/      # 桌面发布内容
│   ├── PublishFooter/              # 发布底部栏
│   ├── PublishManageUpload/        # 上传进度管理
│   ├── PublishDatePicker/          # 定时发布
│   ├── PlatParamsSetting/          # 各平台参数设置（14 平台）
│   ├── MaterialSelectionModal/     # 素材选择弹窗
│   ├── PubParmasTextarea/          # 富文本输入（支持 @提及、图片、视频封面）
│   └── PublishModals/              # 特殊弹窗（Facebook 页面等）
```

### Onboarding（新手引导）
**路径**：`src/components/Onboarding/index.tsx`（483 行）
- 4 步诊断式引导
- Step 0：角色选择（超级个体/一人公司/中小企业）
- Step 1：痛点诊断（5 个维度）
- Step 2：AI 成熟度评估（4 级）
- Step 3：摘要预览
- 完成：生成 AI 商业升级路线图（本周/本月/3个月）

### 公共组件
**路径**：`src/components/common/`
- `MorphingIcon/` — 四态 SVG 路径动画（sparkles/brain/rocket/target 每 1.5s 切换）
- `MediaPreview/` — 全屏媒体预览 + BrushEditor（画笔/裁剪/缩放）
- `EditTitleModal/` — 标题编辑弹窗
- `FavoriteButton/` — 收藏按钮
- `LowBalanceAlert/` — 余额不足提醒

### UI 基础组件（shadcn/ui + 定制，40+ 个）
路径：`src/components/ui/`
button, input, card, dialog, dropdown-menu, tabs, table, form, popover, tooltip, switch, slider, checkbox, radio-group, select, badge, avatar, skeleton, progress, pagination, command, scroll-area, separator, collapsible, carousel, alert, alert-dialog, sonner, notification-center, star-rating, steps, searchable-select, password-input, number-input, empty-state, list, grid, modal, spin

### 布局组件
**路径**：`src/app/layout/`
```
├── Providers.tsx                   # 全局 Provider（Theme/Google/Toaster/Notification）
├── routerData.tsx                  # 导航数据配置
├── layout.utils.ts                 # 布局工具函数
├── LayoutSidebar/
│   ├── index.tsx                   # 桌面侧边栏
│   └── components/
│       ├── IconBar/                # 图标栏
│       ├── LogoSection/            # Logo
│       ├── NavSection.tsx          # 主导航（含 More 折叠组）
│       ├── UserSection/            # 用户区域
│       ├── UserDropdownMenu/       # 用户下拉菜单
│       └── BottomSection/          # 底部区域
│           ├── MyChannelsEntry.tsx # 我的频道入口
│           ├── PluginEntry.tsx     # 插件入口
│           └── SettingsEntry.tsx   # 设置入口
├── MobileNav/                      # 移动端导航
├── MainContent/                    # 主内容区
├── LoginDialog/                    # 全局登录弹窗
└── shared/                         # 共享常量/Hooks/组件
```

## 2.4 Store 全景图

### 1. useUserStore（localStorage 持久化）
**文件**：`src/store/user.ts`
**状态**：token, userInfo, creditsBalance, sidebarCollapsed, defaultPlanId, hasEverLoggedIn, countryCode, lang
**方法**：setToken, setUserInfo, appInit, getUserInfo, fetchCreditsBalance, setSidebarCollapsed, logout

### 2. useSystemStore（IndexedDB 持久化）
**文件**：`src/store/system.ts`
**状态**：disableLowBalanceAlert, calendarViewType, dismissSeedanceBanner, myTasksTab, createTaskDescExpanded, githubStars
**迁移**：v0→v4 向后兼容

### 3. useAccountStore（内存，不持久化）
**文件**：`src/store/account.ts`
**状态**：accountList, accountMap, accountGroupList, accountLoading, accountActive, activeSpaceId

### 4. useNotificationStore（内存）
**文件**：`src/store/notification.ts`
**状态**：notifications[], unreadCount, pagination, loading
**方法**：resetAndFetch, loadMore, markAsRead（乐观更新）, markAllAsRead, deleteNotification

### 5. useAgentStore（核心 AI Store）
**文件**：`src/store/agent/`（15+ 文件，全平台最复杂的 Store）
```
├── index.ts                        # useAgentStore + getTaskInstance
├── agent.types.ts                  # IAgentState, ITaskMessageData, ISSEMessage 等
├── agent.state.ts                  # 初始状态
├── agent.methods.ts                # 核心方法：createTask, continueTask, stopTask
├── agent.constants.ts              # 常量
├── handlers/
│   └── action.handlers.ts          # ActionHandler 注册表（8 处理器）
├── task-instance/
│   ├── TaskInstance.ts             # 每任务独立实例类
│   ├── sse.handler.ts              # SSE 事件路由
│   ├── message.handler.ts          # 消息创建/更新/状态
│   ├── workflow.handler.ts         # 步骤和工具调用管理
│   └── task-instance.types.ts      # 处理器上下文接口
└── utils/
    ├── buildPrompt.ts              # 提示词构建
    ├── message.ts                  # 消息工具
    ├── progress.ts                 # 进度工具
    └── refs.ts                     # 引用工具
```

### 6. usePluginStore（浏览器扩展）
**文件**：`src/store/plugin/`（12+ 文件）
**子模块**：store, hooks(4), constants, utils, types(6), plats(manager + douyin/xhs + demo data), docs(3)

### 7. usePublishDetailCache（IndexedDB 持久化）
**文件**：`src/store/publishDetailCache.ts`
**缓存 TTL**：5 分钟

### 8. useThumbnailCache（IndexedDB 持久化）
**文件**：`src/store/thumbnailCache.ts`
**并发控制**：最大 3 个并发请求

### 9. PublishDialog Storage Store
**文件**：`src/components/PublishDialog/usePublishDialogStorageStore.tsx`

### 10. ChannelManager Store
**文件**：`src/components/ChannelManager/channelManagerStore.ts`

## 2.5 API 层清单

### 核心 API 文件（`src/api/`，30+ 文件）

| 文件 | 端点数 | 功能 |
|------|:--:|------|
| `account.ts` | 6 | 账号 CRUD + 分组管理 |
| `accountSort.ts` | 2 | 账号/分组排序 |
| `agent.ts` | 12 | AI Agent 任务（SSE 流式、收藏、历史） |
| `ai.ts` | 4 | AI 模型配置、素材适配、资产列表 |
| `apiReq.ts` | 5 | 用户信息、积分记录、Google 登录 |
| `assets.ts` | 1 | 视频缩略图生成 |
| `auth.ts` | 4 | 邮箱/手机验证码登录 |
| `credits.ts` | 2 | 积分余额 + 记录 |
| `draftGeneration.ts` | 3 | AI 批量草稿生成 |
| `material.ts` | 3 | 素材上传 + CRUD |
| `media.ts` | 4 | 媒体资源组管理 |
| `notification.ts` | 5 | 通知 CRUD（含已读/全部已读） |
| `oss.ts` | 1 | OSS 上传（MD5 校验） |
| `payment.ts` | 2 | 积分订单创建 + 状态查询 |
| `subscription.ts` | 3 | 订阅计划 + 我的订阅 + 订阅/取消 |
| `tools.ts` | 3 | AI 工具（视频标题/图片审核/文章生成） |
| `platAuth.ts` | 6 | YouTube/TikTok 等平台 OAuth |
| `twitter.ts` | 1 | Twitter OAuth |
| `pinterest.ts` | 2 | Pinterest 广告账号 |
| `plat/publish.ts` | 4 | 发布记录 CRUD |
| `plat/interact.ts` | 4 | 跨平台互动（评论/点赞/收藏） |
| `plat/bridge/extensionBridge.ts` | — | 浏览器扩展桥接 |
| **平台 API**（`plat/`） | — | bilibili, douyin, facebook, instagram, kwai, threads, tiktok, youtube |

### 平台 API（每个平台 1-3 文件）

bilibili, douyin, facebook, instagram, kwai, threads, tiktok, youtube — 各含 auth URL 生成 + auth 状态检查

### Next.js API Routes（9 个）

| 路由 | 方法 | 功能 |
|------|:--:|------|
| `/api/ai/diagnosis` | POST | DeepSeek 内容诊断（deep/quick 模式） |
| `/api/ai/optimize` | POST | DeepSeek 优化方案生成 |
| `/api/ai/summarize` | POST | DeepSeek 内容摘要 |
| `/api/dify/query` | POST | Dify 知识库 RAG 检索 |
| `/api/dify/sync` | POST | 同步数据到 Dify 知识库 |
| `/api/n8n/trigger` | POST | 触发 N8N 工作流 Webhook |
| `/api/n8n/status/[id]` | GET | 查询 N8N 执行状态 |
| `/api/user/dashboard` | GET | 仪表盘聚合数据（MVP 骨架） |

## 2.6 Hook 清单（10 个通用 Hook）

| Hook | 文件 | 功能 |
|------|------|------|
| `useDocumentTitle` | `useDocumentTitle.ts` | 动态更新 document.title，支持 i18n 后缀 |
| `useGeolocation` | `useGeolocation.ts` | 浏览器定位 API 封装 |
| `useIsMobile` | `useIsMobile.ts` | 767px 断点移动端检测 |
| `useKeepTimeCountdown` | `useKeepTimeCountdown.ts` | 任务保留倒计时 |
| `useMediaUpload` | `useMediaUpload.ts` | 媒体文件上传（进度/中止/删除） |
| `useNotification` | `useNotification.ts` | 未读通知轮询（60s） |
| `useSubscription` | `useSubscription.ts` | 订阅计划 + 配额 + canCreate 检查 |
| `useSystem` | `useSystem.ts` | 当前客户端语言获取 |
| `useVideoThumbnail` | `useVideoThumbnail.ts` | 视频缩略图自动缓存（IndexedDB） |
| `useCssVariables` | `app/hooks/useCssVariables.ts` | CSS 变量值实时读取 |

## 2.7 工具层清单（20+ 文件）

### `src/utils/`

| 文件 | 功能 |
|------|------|
| `request.ts` | HTTP 客户端（FetchService + Auth 拦截器 + 错误处理） |
| `createPersistStore.ts` | Zustand 持久化 Store 工厂 |
| `storage.ts` | localStorage 封装 |
| `storageIndexedDb.ts` | IndexedDB 封装 |
| `general.ts` | SEO 元数据工厂 |
| `route.ts` | 公开页面白名单检测 |
| `index.ts` | UUID / sleep / 文件路径 / 话题解析 |
| `format.ts` | 数字/日期格式化 |
| `currency.ts` | 货币符号获取 |
| `oss.ts` | OSS URL 工具 |
| `media.ts` | 媒体文件处理 |
| `auth.ts` | 客户端认证工具 |
| `download.ts` | 文件下载 |
| `detectPlatform.ts` | 浏览器/平台检测 |
| `geoData.ts` | 地理数据 |
| `regulars.ts` | 正则表达式常量 |
| `settlement.ts` | 结算/收益计算 |
| `otherRequest.ts` | 杂项请求 |
| `appLaunch.ts` | 应用启动初始化 |
| `agent-asset.ts` | Agent 资产媒体类型判定 |
| `verify-message.ts` | 消息验证 |

### `src/lib/`

| 文件 | 功能 |
|------|------|
| `utils.ts` | cn()（clsx+twMerge）、formatRelativeTime() |
| `confirm.tsx` | 命令式确认弹窗（React Portal + AlertDialog） |
| `notification.ts` | 全局通知（CustomEvent 驱动） |
| `toast.ts` | Sonner Toast 封装（6 种类型） |
| `knowledge/seed-data.ts` | 知识库种子数据（指令/案例/工作流） |
| `knowledge/customer-service-data.ts` | 客服知识数据 |

## 2.8 中间件与配置

### Middleware（`src/middleware.ts`，83 行）

1. **代理透传**：`/api/` 路径直接放行
2. **MVP 路由隐藏**：7 个未完成路由 → /welcome
3. **白名单放行**：robots.txt / sitemap.xml / healthz / shortLink
4. **语言检测**：Cookie > Accept-Language > fallbackLng(zh-CN)
5. **Referer Cookie 同步**：从 Referer 中提取语言并设置 Cookie

### 平台配置（`src/app/config/platConfig.ts`，395 行）

- `PlatType` 枚举：15 个平台（Tiktok/Douyin/Xhs/WxSph/KWAI/YouTube/BILIBILI/Twitter/WxGzh/Facebook/Instagram/Threads/Pinterest/LinkedIn/Baijiahao）
- `AccountPlatInfoMap`：平台元数据（themeColor/icon/pubTypes/参数限制）
- 区域过滤、发布类型支持检查、收藏/浏览支持检查

### 发布配置（`src/app/config/publishConfig.ts`）
- `PubType` 枚举：VIDEO('video') / ImageText('article') / Article('article2')

### 账号配置（`src/app/config/accountConfig.ts`）
- `AccountStatus`：USABLE(1) / DISABLE(0)
- `XhsAccountAbnormal`：Normal / Abnormal

---

# 第三卷：后端全景施工图

## 3.1 Nx Monorepo 结构

```
aitoearn-backend/
├── apps/
│   ├── aitoearn-server/            # 主 API 服务 (端口 3002)
│   │   └── src/
│   │       ├── main.ts             # 入口
│   │       ├── config.ts           # Zod 类型安全配置
│   │       ├── app.module.ts       # 根模块（19 个 Core Module）
│   │       └── core/               # 16 个业务模块
│   └── aitoearn-ai/                # AI 服务 (端口 3010)
│       └── src/
│           ├── main.ts
│           ├── config.ts           # AI 模型配置 (OpenAI/Gemini/Grok/Anthropic/Volcengine)
│           ├── app.module.ts
│           └── core/               # Agent + AI + Draft + Material Adaptation
├── libs/
│   ├── common/                     # 共享工具（枚举/异常/过滤器/拦截器/i18n）
│   ├── mongodb/                    # 主数据库（28 Schema + 28 Repository）
│   ├── channel-db/                 # 频道数据库（6 Schema）
│   ├── ai-services/                # Dify + N8N 集成
│   ├── aitoearn-auth/             # 认证（JWT + API Key + Internal Token）
│   ├── aitoearn-queue/            # BullMQ 队列（11 个队列）
│   ├── aitoearn-server-client/    # 服务间 HTTP 客户端
│   ├── aitoearn-ai-client/        # AI 服务 HTTP 客户端
│   ├── assets/                     # 资产存储（S3/OSS 适配器）
│   ├── nest-mcp/                   # MCP 框架（SSE + Streamable HTTP）
│   ├── ali-oss/                    # 阿里云 OSS
│   ├── ali-sms/                    # 阿里云短信
│   ├── aws-s3/                     # AWS S3/MinIO
│   ├── mail/                       # 邮件发送
│   ├── redis/                      # Redis + Pub/Sub
│   ├── redlock/                    # 分布式锁
│   └── helpers/                    # Credits + MaterialGroup 辅助
└── tools/                          # 构建工具
```

## 3.2 aitoearn-server 模块地图

### AccountModule
**路径**：`apps/aitoearn-server/src/core/account/`（11 文件）
**端点**：账号 CRUD + 分组 CRUD + MCP HTTP 端点（供 Agent 调用）

### AgentModule
**路径**：`apps/aitoearn-server/src/core/agent/`（12 文件）
**端点**：

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/agent/greeting` | 个性化问候 + 系统状态 + 每日简报 |
| GET | `/agent/events` | 未读系统事件（healing/insight/milestone） |
| GET | `/agent/context` | 用户上下文（竞品/项目/偏好） |
| POST | `/agent/context` | 更新用户上下文 |
| GET | `/agent/profile` | 用户画像 |
| POST | `/agent/behavior` | 行为追踪（前端遥测） |
| GET | `/agent/evolution/report` | 演化报告 |
| POST | `/agent/evolution/module-weights` | 个性化模块权重 |
| POST | `/agent/evolution/layout-check` | 布局重排检测 |
| POST | `/agent/evolution/sync-profile` | 强制画像更新 |

**MongoDB Schema**（`agent.schema.ts`）：
- `SystemEvent`：userId, type, title, description, data, readAt, source
- `UserContext`：userId, competitors, projects, recentSessions, preferredPlatforms, preferredStyle, preferredFormat
- `UserProfile`：userId, industry, role, totalContentCreated, milestones, strengths, avoidTopics
- `UserBehavior`：userId, action, context, timestamp

### AgentChatService
**文件**：`agent-chat.service.ts`
**核心方法**：`chat()` — 调用 Dify 流式 API → RxJS Observable → `translateStream()` 将 Dify 事件类型（agent_thought/message/message_end/error）翻译为前端事件（step_start/step_done/message/done/error）

**工具名中文映射**（44-55 行）：
```
knowledge_retrieval → 搜索知识库
web_scraping → 网络抓取
content_generation → 内容生成
platform_adaptation → 平台适配
compliance_check → 合规检测
```

### AgentRegistryModule
**文件**：`agent-registry.controller.ts`、`agent-registry.service.ts`、`agent-registry.schema.ts`
**Schema**：AgentDefinition（8 预置）、ComponentDefinition（4 内置）、UserInstalledComponent
**操作**：CRUD + quickConfig + reset + reorder + match（智能匹配推荐）

### EvolutionService
**文件**：`evolution.service.ts`（533 行）
**方法**：
- `generateEvolutionReport(userId, periodDays=7)` — 5 维度并行分析（格式/话题/平台/习惯/统计）
- `calculateModuleWeights(userId, moduleIds)` — 四因子加权（40%/30%/20%/10%）
- `shouldSuggestReorg(userId, currentOrder)` — Kendall Tau 距离检测（>30%）
- `updateUserProfileFromBehavior(userId)` — 自动更新画像（拒绝检测 3+ 次→avoidTopics）

### ChannelModule
**路径**：`apps/aitoearn-server/src/core/channel/`（16+ 模块文件）
**覆盖平台**：Bilibili, Douyin, Kwai, YouTube, TikTok, Twitter/X, Facebook, Instagram, Threads, Pinterest, LinkedIn, Google Business, WxGzh, WxPlat, Xiaohongshu
**每个平台**：controller + service + dto + API 集成库

### SubscriptionModule
**路径**：`apps/aitoearn-server/src/core/subscription/`（8 文件）
**Schema**：SubscriptionPlan, UserSubscription, QuotaUsage

**默认计划**：

| 计划 | 价格 | 账号数 | 内容/月 | 平台数 |
|------|------|:--:|:--:|:--:|
| Free | $0 | 3 | 10 | 3 |
| Pro | $299/mo | 10 | 100 | 6 |
| Enterprise | $999/mo | 30 | 500 | 14 |

**Guard**：`@RequireQuota('create_content')` 装饰器 → `QuotaGuard` → `checkQuota()`

### CreditsModule
**路径**：`apps/aitoearn-server/src/core/credits/`（12 文件）
**核心逻辑**：FIFO 扣费策略（先扣快过期的）→ 每 10 分钟 Cron 清理过期积分
**消费者**：credits-purchase（BullMQ）、credits-refund（BullMQ）
**Webhook**：Stripe 支付回调

### 其他模块
- ApiKeyModule — API 密钥管理
- AssetsModule — 资产上传/管理
- ContentModule — 草稿/素材管理 + MCP 工具
- InternalModule — 内部/管理员端点
- NotificationModule — 通知 CRUD + OneSignal/邮件推送
- PublishModule — 发布流水线
- RelayModule — OAuth 中继回调
- ShortLinkModule — 短链接
- ToolsModule — QR 码艺术图片生成
- UnifiedMcpModule — 统一 MCP 服务器管理
- UserModule — 用户 CRUD + 认证

## 3.3 aitoearn-ai 模块地图

### AgentModule（AI 侧）
**路径**：`apps/aitoearn-ai/src/core/agent/`（27+ 文件）

**核心运行时架构**：
```
用户请求 → AgentController(REST)
    → AgentService(业务逻辑)
    → AgentRuntimeService(Claude Code SDK)
        ├── Claude Code Router Service (代理到 Anthropic API)
        ├── 13 个 MCP 工具服务器
        │   ├── MediaMcp (Gemini 图片 + Grok 视频)
        │   ├── UtilMcp (时间/等待/标题)
        │   ├── AideoMcp (火山引擎视频)
        │   ├── VideoEditMcp
        │   ├── DramaRecapMcp
        │   ├── StyleTransferMcp
        │   ├── VideoUtilsMcp
        │   ├── ImageEditMcp
        │   ├── SubtitleMcp
        │   └── 外部 HTTP MCP (Account/Content/Statistics/Publish)
        ├── 13 个 Skill 目录
        └── 子 Agent (polling-task, skill-analyzer)
```

**API 端点**：

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/agent/tasks` | 创建生成任务（SSE 流式） |
| GET | `/agent/tasks` | 分页任务列表 |
| GET | `/agent/tasks/:taskId` | 任务详情 |
| GET | `/agent/tasks/:taskId/messages` | 新消息轮询 |
| DELETE | `/agent/tasks/:taskId` | 软删除 |
| PATCH | `/agent/tasks/:taskId` | 更新标题 |
| POST | `/agent/tasks/:taskId/rating` | 评分 (1-5) |
| POST | `/agent/tasks/:taskId/share` | 创建分享链接 |
| GET | `/agent/tasks/shared/:token` | 公开分享页 |
| POST | `/agent/tasks/:taskId/abort` | 中断运行中任务 |
| POST | `/agent/tasks/:taskId/favorite` | 收藏 |
| DELETE | `/agent/tasks/:taskId/favorite` | 取消收藏 |

**Claude Code Router**：
- `claude-code-router.service.ts` — 管理 CCR 进程生命周期
- 生成 `config.json`（provider/router 配置）
- 代理 Anthropic API 请求

**13 个 Skill 目录**：
generating-images, generating-videos, editing-videos, editing-images, transferring-video-styles, generating-drama-recaps, composing-videos, translating-videos, removing-subtitles, analyzing-videos, managing-content, crawling-social-media, extracting-thumbnails

**MCP 工具名称**（agent.constants.ts）：
MediaGeneration, Database, Util, Aideo, Statistics, Account, Publish, Content, VideoEdit, VideoUtils, SessionTools, DramaRecap, StyleTransfer, ImageEdit, Subtitle, BrandStore

### AIModule
**路径**：`apps/aitoearn-ai/src/core/ai/`

**子模块**：
- **Chat**：AI 对话（model selection）
- **Image**：Gemini 图片生成 + 图片编辑（BullMQ 消费者）
- **Video**：Sora/Gemini Veo/Grok/Volcengine 视频生成（多 Provider + 状态轮询 Scheduler）
- **Aideo**：火山引擎视频处理（drama-recap + style-transfer + Scheduler）
- **Logs**：AI 操作日志
- **Models Config**：可用模型列表
- **Pricing**：成本计算器

**AI Provider 库**（`libs/`）：
- OpenAI — GPT 系列
- Gemini — Google AI（含 KeyManager）
- Grok — xAI Grok
- Volcengine — 火山引擎（7 个内部服务：Base/Aideo/DirectEdit/DramaRecap/Media/Upload/VCreative/VideoGen）

### DraftGenerationModule
**路径**：`apps/aitoearn-ai/src/core/draft-generation/`
- 批量草稿生成 + BullMQ 消费者

### MaterialAdaptationModule
**路径**：`apps/aitoearn-ai/src/core/material-adaptation/`
- 素材跨平台适配

## 3.4 Libs 库地图

### ai-services（Dify + N8N）
**路径**：`libs/ai-services/`

**DifyService 方法**：
- `retrieveKnowledge(params)` — RAG 检索知识库
- `runAgentApp(params)` — 运行 Dify Agent（阻塞）
- `listDatasets()` — 列出数据集
- `createDataset(params)` — 创建知识库
- `createDocument(params)` — 添加文档
- `healthCheck()` — 连接检查

**N8nService 方法**：
- `triggerWorkflow(params)` — 触发 Webhook
- `triggerWorkflowAsync(params)` — 异步触发
- `listWorkflows()` — 列出工作流
- `toggleWorkflow(id, active)` — 激活/停用
- `triggerCompetitorAnalysis(keywords)` — 竞品分析
- `triggerTrendingTopics(industry)` — 热搜话题
- `triggerPostPublishTracking(contentIds)` — 发布追踪
- `triggerAccountHealthCheck(accountIds)` — 账号健康
- `healthCheck()` — 连接检查

### aitoearn-queue（BullMQ）
**路径**：`libs/aitoearn-queue/`
**11 个队列**：PostPublish, PostMediaTask, AiImageAsync, EngagementTaskDistribution, EngagementReplyToComment, DumpSocialMediaAvatar, UpdatePublishedPost, CreditsPurchase, CreditsRefund, Notification, DraftGeneration

### nest-mcp（MCP 框架）
**路径**：`libs/nest-mcp/`
- SSE Transport + Streamable HTTP Transport
- 装饰器：@Tool, @Resource, @Prompt
- 服务注册表 + 处理器 + 适配器

### assets（资产存储）
**路径**：`libs/assets/`
- 适配器：ali-oss.adapter, s3.adapter
- 视频元数据提取（ffprobe）
- Cloudflare R2 事件处理

### aitoearn-auth
**路径**：`libs/aitoearn-auth/`
- JWT Bearer Token + API Key (SHA1) + Internal Token Bypass
- 装饰器：@Public(), @GetToken()

---

# 第四卷：设计系统施工图

## 4.1 色彩系统

### 品牌色
```css
/* src/app/var.css (28 行) */
--brand-purple: oklch(55.8% 0.288 302.321);
--brand-cyan:   oklch(54.6% 0.245 262.881);
```

### 品牌渐变体系
```css
--brand-gradient:            linear-gradient(135deg, var(--brand-purple), var(--brand-cyan));
--brand-gradient-horizontal: linear-gradient(0deg, var(--brand-purple), var(--brand-cyan));
--brand-gradient-subtle:     /* 低透明度，大面积氛围 */
--brand-gradient-glow:       /* 激活态底色 */
--brand-shadow-sm:           /* 品牌色调阴影，非灰色 */
--brand-shadow-md:
--brand-shadow-lg:
```

### OKLCH 完整调色板（`src/app/globals.css`）
亮色模式 + 暗色模式，覆盖：
- background, foreground（多级）
- primary, primary-foreground
- accent, accent-foreground
- destructive, success, warning, info
- chart-1 ~ chart-5
- sidebar, sidebar-foreground（多级）
- border, ring, input
- muted, muted-foreground

## 4.2 字体系统

```css
/* src/assets/fonts/font.css */
font-family: 'Suisseintl', sans-serif;  /* 品牌字体 */
font-family: 'DIN-Medium';              /* 数据展示字体 */
font-family: 'SourceHanSansCN';         /* 中文回退字体 */
```

## 4.3 圆角系统

```css
--radius: 0.625rem;
--radius-sm: calc(var(--radius) - 2px);   /* ~0.5rem */
--radius-md: var(--radius);               /* 0.625rem */
--radius-lg: calc(var(--radius) + 2px);   /* ~0.75rem */
--radius-xl: calc(var(--radius) + 4px);   /* ~0.875rem */
--radius-2xl: calc(var(--radius) + 6px);  /* ~1rem */
--radius-3xl: calc(var(--radius) + 10px); /* ~1.25rem */
--radius-4xl: calc(var(--radius) + 14px); /* ~1.5rem */
```

## 4.4 动画定义

### CSS 动画（`globals.css`）
```css
@keyframes shimmer    { /* 骨架屏渐变扫描，2s ease-in-out infinite */ }
@keyframes pulse-ring { /* 呼吸光环：scale(1→1.3) + opacity(0.4→0)，2s ease-out infinite */ }
@keyframes fade-in-up { /* 上浮淡入：translateY(10px→0) + opacity(0→1) */ }
@keyframes td-shimmer { /* 任务详情闪光 */ }
```

### Welcome 页动画（`welcome.module.scss`）
```css
@keyframes rotate-gradient  { /* 锥形渐变旋转，3s infinite */ }
@keyframes slide-progress   { /* 进度条填充，7s linear */ }
@keyframes pin-bounce       { /* 3D 翻转+弹跳，1s cycle */ }
@keyframes marquee-horizontal { /* 无限水平滚动，80s/50s，hover 暂停 */ }
@keyframes blink            { /* 光标闪烁 */ }
```

### 对话动画（`ChatMessage` 内联 keyframes）
```css
@keyframes thinkingGlow { /* 色相旋转 0→180°，1.8s infinite */ }
@keyframes bounceDots   { /* 三段弹跳，1.4s infinite，staggered */ }
```

### 组件动画（SCSS）
```css
/* AiAssistantWidget: 面板滑入 cubic-bezier(0.16,1,0.3,1) */
/* ChatMessage:      fadeIn 0.2s + slideIn 0.15s */
/* PublishDialog:    面板过渡 300ms */
/* UploadItem:       文件上传项过渡 */
```

### Framer Motion 动画（8 个文件使用）
- `AgentGreetingCore.tsx`：EyeLine morphing（点→线→地平线），卡片/建议 staggered entrance，MorningBrief AnimatePresence
- `MorphingIcon/index.tsx`：SVG pathLength 绘制，spring scale，breathing opacity loop，AnimatePresence 图标切换
- `LoginContent`、`MediaPreview`、`BrushEditor`、`MaterialSelectionModal`：表单过渡、预览过渡、编辑工具过渡

## 4.5 全局微交互规则

```css
/* 所有按钮：transition-all duration-200，hover 时 shadow-md */
/* .card-hover：transition-all duration-300，hover 时 shadow-xl -translate-y-1 */
/* 自定义滚动条：.scrollbar-thin / .scrollbar-thumb-gray-300 / .scrollbar-none */
```

---

# 第五卷：交互体验施工图

## 5.1 Agent 苏醒仪式

**文件**：`src/app/[lng]/agent/AgentGreetingCore.tsx`（575 行）

### 状态机
```
IDLE → WAKING → READY
              → SLOW（>5s，显示"调取记忆中"）
              → DEGRADED（>8s，显示重试按钮）
```

### 动画时间线
| 时间 | 事件 | 实现 |
|------|------|------|
| 0ms | 页面加载，IDLE 状态 | React state |
| 600ms | 呼吸光点浮现，弹性缩放动画 | Framer Motion spring |
| 1200ms | 光点展开为水平线（睁眼） | Framer Motion path morphing |
| 2000ms | 问候文字逐字显现 | TypewriterText 组件（60ms/字） |
| 3000ms | 简报卡片 staggered 浮现 | Framer Motion staggerChildren |
| 4000ms | 所有动画完成，环境光点右下角脉冲 | CSS animate-pulse |
| >5000ms | SLOW 降级态 | 条件渲染 |
| >8000ms | DEGRADED 降级态 | 条件渲染 |

### 子组件
- **EyeLine**（85-105 行）：Framer Motion SVG 路径变形
- **TypewriterText**（108-126 行）：逐字输出 + 光标闪烁
- **StatusBadge**（129-143 行）：系统状态标签
- **BriefCardItem**（147-168 行）：简报卡片（项目/竞品/间隔天数）
- **SuggestionButton**（170-183 行）：建议操作按钮
- **StatusDot**（185-201 行）：右下角环境光点
- **MorningBrief**（203-248 行）：晨间简报弹窗（夜间事件汇总）
- **DegradedFallback**（250-264 行）：降级态 + 重试

### 交互特性
- **Space 跳过**（410-425 行）：任意时刻按空格跳过所有动画
- **自动恢复**（375-381 行）：SLOW 态收到数据后自动恢复 READY
- **个性化问候**（325-354 行）：多段问候拼装（记忆上下文/项目数/竞品数/首次标记/间隔天数）

## 5.2 SSE 流式对话

### TaskInstance 架构
**文件**：`src/store/agent/task-instance/TaskInstance.ts`（429 行）

每对话任务独立实例，持有：
- `taskId`（temp-{timestamp} → 真实 ID）
- `streamBuffer`（流式缓冲）
- `stepIndex`（当前步骤）
- `currentMessageId`（当前消息 ID）
- `callbacks`（onMessage/onStep/onError/onDone）

多任务并行：`Map<string, TaskInstance>` 存储，互不干扰。

### SSE 事件流
**事件类型**（`agent.types.ts` 288-306 行）：
```
init → keep_alive → stream_event → message → status → error → done
       └── text → result → assistant → user
```

**流程**（`agent.methods.ts` 160-343 行）：
1. 生成临时 taskId
2. 创建 TaskInstance 绑定
3. 初始化 Store 中的任务数据
4. 添加用户消息 + pending 助手消息
5. 调用 `agentApi.createTaskWithSSE()` 打开 EventSource
6. 所有事件路由到 `instance.handleSSEMessage(msg, callbacks)`
7. `sse.handler.ts` 按事件类型分发
8. `workflow.handler.ts` 管理 text delta / tool call / tool result
9. `message.handler.ts` 更新显示消息 + 状态转换
10. `init` 事件到达时执行 `migrateToRealTaskId()`

### UI 步骤渲染
**文件**：`src/components/Chat/ChatMessage/index.tsx`

消息气泡 = 多个 `MessageStepContent` 块（111-352 行）  
每个步骤 = `WorkflowSection` + 工具盒子步骤（旋转 Loader / CheckCircle / 展开折叠）

**思考指示器**（488-556 行）：品牌色渐变文字 + 三段彩色光点弹跳

## 5.3 Evolution Engine

### 四因子加权排序
**文件**：`evolution.service.ts` 197-249 行

| 因子 | 权重 | 计算方式 |
|------|:--:|------|
| 使用频率 | 40% | 统计周期内使用次数 |
| 使用新近度 | 30% | 最近使用时间衰减 |
| 上下文关联 | 20% | 当前场景下的相关性 |
| 任务完成率 | 10% | 使用该模块的任务完成比例 |

趋势检测：rising / stable / falling 自动标记

### Kendall Tau 布局检测
**文件**：`evolution.service.ts` 251-270 行

- 比较用户行为排序 vs 当前布局排序
- Kendall Tau 距离 > 30% → 触发布局重排建议
- 非强制：优雅提示「我们发现你的使用习惯发生了变化，要调整布局吗？」

### 自动偏好学习
**文件**：`evolution.service.ts` 277-328 行
- 拒绝检测：3+ 次拒绝同一话题 → `avoidTopics` 自动添加
- 平台偏好：80% 发布去抖音 → 默认选项优先
- 工作时间：晚上高效 → 发布建议匹配窗口
- 内容风格：标题偏好短+直接 → AI 生成风格适配

## 5.4 Agent 精灵系统

### 8 个预置 Agent
| Agent | 角色 | 触发场景 |
|-------|------|----------|
| 内容策略师 | 选题策划 | 热点追踪、竞品分析、选题打分 |
| 文案大师 | 内容创作 | 标题优化、文案生成、多平台适配 |
| 视觉顾问 | 图片/视频 | 封面建议、排版检查、色彩推荐 |
| 数据分析师 | 数据洞察 | 趋势分析、异常检测、对比报告 |
| 发布管家 | 发布调度 | 最佳时间、多平台编排、频率控制 |
| 合规官 | 风险检测 | 敏感词过滤、平台规则检查、版权提醒 |
| 互动教练 | 客户沟通 | 评论回复建议、私信话术、危机应对 |
| 增长顾问 | 增长策略 | 涨粉策略、爆款分析、矩阵规划 |

### 组件市场
**数据模型**：AgentDefinition / ComponentDefinition / UserInstalledComponent
**操作**：CRUD / quickConfig（一键配置）/ reset（恢复默认）/ reorder（拖拽排序）/ match（智能匹配推荐）

## 5.5 微交互系统

### MorphingIcon
**文件**：`src/components/common/MorphingIcon/index.tsx`（210 行）
- 4 个 SVG 图案循环：✨ → 🧠 → 🚀 → 🎯（1.5s/个）
- Framer Motion pathLength 描边动画
- Spring scale 弹性缩放
- Breathing opacity loop（2s 周期）
- AnimatePresence 平滑切换

### AiConsole 粒子
**文件**：`src/app/[lng]/ai-console/AiConsoleCore.tsx`（38-55 行）
- 30 个漂浮青色粒子
- Canvas + requestAnimationFrame 循环
- 随机速度 + 透明度 + 边界反弹

### 思考动画
- **Agent 思考**：三段品牌色光点（蓝/紫/粉）+ `thinkingGlow` 色相旋转
- **AI 助理思考**：三段灰色弹跳点 + staggered animationDelay（0s/0.15s/0.3s）

### 按钮与卡片
- 所有按钮：`transition-all duration-200` + hover `shadow-md`
- 卡片：`.card-hover` + `shadow-xl` + `-translate-y-1`（1px 深度错觉）

## 5.6 引导系统

### 4 步 Onboarding（`src/components/Onboarding/index.tsx`，483 行）
- Step 0：角色选择 + 行业选择
- Step 1：痛点诊断（5 维度）
- Step 2：AI 成熟度评估（4 级）+ 平台选择
- Step 3：摘要预览
- 完成：AI 生成升级路线图（本周/本月/3个月）

### driver.js 引导（`action.handlers.ts` 121-181 行）
- 发布流程上下文高亮
- 1500ms 延迟 + 中文文案 + 自定义按钮

---

# 第六卷：数据模型全览

## 6.1 MongoDB 主库（libs/mongodb/，28 Schema）

| Schema | 集合 | 核心字段 |
|--------|------|----------|
| `User` | user | name, mail, avatar, phone, password, salt, status, userType, inviteCode, score, usedStorage, storage, aiInfo(JSON), location, locale, placeId, libraryId |
| `Account` | account | userId, type(AccountType), uid, account, nickname, avatar, fansCount, groupId, status, tokens(JSON) |
| `AccountGroup` | accountGroup | userId, name, desc, platforms[] |
| `SubscriptionPlan` | subscriptionPlan | planId, name, price(cents), interval, maxAccounts, maxContentPerMonth, maxPlatforms, features[] |
| `UserSubscription` | userSubscription | userId, planId, status, startedAt, expiresAt, autoRenew, paymentMethod, stripeSubscriptionId, alipayTradeNo |
| `QuotaUsage` | quotaUsage | userId, action, month, count |
| `CreditsBalance` | creditsBalance | userId(unique), balance |
| `CreditsRecord` | creditsRecord | userId, amount, balance, type(11 types), description, metadata, expiredAt |
| `ContentGenerationTask` | contentGenerationTask | userId, sessionId, title, messages[], status(5), rating, publicShareToken, subAgentIds[], todos[], favoritedAt, analysis |
| `AiLog` | aiLogs | userId, type(12), model, channel(16), status(3), request, response, points, startedAt |
| `Material` | material | userId, groupId, taskId, source, brandInfo, type, title, desc, topics[], mediaList[], status, useCount, accountTypes[] |
| `MaterialGroup` | materialGroup | userId, name, desc, isDefault, platforms[] |
| `Media` | media | userId, groupId, type(VIDEO/IMG), url, thumbUrl, title, useCount, metadata |
| `MediaGroup` | mediaGroup | userId, name, type |
| `MaterialAdaptation` | materialAdaptation | userId, materialId, adapted fields |
| `MaterialTask` | materialTask | userId, task config |
| `PublishRecord` | publishRecord | userId, flowId, taskId, type, title, desc, accountId, topics[], accountType, videoUrl, publishTime, status, queueId |
| `PublishDayInfo` | publishDayInfo | date, account stats |
| `PublishInfo` | publishInfo | publishing meta |
| `PublishingTaskMeta` | publishingTaskMeta | task metadata, error data |
| `Notification` | notifications | userId, userType, title, content, type(8), status(Unread/Read), relatedId, data, channelResult |
| `UserNotificationControl` | userNotificationControl | userId, preferences |
| `OAuth2Credential` | oauth2Credential | userId, provider, accessToken, refreshToken |
| `ApiKey` | apiKey | userId, name, keyHash, lastUsedAt |
| `InteractionRecord` | interactionRecord | userId, accountId, type, data |
| `ReplyCommentRecord` | replyCommentRecord | userId, comment data |
| `PointsRecord` | pointsRecord | userId, amount, type |
| `QrCodeArtImage` | qrCodeArtImage | userId, prompt, imageUrl |
| `Asset` | assets | userId, path, type, status, size, mimeType, metadata(Image/Video/Audio) |

## 6.2 Agent Schema（apps/aitoearn-server/src/core/agent/agent.schema.ts）

| Schema | 集合 | 核心字段 |
|--------|------|----------|
| `SystemEvent` | systemEvent | userId, type(healing/insight/milestone/evolution), title, description, data(JSON), readAt, source |
| `UserContext` | userContext | userId, trackedCompetitors[], activeProjects[], recentSessions[], preferredPlatforms[], preferredStyle[], preferredFormat[] |
| `UserProfile` | userProfile | userId, industry, role, totalContentCreated, milestones[], strengths[], avoidTopics[], onboardingComplete |
| `UserBehavior` | userBehavior | userId, action, context(JSON), timestamp |

## 6.3 Agent Registry Schema（agent-registry.schema.ts）

| Schema | 集合 | 核心字段 |
|--------|------|----------|
| `AgentDefinition` | agentDefinition | name, role, description, promptTemplate, configurableParams, triggerScenes[] |
| `ComponentDefinition` | componentDefinition | name, type, description, requiredPermissions[], defaultConfig |
| `UserInstalledComponent` | userInstalledComponent | userId, componentId, enabled, customConfig |

## 6.4 Channel DB（libs/channel-db/，6 Schema）

| Schema | 核心字段 |
|--------|----------|
| `ChannelAccount` | 频道侧账号（与主库 Account 不同 DB） |
| `EngagementTask` | 互动任务（Like/Favorite/Comment/Reply），含 SubTask |
| `InteractionRecord` | 互动记录 |
| `OAuth2Credential` | 频道侧 OAuth 凭据 |
| `PostMediaContainer` | 帖子媒体容器 |
| `ReplyCommentRecord` | 回复评论记录 |

---

# 第七卷：API 接口目录（完整端点列表）

## 7.1 Agent API（aitoearn-server）

| # | 方法 | 路径 | 认证 | 描述 |
|---|------|------|:--:|------|
| 1 | GET | `/agent/greeting` | Bearer | 个性化问候（时间+系统状态+简报） |
| 2 | GET | `/agent/events` | Bearer | 未读系统事件列表 |
| 3 | GET | `/agent/context` | Bearer | 用户上下文 |
| 4 | POST | `/agent/context` | Bearer | 更新用户上下文 |
| 5 | GET | `/agent/profile` | Bearer | 用户画像 |
| 6 | POST | `/agent/behavior` | Bearer | 行为追踪 |
| 7 | GET | `/agent/evolution/report` | Bearer | 演化报告（7 天默认） |
| 8 | POST | `/agent/evolution/module-weights` | Bearer | 模块权重计算 |
| 9 | POST | `/agent/evolution/layout-check` | Bearer | 布局重排检测 |
| 10 | POST | `/agent/evolution/sync-profile` | Bearer | 强制画像同步 |
| 11 | GET | `/agent/registry/agents` | Bearer | Agent 定义列表 |
| 12 | POST | `/agent/registry/agents` | Bearer | 创建 Agent |
| 13 | PUT | `/agent/registry/agents/:id` | Bearer | 更新 Agent |
| 14 | DELETE | `/agent/registry/agents/:id` | Bearer | 删除 Agent |
| 15 | POST | `/agent/registry/agents/:id/quick-config` | Bearer | 一键配置 |
| 16 | POST | `/agent/registry/agents/reorder` | Bearer | 拖拽排序 |
| 17 | GET | `/agent/registry/components` | Bearer | 组件列表 |
| 18 | POST | `/agent/registry/components/:id/install` | Bearer | 安装组件 |
| 19 | DELETE | `/agent/registry/components/:id/uninstall` | Bearer | 卸载组件 |

## 7.2 Agent API（aitoearn-ai）

| # | 方法 | 路径 | 描述 |
|---|------|------|------|
| 1 | POST | `/agent/tasks` | 创建生成任务（SSE 流式返回） |
| 2 | GET | `/agent/tasks` | 分页任务列表 |
| 3 | GET | `/agent/tasks/:taskId` | 任务详情 |
| 4 | GET | `/agent/tasks/:taskId/messages` | 新消息轮询 |
| 5 | DELETE | `/agent/tasks/:taskId` | 软删除 |
| 6 | PATCH | `/agent/tasks/:taskId` | 更新标题 |
| 7 | POST | `/agent/tasks/:taskId/rating` | 评分 |
| 8 | POST | `/agent/tasks/:taskId/share` | 创建分享 |
| 9 | GET | `/agent/tasks/shared/:token` | 公开分享 |
| 10 | POST | `/agent/tasks/:taskId/abort` | 中断任务 |
| 11 | POST | `/agent/tasks/:taskId/favorite` | 收藏 |
| 12 | DELETE | `/agent/tasks/:taskId/favorite` | 取消收藏 |

## 7.3 业务 API（aitoearn-server）

### 订阅（Subscription）
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/user/subscription/plans` | 订阅计划列表 |
| GET | `/user/subscription` | 我的订阅状态 |
| POST | `/user/subscription/subscribe` | 订阅/升级 |
| DELETE | `/user/subscription` | 取消订阅 |

### 积分（Credits）
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/user/credits` | 积分余额 |
| GET | `/user/credits/records` | 积分记录（分页） |
| POST | `/user/credits/orders` | 创建充值订单 |
| GET | `/user/credits/orders` | 订单列表 |
| GET | `/user/credits/orders/:orderNo/status` | 订单状态 |
| POST | `/user/credits/webhook/stripe` | Stripe 回调 |

### 用户与认证
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/user/mine` | 我的信息 |
| PUT | `/user/info/update` | 更新信息 |
| POST | `/login/google` | Google 登录 |
| POST | `/login/mail` | 发送邮箱验证码 |
| POST | `/login/mail/verify` | 邮箱验证码登录 |
| POST | `/login/phone` | 发送手机验证码 |
| POST | `/login/phone/verify` | 手机验证码登录 |

### 账号管理
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/account/list/all` | 全部账号 |
| GET | `/account/:id` | 账号详情 |
| POST | `/account/update` | 更新账号 |
| POST | `/account/status` | 状态变更 |
| POST | `/account/sort` | 排序 |
| GET | `/account/group/list` | 分组列表 |
| POST | `/account/group` | 创建分组 |

### 通知
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/notification/list` | 通知列表（分页） |
| GET | `/notification/unread/count` | 未读数 |
| PUT | `/notification/read` | 标记已读 |
| PUT | `/notification/readAll` | 全部已读 |
| DELETE | `/notification` | 删除通知 |

## 7.4 Next.js API Routes（9 个）

| # | 路径 | 方法 | 描述 |
|---|------|:--:|------|
| 1 | `/api/ai/diagnosis` | POST | DeepSeek 内容诊断 |
| 2 | `/api/ai/optimize` | POST | DeepSeek 优化方案 |
| 3 | `/api/ai/summarize` | POST | DeepSeek 摘要 |
| 4 | `/api/dify/query` | POST | Dify RAG 检索 |
| 5 | `/api/dify/sync` | POST | Dify 知识库同步 |
| 6 | `/api/n8n/trigger` | POST | N8N Webhook 触发 |
| 7 | `/api/n8n/status/[id]` | GET | N8N 执行状态 |
| 8 | `/api/user/dashboard` | GET | 仪表盘聚合数据 |

---

# 第八卷：DevOps 基础设施

## 8.1 Docker 编排（17 容器）

| 服务 | 容器数 | 端口映射 | 镜像 |
|------|:--:|------|------|
| **Dify CE** | 9 | — | langgenius/dify-* |
| ├─ dify-api | 1 | 5001 | API 服务 |
| ├─ dify-worker | 1 | — | 异步 Worker |
| ├─ dify-web | 1 | 3000 | Web UI |
| ├─ dify-nginx | 1 | 8082 | 反向代理 |
| ├─ dify-redis | 1 | — | 缓存 |
| ├─ dify-db | 1 | — | PostgreSQL |
| ├─ dify-sandbox | 1 | — | 代码沙箱 |
| ├─ dify-ssrf-proxy | 1 | — | SSRF 防护 |
| └─ dify-weaviate | 1 | — | 向量数据库 |
| **AiToEarn** | 7 | — | 自建镜像 |
| ├─ aitoearn-nginx | 1 | 8080, 9000 | API 网关 + OSS |
| ├─ aitoearn-mongodb | 1 | 27017 | 主库 |
| ├─ aitoearn-redis | 1 | 6379 | 缓存 |
| ├─ aitoearn-server | 1 | 3002 | 业务 API |
| ├─ aitoearn-ai | 1 | 3010 | AI 服务 |
| ├─ aitoearn-rustfs | 1 | 9001 | 文件存储 |
| └─ aitoearn-web | 1 | 3000 | Next.js (生产) |
| **n8n** | 1 | 5678 | 自动化工作流 |

## 8.2 Nginx 路由规则

| 路径 | 后端 | 说明 |
|------|------|------|
| `/api/*` | aitoearn-server:3002 | 业务 API |
| `/api/ai/*` | aitoearn-ai:3010 | AI 服务 |
| `/api/agent/*` | aitoearn-server:3002 | Agent API（全外部可达） |
| `/oss/*` | aitoearn-rustfs:9001 | 文件存储 |
| `/` | aitoearn-web:3000 | Next.js 前端 |

## 8.3 本地环境

| 服务 | 地址 | 状态 |
|------|------|:--:|
| 前端 Dev | http://localhost:6060 | ✅ pnpm dev |
| Dify API | http://localhost:5001 | ✅ |
| Dify Web | http://localhost:8082 | ✅ |
| n8n | http://localhost:5678 | ✅ |
| API Gateway | http://localhost:8080 | ✅ |
| OSS | http://localhost:9000 | ✅ |
| 本地域名 | aibrand.local → 127.0.0.1 | ✅ hosts 配置 |

## 8.4 环境变量（已外部化）

所有密钥从 `docker-compose.yml` 提取到 `.env` 文件：
- MongoDB URI + credentials
- Redis URI
- JWT secrets
- OAuth credentials（Google/Douyin/Kwai/Bilibili/YouTube/TikTok/...）
- AI API keys（OpenAI/Anthropic/Google/Volcengine/Grok）
- Dify API keys
- n8n webhook URLs
- Stripe keys
- Mail/SMS credentials

---

# 第九卷：构建与发布

## 9.1 前端构建

```bash
# 开发
cd D:\king2046\project\aitoearn-web
pnpm dev                    # Next.js dev server, port 6060

# 生产构建
pnpm build                  # next build
pnpm start                  # next start

# 类型检查
pnpm type-check             # tsc --noEmit

# 代码质量
pnpm lint                   # eslint ./src
pnpm format                 # prettier --write .

# 测试
pnpm test                   # playwright test
```

## 9.2 后端构建

```bash
# 开发
cd D:\king2046\project\aitoearn-backend
pnpm server:serve           # nx serve aitoearn-server
pnpm ai:serve               # nx serve aitoearn-ai

# 构建
npx nx build aitoearn-server
npx nx build aitoearn-ai

# 代码质量
pnpm lint                   # nx run-many --target=lint
```

## 9.3 Docker 构建

```bash
# 完整栈启动
cd D:\king2046
docker-compose up -d

# 单独构建后端镜像
cd D:\king2046\project\aitoearn-backend
node scripts/build-docker.mjs
# 支持：multi-platform (linux/amd64, linux/arm64)
# 标签：{date}-{git-short-hash}
# 推送：registry.fly.io / registry.aitoearn.cn
```

---

# 第十卷：待建工程

## 10.1 已完成 ✅

- [x] Docker 17 容器全栈部署
- [x] Agent 感知层后端（24 API + 4 Schema + Evolution Engine）
- [x] Agent 精灵 + 组件市场（8 预置 Agent + CRUD + 组件安装）
- [x] Agent 苏醒仪式前端（575 行状态机 + Framer Motion 动画）
- [x] AI 服务集成（Dify RAG/Agent + N8N 工作流）
- [x] 品牌设计系统（OKLCH + 品牌渐变 + 暗/亮双主题）
- [x] i18n 品牌化（95 文件替换）
- [x] 订阅 + 积分计费链路
- [x] SSE 流式对话系统（TaskInstance 架构）
- [x] 4 步 Onboarding 新手引导
- [x] AiAssistantWidget 悬浮助理
- [x] 知识库种子数据（指令/案例/工作流）
- [x] 14 平台 OAuth 管理
- [x] 密钥外部化（docker-compose.yml → .env）

## 10.2 进行中 🔄

- [ ] N8N 4 工作流激活验证
- [ ] Dify RAG + N8N Webhook 端到端联调
- [ ] Agent 苏醒动画视觉定稿（Pixso + Rive）
- [ ] E2E 测试核心流程（Playwright 已配置）
- [ ] TypeScript 严格模式全量通过

## 10.3 待完成 📋

### Phase 1：智能内容工厂
- [ ] 6 步工作流前端完整 UI
- [ ] NestJS WorkflowModule 编排引擎
- [ ] GEO 引擎（AI 搜索可见性追踪）
- [ ] 内容全生命周期管理（变体生成/复用/退役）

### Phase 2：支付与安全
- [ ] Stripe 真实支付集成
- [ ] 支付宝支付集成
- [ ] 后端配额 Guard 全量验证
- [ ] CSP + Rate Limiting + 依赖审计

### Phase 3：交互深化
- [ ] Pixso 暗色视觉基调定稿
- [ ] Rive 4s 苏醒动画替换 Framer Motion
- [ ] Agent 对话语音交互
- [ ] 多模态输入（摄像头/屏幕共享）

### Phase 4：发布与运营
- [ ] CI/CD（GitHub Actions）
- [ ] 生产环境部署
- [ ] 监控告警（Prometheus + Grafana）
- [ ] 上线 Checklist

## 10.4 技术债务

| 项目 | 优先级 | 说明 |
|------|:--:|------|
| TypeScript 严格模式 | 高 | 当前有 `as any` 的临时方案 |
| 测试覆盖率 | 高 | 目标 80%，当前偏低 |
| 错误处理统一 | 中 | SSE 错误传播链路需加强 |
| 日志系统 | 中 | 生产级结构化日志 |
| 性能优化 | 中 | 大列表虚拟滚动、图片懒加载 |
| 无障碍 | 低 | ARIA 标签、键盘导航 |

---

# 附录：关键数字

| 指标 | 数值 |
|------|------|
| 总提交数 | 17 |
| 前端文件数 | 865 |
| 后端文件数 | 530+ |
| Docker 容器 | 17 |
| Agent API 端点 | 24 |
| 业务 API 端点 | 30+ |
| Next.js API Routes | 9 |
| MongoDB 主库 Schema | 28 |
| Agent Schema | 7 |
| Channel DB Schema | 6 |
| Zustand Store | 10 |
| 通用 Hooks | 10 |
| i18n 命名空间 | 23 |
| 支持平台 | 14 |
| 平台 OAuth Provider | 14 |
| BullMQ 队列 | 11 |
| AI Provider | 5（OpenAI/Gemini/Grok/Anthropic/Volcengine） |
| MCP 工具 | 16 |
| Skill 目录 | 13 |
| 预置 Agent | 8 |
| 内置组件 | 4 |
| 品牌渐变 Token | 5 |
| 动画关键帧定义 | 10+ |
| OKLCH 色彩变量 | 50+ |

---

> **施工图编制完成。**  
> 本文档所有文件路径、行数、API 端点、Schema 字段、设计 Token、动画参数  
> 均来自 AiBrand MVP 实际代码库 (`D:\king2046\project/`)。
>
> 保存位置：  
> `D:\king2046\docs\AiBrand-产品施工图-完整蓝图.md`  
> `C:\Users\XIAOMI\Desktop\AiBrand-产品施工图-完整蓝图.md`
