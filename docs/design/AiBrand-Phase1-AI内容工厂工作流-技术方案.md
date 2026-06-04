# Phase 1：AI 智能内容工厂工作流 — 技术方案

> 版本 v1.0 | 2026-06-03 | 状态：设计阶段

---

## 一、方案概述

### 1.1 目标

将 AiBrand 内容创作模块从"用户手动输入主题 → AI 生成文案 → 手动编辑"升级为完整的 **AI 智能内容工厂**，实现：

> 用户输入自然语言意图 → AI 工作流自动编排执行 → 高质量多平台内容输出

### 1.2 核心价值

| 维度 | 当前 | 升级后 |
|------|------|--------|
| 用户输入 | 手动填写主题+参数 | 一句话表达意图 |
| 内容质量 | 依赖单次 Prompt | 多步骤 AI 协作 + 质检 |
| 平台适配 | 手动逐平台改写 | 一次生成多平台版本 |
| 效率 | 30-60 分钟/条 | 3-5 分钟/条 |
| 策略能力 | 无 | AI 选题研究 + 竞品分析 |

---

## 二、工作流全景

### 用户意图 → 发布完成（6 步闭环）

```
用户输入："618大促，帮我推一波美妆产品"
         │
    ┌────▼──── ① 意图分析 ────┐
    │  LLM 解析                │
    │  → 行业=美妆护肤          │
    │  → 目标=促销转化          │
    │  → 平台=小红书+抖音+B站   │
    │  → 调性=年轻活泼          │
    │  → 产品信息提取/补充      │
    └────────────┬────────────┘
                 │
    ┌────────────▼────────────┐
    │    ② 策略研究            │
    │  并行执行：               │
    │  🅐 趋势洞察 (RAG+搜索)    │
    │  🅑 竞品分析 (n8n抓取)    │
    │  🅒 历史数据 (用户账号)   │
    │  → 输出：3个选题方向      │
    │  → 每个含：角度/关键词/    │
    │    预估效果/发布时间建议  │
    └────────────┬────────────┘
                 │
    ┌────────────▼────────────┐
    │    ③ 用户确认             │
    │  展示 3 个选题方案         │
    │  用户选择/调整 → 确认      │
    │  (一键确认 or 逐项调整)    │
    └────────────┬────────────┘
                 │
    ┌────────────▼────────────┐
    │    ④ 内容生成 (并行)      │
    │  每个选中的选题 →          │
    │  ┌────────────────────┐  │
    │  │ 小红书版  │ 图文+标题 │  │
    │  │ 抖音版    │ 口播+字幕 │  │
    │  │ B站版     │ 长视频脚本 │  │
    │  │ 公众号版  │ 长文+排版  │  │
    │  │ 通用短文案│ 微博/朋友圈 │  │
    │  └────────────────────┘  │
    └────────────┬────────────┘
                 │
    ┌────────────▼────────────┐
    │    ⑤ AI 质量检测         │
    │  并行检测：               │
    │  🅐 合规检测 (广告法)      │
    │  🅑 平台规则检测           │
    │  🅒 吸引力评分            │
    │  🅓 原创度检测            │
    │  🅔 A/B 变体生成          │
    │  → 不合格内容自动重写      │
    └────────────┬────────────┘
                 │
    ┌────────────▼────────────┐
    │    ⑥ 发布策略 + 数据闭环  │
    │  → 最优发布时间计算        │
    │  → 发布顺序推荐            │
    │  → 发布后 48h 效果追踪     │
    │  → 优化建议 + 用户偏好学习 │
    └─────────────────────────┘
```

---

## 三、技术架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│              Next.js 前端 (aitoearn-web)              │
│                                                      │
│  ┌────────────────┐  ┌────────────────────────────┐ │
│  │ WorkflowWizard  │  │ WorkflowProgressPanel       │ │
│  │ 意图输入 + 选题  │  │ 实时步骤状态 +               │ │
│  │ 确认 + 参数调整  │  │ 日志流 + 中间结果预览         │ │
│  └───────┬────────┘  └────────────┬───────────────┘ │
│          │                        │                  │
└──────────┼────────────────────────┼──────────────────┘
           │ HTTP/SSE               │ SSE (Server-Sent Events)
┌──────────▼────────────────────────▼──────────────────┐
│           NestJS Backend (aitoearn-server)            │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │          WorkflowModule (新增)                 │    │
│  │                                               │    │
│  │  WorkflowController  WorkflowService          │    │
│  │  WorkflowRepository  WorkflowGateway (WebSocket)│   │
│  │                                               │    │
│  │  ┌─────────┐  ┌──────────┐  ┌────────────┐   │    │
│  │  │Executor │  │Scheduler │  │StepRegistry │   │    │
│  │  │步骤执行器│  │定时调度器│  │步骤注册表   │   │    │
│  │  └────┬────┘  └──────────┘  └────────────┘   │    │
│  └───────┼───────────────────────────────────────┘    │
│          │                                            │
│  ┌───────▼───────────────────────────────────────┐   │
│  │          AIServiceModule (扩展现有)              │   │
│  │  LLM Router · Model Fallback · Token Counter   │   │
│  │  Cost Tracker · Cache Layer                     │   │
│  └───────────────────────────────────────────────┘   │
└──────────┬───────────────────────────────────────────┘
           │ HTTP / gRPC / Webhook
┌──────────▼───────────────────────────────────────────┐
│              外部 AI 服务层                            │
│                                                       │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐    │
│  │   Dify    │  │    n8n    │  │  LLM APIs     │    │
│  │           │  │           │  │               │    │
│  │ • 知识库   │  │ • 定时任务 │  │ • GPT-5       │    │
│  │ • RAG     │  │ • 数据抓取 │  │ • Claude 4.5  │    │
│  │ • Agent   │  │ • Webhook │  │ • Gemini 2.5  │    │
│  │ • 对话应用 │  │ • 多步骤   │  │ • 本地模型     │    │
│  └───────────┘  └───────────┘  └───────────────┘    │
│                                                       │
│  Docker Compose 部署 (同现有基础设施)                    │
└───────────────────────────────────────────────────────┘
```

### 3.2 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| **工作流编排** | NestJS 自研 WorkflowModule + Dify/n8n 互补 | 核心流程自主可控，复杂自动化外挂 |
| **实时通信** | SSE (Server-Sent Events) | 轻量，单向推送工作流状态，不需要 WebSocket 双向复杂性 |
| **LLM 路由** | 成本分层：简单步骤用 GPT-5-mini，创意生成用 Claude 4.5，RAG 用 Dify 内置 | 控制成本，保证质量 |
| **工作流持久化** | MongoDB `workflow_executions` 集合 | 利用现有基础设施 |
| **前端展示** | 渐进式：V1 用步骤列表+日志，V2 加 DAG 拓扑图 | 快速上线，逐步增强 |

---

## 四、后端实现：WorkflowModule

### 4.1 目录结构

```
apps/aitoearn-server/src/core/workflow/
├── workflow.module.ts
├── workflow.controller.ts
├── workflow.service.ts
├── workflow.repository.ts
├── workflow.schema.ts
├── workflow.dto.ts
├── workflow.vo.ts
├── workflow.gateway.ts          # SSE 推送工作流状态
├── engine/
│   ├── workflow-executor.ts     # 工作流执行引擎
│   ├── step-registry.ts         # 步骤注册表
│   ├── step.interface.ts        # 步骤接口
│   └── context.ts               # 工作流上下文
└── steps/                       # 具体步骤实现
    ├── intent-analysis.step.ts
    ├── strategy-research.step.ts
    ├── content-generation.step.ts
    ├── quality-check.step.ts
    └── publish-strategy.step.ts
```

### 4.2 核心数据模型

```typescript
// workflow.schema.ts

// ── 工作流定义 ──
@Schema({ timestamps: true })
export class WorkflowDefinition {
  _id: string
  
  @Prop({ required: true, unique: true })
  name: string                    // 'content-factory'
  
  @Prop({ required: true })
  displayName: string             // '智能内容工厂'
  
  @Prop()
  description: string
  
  @Prop({ type: [String] })
  steps: string[]                 // 有序步骤名称数组
  
  @Prop({ type: Object })
  config: {
    maxRetry: number              // 步骤最大重试次数 (默认 2)
    timeout: number               // 总超时时间 ms (默认 300000)
    parallelSteps: string[][]     // 可并行的步骤组
  }
  
  @Prop({ default: true })
  enabled: boolean
}

// ── 工作流执行实例 ──
@Schema({ timestamps: true })
export class WorkflowExecution {
  _id: string
  
  @Prop({ type: ObjectId, ref: 'User', required: true, index: true })
  userId: string
  
  @Prop({ required: true })
  workflowName: string            // 'content-factory'
  
  @Prop({ required: true, enum: ['pending','running','paused','completed','failed','cancelled'] })
  status: string
  
  @Prop({ type: Object, required: true })
  input: WorkflowInput             // 用户输入
  
  @Prop({ type: Object })
  context: WorkflowContext         // 工作流上下文 (步骤间传递)
  
  @Prop({ type: [StepResult], default: [] })
  steps: StepResult[]              // 各步骤执行结果
  
  @Prop({ type: Object })
  output: WorkflowOutput           // 最终输出
  
  @Prop({ type: Object })
  metrics: {                       // 执行指标
    totalDuration: number          // 总耗时 ms
    totalTokens: number            // 总 token 消耗
    totalCost: number              // 总费用 $
    retryCount: number             // 重试次数
  }
  
  @Prop()
  error?: string
  
  @Prop({ default: Date.now })
  createdAt: Date
  
  @Prop()
  completedAt: Date
}

// ── 类型定义 ──

interface WorkflowInput {
  intent: string                   // 用户自然语言意图
  userId: string
  params?: {
    platforms?: string[]           // 指定平台 (默认全部)
    tone?: string                  // 内容调性
    productInfo?: string           // 产品信息
    targetAudience?: string       // 目标受众
    budget?: string               // 预算/促销力度
    deadline?: Date               // 截止日期
  }
}

interface WorkflowContext {
  intent: IntentResult             // 步骤①输出
  strategy?: StrategyResult        // 步骤②输出
  selectedTopics?: TopicOption[]   // 步骤③用户确认
  generatedContent?: GeneratedContent[]  // 步骤④输出
  qualityReport?: QualityReport[]  // 步骤⑤输出
  publishPlan?: PublishPlan       // 步骤⑥输出
  errors: StepError[]              // 错误日志
}

interface IntentResult {
  industry: string
  goal: 'conversion' | 'branding' | 'education' | 'entertainment'
  platforms: string[]
  tone: string
  targetAudience: string
  keyProducts: string[]
  extractedKeywords: string[]
  confidence: number               // 0-1
}

interface StrategyResult {
  topics: TopicOption[]
  marketInsights: string
  competitorAnalysis: CompetitorBrief[]
}

interface TopicOption {
  id: string
  title: string
  angle: string                    // 切入角度
  keywords: string[]
  estimatedEngagement: 'high' | 'medium' | 'low'
  suggestedPlatforms: string[]
  bestPublishTime: string
  outline: string[]                // 内容大纲
}

interface GeneratedContent {
  id: string
  platform: string
  contentType: 'article' | 'video_script' | 'image_text'
  title: string
  body: string
  hashtags: string[]
  coverSuggestion: string
  aiScore: number                  // AI 质量评分 0-100
}

interface QualityReport {
  contentId: string
  compliance: { passed: boolean; issues: string[] }
  platformRules: { passed: boolean; issues: string[] }
  attractiveness: { score: number; suggestions: string[] }
  originality: { score: number; similarContent?: string[] }
  abTestVariants?: { variant: string; content: GeneratedContent }[]
  overallPassed: boolean
}

interface StepResult {
  stepName: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt: Date
  completedAt?: Date
  duration?: number
  output?: any
  error?: string
  retries: number
  tokensUsed: number
  cost: number
}
```

### 4.3 步骤接口与引擎

```typescript
// step.interface.ts

interface WorkflowStep {
  name: string                    // 步骤唯一名称
  execute(ctx: WorkflowContext, exec: WorkflowExecution): Promise<StepResult>
  rollback?(ctx: WorkflowContext, result: StepResult): Promise<void>
  canSkip?(ctx: WorkflowContext): boolean
  timeout?: number                // ms
  maxRetries?: number
  costEstimate?(input: WorkflowInput): number
}

// workflow-executor.ts
@Injectable()
export class WorkflowExecutor {
  constructor(private readonly stepRegistry: StepRegistry) {}
  
  async execute(execution: WorkflowExecution): Promise<WorkflowOutput> {
    const definition = await this.getDefinition(execution.workflowName)
    const context: WorkflowContext = { errors: [] }
    
    // 按 definition 中定义的步骤顺序执行
    for (const stepName of definition.steps) {
      const step = this.stepRegistry.get(stepName)
      
      // 检查是否可跳过
      if (step.canSkip?.(context)) {
        execution.steps.push({ stepName, status: 'skipped', ... })
        continue
      }
      
      // 执行步骤（带重试）
      const result = await this.executeWithRetry(step, context, execution)
      execution.steps.push(result)
      
      // 失败处理
      if (result.status === 'failed') {
        if (this.isCriticalStep(stepName)) {
          throw new WorkflowError(`Critical step ${stepName} failed`)
        }
        // 非关键步骤失败 → 记录继续
        context.errors.push({ stepName, error: result.error })
      }
      
      // 实时推送状态 (SSE)
      this.gateway.emitStepUpdate(execution.userId, execution._id, result)
    }
    
    return this.buildOutput(context)
  }
}
```

### 4.4 API 端点

```typescript
// workflow.controller.ts

@Controller('api/user/workflow')
export class WorkflowController {
  
  // ── 工作流定义 ──
  @Get('definitions')
  async listDefinitions(): Promise<WorkflowDefinitionVO[]>
  
  @Get('definitions/:name')
  async getDefinition(@Param('name') name: string): Promise<WorkflowDefinitionVO>
  
  // ── 工作流执行 ──
  @Post('execute')
  @UseGuards(JwtAuthGuard)
  async executeWorkflow(
    @Body() dto: ExecuteWorkflowDto
  ): Promise<{ executionId: string }>
  
  @Get('executions')
  @UseGuards(JwtAuthGuard)
  async listExecutions(
    @Query() query: PaginationDto
  ): Promise<PaginatedResult<WorkflowExecutionVO>>
  
  @Get('executions/:id')
  @UseGuards(JwtAuthGuard)
  async getExecution(@Param('id') id: string): Promise<WorkflowExecutionVO>
  
  @Get('executions/:id/stream')
  @UseGuards(JwtAuthGuard)
  @Sse()
  async streamExecution(
    @Param('id') id: string
  ): Observable<WorkflowStepEvent>
  
  // ── 交互操作 ──
  @Post('executions/:id/confirm-topics')
  @UseGuards(JwtAuthGuard)
  async confirmTopics(
    @Param('id') id: string,
    @Body() dto: ConfirmTopicsDto
  ): Promise<void>
  
  @Post('executions/:id/retry-step')
  @UseGuards(JwtAuthGuard)
  async retryStep(
    @Param('id') id: string,
    @Body('stepName') stepName: string
  ): Promise<void>
  
  @Post('executions/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelExecution(@Param('id') id: string): Promise<void>
  
  // ── 成本/用量查询 ──
  @Get('usage/stats')
  @UseGuards(JwtAuthGuard)
  async getUsageStats(): Promise<UsageStatsVO>
}
```

---

## 五、Dify + n8n 部署与集成

### 5.1 Docker Compose 部署

```yaml
# docker-compose.ai.yml（新增，不影响现有服务）

version: '3.8'
services:
  # ── Dify CE ──
  dify-api:
    image: langgenius/dify-api:1.0.0
    container_name: aibrand-dify-api
    ports:
      - "5001:5001"
    environment:
      MODE: api
      SECRET_KEY: ${DIFY_SECRET_KEY}
      DB_HOST: aibrand-mongodb  # 重用现有 MongoDB
      REDIS_HOST: aibrand-redis # 重用现有 Redis
      STORAGE_TYPE: local
    volumes:
      - ./dify/storage:/app/api/storage
    networks:
      - aitoearn_network

  dify-web:
    image: langgenius/dify-web:1.0.0
    container_name: aibrand-dify-web
    ports:
      - "5002:3000"
    environment:
      API_BASE_URL: http://dify-api:5001
    networks:
      - aitoearn_network

  # ── n8n ──
  n8n:
    image: n8nio/n8n:latest
    container_name: aibrand-n8n
    ports:
      - "5678:5678"
    environment:
      N8N_BASIC_AUTH_ACTIVE: "true"
      N8N_BASIC_AUTH_USER: admin
      N8N_BASIC_AUTH_PASSWORD: ${N8N_PASSWORD}
      DB_TYPE: mongodb
      DB_MONGODB_CONNECTION_URL: mongodb://admin:password@aibrand-mongodb:27017/n8n
    volumes:
      - ./n8n/data:/home/node/.n8n
    networks:
      - aitoearn_network

networks:
  aitoearn_network:
    external: true
```

### 5.2 Dify 知识库设计

```
Dify 知识库结构：
├── 品牌知识库
│   ├── 品牌故事、产品信息、卖点
│   ├── 品牌调性指南、话术库
│   └── 历史优质内容范例
│
├── 平台规则库
│   ├── 小红书违禁词/限流规则
│   ├── 抖音审核规则
│   ├── 广告法合规检查点
│   └── 各平台内容格式要求
│
├── 行业趋势库
│   ├── 美妆/科技/教育等行业热搜话题 (n8n 每日更新)
│   ├── 竞品爆文素材 (n8n 每周抓取)
│   └── 季节性话题日历
│
└── 用户画像库
    ├── 用户历史内容偏好
    ├── 用户账号数据（粉丝画像）
    └── 用户内容效果数据
```

### 5.3 NestJS ↔ Dify 集成

```typescript
// libs/ai-services/src/dify/dify.service.ts

@Injectable()
export class DifyService {
  constructor(private readonly http: HttpService) {}
  
  /** 知识库检索 */
  async searchKnowledge(query: string, datasetIds: string[]): Promise<DocFragment[]> {
    const { data } = await this.http.post(`${DIFY_API}/datasets/retrieve`, {
      query,
      dataset_ids: datasetIds,
      top_k: 10,
    })
    return data.records
  }
  
  /** 调用 Dify Agent 应用 */
  async runAgentApp(appId: string, inputs: Record<string, any>, userId: string): Promise<{
    answer: string
    conversationId: string
  }> {
    const { data } = await this.http.post(`${DIFY_API}/chat-messages`, {
      inputs,
      query: inputs.query || '',
      user: userId,
      response_mode: 'blocking',
    })
    return { answer: data.answer, conversationId: data.conversation_id }
  }
  
  /** 流式调用 Dify Agent */
  async runAgentAppStream(
    appId: string, 
    inputs: Record<string, any>, 
    userId: string
  ): Observable<string> {
    // SSE stream from Dify → Observable
  }
}
```

### 5.4 NestJS ↔ n8n 集成

```typescript
// libs/ai-services/src/n8n/n8n.service.ts

@Injectable()
export class N8nService {
  /** 触发 n8n 工作流 */
  async triggerWorkflow(webhookPath: string, payload: any): Promise<any> {
    const { data } = await this.http.post(
      `${N8N_BASE}/webhook/${webhookPath}`,
      payload,
    )
    return data
  }
  
  /** n8n 工作流使用场景 */
  // - 定时抓取竞品内容 (每6小时)
  // - 定时拉取热搜话题 (每小时) → 写入 Dify 知识库
  // - 发布后 48h 拉取平台数据 → 触发效果报告
  // - 用户账号 OAuth 健康检查
  // - 跨平台内容同步发布
}
```

---

## 六、前端实现

### 6.1 新增页面/组件

```
src/
├── app/[lng]/
│   └── content/                          ← 现有内容页
│       └── workflow/                     ← 🆕 AI 工作流模式
│           ├── page.tsx                  ← 服务端组件
│           ├── WorkflowPage.tsx          ← 客户端核心组件
│           ├── components/
│           │   ├── IntentInput.tsx       ← 意图输入组件
│           │   ├── TopicSelector.tsx     ← 选题确认组件
│           │   ├── WorkflowProgress.tsx  ← 工作流进度条
│           │   ├── StepLogPanel.tsx      ← 步骤实时日志
│           │   ├── ContentPreview.tsx    ← 内容预览+编辑
│           │   ├── QualityReport.tsx     ← 质量报告面板
│           │   └── PublishStrategy.tsx   ← 发布策略面板
│           └── hooks/
│               ├── useWorkflowSSE.ts     ← SSE 订阅 Hook
│               └── useWorkflowStore.ts   ← 页面级 Zustand Store
│
├── components/
│   └── WorkflowBadge/                    ← 🆕 公共组件
│       └── index.tsx                     ← 工作流状态标签
│
└── api/
    └── workflow.ts                       ← 🆕 工作流 API 封装
```

### 6.2 SSE 实时订阅 Hook

```typescript
// hooks/useWorkflowSSE.ts

export function useWorkflowSSE(executionId: string) {
  const [events, setEvents] = useState<WorkflowStepEvent[]>([])
  
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/user/workflow/executions/${executionId}/stream`
    )
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setEvents(prev => [...prev, data])
    }
    
    eventSource.onerror = () => eventSource.close()
    return () => eventSource.close()
  }, [executionId])
  
  return { events, latestEvent: events[events.length - 1] }
}
```

### 6.3 页面级 Store

```typescript
// hooks/useWorkflowStore.ts

export const useWorkflowStore = create(
  combine({
    executionId: null as string | null,
    step: 0,                              // 当前步骤 0-6
    intent: '',
    params: {} as WorkflowParams,
    strategy: null as StrategyResult | null,
    selectedTopics: [] as string[],
    generatedContent: [] as GeneratedContent[],
    qualityReports: [] as QualityReport[],
    publishPlan: null as PublishPlan | null,
    isStreaming: false,
    errors: [] as StepError[],
  },
  (set, get) => ({
    reset: () => set(initialState),
    
    setStep: (step: number) => set({ step }),
    
    setExecutionId: (id: string) => set({ executionId: id, isStreaming: true }),
    
    applyStepEvent: (event: WorkflowStepEvent) => {
      const state = get()
      const newData = { ...state[event.stepName], ...event.data }
      set({ [event.stepName]: newData } as any)
      
      if (event.status === 'completed') {
        set({ step: state.step + 1 })
      }
      if (event.status === 'completed' && event.stepName === 'publish-strategy') {
        set({ isStreaming: false, step: 6 })
      }
    },
  }),
)
```

### 6.4 用户交互流程

```
页面加载
  │
  ▼
┌────────────────────────────────────────┐
│  IntentInput                            │
│                                         │
│  "618大促，帮我推一波美妆产品"             │
│  ┌─────────────────────────────────┐   │
│  │ 🎯 高级设置（可折叠）              │   │
│  │  平台：☑小红书 ☑抖音 ☐B站 ☐公众号  │   │
│  │  调性：○活泼 ○专业 ○温馨            │   │
│  │  补充产品信息：[_____________]      │   │
│  └─────────────────────────────────┘   │
│          [🚀 开始创作]                  │
└────────────────────────────────────────┘
  │ 点击"开始创作"
  ▼
┌────────────────────────────────────────┐
│  WorkflowProgress + StepLogPanel        │
│                                         │
│  ① 意图分析 ████████████ ✅             │
│     → 识别：美妆行业 · 促销转化 · 小红书+抖音 │
│  ② 策略研究 ████████████ ⏳             │
│     → 正在分析竞品爆文...                │
│  ③ 选题确认 ○ ○ ○                       │
│  ④ 内容生成 ○ ○ ○ ○ ○                    │
│  ⑤ 质量检测 ○ ○ ○                       │
│  ⑥ 发布策略 ○ ○ ○                       │
│                                         │
│  实时日志：                              │
│  [14:32:01] 已识别 3 个618热搜话题       │
│  [14:32:05] 已分析 5 个竞品账号...       │
└────────────────────────────────────────┘
  │ 步骤②完成
  ▼
┌────────────────────────────────────────┐
│  TopicSelector                          │
│                                         │
│  AI 为你找到了 3 个选题方向：             │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ ✅ 选题 1：618必囤！成分党教你挑卸妆油 │  │
│  │    角度：成分科普 + 促销引导          │  │
│  │    平台：小红书                        │  │
│  │    预估互动：⭐⭐⭐⭐⭐ 高              │  │
│  │    关键词：#618美妆 #成分党 #敏感肌    │  │
│  │    [编辑] [删除]                      │  │
│  └──────────────────────────────────┘  │
│  ... (更多选题)                          │
│                                         │
│          [+ 自定义选题]  [✨ 确认生成]    │
└────────────────────────────────────────┘
  │ 确认后
  ▼
  步骤④-⑥ 自动执行 → ContentPreview 展示最终结果
```

---

## 七、LLM 成本控制

### 7.1 模型分层策略

| 步骤 | 模型选择 | 预估 Token/次 | 预估成本/次 |
|------|---------|:--:|:--:|
| ① 意图分析 | GPT-5-mini | ~500 | $0.001 |
| ② 策略研究 (RAG) | Dify 内置 + GPT-5-mini | ~3000 | $0.005 |
| ② 竞品分析 | Claude Haiku 4.5 | ~2000 | $0.003 |
| ③ 选题生成 | Claude Sonnet 4.6 | ~4000 | $0.024 |
| ④ 内容生成 (每条) | Claude Sonnet 4.6 | ~5000 | $0.030 |
| ④ 多平台 × 3 | 并行调用 | ~15000 | $0.090 |
| ⑤ 质量检测 | GPT-5-mini × 4 | ~4000 | $0.006 |
| ⑥ 发布策略 | GPT-5-mini | ~1000 | $0.002 |
| **单次工作流总计** | | ~30,000 | **$0.13** |

> 约 ¥0.95/条内容（含 3 平台版本）。Pro 用户 ¥199/月含 100 条 → 成本 ¥95，毛利率 52%。

### 7.2 成本优化手段

- **语义缓存**：相同/相似意图（>0.9 余弦相似度）跳过意图分析
- **渐进式生成**：先生成标题 → 用户确认 → 再生成全文（减少无意义生成）
- **模型降级**：非高峰时段用 Haiku 4.5 替代 Sonnet（成本降 60%）
- **批量处理**：多条内容聚合一次质量检测
- **结果缓存**：24h 内相同查询直接返回缓存

---

## 八、实施计划（8 周）

```
Week 1-2: 基础设施
├── Day 1-3: Docker 部署 Dify + n8n
├── Day 4-5: NestJS WorkflowModule 骨架（schema + controller + service）
├── Day 6-8: WorkflowExecutor + StepRegistry + SSE Gateway
├── Day 9-10: 第一个步骤联调（意图分析 ①）
└── Day 11-14: Dify 知识库搭建 + NestJS 集成

Week 3-4: 核心工作流
├── Day 15-18: 策略研究步骤（②）+ Dify RAG 联调
├── Day 19-22: 内容生成步骤（④）+ 多平台并行
├── Day 23-24: 质量检测步骤（⑤）
├── Day 25-26: 发布策略步骤（⑥）
└── Day 27-28: 完整工作流端到端测试

Week 5-6: 前端开发
├── Day 29-31: WorkflowPage 骨架 + IntentInput
├── Day 32-34: WorkflowProgress + SSE 订阅
├── Day 35-37: TopicSelector + ContentPreview
├── Day 38-40: QualityReport + PublishStrategy
└── Day 41-42: 端到端联调 + E2E 测试

Week 7-8: 打磨上线
├── Day 43-46: AI 成本监控面板 + 配额集成
├── Day 47-49: 错误处理 + 降级策略 + 手动模式
├── Day 50-52: 预置 10 个行业模板（美妆/科技/教育...）
├── Day 53-54: 性能优化 + 缓存策略
└── Day 55-56: 上线 + 监控
```

---

## 九、验收标准

| 测试场景 | 预期结果 |
|----------|----------|
| 输入"618美妆促销推广" | 完整输出 3 个选题 + 小红书/抖音版本内容 |
| 仅输入"帮我写条小红书" | 意图分析追问行业/目标 |
| 生成中关闭页面 → 重新打开 | 工作流继续执行，状态可恢复 |
| 智能选题中的竞品分析超时 | 跳过该步骤，降级为无竞品分析的生成 |
| Pro 用户执行工作流 | 配额正常扣除，超限返回 403 |
| 质量检测不通过 | 自动重写 1 次，重写仍失败则标记为手动审核 |

---

## 十、后续扩展路线

```
Phase 1 (本方案)
└── 智能内容工厂 — 6 步闭环

Phase 2
└── GEO 引擎集成 — 内容自动 SEO/结构化

Phase 3
└── 客户互动 AI 工作流 — 评论管理自动化

Phase 4
├── 账号 AI 诊断 — 数据洞察自动化
└── 工作流市场 — 社区模板共享
```

---

> 📅 文档版本 v1.0 · 2026-06-03 · 作者：Claude Code + AiBrand Team

---

# 附录 B：风险矩阵与应对策略

> 更新于 2026-06-03 · 阶段：设计评审

## B.1 技术层面

### B.1.1 LLM 稳定性与适配性

| 风险 | 概率 | 影响 | 应对策略 |
|------|:--:|:--:|------|
| 第三方 API 限流/宕机 | 高 | 高 | **Model Fallback Chain**: Dify 中配置 DeepSeek → GPT-5-mini → Claude Haiku 降级链；每个模型独立超时 15s |
| 模型效果行业差异大 | 中 | 中 | **多模型投票+自动A/B**: 同内容用 DeepSeek + GPT-mini 各生成一版，评分 Agent 自动选优；行业 Prompt 模板持续沉淀到 Dify 知识库 |
| 模型版本迭代破坏兼容性 | 中 | 高 | 锁定模型版本号（如 DeepSeek-V4-Pro）；升级前在沙箱环境回归测试 |
| 本地模型引入 | 低 | 中 | **Phase 1 不上本地模型**。DeepSeek API 价格仅为 GPT-5 的 1/5，本地模型运维成本远超 API 差价 |

### B.1.2 工作流容错与实时性

| 风险 | 概率 | 影响 | 应对策略 |
|------|:--:|:--:|------|
| 单步骤超时导致全流程卡顿 | 高 | 高 | **拆分 3 个子工作流**: A(意图+策略) → B(内容生成) → C(质量+发布)；独立重试互不干扰；B 失败不回滚 A 结果 |
| SSE 高并发断连 | 中 | 中 | 前端指数退避重连（1s→2s→4s→8s）；心跳 5s/次；降级为轮询模式 |
| MongoDB 执行日志膨胀 | 高 | 中 | **元数据存 MongoDB + 详细日志存 RustFS**。workflow_executions 仅存索引字段，详情以 JSON 文件存储，MongoDB 仅存路径引用 |

### B.1.3 集成生态兼容性

| 风险 | 概率 | 影响 | 应对策略 |
|------|:--:|:--:|------|
| Dify/n8n 版本迭代破坏 API | 中 | 高 | Docker Compose 锁定镜像版本号；升级前在 staging 环境验证 |
| 平台发布 API 频繁变动 | 高 | 中 | **发布适配层抽象**：每个平台独立 Adapter，变更仅影响单文件；n8n 定时检测平台 API 文档变更 |

---

## B.2 成本控制

### B.2.1 LLM 成本优化（核心）

**当前估算**: $0.13/条，Pro 用户 ¥199/月 毛利率 52% → **风险偏高**

| 优化策略 | 预期降本 | 实施难度 | 优先级 |
|------|:--:|:--:|:--:|
| DeepSeek 替代 GPT-mini 做预处理（意图分析、选题建议） | -70% | 低 | **P0** |
| 向量相似度语义缓存（余弦相似度 > 0.92 复用策略） | -30% | 中 | **P2** |
| 渐进式生成（先生成标题→确认→再生成全文） | -30% | 低 | **P1** |
| 分层模型路由（免费=DeepSeek, Pro=Claude Sonnet） | 成本对齐 | 低 | **P1** |
| 结果缓存（24h 内同查询直接返回） | -15% | 低 | 已部分实现 |

**优化后目标**: $0.04/条，毛利率 **85%**

### B.2.2 基础设施成本

| 成本项 | 优化策略 |
|------|------|
| 爬虫代理 IP | 使用国内代理池（¥500/月百万次），不走直连 |
| 热搜数据源 | 优先免费 API（知乎热榜/微博热搜自建缓存），避免付费数据源 |
| Docker 集群 | Phase 1 单机部署；Phase 3 后评估 K8s 迁移必要性 |

---

## B.3 业务与合规

### B.3.1 内容合规（关键风险）

**核心原则：不要用 LLM 做合规检测**。LLM 漏检率实测 15-20%。

```
合规检测双层架构：
┌────────────────────────────────────┐
│ Layer 1: 规则引擎 (负责 90% 检测)    │
│ • 违禁词库 (2000+条，每周更新)       │
│ • 正则匹配（联系方式/URL/敏感模式）   │
│ • 平台规则模板（小红书/抖音/广告法）   │
│ → 不通过：自动标记 + 建议修改        │
└──────────────┬─────────────────────┘
               │ 通过
┌──────────────▼─────────────────────┐
│ Layer 2: LLM 复核 (负责 10% 语境)    │
│ • 隐性违规（反讽、黑话、拼音替换）    │
│ • 语境判断（医疗建议/金融承诺）       │
│ → 不通过：转人工审核                 │
└─────────────────────────────────────┘
```

### B.3.2 版权与数据隐私

| 风险 | 应对 |
|------|------|
| AI 内容抄袭/侵权 | Dify 知识库素材标记版权来源；服务条款明确责任归属 |
| 用户上传素材版权 | 图片上传时提取 EXIF 元数据；大文件标记风险提示 |
| 竞品数据抓取合规 | n8n 抓取仅限公开数据，不绕过反爬；遵守 robots.txt |
| 用户数据隐私 | MongoDB 加密存储；意图数据脱敏后用于模型优化 |

### B.3.3 行业拓展适配

```
工作流模板 = 基础步骤 + 可插拔行业插件

基础步骤 (必选):
  意图分析 → 内容生成 → 质量检测

行业插件 (可选):
  医疗: 合规预检 + 资质审核 + 风险提示
  金融: 合规声明 + 风险披露 + 投资警示
  教育: 课程分类 + 适龄标签 + 效果承诺审核
  美妆: 成分审核 + 功效声明检测 + 备案号验证
```

---

## B.4 用户体验与商业化

### B.4.1 等待时长优化（最关键体验问题）

**从"黑盒等待"到"流式可视化"**:

```
当前体验: 用户点"生成" → 转圈60秒 → 展示结果

优化后体验:
  t=0s   意图分析 → "已识别：美妆·618促销·小红书+抖音"
  t=5s   选题建议 → 3个标题候选（用户可选）
  t=8s   用户选择 #2 → 开始流式生成
  t=15s  小红书版本流式输出（逐字展示）
  t=25s  抖音版本同步生成
  t=35s  质量检测 → 标记通过/问题
  t=40s  完成
```

### B.4.2 定价策略优化

| 方案 | 当前 | 优化后 | 理由 |
|------|:--:|:--:|------|
| Pro 月费 | ¥199 | **¥299** | 全链路价值 > 单点工具 (Jasper $49/月) |
| 配额计量 | 按条数 | **按 Token 消耗** | 公平透明，用户可控，避免复杂内容亏本 |
| 免费版 | 按功能阉割 | **体验全流程 + 限 3 条/月** | 先感受价值再限制用量，转化率更高 |

### B.4.3 用户预期管理

| 痛点 | 应对 |
|------|------|
| AI 质量不达预期 | 首次使用前展示"效果预览"（预生成示例）；每次生成展示质量评分 |
| 操作门槛高 | 预置 20+ 行业模板（一键使用）；支持"模糊意图"输入（不用填表单） |
| 效果无法量化 | 发布后 48h 自动推送效果报告；对比"使用前 vs 使用后"数据 |

---

## B.5 团队与运维

### B.5.1 监控体系（开源方案）

| 监控维度 | 工具 | 说明 |
|------|------|------|
| LLM 成本 | Dify Dashboard | 自带 Token 用量统计 |
| 工作流成功率 | n8n Execution 列表 | 自带执行历史和错误日志 |
| 用户行为 | Umami (自托管) | 轻量，隐私友好，2 分钟部署 |
| 服务健康 | Uptime Kuma | 开源、Docker 部署、支持告警 |
| 错误追踪 | Sentry (免费额度) | JS/TS SDK 接入 |

### B.5.2 知识资产管理

在 Dify 中创建第 4 个知识库：**「AI 运营最佳实践」**

```
内容来源：
├── 已验证的高转化 Prompt 模板
├── 各行业选题策略与爆款模式
├── A/B 测试结论（标题/封面/发布时间）
├── 平台算法规则变更记录
└── 用户反馈精选案例

机制：
每次发现好策略 → 写入知识库 → 所有用户自动受益
```

---

# 附录 C：进一步精进方向

> 在风险应对之外，需要进一步深度思考的维度

## C.1 工作流的「可观测性」与「可调试性」

当前方案关注工作流执行，但缺少一个关键能力：**当 AI 输出不理想时，用户和开发者怎么知道是哪一步出了问题？**

### 问题场景
- 选题偏了 → 是意图分析没理解需求，还是策略研究没找到好角度？
- 内容质量差 → 是生成模型的问题，还是知识库检索没命中？
- 质检一直不通过 → 是规则太严，还是 AI 确实在违规？

### 建议方向
```
每个工作流输出附带 "决策溯源":
  ├── 意图分析: { 置信度: 0.92, 备选: [...], 依据: "关键词匹配+行业知识库" }
  ├── 选题策略: { 来源: ["竞品分析", "热搜爬取"], 数据新鲜度: "2小时前" }
  ├── 内容生成: { 模型: "Claude Sonnet 4.6", Prompt模板: "美妆促销V2" }
  └── 质量检测: { 通过项: 4/5, 问题项: ["标题含'最'字"], 修改建议: "→'超值'" }
```

这不是给开发者看的日志，而是**直接展示给用户**的透明化决策过程。用户看到 AI 在"思考什么"，信任感完全不同。

## C.2 「人机协作」的交互粒度

当前 6 步闭环中，用户只在第 ③ 步（选题确认）参与一次。这太粗了。

### 问题
- 用户是一个"审批按钮"，不是一个"协作者"
- 如果选题确认后生成的内容不满意，用户只能全盘接受或重来
- 用户无法在中间步骤注入自己的专业知识（比如："这个选题角度好，但加上我们品牌刚拿的奖项"）

### 建议方向
```
交互模型从 "Linear Approval" → "Branching Collaboration"

用户可以在任意步骤介入：
  ├── 意图分析后："等一下，我其实是想推新品不是促销"
  ├── 选题确认时："第2个选题很好，加上我们的618专属优惠信息"
  ├── 内容生成中："这个开头不够有冲击力，给我3个替换选项"
  ├── 质检后："这条违规提示我确认可以忽略，这是行业术语不是广告词"
  └── 发布前："小红书版本OK，抖音版本换个BGM建议"

每个介入点都是对话式的（自然语言），不是填表单。
```

这与 Dify 的 Chat 模式天然契合——用户在对话中逐步协作，而不是一次性提交。

## C.3 「AI 原生」的度量体系

当前方案用传统 SaaS 指标（用量/满意度/留存）。但 AI 原生产品需要一套新指标。

### 建议指标
| 传统指标 | AI 原生指标 |
|------|------|
| 内容生成条数 | **AI 采纳率**: AI 建议被用户采⽤的比例 (选题采纳率/文案采纳率/修改率) |
| 用户满意度 | **协作深度**: 用户平均与 AI 交互的轮次 (高轮次=深度协作，低轮次=一键跑路) |
| 留存率 | **学习曲线斜率**: 用户从第 1 次到第 10 次使用，采纳率提升幅度 |
| 功能使用率 | **工作流定制率**: 多少用户修改了默认工作流/创建了自定义模板 |

这些指标直接反映"用户是否信任 AI"以及"AI 是否在持续变好"，而不是"用了多少功能"。

## C.4 「领域知识飞轮」

当前每个用户的知识是孤立的。你的知识是他的，我的知识是我的。

### 关键洞察
一个美妆博主用 AiBrand 做了 100 条爆款内容 → 积累了大量的"选题-标题-发布时间-标签"数据 → 这些数据如果沉淀为领域知识 → 新来的美妆博主直接从 90 分开始，而不是 0 分。

```
领域知识飞轮:
  用户A (美妆) 使用 100 次
       ↓
  提炼：美妆行业爆款模式 (Prompt模型+选题策略+发布时间)
       ↓
  写入 Dify 第4知识库 "AI运营最佳实践"
       ↓
  用户B (美妆) 首次使用 = 自动加载行业模板 + 高转化Prompt
       ↓
  用户B 效果更好 → 更频繁使用 → 产生更多数据 → 飞轮加速
```

这是防御性壁垒——竞品可以复制功能，但复制不了"100 个美妆博主的真实数据沉淀的领域知识"。

## C.5 「内容生命周期」闭环

当前 6 步以"发布"为终点。但内容发布之后的生命周期更长、价值更大。

### 问题
- 发布后的内容，48 小时追踪就结束了
- 没有"内容复用"机制（一条爆款内容可以衍生出多条变体）
- 没有"内容退役"机制（过时内容需要更新或下架）

### 建议方向
```
内容全生命周期:
  创作 → 发布 → 追踪(48h) → 分类: 
    ├── 爆款(CTR > 5%) → 自动生成变体(换个标题/角度再发)
    ├── 一般(1-5%) → 优化建议 → 重新排期
    ├── 低迷(<1%) → 分析原因 → 存入失败案例库
    └── 过时 → 退役提醒 → 存档

  爆款变体生成:
    小红书爆款A (标题"618必囤") 
    → 变体B: 换个角度 ("成分党618避坑指南")
    → 变体C: 换平台 (从图文转口播脚本)
    → 变体D: 换时间 (618后持续种草)
```

一条爆款内容的 ROI 从"一次发布"变成了"持续再生"。

## C.6 「本地化智能」vs 「云端智能」的架构取舍

当前全依赖云端 LLM。但某些场景下，本地智能更优：

| 场景 | 本地更优的理由 |
|------|------|
| 实时合规检测 | 毫秒级响应，不受 API 延迟影响 |
| 用户行为学习 | 用户偏好的 Prompt 模式、风格学习，本地推理更隐私 |
| 离线草稿模式 | 断网也能继续编辑已生成的草稿 |
| 敏感行业内容 | 医疗/金融内容的预处理，避免敏感数据上传云端 |

**建议**: Phase 1 不强求，但架构预留 "local-first" 接口——所有 AI 调用通过统一的 `AiService` 抽象层，后续可无感切换本地/云端实现。

---

## C.7 「定价-成本-价值」三角的动态平衡

当前定价是静态的。但 LLM 成本在持续下降（年均 -30%~-50%），AI 能力在持续上升。  

```  
2026 Q3: 成本 $0.04/条, Pro ¥299/月 → 毛利率 85%  
2027 Q1: 成本 $0.02/条, AI 能力 ↑2x → ?  
```

**问题**：如果成本下降了、AI 更强了，你是降价还是提升利润？  

**建议**：成本下降一半时，不要降价，而是 **把多出来的利润投入到"AI 能力升级"** ——用更好的模型、更长的上下文、更多的行业模板。用户感知到的是"越来越强"，而不是"越来越便宜"。  

---

> 📅 文档版本 v1.1 · 2026-06-03 · 新增附录 B/C

---

# 附录 D：前端 UI/UX 板块优化 — /create 创作页

> 讨论日期：2026-06-03 · 状态：设计评审 · 性质：头脑风暴

## D.1 页面定位与核心问题

**地址**: `http://localhost:6060/zh-CN/create`  
**当前定位**: AI 内容创作 / 生成核心操作页

### 根本问题：定位模糊

`/create` 的核心矛盾是它没有回答一个问题：**它是一个"AI 生成器"还是一个"编辑器"？**

| 如果定位为 AI 生成器 | 单页对话式，ChatGPT 风格，输入即生成 |
|------|------|
| 如果定位为编辑器 | 三栏工作台，Notion 风格，编辑为主 AI 为辅 |

**决策：定位为「AI 驱动的编辑器」**—— 编辑为主，AI 在侧边辅助。用户拥有最终控制权。

### 当前问题清单

1. 创作动线不清晰，用户易迷失
2. 视觉与组件缺乏统一设计系统
3. 产品架构未形成 写前→写中→写后→发布 闭环
4. 缺少状态管理、错误处理、加载与空态
5. 没有"版本树"概念 —— 同一初稿的多平台派生版本相互孤立
6. 缺少"撤销 AI"交互 —— 用户无法回退 AI 的修改

---

## D.2 产品架构优化

### D.2.1 信息架构（三栏 + 时间维度）

```
顶部导航区
├── 面包屑：首页 / 内容创作 / 新建创作
├── 快捷操作：保存草稿、预览、一键发布、历史版本
└── 状态指示：草稿/生成中/已完成

左侧创作配置区（可折叠，240px）
├── 选择平台/场景
├── 选择模板（可视化卡片网格，非下拉框）
├── 输入关键词/需求
├── 品牌知识卡片（自动加载，无需重复输入）
└── 参数配置（长度、语气、条数等）

中央编辑/预览区（弹性宽度）
├── 实时 AI 生成内容（流式输出）
├── 富文本编辑/格式化
├── 多版本树（v1 → v2小红书版 → v3抖音版）
├── 撤销 AI（选中文字 → AI改写 → 撤销/再试试）
└── Diff 对比视图

右侧辅助区（可收起，280px）
├── 智能建议/热点参考
├── 数据指标预估（预估互动率/违禁词风险）
├── 操作历史/撤销重做
└── 决策溯源面板（AI 每步给出的依据）

底部状态栏
├── 保存状态、字数、token 消耗
└── 操作提示
```

### D.2.2 核心流程闭环

```
标准链路:
选题 → 选模板 → 输指令 → 生成 → 编辑 → 润色 → 预览 → 发布 → 数据反馈

补充环节:
├── 「重做」: 以当前编辑内容为 prompt，重新生成更好版本（AI 编辑器独有）
├── 「对比」: 两版内容并排 + diff 高亮差异
├── 「知识注入」: 创作前自动加载品牌知识卡片，不用每次重复输入
└── 「撤销 AI」: 浮动标签 "AI改写 | 撤销 | 再试试"
```

### D.2.3 状态管理

```
每个平台版本独立管理状态（不共享同一个 loading）:

草稿态 → 生成中 → 生成成功 → 编辑中 → 发布中 → 已发布
  ↓         ↓         ↓
 暂停     失败      部分就绪
           ↓         (如小红书OK，抖音失败)
         重试          ↓
                   用户可先编辑成功版本
                   同时重试失败版本
```

---

## D.3 UI 设计系统

### D.3.1 设计 Token

```
主色：品牌紫 oklch(55.8% 0.288 302.321)
功能色：成功 #10B981、警告 #F59E0B、错误 #EF4444、链接 #3B82F6
中性色：背景 #F5F7FA、卡片 #FFF、文字 #1D2129、次要 #4E5969、占位 #86909C

字体层级：
  标题 16-20px / 600 / line-height 1.3
  正文 14px / 400 / line-height 1.5
  辅助 12px / 400

间距：模块间距 24/32px，卡片内边距 16/20px
圆角：统一 4-6px（B 端克制）

组件状态矩阵（每个组件必须覆盖）:
  Default / Hover / Focus / Active / Disabled / Loading / Error / Empty
```

### D.3.2 模板选择器（差异化设计）

```
模板选择不应是下拉框，而是可视化卡片网格:

┌─────────┐  ┌─────────┐  ┌─────────┐
│ 📕       │  │ 🎵       │  │ 📺       │
│ 小红书种草│  │ 抖音口播  │  │ B站深度  │
│ 图文+emoji│  │ 15-60秒  │  │ 长视频脚本│
│ 转化率↑15%│  │ 完播率↑8%│  │ 互动率↑12%│
└─────────┘  └─────────┘  └─────────┘

每张卡片：模板名 + 平台 + 内容格式 + 预期效果
hover: 模板预览示例 + "使用此模板"
```

### D.3.3 进度反馈三阶段

```
阶段1 (0-3s): 骨架屏 + "正在分析你的需求..."
  展示：意图识别中 → 已识别行业、目标、平台

阶段2 (3-15s): 流式输出 + "正在生成内容..."
  展示：标题已生成 → 正文逐字输出 → 标签推荐出现

阶段3 (15-30s): 完成后 + "内容已生成 ✓"
  展示：质量评分 + 修改建议 + "一键发布"
```

---

## D.4 交互关键优化

| 交互 | 当前 | 优化后 |
|------|------|------|
| 生成模式 | 一键生成 | **逐步确认** — 每次 AI 输出都留 touch point |
| 撤销 | Ctrl+Z | **撤销 AI** — 浮动标签 "AI改写 | 撤销 | 再试试" |
| 多版本 | 无 | **版本树** — 从同一初稿派生多平台版本 |
| 品牌信息 | 每次手动输入 | **知识卡片** — 自动加载，一次配置复用 |
| 对比 | 无 | **Diff 视图** — 高亮 AI 修改了哪里 |
| 移动端 | 无适配 | **步骤式** — 单栏滑动切换，顶部进度条 |

---

## D.5 落地优先级

| 优先级 | 事项 | 说明 |
|:--:|------|------|
| **P0** | 统一按钮/输入框/卡片样式 | 建立设计系统是前提 |
| **P0** | 三栏布局定型 + 可折叠 | 布局是骨架，先定型再做组件 |
| **P0** | 生成中 Loading + 失败重试 + 自动保存 | 体验底线 |
| **P0** | 面包屑 + 页面标题 | 导航基础 |
| **P1** | 智能选题 + 热点推荐 | 选题质量决定内容质量上限 |
| **P1** | 空态/错误态统一界面 | 减少用户困惑 |
| **P1** | 品牌知识卡片 | 减少重复输入 |
| **P1** | 历史版本/撤销 AI | AI 编辑器核心交互 |
| **P2** | 多版本并排对比 + Diff 视图 | 差异化体验 |
| **P2** | 发布后数据看板打通 | 闭环 |
| **P2** | 移动端步骤式适配 | 移动端场景 |

---

## D.6 一句话总结

**把 `/create` 从简单生成页升级为标准、高效、闭环的 AI 创作工作台：定位为"AI 驱动的编辑器"而非生成器，架构清晰、动线顺畅、UI 统一、交互可信。**

---

# 附录 E：内容管理板块（/draft-box）优化

> 讨论日期：2026-06-03 · 状态：设计评审 · 性质：头脑风暴

## E.1 当前状态

`/draft-box` 页面缺 page.tsx，处于"路由存在但页面空白"状态。这是内容管理的枢纽，需要从零设计。

## E.2 核心定位

**/draft-box = 内容管理中枢 = 用户的"内容资产库"**

不是草稿列表。是包括草稿、生成中、已完成、已发布、已归档的全部内容的统一管理入口。

## E.3 信息架构：版本树模型

### E.3.1 数据模型

```
SourceDraft (源稿，不绑定平台)
├── id, title, content, tags, createdAt
├── status: draft | generating | ready | archived
├── brandContext: { name, tone, sellingPoints, forbiddenWords }
└── children: VersionBranch[]

VersionBranch (平台版本，继承源稿)
├── id, parentId, platform, content
├── status: generating | success | failed | published
├── publishedAt, platformPostId
├── metrics: { views, likes, comments, shares }
└── note: "从小红书版本AI重做派生的变体"
```

### E.3.2 列表视图 → 版本树视图

```
传统列表视图（默认）:
┌────────────────────────────────┐
│ 📄 618美妆促销方案   草稿 · 3h前 │
│    小红书版 ✅ 抖音版 ⏳         │
├────────────────────────────────┤
│ 📄 新品成分解析      已发布 · 1d前│
│    小红书版 📊 1.2w阅读          │
└────────────────────────────────┘

展开为版本树视图（点击展开）:
▼ 📄 618美妆促销方案 (源稿)
  ├── 📕 小红书版 · 已发布 · 1.2w阅读
  │     └── ✨ AI变体 · 草稿
  ├── 🎵 抖音版 · 编辑中
  └── ＋ 派生新版本
```

## E.4 功能模块

### E.4.1 顶部操作栏

```
[🔍 搜索]  [平台筛选▼]  [状态筛选▼]  [时间排序▼]  [＋ 新建创作]
```

### E.4.2 批量操作

```
选中多条 → [批量发布] [批量归档] [批量删除] [批量导出]
```

### E.4.3 单条操作（hover 显示）

```
┌──────────────────────────────────┐
│ 📄 618美妆促销    ...            │
│   [编辑] [预览] [发布] [派生]     │
│   [归档] [删除] [···更多]        │
└──────────────────────────────────┘
```

### E.4.4 状态标签系统

| 状态 | 标签样式 | 说明 |
|------|------|------|
| 草稿 | 灰色圆点 | 未完成编辑 |
| 生成中 | 蓝色脉冲 | AI 正在生成 |
| 待审核 | 橙色圆点 | 生成完成，待用户确认 |
| 已发布 | 绿色圆点 | 已推送到平台 |
| 部分失败 | 红色感叹号 | 部分平台发布失败 |
| 已归档 | 灰色 | 不再活跃 |

### E.4.5 数据看板（列表顶部）

```
┌──────────┬──────────┬──────────┬──────────┐
│ 32       │ 18       │ 5        │ 9        │
│ 全部内容  │ 已发布    │ 草稿      │ 生成中    │
└──────────┴──────────┴──────────┴──────────┘
```

## E.5 UI 设计要点

### E.5.1 移动端适配

```
移动端列表 = 卡片堆叠 + 底部 Tab 筛选

每张卡片展示:
  标题 (1行，溢出省略)
  状态标签 + 更新时间
  平台版本数 (📕2 🎵1)
  右滑 → [编辑] [删除]
```

### E.5.2 空态设计

```
首次使用（无内容）:
  🎨 插画
  "还没有创作内容"
  "选择模板，开始你的第一次 AI 创作"
  [✨ 开始创作] [📋 浏览模板]

筛选后无结果:
  🔍 图标
  "没有找到符合条件的内容"
  [清除筛选]
```

### E.5.3 加载态

```
骨架屏：4 行矩形卡片占位，shimmer 动画
首次加载 < 500ms 不展示骨架屏（避免闪烁）
```

## E.6 补充讨论：我的反馈

### E.6.1 源稿不绑定平台 — 明确化

版本树的核心前提：**源稿不绑定平台**。如果源稿绑定平台，分支就变成"同一平台的多次修改"而非"跨平台派生"。

```
✅ 正确：源稿（无平台）→ 小红书版 / 抖音版 / B站版
❌ 错误：小红书版（源稿）→ 小红书改版 / 小红书再改版
```

### E.6.2 "一键生成初稿" vs "一键全量生成"

分步确认不等于完全去掉"快"的体验。保留**"一键生成初稿"**作为快速开始入口：

| 一键生成初稿（保留） | 一键全量生成（废除） |
|------|------|
| 生成后进入编辑流程 | 生成=结束 |
| 是创作的"起点" | 是创作的"终点" |

### E.6.3 "撤销 AI"的批次管理

```
问题场景：用户选中3个段落分别让AI改写
→ 每段旁边出现浮动标签 → 标签堆叠

解决方案：每次AI改写生成一个"改写批次"
┌──────────────────────────────┐
│ AI 改写批次 #3 (2秒前)        │
│ 修改了 3 个段落               │
│ [全部应用] [全部撤销] [逐段查看]│
└──────────────────────────────┘
```

### E.6.4 移动端的版本树

移动端无法展示完整树形结构。降级方案：

```
移动端：平铺列表 + 父子关系用缩进+连线表示

  618美妆促销 (源稿)
    └─ 📕 小红书版 · 已发布
      └─ ✨ AI变体 · 草稿
    └─ 🎵 抖音版 · 编辑中
  
  每行左滑 → 操作菜单
```

### E.6.5 微动效规范补充

组件状态矩阵之外，需要统一的过渡动效 Token：

```
duration:
  --duration-fast: 100ms (按钮按下回弹)
  --duration-normal: 200ms (hover抬升、内容切换)
  --duration-slow: 300ms (面板展开、fadeIn)

easing:
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1) (标准过渡)
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1) (弹性回弹)
```

## E.7 落地优先级

| 优先级 | 事项 | 说明 |
|:--:|------|------|
| **P0** | 版本树数据模型 + 列表页骨架 | 数据结构先于 UI |
| **P0** | 搜索/筛选/排序基础功能 | 列表页基础 |
| **P0** | 状态标签系统 + 空态/骨架屏 | 体验底线 |
| **P1** | 版本树可视化展开/折叠 | 核心差异体验 |
| **P1** | 批量操作（发布/归档/删除） | 效率工具 |
| **P1** | 数据看板（顶部计数栏） | 信息概览 |
| **P2** | 撤销 AI 批次管理 | 高级交互 |
| **P2** | 移动端滑动操作 | 移动适配 |

---

> 📅 文档版本 v1.2 · 2026-06-03 · 新增附录 D/E

# 附录 F：内容创作架构深化 — 数据模型与工程实现

> 讨论日期：2026-06-03 · 状态：设计评审 · 性质：架构设计

## F.1 底层数据架构：源稿 + 树形版本（DAG 模型）

### F.1.1 核心约束

- **源稿 SourceDraft.platform = null**，不绑定任何渠道
- 仅分支子版本绑定单一平台（小红书/抖音/公众号...）
- 同一源稿可无限派生多平台、多迭代子版本
- 从数据层面实现「一稿多端」

### F.1.2 数据模型（含派生原因）

```json
{
  "id": "draft-001",
  "content": "源正文（无平台绑定）",
  "platform": null,
  "status": "ready",
  "brandContext": {
    "name": "XX美妆",
    "version": "v1",
    "tone": "年轻活泼",
    "sellingPoints": ["天然成分", "敏感肌可用"],
    "forbiddenWords": ["最好", "第一", "万能"]
  },
  "brandKnowledgeVersion": "brand-v1-202606",
  "children": [
    {
      "id": "v-xhs-1",
      "parentId": "draft-001",
      "platform": "xhs",
      "status": "published",
      "content": "小红书版本正文",
      "derivedFrom": {
        "type": "ai_redo",
        "prompt": "换个更活泼的语气",
        "aiBatchId": "batch-003"
      },
      "lockedBy": null,
      "conflictWith": null
    },
    {
      "id": "v-douyin-1",
      "parentId": "draft-001",
      "platform": "douyin",
      "status": "generating",
      "content": "抖音版本正文",
      "derivedFrom": {
        "type": "platform_adapt",
        "prompt": "从小红书版本适配为抖音口播脚本",
        "aiBatchId": "batch-004"
      }
    }
  ]
}
```

### F.1.3 派生原因枚举

| 类型 | 说明 | 用途 |
|------|------|------|
| `ai_redo` | AI 重做/改写 | 批次撤销时反向追溯受影响版本 |
| `manual_edit` | 用户手动修改 | 区分 AI 编辑和用户编辑 |
| `platform_adapt` | 跨平台适配 | 追踪多平台内容血缘 |

**价值**：用户看版本树时知道每个分支"怎么来的"；数据分析时统计"AI 采纳率"和"AI 改写保留比例"。

## F.2 架构分层解耦（7 层）

```
┌─────────────────────────────────────────┐
│ Layer 1: 品牌知识库层                     │
│ 品牌信息、卖点、禁用词、风格 → 版本化管理   │
├─────────────────────────────────────────┤
│ Layer 2: 模板引擎层                       │
│ 行业模板、内容格式、平台参数 → 卡片化匹配    │
├─────────────────────────────────────────┤
│ Layer 3: AI 任务调度层                    │
│ 独立实例、状态机、部分就绪、降级重试         │
├─────────────────────────────────────────┤
│ Layer 4: 冲突检测层 🆕                    │
│ 段落级锁、版本冲突提示、合并策略             │
├─────────────────────────────────────────┤
│ Layer 5: 富文本编辑层                      │
│ 流式预览、Diff 高亮、批次撤销、逐段确认      │
├─────────────────────────────────────────┤
│ Layer 6: 版本管理层                       │
│ 版本树 CRUD、派生溯源、DAG 遍历            │
├─────────────────────────────────────────┤
│ Layer 7: 发布数据层                       │
│ 平台 API 适配、发布追踪、效果回流           │
└─────────────────────────────────────────┘
```

### F.2.1 冲突检测层（新增）

```
场景：用户在编辑 v-xhs-1 第二段的同时，AI 正在改写同一段落

机制：
├── 段落级锁：AI 操作的段落标记 lockedBy = "ai-batch-005"
├── 版本级提示：检测到冲突 → 提示"另一操作正在修改此段落"
└── 合并策略：
    ├── 用户优先：用户编辑覆盖 AI 改写
    ├── AI 优先：AI 改写覆盖用户编辑
    └── 手动合并：展示两版 → 用户逐段选择

数据字段:
  lockedBy: string | null     // 锁定者标识
  conflictWith: string | null // 冲突版本 ID
```

### F.2.2 AI 任务粒度

每个平台生成任务为独立实例，独立状态机：

```
单任务状态: pending → generating → success | failed
多任务聚合: 部分就绪（成功版本即时可编辑，失败条目独立重试）
```

## F.3 创作流程：双生成路径

### F.3.1 路径设计

| 路径 | 定位 | 保留/废除 |
|------|------|:--:|
| **一键全量生成终稿** | 生成即结束，AI 主导，无编辑环节 | ❌ 废除 |
| **一键生成初稿** | 快捷入口，初稿落地后自动进入编辑 + 分支迭代 | ✅ 保留 |

### F.3.2 标准主链路

```
品牌知识自动注入 → 卡片选模板 → AI 三选题用户选定 →
确认大纲 → 逐段子循环生成 → AI 局部改写 → 批次撤销 AI →
Diff 内容对比 → 版本树分支存档 → 分平台发布
```

### F.3.3 逐段生成子循环

```
大纲确认后 → 
  生成第 1 段 → 用户确认（OK 继续 / 改写优化） →
  生成第 2 段（自动带入前段上下文）→ 用户确认 →

  ...用户说"停，换个风格" → 

  状态 = "子循环中断"
  ├── 第 1 段和第 2 段保留（已确认内容不丢）
  ├── 用户可以：① 继续从第 3 段 ② 从第 2 段重来 ③ 换模板
  └── 中断时写入草稿，下次打开恢复到此中断点
```

## F.4 品牌知识版本化

### F.4.1 问题

品牌信息会变化——产品线调整、新卖点上线、禁用词更新。

### F.4.2 方案

```
品牌知识版本:
  v1 (2026-06): 卖点 = 天然成分、敏感肌可用
  v2 (2026-08): 新增卖点 = 618爆款认证、月销10w+
  v3 (2026-10): 禁用词新增 "全效" "万能"

每次创作记录 brandKnowledgeVersion → 
  → 合规追溯：下架内容可追溯到当时的品牌规范版本
  → 效果归因：新版品牌知识发布后内容效果提升了多少
```

## F.5 UI 进度展示硬约束

### F.5.1 三阶 Loading 规范

```
0～3s（需求解析）:  骨架屏 ｜ "正在分析你的需求..."
3～15s（流式生成）: 逐字输出 ｜ "分段生成正文内容..."
15～30s（收尾）:    完整内容 + 评分卡片 ｜ "正在校验内容质量..."
```

### F.5.2 禁止展示

```
❌ 技术文案: LLM、Token、API、RAG、模型调用
❌ 拟人化但无信息: "AI 正在思考..."、"请稍候..."
❌ 无法验证的数字: "45% 完成"、"还剩约 18 秒"

✅ 已完成的具体成果:
  "已识别：美妆行业 · 618促销 · 小红书+抖音"
  "标题已生成（3个候选）"
  "正文第 2 段已完成"
  "质量检测通过 4/5 项"

原则：展示「已完成的具体成果」，不展示「模糊的进度数字」
```

## F.6 组件状态矩阵 + 微动效规范

### F.6.1 全组件状态矩阵

| 组件 | Default | Hover | Focus | Pressed | Disabled | Loading | Error | Empty |
|------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 按钮 | ✓ | ✓ | - | ✓ | ✓ | ✓ | - | - |
| 输入框 | ✓ | ✓ | ✓ | - | ✓ | ✓ | ✓ | - |
| 功能卡片 | ✓ | ✓ | - | - | - | - | - | ✓ |
| 标签 | ✓ | - | - | - | ✓ | - | - | - |

所有组件在 Figma 落地 Variant 变体。

### F.6.2 全局微动效 Token

```
--duration-fast: 100ms     // 按钮按下回弹
--duration-normal: 200ms   // hover 抬升、内容切换
--duration-slow: 300ms     // 面板展开、fadeIn

--ease-out: cubic-bezier(0.16, 1, 0.3, 1)         // 标准过渡
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)  // 弹性回弹

按钮点击: 100ms scale(0.97) → 回弹
卡片 Hover: 200ms translateY(-2px) + shadow 加深
弹窗入场: 300ms fadeIn 淡入
Tab 切换: 200ms crossfade 交叉淡入
```

## F.7 AI 改写批次管理（解决标签堆叠）

```
用户批量选中多段落 → AI 改写 → 生成「改写批次卡片」

┌──────────────────────────────┐
│ AI 改写批次 #3 (2秒前)        │
│ 修改了 3 个段落               │
│ [全部应用] [全部撤销] [逐段查看]│
└──────────────────────────────┘

仅点开"逐段查看"后，单段落才出现「撤销 / 再试试」按钮
```

## F.8 两端布局规范

| 端 | 布局 | 说明 |
|------|------|------|
| **PC** | 24 栅格三栏：左 6｜中 12｜右 6 | 左右侧边栏可折叠，折叠后主编辑区自适应扩宽 |
| **移动端** | 单栏分步式 | 顶部全局进度条，步骤纵向滑动切换：选模板→填需求→生成→编辑发布 |

## F.9 落地优先级

| 优先级 | 事项 | 分类 |
|:--:|------|------|
| **P0** | 版本树数据库结构 + 源稿 platform=null 约束 | 数据层 |
| **P0** | 页面三栏 + PC/移动端布局骨架 | 布局 |
| **P0** | 独立任务状态机 + 部分就绪逻辑 | 调度层 |
| **P0** | 品牌知识库接入 + 卡片式模板底层接口 | 配置层 |
| **P0** | 自动草稿持久化 + 面包屑路由 | 存储层 |
| **P1** | 逐段生成子循环 + 暂停/续传 | 生成层 |
| **P1** | 批次化 AI 撤销 + Diff 差异对比 | 编辑层 |
| **P1** | 品牌知识版本化存储 | 配置层 |
| **P2** | 冲突检测层 + 段落级锁 | 架构层 |
| **P2** | 热点素材中台接入 + 高阶版本分支 | 扩展层 |

---

## F.10 顶层产品定位

**页面改造核心：从「AI 替用户写内容」→「AI 辅助用户创作」**

版本树、分步生成、逐段确认、批次撤销、派生溯源——全部围绕一个锚点：

> **用户是内容主体，AI 是工具。**

---

> 📅 文档版本 v1.3 · 2026-06-03 · 新增附录 F

# 附录 G：统一发布板块（/publish）优化

> 讨论日期：2026-06-03 · 状态：设计评审 · 性质：头脑风暴

## G.1 核心定位

`/publish` 不只是"内容出口"，而是**内容质量的最后一道关隘**——像 CI/CD 的部署流水线，不通过检查就发不出去。

```
/create（创作）→ /publish（把关）→ 平台（上线）
                     ↑
              拦住：合规问题 / 格式问题 / 策略问题 / 账号问题
```

## G.2 架构优化

### G.2.1 与 /create 版本树打通（核心）

```
发布任务必须绑定：
  draftId + versionId + brandKnowledgeVersionId

确保全链路可追溯：谁发、哪个版本、哪套品牌知识
```

### G.2.2 多平台独立状态机

```
单平台任务: 待发布｜发布中｜发布成功｜发布失败｜已撤回
多平台聚合: 部分成功 → 成功平台即时上线，失败平台独立重试
```

### G.2.3 三层关键架构

```
发布校验层: 敏感词/违规词/字数/封面/标签完整性预检
          预检分级: Error(阻断) + Warning(提醒) + Info(建议)

冲突检测层: 同内容短时间重复发布拦截、同账号并发发布拦截

数据回流层: 发布后自动拉取曝光/播放/互动，回填对应版本
          到达阈值触发: 爆款预警(CTR>8%) / 低效预警(CTR<1%)
```

### G.2.4 定时发布二次预检

```
用户 14:00 创建定时发布 19:00 → 预检通过
18:50 → 二次预检 → 账号 Token 过期
→ 提前通知用户，不静默失败
→ [重新授权] [更换账号] [取消发布]
```

## G.3 页面架构

### G.3.1 信息架构

```
顶部筛选区: 标题搜索 / 平台筛选 / 发布状态 / 时间范围
  + 快捷标签: 全部 | 待定时 | 发布中 | 发布失败 | 已上线
  + 筛选条件自动记忆

中部任务列表: 按源稿 ID 分组
  ▼ 📄 618方案 (源稿)  2/3 已完成
    ├── 📕 小红书 · ✅ · 12:00 · 👁1.2w 💬328
    ├── 🎵 抖音 · ⏳ 定时 19:30 · [编辑] [立即发布]
    └── 📺 B站 · ❌ 账号失效 · [🔄 重试]

右侧抽屉: 单任务详情（点击条目拉出，不新开页面）
```

### G.3.2 面包屑

```
工作台 → AI 内容创作 → 发布管理
支持点击返回上级
从发布条目可一键跳转 /create 对应版本
```

## G.4 列表设计

### G.4.1 精简字段

```
固定展示: 内容标题、关联版本、平台&账号、计划时间、状态、快捷操作
次要信息: 创建人、校验详情 → 收纳进详情抽屉
```

### G.4.2 默认排序

```
按关注优先级排列（非时间倒序）:
  失败 > 发布中 > 待定时 > 已成功

用户打开第一眼看到"需要我处理什么"
```

### G.4.3 状态可视化

| 状态 | 标签 | 说明 |
|------|------|------|
| 待定时发布 | 灰色 | |
| 发布进行中 | 蓝色动态 Loading | |
| 发布成功 | 绿色 + 可选数据缩略 | 👁 1.2w 💬328 |
| 发布失败 | 红色 + 失败简述 | 账号失效 / 内容违规 / 频次超限 |

### G.4.4 失败条目体验（两层）

```
Layer 1 (列表行内): 失败类型短标签
  [账号失效] [内容违规] [频次超限] [封面缺失]
  → 失败条目自动置顶，不被成功数据淹没
  → 行内【🔄 重试】按钮外显

Layer 2 (hover/点击): 具体原因 + 修复指引
  "小红书账号 Access Token 已于 6月1日过期
   [去 /accounts 重新授权] [换一个账号发布]"
```

## G.5 核心操作

### G.5.1 新建发布流程

```
[＋ 新建发布] → 从 /create 版本树选择 → 勾选平台 →
各平台独立配置时间（部分立即/部分定时）→ 
发布前自动预检 → 预检通过 → 发布
预检不通过 → 标红列明问题 → 一键跳转修改
```

### G.5.2 定时任务管理

```
定时发布: 修改时间 / 取消 / 提前立即发布
临近发布(30min): 浅底色提醒
定时中内容被修改: 提示需重新校验
```

### G.5.3 批量操作

```
多选 → 顶部浮出批量操作栏:
  [批量重试失败] [批量取消待发布] [批量更换账号]

分组级操作: [一键发布全组] [一键取消全组]
```

### G.5.4 发布队列视图

```
🔴 发布中 (2)
  ├── 618美妆 · 小红书 · 30%
  └── 新品成分 · 抖音 · 60%
🟡 待发布 (5)
  ├── 每日种草 · 小红书 · 18:00
  └── ...
🟢 今日已完成 (3)
```

## G.6 反馈与空态

```
操作反馈: Toast 提示（成功/失败原因），禁用技术术语
加载: 列表骨架屏，不整页转圈
空态分层:
  全量无发布 → 插画 + [前往创作内容]
  筛选无结果 → "暂无匹配数据" + [清空筛选]
```

## G.7 移动端适配

```
单栏卡片布局:
┌─────────────────────────┐
│ 📕 618美妆 · 小红书       │
│ ❌ 失败 · 账号失效        │
│ [🔄 重试]        [⋯ 更多]│  ← 重试始终外显
└─────────────────────────┘

"更多"里: 查看详情、编辑原稿、删除
```

## G.8 落地优先级

| 优先级 | 事项 | 分类 |
|:--:|------|------|
| **P0** | 与 /create 版本树绑定（draftId+versionId） | 数据层 |
| **P0** | 多平台独立状态 + 失败单点重试 | 调度层 |
| **P0** | 发布前自动预检（Error/Warning/Info） | 校验层 |
| **P0** | 冲突检测 + 并发拦截 | 校验层 |
| **P0** | 失败原因明细 + 修复指引（两层） | 体验 |
| **P0** | 状态可视化标签 + 空态引导 | UI |
| **P0** | 源稿分组展示 + 一键跳回 /create | 导航 |
| **P0** | 失败条目置顶 + 行内快捷重试 | 体验 |
| **P1** | 快捷筛选标签 + 筛选条件记忆 | 筛选 |
| **P1** | 右侧抽屉式详情 + 批量操作 | 交互 |
| **P1** | 定时发布编辑 + 二次预检 | 发布 |
| **P1** | 发布队列视图 | 监控 |
| **P1** | 已发布条目显示数据缩略（👁 💬） | 数据 |
| **P2** | 定时任务临近提醒 | 提醒 |
| **P2** | 发布效果分析面板 | 数据 |
| **P2** | 批量发布/批量重试 | 效率 |

## G.9 一句话总结

**/publish 不是"发布列表"，而是内容质量的最后一道关隘——从版本绑定到预检阻断到数据回流，每个环节都在说：不通过检查，发不出去。**

---

> 📅 文档版本 v1.4 · 2026-06-03 · 新增附录 G
