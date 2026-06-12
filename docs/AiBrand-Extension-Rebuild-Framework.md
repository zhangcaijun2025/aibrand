# AiBrand 一键多发插件 — 重构技术框架

> **文档版本**: v1.0  
> **日期**: 2026-06-08  
> **状态**: 待审核 (_Awaiting Review_)

---

## 目录

1. [现状分析与问题诊断](#1-现状分析与问题诊断)
2. [架构愿景](#2-架构愿景)
3. [系统架构设计](#3-系统架构设计)
4. [核心技术选型](#4-核心技术选型)
5. [模块详细设计](#5-模块详细设计)
6. [数据流与协议](#6-数据流与协议)
7. [与 AI 平台集成](#7-与-ai-平台集成)
8. [安全设计](#8-安全设计)
9. [实施路线图](#9-实施路线图)
10. [风险与缓解](#10-风险与缓解)

---

## 1. 现状分析与问题诊断

### 1.1 当前架构速览

当前 Extension 基于 **MultiPost 开源项目** fork 而来（约 130+ 源文件），采用 Plasmo 框架构建。架构如下：

```
┌─ Chrome Extension (Plasmo / React) ──────────────────────┐
│                                                            │
│  ┌─ Background SW ──────────────────────────────────────┐ │
│  │  • 30s 轮询 Ping → Next.js BFF                       │ │
│  │  • 消息路由 (MULTIPOST_ / AIBRAND_ 双前缀)           │ │
│  │  • Tab 管理 · 保活机制                                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Content Scripts (extension.ts / scraper.ts) ─────────┐ │
│  │  • window.postMessage ↔ chrome.runtime 桥接           │ │
│  │  • 平台页面 DOM 抓取 / 内容注入                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Sync Modules (50+ 平台文件) ────────────────────────┐ │
│  │  • article/ · dynamic/ · video/ · podcast/ 分类       │ │
│  │  • 每个平台一个硬编码 DOM 注入函数                      │ │
│  │  • account/ 平台登录态检测                              │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ UI Pages ───────────────────────────────────────────┐ │
│  │  • popup (主入口) · sidepanel (Tab 管理)               │ │
│  │  • options (设置) · tabs/ (publish / link-ext / ...)  │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
         │  HTTP Poll (30s)
         ▼
┌─ Next.js BFF (:3099) ──────────────────────────────────────┐
│  /api/extension/ping     ← Extension 注册 + 任务派发        │
│  /api/publish/tasks/*    ← 任务 CRUD + 进度                 │
│  /api/agents/* · /api/workflows/* · /api/geo/* · ...        │
└────────────────────────────────────────────────────────────┘
         │  Proxy (auth-required)
         ▼
┌─ NestJS Backend (:8080 Docker) ────────────────────────────┐
│  Login · Account · Channel · Publish · Content · Workflow   │
│  Agent · AI · Credits · Dashboard · ...                     │
└────────────────────────────────────────────────────────────┘
```

### 1.2 核心问题清单

| # | 严重级别 | 问题 | 影响 |
|---|---------|------|------|
| 1 | **CRITICAL** | **身份分裂** — MultiPost fork，双品牌前缀混用 (MULTIPOST_ / AIBRAND_)，UI 残留 MultiPost 品牌 | 维护混乱，用户体验不统一 |
| 2 | **CRITICAL** | **Token 存储分裂** — `apiKey` (ping用) vs `aibrand_token` (API调用)，两个 key 互不同步 | SET_TOKEN 消息无法激活自动 Ping |
| 3 | **CRITICAL** | **脆弱的 DOM 注入** — 50+ 平台各自硬编码 CSS 选择器，平台 UI 变更 = 全盘失效 | 发布成功率随平台迭代下降 |
| 4 | **HIGH** | **无推送通道** — 仅 30s 轮询，无 WebSocket/SSE，任务延迟 0-30s | 用户体验差 |
| 5 | **HIGH** | **任务队列内存存储** — Next.js BFF 的任务队列在内存中，重启丢失 | 数据丢失风险 |
| 6 | **HIGH** | **离线不工作** — 无离线队列，发布失败无重试，错误只 console.log | 可靠性问题 |
| 7 | **HIGH** | **构建流程脆弱** — post-build sed 改 URL，NODE_ENV 硬编码，无 CI/CD | 部署成本高 |
| 8 | **MEDIUM** | **无质量门禁** — 内容直接发布，经过 AI 工作流但不经过质检 | 低质量内容上线 |
| 9 | **MEDIUM** | **零遥测** — 无发布成功率统计、无错误聚合、无性能监控 | 运维盲区 |
| 10 | **MEDIUM** | **UI 陈旧** — 使用 HeroUI (NextUI 前身)，缺乏 AiBrand 品牌设计 | 品牌感知弱 |

### 1.3 技术债务量化

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| 源文件数 | ~130 | ~40-50 (精简 + 合并) |
| 平台接入方式 | 硬编码 selector 每平台 | API/配置驱动 |
| 通信协议 | HTTP Poll (30s) | WebSocket + HTTP fallback |
| 任务持久化 | 内存 (重启丢失) | Redis/MongoDB 持久化 |
| 离线支持 | 无 | 本地队列 + 自动重试 |
| 错误处理 | console.log | 结构化遥测 + 告警 |
| 品牌一致性 | MultiPost 残留 | 100% AiBrand |

---

## 2. 架构愿景

### 2.1 设计原则

1. **AI Native First** — Extension 是 AI 平台的"手"，不是独立工具。所有能力由后端 AI Agent 驱动。
2. **Platform-as-Config** — 平台接入通过配置驱动，不再硬编码。平台变更 = 更新配置，不需要发版。
3. **Resilience by Default** — 离线队列、自动重试、优雅降级。发布可靠性 > 99%。
4. **Observable Everything** — 每一步发布操作上报遥测。运营可见，问题可追溯。
5. **Clean AiBrand Branding** — 完全消除 MultiPost 痕迹，统一 AiBrand 设计语言。

### 2.2 Extension 定位转变

```
旧定位: Extension = 独立发布工具 (用户手动操作)
新定位: Extension = AI 平台的执行终端 (Agent 驱动，用户监督)

旧流程: Web → 创建任务 → Extension 30s 后收到 → 打开平台 Tab → 填表单 → 发布
新流程: Web → Agent 编排 → WebSocket 实时推送 → Extension 执行 → 实时反馈 → Agent 确认
```

---

## 3. 系统架构设计

### 3.1 整体架构

```
                            ┌── AiBrand Cloud ──────────────────────┐
                            │                                        │
                            │  ┌─ Agent Orchestrator ────────────┐  │
                            │  │  11 Agents → 任务编排 + 质检     │  │
                            │  └─────────────────────────────────┘  │
                            │                                        │
                            │  ┌─ Content Factory (n8n/Dify) ────┐  │
                            │  │  选题→创作→GEO→审核→发布           │  │
                            │  └─────────────────────────────────┘  │
                            │                    │                   │
                            │  ┌─ API Gateway ───────────────────┐  │
                            │  │  NestJS + Next.js BFF            │  │
                            │  │  • REST + WebSocket              │  │
                            │  │  • Task Queue (Redis/BullMQ)     │  │
                            │  │  • Platform Config Service       │  │
                            │  └───────────┬─────────────────────┘  │
                            └──────────────┼────────────────────────┘
                                           │
                              🔗 WebSocket (wss://)
                              🔄 HTTP/2 Fallback
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │          AiBrand Chrome Extension v3.0                  │
              │                                                         │
              │  ┌─ Core ───────────────────────────────────────────┐  │
              │  │  • WebSocket Manager (reconnect, heartbeat)       │  │
              │  │  • Auth Service (JWT refresh, secure storage)     │  │
              │  │  • Task Executor (queue, retry, priority)         │  │
              │  │  • Offline Queue (IndexedDB)                      │  │
              │  │  • Telemetry Reporter                             │  │
              │  └──────────────────────────────────────────────────┘  │
              │                                                         │
              │  ┌─ Platform Engine ─────────────────────────────────┐  │
              │  │  • Platform Registry (config-driven)              │  │
              │  │  • Smart Injector (AI-assisted DOM targeting)     │  │
              │  │  • CAPTCHA Handler (delegate to user)             │  │
              │  │  • Media Upload Pipeline                          │  │
              │  └──────────────────────────────────────────────────┘  │
              │                                                         │
              │  ┌─ UI Shell ───────────────────────────────────────┐  │
              │  │  • Side Panel (主操作界面)                         │  │
              │  │  • Popup (快速状态)                                │  │
              │  │  • Toast Notifications (任务通知)                  │  │
              │  └──────────────────────────────────────────────────┘  │
              └─────────────────────────────────────────────────────────┘
```

### 3.2 技术栈

| 层 | 技术 | 理由 |
|----|------|------|
| Extension 框架 | **WXT** (替代 Plasmo) | 更轻量、TypeScript 原生、更好的 HMR、Vite 生态 |
| UI 框架 | **React 18 + Tailwind CSS 4** | 与主站一致，设计 Token 共享 |
| 状态管理 | **Zustand** | 轻量、无 boilerplate、与主站一致 |
| 实时通信 | **WebSocket (ws) + Auto-reconnect** | 推送任务、实时进度、双向通信 |
| 离线存储 | **IndexedDB (idb-keyval)** | 任务队列持久化、失败重试 |
| 安全存储 | **chrome.storage.session** (token) | 敏感数据不落 disk |
| 测试 | **Vitest + Playwright** | 单元 + E2E |
| 构建 | **WXT + GitHub Actions CI** | 自动构建、签名、发布 |

---

## 4. 核心技术选型论证

### 4.1 为什么放弃 Plasmo → WXT

| 对比维度 | Plasmo (当前) | WXT (推荐) |
|----------|---------------|------------|
| 构建速度 | 慢 (Webpack 变体) | 快 (Vite 原生) |
| HMR | 不稳定 | 优秀 |
| TypeScript | 部分支持 (有坑) | 一等公民 |
| 配置复杂度 | 中 | 低 (wxt.config.ts) |
| 社区维护 | plasmo 作者活跃但小团队 | WXT 社区更大，文档更好 |
| Manifest V3 | 支持 | 完善支持 |
| 多入口 | 约定式 (容易踩坑) | 显式配置 (清晰) |
| Content Script | 约定式路径 | 显式 registerContentScript |

### 4.2 为什么 WebSocket 而非轮询

| 对比维度 | 轮询 30s (当前) | WebSocket (推荐) |
|----------|-----------------|-------------------|
| 延迟 | 0-30s | < 100ms |
| 带宽 | 每次 ~500B × N 客户端 | 仅心跳 1B/s |
| 服务端负载 | O(N × poll_rate) | O(N × heartbeat) |
| 离线检测 | 需额外机制 | WebSocket close → 立即感知 |
| 双向通信 | 需额外 API 调用 | 原生支持 |
| 实现复杂度 | 低 | 中 (有成熟库) |

### 4.3 为什么 IndexedDB 离线队列

- Chrome Extension 的 `chrome.storage.local` 有 10MB 限制（Manifest V3 对 service worker 更严格）
- IndexedDB 无大小限制，支持索引查询，适合任务队列
- `idb-keyval` 提供简洁的 Promise API
- 离线任务在上线后自动重试，带指数退避

---

## 5. 模块详细设计

### 5.1 Core Module — `@aibrand/extension-core`

```
src/
├── core/
│   ├── websocket.ts        # WebSocket 连接管理 (reconnect, heartbeat, auth)
│   ├── auth.ts             # JWT 管理 (refresh, secure storage, expiry check)
│   ├── task-executor.ts    # 任务执行引擎 (queue, dequeue, execute, retry)
│   ├── offline-queue.ts    # IndexedDB 离线队列 (enqueue, flush, dedup)
│   ├── telemetry.ts        # 遥测上报 (event, error, perf)
│   └── config.ts           # 动态配置拉取 (platform config, feature flags)
│
├── platforms/
│   ├── registry.ts         # 平台注册表 (从 API 拉取配置)
│   ├── injector.ts         # 智能注入引擎 (AI-assisted targeting)
│   ├── uploader.ts         # 媒体上传管线 (分片、断点续传)
│   └── captcha.ts          # 验证码处理 (委托用户交互)
│
├── ui/
│   ├── sidepanel/          # 主操作面板 (任务列表、平台状态、发布进度)
│   ├── popup/              # 快速操作弹窗 (一键发布、状态摘要)
│   ├── components/         # 共享 UI 组件 (品牌设计系统)
│   └── hooks/              # useWebSocket, useTask, usePlatforms
│
├── entrypoints/
│   ├── background.ts       # Service Worker 入口
│   ├── content.ts          # Content Script (postMessage bridge)
│   ├── sidepanel.html      # 侧边栏
│   └── popup.html          # 弹窗
│
└── shared/
    ├── types.ts            # 共享类型定义
    ├── constants.ts        # 常量
    └── utils.ts            # 工具函数
```

### 5.2 WebSocket 协议设计

```typescript
// ─── Client → Server ───

// 注册 (首次连接)
{ type: "REGISTER", payload: {
    extensionVersion: "3.0.0",
    clientId: "uuid",
    platformCapabilities: ["weibo", "douyin", "xhs", ...]
}}

// 心跳
{ type: "PING", payload: { ts: 1700000000000 } }

// 任务进度上报
{ type: "TASK_PROGRESS", payload: {
    taskId: "task_xxx",
    platform: "weibo",
    status: "uploading" | "publishing" | "completed" | "error",
    progress: 0-100,
    message?: "上传中...",
    resultUrl?: "https://..."
}}

// 任务完成
{ type: "TASK_COMPLETE", payload: {
    taskId: "task_xxx",
    results: [{ platform: "weibo", success: true, url: "..." }]
}}

// ─── Server → Client ───

// 注册确认
{ type: "REGISTERED", payload: { clientId: "uuid", serverTime: "..." } }

// 心跳响应
{ type: "PONG", payload: { ts: 1700000000000 } }

// 新任务派发 (实时推送!)
{ type: "NEW_TASK", payload: {
    taskId: "task_xxx",
    priority: "normal" | "high",
    platforms: ["weibo", "douyin"],
    content: {
      type: "article" | "dynamic" | "video",
      title: "...",
      content: "...",
      media: [{ url: "...", type: "image" }],
      tags: ["..."],
    },
    config: {
      scheduledTime?: number,
      autoPublish: boolean,
      requireConfirmation: boolean,  // ← 高价值内容需人工确认
    }
}}

// 平台配置更新
{ type: "CONFIG_UPDATE", payload: { platforms: {...} } }

// 指令
{ type: "COMMAND", payload: {
    command: "SYNC_ACCOUNTS" | "REFRESH_PLATFORMS" | "CANCEL_TASK",
    data?: any
}}
```

### 5.3 Task Executor 设计

```typescript
interface TaskExecutor {
  // 入队任务 (来自 WebSocket NEW_TASK)
  enqueue(task: PublishTask): Promise<void>

  // 执行任务 (按平台并行)
  execute(taskId: string): Promise<TaskResult>

  // 单平台发布流程
  publishToPlatform(platform: string, task: PublishTask): Promise<PlatformResult> {
    // 1. 打开平台发布页 (或复用已有 Tab)
    // 2. 等待页面加载
    // 3. 智能注入内容 (AI-assisted targeting)
    // 4. 处理媒体文件上传
    // 5. 检测验证码 (如有 → 通知用户)
    // 6. 提交发布
    // 7. 检测发布结果 (抓取成功标识)
    // 8. 上报进度
  }

  // 重试策略
  retry(taskId: string, platform: string): Promise<PlatformResult> {
    // 指数退避: 1s → 2s → 4s → 8s → 30s → 1min → 5min
    // 最多 7 次重试
    // 不可重试错误 (账号被封、内容违规) → 直接标记失败
  }
}
```

### 5.4 平台配置驱动模型

每个平台的发布行为由服务器下发的 JSON 配置定义，不再硬编码：

```typescript
interface PlatformConfig {
  id: string                    // "weibo"
  name: string                  // "微博"
  type: "article" | "dynamic" | "video"
  icon: string                  // iconify icon

  // 页面路由
  publishUrl: string            // "https://weibo.com/.../publish"
  loginUrl: string              // "https://weibo.com/login"

  // 发布流程步骤
  pipeline: PipelineStep[]

  // AI 辅助注入配置
  aiInjection: {
    enabled: boolean
    prompt: string              // System prompt for the AI selector model
    fallbackSelectors: Record<string, string[]>  // 兜底 CSS selectors
  }

  // 媒体限制
  mediaConstraints: {
    images: { max: number; formats: string[]; maxSize: number }
    videos: { max: number; formats: string[]; maxDuration: number }
  }

  // 内容限制
  contentConstraints: {
    titleMaxLength: number
    contentMaxLength: number
    hashtagMaxCount: number
    supportedFeatures: string[]  // ["schedule", "thread", "poll", ...]
  }

  // 登录态检测
  loginDetection: {
    cookieName?: string
    apiCheck?: string
    domIndicator?: { selector: string; text: string }
  }
}

interface PipelineStep {
  id: string                    // "fill_title"
  type: "input" | "upload" | "click" | "wait" | "select" | "custom"
  target: {
    selector?: string
    aiHint?: string             // "标题输入框，位于页面顶部，placeholder 为'请输入标题'"
    xpath?: string
  }
  value?: string | { template: string }  // 模板变量: "{{title}}"
  waitAfter?: number            // 操作后等待 ms
  optional?: boolean            // 失败不阻塞流程
}
```

> **关键创新**：`aiHint` 字段允许平台配置不给出精确 CSS 选择器，而是给出自然语言描述。Extension 端的小型 AI 模型（或调用后端）根据描述和当前 DOM 自动找到正确的元素。这解决了平台 UI 频繁变更的问题。

### 5.5 Auth 模块设计

```typescript
// 统一 Token 管理 — 解决当前 apiKey vs aibrand_token 分裂问题
interface AuthService {
  // 统一存储 key
  readonly TOKEN_KEY = "aibrand_auth_token"

  // 设置 token (同时写入 chrome.storage.session + 内存)
  setToken(token: string): Promise<void>

  // 获取 token (自动检查过期)
  getToken(): Promise<string | null>

  // 自动刷新
  refreshToken(): Promise<string>

  // 监听 Web App 发送的 SET_TOKEN 消息
  onExternalToken(token: string): Promise<void>

  // 登出
  clear(): Promise<void>
}
```

---

## 6. 数据流与协议

### 6.1 实时发布流程

```
  Web App                BFF/API               Extension            Platform
    │                       │                      │                    │
    │  1. 用户点"发布"      │                      │                    │
    │──────────────────────▶│                      │                    │
    │                       │                      │                    │
    │                       │  2. WebSocket PUSH   │                    │
    │                       │  NEW_TASK ──────────▶│                    │
    │                       │                      │                    │
    │                       │                      │  3. 打开平台发布页  │
    │                       │                      │───────────────────▶│
    │                       │                      │                    │
    │                       │                      │  4. AI 智能注入内容 │
    │                       │                      │───────────────────▶│
    │                       │                      │                    │
    │                       │  5. TASK_PROGRESS    │                    │
    │                       │◀─────────────────────│  "uploading 50%"   │
    │                       │                      │                    │
    │  6. 实时进度更新      │                      │                    │
    │◀──────────────────────│                      │                    │
    │                       │                      │                    │
    │                       │                      │  7. 平台返回成功    │
    │                       │                      │◀───────────────────│
    │                       │                      │                    │
    │                       │  8. TASK_COMPLETE    │                    │
    │                       │◀─────────────────────│  {weibo: "ok"}     │
    │                       │                      │                    │
    │  9. 发布结果通知      │                      │                    │
    │◀──────────────────────│                      │                    │
```

### 6.2 离线场景

```
  用户离线 (无网络)
  │
  ├─ Extension 收到 NEW_TASK
  ├─ 检查网络 → 离线
  ├─ 写入 IndexedDB 离线队列
  ├─ 注册 chrome.alarms (定期检查)
  │
  ... (网络恢复)
  │
  ├─ chrome.alarms 触发
  ├─ WebSocket 重新连接
  ├─ 刷新 Auth Token
  ├─ 从 IndexedDB 读取待发布任务
  ├─ 检查任务时效性 (过期任务通知用户)
  └─ 执行发布
```

---

## 7. 与 AI 平台集成

### 7.1 Agent ↔ Extension 交互模型

Extension 是 AI Agent 的"手"，Agent 通过它执行平台操作：

```
  ┌─ Agent 层 ───────────────────────────────────┐
  │                                                │
  │  发布管家 (Agent Publish)                       │
  │  ├─ 接收内容工厂输出                            │
  │  ├─ 质量总监评分 ≥ 80 → 自动发布               │
  │  ├─ 评分 < 80 → 人工审核                       │
  │  ├─ 智能排期 (平台活跃时段)                    │
  │  └─ 创建 Task → 发送到 Extension               │
  │                                                │
  │  GEO 优化师 (Agent GEO)                        │
  │  ├─ 发布前: 内容 AI 友好度评分                 │
  │  ├─ 关键词优化建议                             │
  │  └─ 发布后: 效果追踪，反馈到下一次优化         │
  │                                                │
  │  数据洞察师 (Agent Data)                       │
  │  ├─ 发布后: 各平台数据回收                     │
  │  ├─ 趋势分析                                   │
  │  └─ 反馈给内容工厂 (持续优化闭环)              │
  │                                                │
  │  智能客服 (Agent Customer)                     │
  │  ├─ Extension 检测新评论/私信                  │
  │  ├─ Agent 分析 + 生成回复                      │
  │  └─ Extension 自动回复 (或人工审核后回复)      │
  └────────────────────────────────────────────────┘
```

### 7.2 质量门禁流程

```
  内容创作完成
       │
       ▼
  ┌──────────────┐
  │ GEO 评分     │ ← GEO 优化师
  │  < 70 分?    │──── 退回优化
  └──────┬───────┘
       │ ≥ 70
       ▼
  ┌──────────────┐
  │ 质量总监审核  │ ← 质量总监 Agent
  │  < 80 分?    │──── 人工审核
  └──────┬───────┘
       │ ≥ 80
       ▼
  ┌──────────────┐
  │ 平台适配检查  │ ← 发布管家 Agent
  │  格式/长度    │
  └──────┬───────┘
       │ ✓
       ▼
  ┌──────────────┐
  │ Extension     │
  │ 自动发布      │
  └──────────────┘
```

---

## 8. 安全设计

### 8.1 Token 管理

- JWT Token **仅存储在 `chrome.storage.session`**（内存级，不落磁盘）
- Extension 重启后通过 Web App 自动重新注入
- Token 过期前 5 分钟自动刷新
- 登出时彻底清除所有存储

### 8.2 通信安全

- WebSocket 使用 `wss://`（生产环境）
- 每条消息带 JWT 签名（Authorization header）
- 消息防重放（timestamp + nonce）

### 8.3 权限最小化

```json
{
  "permissions": [
    "storage",        // 配置存储
    "sidePanel",      // 主 UI
    "tabs",           // 平台页面操作
    "scripting",      // 内容注入
    "alarms"          // 离线重试定时器
  ],
  "host_permissions": [
    "https://aibrand.local/*",
    "https://*.aibrand.com/*",
    "http://localhost:*/*"
  ]
}
```

不再需要 `<all_urls>` — 只在 AI 指定的平台页面上注入。

---

## 9. 实施路线图

### Phase 1: 核心通信层 (Week 1-2)

| 任务 | 产出 | 人天 |
|------|------|------|
| WXT 项目脚手架 + Tailwind 配置 | 项目骨架 | 1 |
| WebSocket Manager (reconnect/heartbeat/auth) | ws.ts | 2 |
| Auth Service (统一 Token 管理) | auth.ts | 1 |
| 消息协议实现 (全部 message types) | protocol.ts | 1 |
| Backend WebSocket Server (NestJS Gateway) | ws.gateway.ts | 2 |
| 端到端连通测试 | E2E test | 1 |
| **小计** | | **8** |

### Phase 2: 任务执行引擎 (Week 2-3)

| 任务 | 产出 | 人天 |
|------|------|------|
| Task Executor (queue/execute/retry) | task-executor.ts | 2 |
| Offline Queue (IndexedDB) | offline-queue.ts | 1 |
| Platform Registry + Config Service | registry.ts + backend API | 2 |
| Smart Injector (AI-assisted DOM targeting v1) | injector.ts | 3 |
| Media Upload Pipeline | uploader.ts | 2 |
| **小计** | | **10** |

### Phase 3: UI Shell (Week 3-4)

| 任务 | 产出 | 人天 |
|------|------|------|
| AiBrand Design System (Token + Components) | ui/components/ | 2 |
| Side Panel (任务列表 + 平台状态 + 进度) | sidepanel/ | 3 |
| Popup (快速状态 + 一键操作) | popup/ | 1 |
| Toast Notifications | notifications/ | 1 |
| Options Page (设置) | options/ | 1 |
| **小计** | | **8** |

### Phase 4: 平台迁移 + AI 集成 (Week 4-5)

| 任务 | 产出 | 人天 |
|------|------|------|
| 迁移 5 个核心平台到新架构 (weibo/douyin/xhs/bilibili/zhihu) | 5 platform configs | 5 |
| Remote Config API (平台配置热更新) | backend API | 1 |
| Quality Gate 集成 (Agent → Extension) | integration | 2 |
| Agent Publish 指令打通 | integration | 2 |
| 旧扩展功能对标 (确保不降级) | diff checklist | 1 |
| **小计** | | **11** |

### Phase 5: 质量 + 发布 (Week 5-6)

| 任务 | 产出 | 人天 |
|------|------|------|
| 单元测试 (core + platforms) | vitest | 2 |
| E2E 测试 (Playwright + Chrome Extension) | playwright | 3 |
| 遥测 Dashboard | backend + Grafana | 1 |
| 错误监控 + 告警 | Sentry/自建 | 1 |
| Chrome Web Store 上架 | store listing | 1 |
| 文档: 用户手册 + 平台接入指南 | docs | 1 |
| **小计** | | **9** |

> **总人天估算**: 46 人天 ≈ **6 周** (单人) 或 **3 周** (2人并行)

---

## 10. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 平台 UI 变更导致注入失败 | 高 | 中 | AI-assisted targeting + fallback selectors + 配置热更新 |
| WebSocket 连接不稳定的网络环境 | 中 | 高 | HTTP/2 fallback + 离线队列 + 指数退避重连 |
| Chrome Web Store 审核延迟/拒审 | 中 | 中 | 提前提交、最小权限、合规文档 |
| 平台反爬/反自动化检测 | 中 | 高 | 行为拟人化、操作间隔随机化、验证码委托 |
| WXT 框架成熟度不如 Plasmo | 低 | 中 | Phase 1 验证可行性后决定是否回退 |
| 旧用户迁移兼容 | 中 | 低 | 保持 API 兼容、渐进式迁移 |

---

## 附录 A: 与当前系统对比

| 维度 | 当前 (v2.0 fork) | 新架构 (v3.0 native) |
|------|-------------------|----------------------|
| 代码来源 | MultiPost fork | 全自研 |
| 品牌 | MultiPost + AiBrand 混用 | 100% AiBrand |
| 通信 | HTTP 轮询 (30s) | WebSocket 实时推送 |
| 平台接入 | 硬编码 selector × 50+ 文件 | 配置驱动 + AI-assisted |
| 离线 | 不支持 | IndexedDB 队列 + 自动重试 |
| 质量门禁 | 无 | Agent 评分 → 门禁 → 发布 |
| 遥测 | 无 | 全链路结构化遥测 |
| 源文件 | ~130+ | ~40-50 |
| 设计系统 | HeroUI 默认 | AiBrand 品牌设计系统 |
| Token 管理 | apiKey / aibrand_token 分裂 | 统一 Token 管理 |
| 构建 | Plasmo + post-build sed | WXT + CI/CD |
| 测试 | 无 | 单元 + E2E ≥ 80% |

---

## 附录 B: 目录结构总览

```
aibrand-extension-v3/
├── wxt.config.ts                 # WXT 配置
├── tailwind.config.ts            # Tailwind + AiBrand Design Tokens
├── tsconfig.json
├── package.json
├── README.md
│
├── src/
│   ├── entrypoints/
│   │   ├── background.ts         # Service Worker
│   │   ├── content.ts            # Content Script Bridge
│   │   ├── sidepanel/            # 侧边栏主 UI
│   │   │   ├── index.html
│   │   │   ├── App.tsx
│   │   │   └── style.css
│   │   └── popup/                # 弹窗快速操作
│   │       ├── index.html
│   │       ├── App.tsx
│   │       └── style.css
│   │
│   ├── core/
│   │   ├── websocket.ts          # WebSocket 管理
│   │   ├── auth.ts               # 统一认证
│   │   ├── task-executor.ts      # 任务执行引擎
│   │   ├── offline-queue.ts      # 离线队列
│   │   ├── telemetry.ts          # 遥测
│   │   └── config.ts             # 动态配置
│   │
│   ├── platforms/
│   │   ├── registry.ts           # 平台注册表
│   │   ├── injector.ts           # 智能注入引擎
│   │   ├── uploader.ts           # 媒体上传
│   │   └── captcha.ts            # 验证码处理
│   │
│   ├── ui/
│   │   ├── components/           # 品牌 UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── PlatformBadge.tsx
│   │   │   └── Notification.tsx
│   │   └── hooks/
│   │       ├── useWebSocket.ts
│   │       ├── useTask.ts
│   │       └── usePlatforms.ts
│   │
│   └── shared/
│       ├── types.ts
│       ├── constants.ts
│       └── utils.ts
│
├── tests/
│   ├── unit/
│   │   ├── core/
│   │   └── platforms/
│   └── e2e/
│       ├── publish-flow.spec.ts
│       └── offline.spec.ts
│
└── scripts/
    ├── build.sh
    └── release.sh
```

---

> **审核要点** (请重点确认):
>
> 1. **WXT vs Plasmo** — 接受 WXT 作为新框架吗？还是坚持 Plasmo？
> 2. **WebSocket vs 轮询** — 后端 WebSocket Gateway 是否可投入？
> 3. **平台配置驱动** — 50+ 平台是否全部迁移，还是优先 Top 10？
> 4. **AI-assisted DOM targeting** — 这个创新方案是否认可？（需要一个小型视觉模型支持）
> 5. **Phase 拆分** — 6周计划是否合理？是否有优先级调整？
> 6. **团队配置** — 谁来开发？前端/后端如何分工？

---

*AiBrand Extension v3.0 — AI Native Multi-Platform Publishing Terminal*
