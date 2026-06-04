# AiBrand 前端重构方案 v1.0 — 待审核

> 现状：现有前端是"内容发布工具"，我们建的是"AI 编排平台"。两者产品定位完全不同。

---

## 一、现状深度诊断

### 1.1 现有前端能力矩阵

| 页面 | HTTP | 实际功能 | 能否展示AI能力 | 建议 |
|------|:--:|------|:--:|:--:|
| `/welcome` | 200 | SaaS落地页(Hero+Features+Reviews) | ❌ 纯营销 | 保留(作为对外展示) |
| `/dashboard` | 200 | 通用数据看板 | ❌ 无AI指标 | 替换 |
| `/pricing` | 200 | 订阅定价 | ⚠️ 可对接 | 保留+改造 |
| `/auth` | 200 | 登录注册 | - | 保留 |
| `/accounts` | 200 | 平台账号管理 | - | 保留 |
| `/chat` | 200 | AI对话式创作 | ⚠️ 仅对话 | 纳入Agent面板 |
| `/draft-box` | 200 | 内容草稿 | ❌ 无AI | 降级为工具 |
| `/admin` | 200 | 仪表板(我们新加) | ⚠️ 静态 | 替换 |
| `/ai-console` | 404 | 刚创建未生效 | 🆕 | **核心新页面** |

### 1.2 能力-展示 Gap 分析

```
我们已经建成的后端能力:
  ✅ Subscription API     → 前端: ❌ 没有任何订阅状态UI
  ✅ QuotaGuard            → 前端: ❌ 没有配额使用可视化
  ✅ AiServicesModule      → 前端: ❌ 没有Dify/n8n状态
  ✅ 4个n8n AI工作流       → 前端: ❌ 没有工作流触发入口
  ✅ LangChain Agent + 评测 → 前端: ❌ 没有Agent对话面板
  ✅ Evolution Engine      → 前端: ❌ 没有自愈/进化界面
  ✅ 自适应 Skill 生成     → 前端: ❌ 没有Skill管理
  ✅ Health Dashboard      → 前端: ❌ 没有系统健康监控
  ✅ 统一消息 Schema       → 前端: ❌ 没有任务追踪
  ✅ 五层架构              → 前端: ❌ 没有任何可视化

结论: 后端95%的能力在前端为0%可见 → 必须重构
```

---

## 二、三条路径对比

| 维度 | A: 改造现有 | B: 完全自研 | **C: 混合策略(推荐)** |
|------|:--:|:--:|:--:|
| **开发周期** | 1-2周 | 4-6周 | **2-3周** |
| **风险** | 高(技术债务) | 低 | **中** |
| **UX一致性** | 差(新旧混杂) | 好 | **好(新模块统一)** |
| **维护成本** | 高 | 低 | **中** |
| **AiToEarn耦合** | 强 | 无 | **弱(逐步解除)** |
| **团队学习成本** | 低 | 高 | **中** |
| **推荐场景** | 快速原型 | 正式产品 | **MVP→产品过渡期** |

---

## 三、推荐方案：C 混合策略

### 3.1 模块分类

```
保留(不改):          改造(加AI入口):      新建(AI原生):
  /auth                /pricing              /ai-console (核心)
  /accounts            /chat                 /ai-workflows
                       /draft-box            /ai-evolution
                                             /ai-knowledge
```

### 3.2 新建模块详细设计

#### 模块 1: `/ai-console` — AI 控制台首页 (P0)

```
┌──────────────────────────────────────────────────────────┐
│  🤖 AiBrand AI Console              🟢 全部系统正常      │
│──────────────────────────────────────────────────────────│
│  ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ 进化指数    │ │ 自愈状态 │ │ Agent调用│ │ 今日任务│ │
│  │   87/100    │ │ 5剧本就绪│ │  23次    │ │  3个    │ │
│  │  ↑ +3 本周  │ │ 0故障    │ │ 成功率95%│ │  待处理 │ │
│  └─────────────┘ └──────────┘ └──────────┘ └─────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  🧠 Agent 对话 (LangChain :4010)                 │    │
│  │  ┌────────────────────────────────────────────┐ │    │
│  │  │ [user] 分析AI客服竞品                       │ │    │
│  │  │ [tool] 🔧 search_knowledge_base            │ │    │
│  │  │ [tool] 🔧 generate_content                 │ │    │
│  │  │ [agent] 竞品分析报告已生成，包含... 📊      │ │    │
│  │  └────────────────────────────────────────────┘ │    │
│  │  ┌────────────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │ 输入任务...     │ │ 发送 →  │ │ 🎤 语音  │  │    │
│  │  └────────────────┘ └──────────┘ └──────────┘  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────┐ ┌────────────────────────────┐  │
│  │ 五层健康           │ │ 工作流快捷入口              │  │
│  │ L5 OpenClaw  🟢   │ │ 🔍 竞品分析    [执行]      │  │
│  │ L4 Dify      🟢   │ │ 🔥 热搜追踪     [执行]     │  │
│  │ L3 LangChain 🟢   │ │ 📊 发布追踪     [执行]     │  │
│  │ L2 n8n       🟢   │ │ 💚 账号健康     [执行]     │  │
│  │ L1 Claude    🟢   │ │ 🛡️ 自愈检测    [执行]     │  │
│  │ L0 Evolution 🟢   │ │                            │  │
│  └───────────────────┘ └────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

#### 模块 2: `/ai-workflows` — 工作流管理 (P1)

```
- 10个n8n工作流状态 (active/inactive/last_run)
- 工作流触发按钮 + 参数表单
- 执行历史 + 日志查看
- 定时任务管理 (Cron 配置)
```

#### 模块 3: `/ai-evolution` — 进化引擎 (P1)

```
- 进化指数趋势图 (7天/30天)
- 自愈状态面板 (剧本数量、成功率、最近修复)
- Skill 列表 (自动生成+手动创建)
- 用户画像 (交互次数、高频意图、满意率)
- 每日进化报告
```

#### 模块 4: `/ai-knowledge` — 知识库管理 (P2)

```
- Dify 知识库文档 CRUD
- 检索测试 + 召回率
- Prompt 模板管理
- A/B 评测结果对比
```

### 3.3 路由与导航结构

```
新侧边栏:
  ├── 🏠 AI 控制台      → /ai-console
  ├── ⚡ 工作流          → /ai-workflows
  ├── 🧬 进化引擎        → /ai-evolution
  ├── 📚 知识库          → /ai-knowledge
  ├── ─────────────
  ├── 💬 对话创作        → /chat (保留)
  ├── 📝 草稿箱          → /draft-box (保留)
  ├── 👤 账号管理        → /accounts (保留)
  ├── 💳 订阅计划        → /pricing (保留)
  └── ⚙️ 设置            → /settings
```

---

## 四、技术方案

### 4.1 技术栈

| 层 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js 14 App Router | 与现有一致 |
| UI | shadcn/ui + Tailwind CSS | 品牌设计系统复用 |
| 状态 | Zustand | 轻量，无 boilerplate |
| 图表 | Recharts | 进化指数/健康趋势 |
| 实时 | WebSocket (Socket.io) | 系统健康/Agent状态推送 |
| AI交互 | 直接调 Bridge API | LangChain :4010 + Claude :4020 |

### 4.2 API 对接

```
前端 → 后端服务:
  /ai-console  → GET :4010/health, :4020/health, :4030/health, :5001/health, :5678/healthz
  Agent 对话    → POST :4010/agent/run-unified
  工作流触发    → POST :5678/webhook/aibrand/*
  进化面板      → GET :4030/runbooks, :4030/adapt/profile/:uid
  自愈触发      → POST :4030/auto-heal
  知识库        → POST :5001/v1/datasets/retrieve, :5001/v1/chat-messages
```

### 4.3 文件结构

```
src/app/[lng]/
├── ai-console/          🆕 AI控制台
│   ├── page.tsx
│   └── AiConsoleCore.tsx
├── ai-workflows/        🆕 工作流管理
│   ├── page.tsx
│   └── WorkflowManager.tsx
├── ai-evolution/        🆕 进化引擎
│   ├── page.tsx
│   └── EvolutionPanel.tsx
├── ai-knowledge/        🆕 知识库
│   ├── page.tsx
│   └── KnowledgeManager.tsx
├── (welcome)/           保留
├── auth/                保留
├── accounts/            保留
├── pricing/             保留
├── chat/                保留
└── draft-box/           保留

src/components/
├── ai-console/          🆕 共享AI组件
│   ├── LayerHealthCard.tsx
│   ├── AgentChat.tsx
│   ├── EvolutionIndex.tsx
│   ├── WorkflowCard.tsx
│   └── SystemTopology.tsx
├── ui/                  保留 (shadcn)
└── ...                  保留
```

---

## 五、实施计划

| 阶段 | 天数 | 交付物 | 依赖 |
|:--:|:--:|------|------|
| **Phase 1** | Day 1 | AI控制台骨架 + 五层健康面板 + 路由生效 | 无 |
| **Phase 2** | Day 2 | Agent对话 + 工作流触发 + 侧边栏导航 | Phase 1 |
| **Phase 3** | Day 3 | 进化引擎面板 + 知识库管理 | Phase 2 |
| **Phase 4** | Day 4 | 架构拓扑图 + 实时WebSocket + 打磨 | Phase 3 |
| **Phase 5** | Day 5 | E2E验证 + 旧页面桥接 + 文档 | Phase 4 |

**总工期**: 5 天 | **核心价值交付**: Day 3 即可

---

## 六、风险与缓解

| 风险 | 概率 | 缓解 |
|------|:--:|------|
| Next.js 新路由不生效 | 中 | 重启 dev server + 验证路由配置 |
| 旧页面与新页面视觉割裂 | 高 | 统一 shadcn/Tailwind 主题 |
| Agent 调用超时影响 UX | 中 | 异步模式 + loading 状态 |
| 跨域问题 (前端→Bridge) | 低 | 已配置 CORS |
| 实时 WebSocket 复杂 | 中 | Phase 4 可选，先用轮询 |

---

> **审核确认后即开始实施。预计 3 天可达到核心价值交付状态。**
