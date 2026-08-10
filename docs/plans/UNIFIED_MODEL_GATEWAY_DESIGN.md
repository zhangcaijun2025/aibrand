# AiBrand 统一模型网关设计方案

> 目标: 14 图像模型 + 16 视频模型 → 统一调度 · 统一参数 · 统一计费 · 前端选择器 · 跨模态工作流

---

## 一、模型清单 & API Provider 映射

### 1.1 图像模型 (14+ 变体, 6 家服务商)

| # | 模型名称 | API Provider | API 端点 | 接入难度 |
|---|---------|-------------|---------|---------|
| 1 | **GPT Image 2** | OpenAI | `POST /v1/images/generations` | ★☆☆ 已有 OpenAI 兼容层 |
| 2 | **Nano Banana Pro** | 即梦 Jimeng (火山 ARK) | `POST /v1/chat/completions` (多模态) | ★★☆ 需 ARK 配置 |
| 3 | **Nano Banana 2** | 即梦 Jimeng (火山 ARK) | 同上 | ★★☆ |
| 4 | **Nano Banana 2 Lite** | 即梦 Jimeng (火山 ARK) | 同上 | ★★☆ |
| 5 | **Nano Banana** | 即梦 Jimeng (火山 ARK) | 同上 | ★★☆ |
| 6 | **Seedream 5.0 Pro** | 火山引擎 ARK | `POST /v1/images/generations` | ★☆☆ 已接入 Seedream 4.0 |
| 7 | **Seedream 5.0 Lite** | 火山引擎 ARK | 同上 | ★☆☆ |
| 8 | **Seedream 4.5** | 火山引擎 ARK | 同上 | ★☆☆ 已有代码 |
| 9 | **Wan 2.7 Pro** | 阿里百炼 DashScope | `POST /api/v1/services/aigc/multimodal-generation/generation` | ★★☆ |
| 10 | **Qwen Image 3.0 Pro** | 阿里百炼 DashScope | `POST /api/v1/services/aigc/text2image/image-synthesis` | ★★☆ |
| 11 | **Qwen Image 2.0 Pro** | 阿里百炼 DashScope | 同上 | ★★☆ |
| 12 | **Qwen Image 2.0** | 阿里百炼 DashScope | 同上 | ★★☆ |
| 13 | **Qwen Image Plus** | 阿里百炼 DashScope | 同上 | ★★☆ |
| 14 | **ZImage Turbo** | 智谱 AI (BigModel) | `POST /api/paas/v4/images/generations` | ★★☆ |
| 15 | **Midjourney Niji7** | Midjourney (via 第三方代理) | `POST /v1/midjourney` (代理) | ★★★ 需代理层 |
| 16 | **Midjourney V8.2** | Midjourney (via 第三方代理) | 同上 | ★★★ |

> 注: Qwen Image 系列按 4 个独立变体接入，共享同一 API 端点但 modelId 不同。

### 1.2 视频模型 (16 个, 8 家服务商)

| # | 模型名称 | API Provider | API 端点 | 接入难度 |
|---|---------|-------------|---------|---------|
| 1 | **Seedance 2.5** | 火山引擎 ARK | `POST /v1/video/generations` | ★★☆ |
| 2 | **Seedance 2** | 火山引擎 ARK | 同上 | ★★☆ |
| 3 | **Seedance Pro** | 火山引擎 ARK | 同上 | ★★☆ |
| 4 | **Happy Horse 1.1** | 即梦 Jimeng (火山 ARK) | `POST /v1/video/generations` | ★★☆ |
| 5 | **Happy Horse** | 即梦 Jimeng (火山 ARK) | 同上 | ★★☆ |
| 6 | **MiniMax H3** | MiniMax (Hailuo AI) | `POST /v1/video/generation` | ★★☆ |
| 7 | **Veo3.1** | Google Vertex AI | `POST /v1/projects/{project}/locations/{location}/publishers/google/models/veo-3.1:predictLongRunning` | ★★★ |
| 8 | **Veo3.1 Fast** | Google Vertex AI | 同上 (fast variant) | ★★★ |
| 9 | **Gemini Omni Flash** | Google AI / Vertex AI | `POST /v1/models/gemini-2.5-flash:generateContent` | ★★☆ |
| 10 | **Kling O1** | 可灵 Kuaishou | `POST /v1/videos/text2video` | ★★☆ |
| 11 | **Kling 3.0** | 可灵 Kuaishou | 同上 | ★★☆ |
| 12 | **Kling 3.0 Omni** | 可灵 Kuaishou | 同上 | ★★☆ |
| 13 | **Kling 2.6** | 可灵 Kuaishou | 同上 | ★★☆ |
| 14 | **Wan 2.7 (视频)** | 阿里百炼 DashScope | `POST /api/v1/services/aigc/video-generation/video-synthesis` | ★★☆ |
| 15 | **Vidu Q2** | 生数科技 Vidu | `POST /v1/video/generations` | ★★☆ |
| 16 | **Hailuo 2.3** | 智谱 AI (BigModel) | `POST /api/paas/v4/videos/generations` | ★★☆ |

### 1.3 API Provider 归并 (去重后 8 家)

```
Provider                          图像模型               视频模型              已有集成
─────────────────────────────────────────────────────────────────────────────────────
火山引擎 ARK (ByteDance)         Seedream 3个 + Nano 4个  Seedance 3个+Happy 2个   ✅ Seedream 4.0
阿里百炼 DashScope               Wan2.7 + Qwen 4个        Wan2.7视频              ❌ 新建
智谱 BigModel                    ZImage Turbo            Hailuo 2.3              ❌ 新建
OpenAI                           GPT Image 2             -                        ✅ 已有 GateWay
Google Vertex AI                 -                       Veo3.1×2 + Gemini        ❌ 新建
可灵 Kuaishou                    -                       Kling 4个                ❌ 新建
MiniMax                          -                       MiniMax H3               ❌ 新建
生数科技 Vidu                    -                       Vidu Q2                  ❌ 新建
Midjourney (第三方代理)          Niji7 + V8.2            -                        ❌ 新建
```

---

## 二、整体架构设计

### 2.1 三层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (aibrand-studio)                     │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ ModelSelector    │  │ UnifiedParams    │  │ CrossModalFlow   │  │
│  │ (模态×能力筛选)   │  │ (统一参数表单)    │  │ (图/文/视频联动)  │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│           │                     │                     │             │
│           └─────────────────────┼─────────────────────┘             │
│                                 │                                   │
│                  POST /api/models/unified/generate                  │
│                  POST /api/models/unified/query                      │
│                  GET  /api/models/unified/capabilities               │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND — Unified Model Gateway                   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  UnifiedModelController  (统一入口)                           │  │
│  │  · POST /generate   · GET /capabilities   · GET /providers   │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐  │
│  │  ModelRouterService  (模型路由引擎)                           │  │
│  │  · 模态匹配 (text/image/video)                                │  │
│  │  · 七维评分 (质量/速度/成本/风格/分辨率/隐私/健康)            │  │
│  │  · 降级策略 (A→B→C fallback chain)                           │  │
│  │  · 用户配额检查 (credits/userTier)                            │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                       │
│  ┌──────────────────────────▼───────────────────────────────────┐  │
│  │  ModelAdapterRegistry  (适配器注册表)                         │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │  │
│  │  │ARK      │ │DashScope│ │BigModel │ │OpenAI   │  ...      │  │
│  │  │Adapter  │ │Adapter  │ │Adapter  │ │Adapter  │           │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │  │
│  └───────┼───────────┼───────────┼───────────┼────────────────┘  │
│          │           │           │           │                     │
│  ┌───────▼───────────▼───────────▼───────────▼────────────────┐  │
│  │  BillingService / MetricsService / CacheService             │  │
│  │  · credits 消费记录  · 调用指标  · API Key 加密存储         │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ADAPTER LAYER (8 Adapters)                        │
│                                                                     │
│  每个 Adapter 实现:                                                  │
│  · translateRequest(unified) → provider-specific                    │
│  · translateResponse(provider) → unified                            │
│  · healthCheck() → { available, latency }                           │
│  · getCapabilities() → CapabilityEntry[]                            │
└────────────────────────────────┬────────────────────────────────────┘
                                  │
          ┌───────────┬───────────┼───────────┬───────────┐
          ▼           ▼           ▼           ▼           ▼
    火山引擎 ARK  阿里百炼    智谱AI      OpenAI    Google AI
    Seedream     Wan2.7      ZImage      GPT-4     Veo3.1
    Seedance     Qwen Image  Hailuo      Image2    Gemini
    Nano Banana  Wan Video
    Happy Horse

    可灵 Kuaishou   MiniMax     生数 Vidu   Midjourney
    Kling O1/3.0   H3           Vidu Q2     Niji7/V8.2
```

### 2.2 核心接口定义

```typescript
/* ═══════════════════════════════════════════════════════════════
 * 统一模型生成请求 (前端 → 后端)
 * ═══════════════════════════════════════════════════════════════ */

type ModelModality = 'text' | 'image' | 'video'

interface UnifiedGenerateRequest {
  // ── 必填 ──
  modality: ModelModality
  prompt: string
  capability?: string                    // 'smart_cover' | 'txt2img' | 'txt2video' | 'img2video'

  // ── 模型选择 (可选, 不填则自动路由) ──
  preferModel?: string                   // 指定模型名, 如 'seedream-5.0-pro'
  preferProvider?: string                // 指定提供商, 如 'volcano-ark'

  // ── 图像参数 ──
  imageParams?: {
    size?: string                        // '1024x1024' | '1024x1360' | '2048x2720'
    aspectRatio?: string                 // '1:1' | '3:4' | '9:16' | '16:9'
    n?: number                           // 1-4
    style?: string                       // 'fresh' | 'luxury' | 'tech' | ...
    quality?: 'standard' | 'hd' | 'ultra'
    referenceImages?: string[]           // base64 URLs, for img2img
    negativePrompt?: string
    seed?: number                        // for reproducibility
  }

  // ── 视频参数 ──
  videoParams?: {
    duration?: number                    // seconds (4-60)
    fps?: number                         // default 24
    resolution?: string                  // '720p' | '1080p' | '2K'
    aspectRatio?: string                 // '16:9' | '9:16' | '1:1'
    startImageUrl?: string               // first frame reference
    endImageUrl?: string                 // last frame reference (optional)
    motionStrength?: number              // 0-1, motion intensity
    cameraControl?: string               // 'static' | 'pan' | 'zoom' | 'orbit'
    audioPrompt?: string                 // background audio description
    style?: string
    negativePrompt?: string
  }

  // ── 通用选项 ──
  options?: {
    userTier?: 'free' | 'pro' | 'enterprise'
    priority?: 'speed' | 'quality' | 'cost'
    webhookUrl?: string                  // 异步回调
    maxBudget?: number                   // USD, 成本上限
    externalId?: string                  // 外部任务跟踪 ID
  }
}

/* ═══════════════════════════════════════════════════════════════
 * 统一模型生成响应 (后端 → 前端)
 * ═══════════════════════════════════════════════════════════════ */

interface UnifiedGenerateResponse {
  success: boolean
  taskId: string                         // UUID, 用于异步轮询
  status: 'completed' | 'processing' | 'queued' | 'failed'

  // ── 实际使用的模型 ──
  modelUsed: string                      // 'seedream-5.0-pro'
  providerUsed: string                   // 'volcano-ark'
  modality: ModelModality

  // ── 结果 (同步完成时) ──
  results?: UnifiedResult[]

  // ── 异步任务信息 (processing/queued 时) ──
  pollUrl?: string                       // GET /api/models/unified/query/{taskId}
  estimatedTime?: number                 // 预估剩余秒数
  progress?: number                      // 0-100

  // ── 用量 & 计费 ──
  usage: UnifiedUsage

  // ── 元数据 ──
  latencyMs: number
  routingDecision?: {
    selectedBy: 'user' | 'auto'
    dimensions: Record<string, number>   // 各维度评分
    fallbackChain: string[]              // 降级链路
  }

  error?: string
}

interface UnifiedResult {
  type: 'image' | 'video' | 'text'
  url?: string                           // CDN URL (后端已转存)
  b64Data?: string
  thumbnailUrl?: string                  // 视频缩略图
  width?: number
  height?: number
  duration?: number                      // 视频时长 (秒)
  size?: string
  format?: string                        // 'png' | 'jpg' | 'webp' | 'mp4'
  metadata?: {
    seed?: number
    promptUsed?: string
    negativePromptUsed?: string
    styleApplied?: string
    generationParams?: Record<string, unknown>
  }
}

interface UnifiedUsage {
  credits: number                        // 消耗积分
  cost: number                           // USD
  images?: number                        // 生成图片数
  videoSeconds?: number                  // 视频时长 (秒)
  tokensUsed?: { prompt: number; completion: number; total: number }
}
```

---

## 三、后端实施计划

### 3.1 新建模块结构

```
project/aibrand-backend/apps/aibrand-server/src/core/
└── unified-model/                      # ★ 新模块
    ├── unified-model.module.ts          # NestJS 模块注册
    ├── unified-model.controller.ts      # 统一入口 API
    ├── unified-model.service.ts         # 核心调度服务
    ├── model-router.service.ts          # 七维路由引擎
    ├── model-registry.service.ts        # 模型元数据注册表
    ├── model-config.schema.ts           # MongoDB Schema (扩展)
    ├── billing.service.ts               # 统一计费服务
    ├── metrics-collector.service.ts     # 调用指标收集
    ├── dto/
    │   ├── generate.dto.ts              # 请求/响应 DTO
    │   ├── capability.dto.ts
    │   └── model-config.dto.ts
    ├── adapters/                        # ★ 8 个 Provider Adapter
    │   ├── base-adapter.ts              # 抽象基类
    │   ├── volcano-ark.adapter.ts       # 火山引擎 ARK (Seedream/Seedance/Nano/Happy)
    │   ├── alibaba-dashscope.adapter.ts # 阿里百炼 (Wan/Qwen Image/Wan Video)
    │   ├── zhipu-bigmodel.adapter.ts    # 智谱 AI (ZImage/Hailuo)
    │   ├── openai.adapter.ts            # OpenAI (GPT Image 2)
    │   ├── google-vertex.adapter.ts     # Google Vertex AI (Veo3.1/Gemini)
    │   ├── kling-kuaishou.adapter.ts    # 可灵 (Kling系列)
    │   ├── minimax.adapter.ts           # MiniMax (H3)
    │   ├── vidu-shengshu.adapter.ts     # 生数科技 (Vidu Q2)
    │   ├── midjourney-proxy.adapter.ts  # Midjourney (第三方代理)
    │   └── index.ts
    └── __tests__/
        ├── unified-model.controller.spec.ts
        ├── model-router.service.spec.ts
        ├── billing.service.spec.ts
        └── adapters/
            ├── volcano-ark.adapter.spec.ts
            ├── alibaba-dashscope.adapter.spec.ts
            └── ...
```

### 3.2 适配器基类设计

```typescript
/* adapters/base-adapter.ts */

abstract class BaseModelAdapter {
  abstract readonly provider: string
  abstract readonly displayName: string
  abstract readonly supportedModalities: ModelModality[]

  /** 获取此提供商下所有模型 */
  abstract getModels(): ModelDefinition[]

  /** 健康检查 */
  abstract healthCheck(): Promise<HealthStatus>

  /** 核心：将统一请求转为供应商特定请求并执行 */
  abstract execute(request: NormalizedRequest): Promise<NormalizedResult>

  /** 供应商特定参数映射 */
  abstract translateParams(unified: UnifiedGenerateRequest): NormalizedRequest

  /** 供应商响应标准化 */
  abstract translateResponse(raw: unknown): NormalizedResult

  /** 获取定价信息 */
  getPricing(): PricingInfo { ... }
}
```

### 3.3 MongoDB Schema 扩展

```typescript
/* model-config.schema.ts — 扩展到现有 ModelConfig */

@Schema({ timestamps: true })
export class ModelConfig {
  // ── 现有字段 ──
  @Prop({ required: true, unique: true }) name!: string
  @Prop({ required: true }) tier!: string         // T0/T1/T2/T3
  @Prop({ required: true }) provider!: string
  @Prop({ required: true }) modelId!: string
  @Prop({ required: true }) costPer1k!: number
  @Prop({ default: true }) healthy!: boolean
  @Prop() apiBase?: string
  @Prop({ default: 500 }) rpm!: number

  // ── ★ 新增字段 ──
  @Prop({ required: true, enum: ['text','image','video'] })
  modality!: string                               // 模态

  // 图像特定
  @Prop() imageParams?: {
    maxResolution?: string                        // '2048x2720'
    supportedSizes?: string[]
    supportedAspectRatios?: string[]
    maxBatchSize?: number                         // 单次最大生成数
    supportsImg2Img?: boolean
    supportsInpaint?: boolean
    supportsStyleRef?: boolean
  }

  // 视频特定
  @Prop() videoParams?: {
    minDuration?: number                          // 4 seconds
    maxDuration?: number                          // 60-120 seconds
    supportedResolutions?: string[]
    supportedFps?: number[]
    supportsStartImage?: boolean
    supportsEndImage?: boolean
    supportsCameraControl?: boolean
    supportsAudioGen?: boolean
  }

  // 风格标签
  @Prop({ type: [String], default: [] })
  styleTags?: string[]                            // 'realistic','anime','oil-painting',...

  // 扩展能力标签
  @Prop({ type: [String], default: [] })
  capabilities?: string[]                         // 'txt2img','img2img','txt2video','img2video','inpaint'
}
```

### 3.4 模型注册表 (Seed Data)

```typescript
/* 模型种子数据 — 30 个模型完整配置 */

const IMAGE_MODELS: Partial<ModelConfig>[] = [
  // ── 火山引擎 ARK ──
  {
    name: 'seedream-5.0-pro',   tier: 'T0',  modality: 'image',
    provider: 'volcano-ark',    modelId: 'doubao-seedream-5.0-pro-250828',
    costPer1k: 0.04,            rpm: 50,
    supports: ['txt2img','img2img','inpaint','styleRef'],
    imageParams: { maxResolution: '2048x2720', supportedAspectRatios: ['1:1','3:4','2:3','9:16','16:9'], maxBatchSize: 4 },
    styleTags: ['fresh','luxury','tech','warm','minimal','guochao','realistic'],
  },
  {
    name: 'seedream-5.0-lite',  tier: 'T1',  modality: 'image',
    provider: 'volcano-ark',    modelId: 'doubao-seedream-5.0-lite',
    costPer1k: 0.02,            rpm: 100,
    supports: ['txt2img','img2img'],
    imageParams: { maxResolution: '1024x1360', supportedAspectRatios: ['1:1','3:4','9:16','16:9'], maxBatchSize: 4 },
  },
  {
    name: 'seedream-4.5',       tier: 'T2',  modality: 'image',
    provider: 'volcano-ark',    modelId: 'doubao-seedream-4-5-251128',
    costPer1k: 0.012,           rpm: 200,
    supports: ['txt2img'],
    imageParams: { maxResolution: '1024x1024', supportedAspectRatios: ['1:1','3:4','16:9'], maxBatchSize: 4 },
  },
  { name: 'nano-banana-pro',    tier: 'T0', modality: 'image', provider: 'volcano-ark', modelId: 'nano-banana-pro',     costPer1k: 0.05, supports: ['txt2img','img2img','inpaint'] },
  { name: 'nano-banana-2',      tier: 'T1', modality: 'image', provider: 'volcano-ark', modelId: 'nano-banana-2',       costPer1k: 0.025, supports: ['txt2img','img2img'] },
  { name: 'nano-banana-2-lite', tier: 'T2', modality: 'image', provider: 'volcano-ark', modelId: 'nano-banana-2-lite',  costPer1k: 0.015, supports: ['txt2img'] },
  { name: 'nano-banana',        tier: 'T3', modality: 'image', provider: 'volcano-ark', modelId: 'nano-banana',         costPer1k: 0.008, supports: ['txt2img'] },

  // ── 阿里百炼 ──
  { name: 'wan-2.7-pro',        tier: 'T1', modality: 'image', provider: 'alibaba-dashscope', modelId: 'wan2.7-pro', costPer1k: 0.03, supports: ['txt2img','img2img'] },
  { name: 'qwen-image-3.0-pro', tier: 'T1', modality: 'image', provider: 'alibaba-dashscope', modelId: 'qwen-image-3.0-pro', costPer1k: 0.025, supports: ['txt2img'] },
  { name: 'qwen-image-2.0-pro', tier: 'T2', modality: 'image', provider: 'alibaba-dashscope', modelId: 'qwen-image-2.0-pro', costPer1k: 0.018, supports: ['txt2img'] },
  { name: 'qwen-image-2.0',     tier: 'T2', modality: 'image', provider: 'alibaba-dashscope', modelId: 'qwen-image-2.0',     costPer1k: 0.012, supports: ['txt2img'] },
  { name: 'qwen-image-plus',    tier: 'T3', modality: 'image', provider: 'alibaba-dashscope', modelId: 'qwen-image-plus',    costPer1k: 0.006, supports: ['txt2img'] },

  // ── OpenAI ──
  { name: 'gpt-image-2',        tier: 'T1', modality: 'image', provider: 'openai', modelId: 'gpt-image-2', costPer1k: 0.04, supports: ['txt2img','img2img','inpaint'] },

  // ── 智谱 AI ──
  { name: 'zimage-turbo',       tier: 'T2', modality: 'image', provider: 'zhipu-bigmodel', modelId: 'zimage-turbo', costPer1k: 0.015, supports: ['txt2img'] },

  // ── Midjourney ──
  { name: 'midjourney-niji7',   tier: 'T0', modality: 'image', provider: 'midjourney-proxy', modelId: 'niji-7',    costPer1k: 0.08, supports: ['txt2img','img2img','styleRef'] },
  { name: 'midjourney-v8.2',    tier: 'T0', modality: 'image', provider: 'midjourney-proxy', modelId: 'v8.2',      costPer1k: 0.08, supports: ['txt2img','img2img','styleRef'] },
]

const VIDEO_MODELS: Partial<ModelConfig>[] = [
  // ── 火山引擎 ARK ──
  { name: 'seedance-2.5',        tier: 'T0', modality: 'video', provider: 'volcano-ark', modelId: 'seedance-2.5',    costPer1k: 0.15, supports: ['txt2video','img2video'], videoParams: { maxDuration: 60, supportedResolutions: ['1080p'], supportedFps: [24,30] } },
  { name: 'seedance-2',          tier: 'T1', modality: 'video', provider: 'volcano-ark', modelId: 'seedance-2',      costPer1k: 0.10, supports: ['txt2video','img2video'], videoParams: { maxDuration: 30, supportedResolutions: ['1080p','720p'] } },
  { name: 'seedance-pro',        tier: 'T0', modality: 'video', provider: 'volcano-ark', modelId: 'seedance-pro',    costPer1k: 0.20, supports: ['txt2video','img2video','cameraControl'], videoParams: { maxDuration: 120 } },
  { name: 'happy-horse-1.1',     tier: 'T2', modality: 'video', provider: 'volcano-ark', modelId: 'happy-horse-1.1', costPer1k: 0.05, supports: ['txt2video'] },
  { name: 'happy-horse',         tier: 'T3', modality: 'video', provider: 'volcano-ark', modelId: 'happy-horse',     costPer1k: 0.025, supports: ['txt2video'] },

  // ── Google Vertex AI ──
  { name: 'veo-3.1',             tier: 'T0', modality: 'video', provider: 'google-vertex', modelId: 'veo-3.1',           costPer1k: 0.50, supports: ['txt2video','img2video'], videoParams: { maxDuration: 120, supportedResolutions: ['4K','1080p'] } },
  { name: 'veo-3.1-fast',        tier: 'T1', modality: 'video', provider: 'google-vertex', modelId: 'veo-3.1-fast',      costPer1k: 0.20, supports: ['txt2video','img2video'], videoParams: { maxDuration: 60 } },
  { name: 'gemini-omni-flash',   tier: 'T1', modality: 'video', provider: 'google-vertex', modelId: 'gemini-2.5-flash',  costPer1k: 0.01, supports: ['txt2video','img2video','audioGen'], videoParams: { maxDuration: 30 } },

  // ── 可灵 ──
  { name: 'kling-o1',            tier: 'T0', modality: 'video', provider: 'kling-kuaishou', modelId: 'kling-o1',        costPer1k: 0.12, supports: ['txt2video','img2video'] },
  { name: 'kling-3.0',           tier: 'T1', modality: 'video', provider: 'kling-kuaishou', modelId: 'kling-3.0',       costPer1k: 0.08, supports: ['txt2video','img2video'] },
  { name: 'kling-3.0-omni',      tier: 'T1', modality: 'video', provider: 'kling-kuaishou', modelId: 'kling-3.0-omni',  costPer1k: 0.10, supports: ['txt2video','img2video','audioGen'] },
  { name: 'kling-2.6',           tier: 'T2', modality: 'video', provider: 'kling-kuaishou', modelId: 'kling-2.6',       costPer1k: 0.04, supports: ['txt2video'] },

  // ── 其他 ──
  { name: 'minimax-h3',          tier: 'T1', modality: 'video', provider: 'minimax', modelId: 'hailuo-h3',    costPer1k: 0.08, supports: ['txt2video','img2video'] },
  { name: 'wan-2.7-video',       tier: 'T2', modality: 'video', provider: 'alibaba-dashscope', modelId: 'wan2.7-video', costPer1k: 0.06, supports: ['txt2video','img2video'] },
  { name: 'vidu-q2',             tier: 'T1', modality: 'video', provider: 'vidu-shengshu', modelId: 'vidu-q2', costPer1k: 0.10, supports: ['txt2video','img2video'] },
  { name: 'hailuo-2.3',          tier: 'T2', modality: 'video', provider: 'zhipu-bigmodel', modelId: 'hailuo-2.3', costPer1k: 0.05, supports: ['txt2video','img2video'] },
]
```

### 3.5 API 端点设计

```
POST   /api/models/unified/generate          # 统一生成入口 (图像/视频)
  Body: UnifiedGenerateRequest
  Response: UnifiedGenerateResponse

GET    /api/models/unified/query/{taskId}     # 异步任务查询
  Response: { status, progress, results?, error? }

DELETE /api/models/unified/query/{taskId}     # 取消异步任务

GET    /api/models/unified/capabilities       # 获取所有可用模型能力清单
  Query: ?modality=image|video&provider=X&style=Y
  Response: { models: ModelDefinition[], providers: ProviderInfo[] }

GET    /api/models/unified/providers          # 获取所有 Provider 健康状态
  Response: { providers: { name, healthy, latency, models[] }[] }

POST   /api/models/unified/compare            # 多模型对比生成 (A/B test)
  Body: { prompt, models: string[], ... }
  Response: { comparisons: { model, result, cost, latency }[] }

GET    /api/models/unified/metrics            # 模型调用统计 (管理端)
  Query: ?window=24h|7d|30d&modality=image|video

POST   /api/models/unified/billing/report     # 计费报告
POST   /api/models/unified/health/check       # 全量健康检查
POST   /api/models/unified/config             # 管理端: 模型上下线/配额调整
```

---

## 四、前端实施计划

### 4.1 新增文件结构

```
project/aibrand-studio/src/
├── lib/
│   └── unified-model/                       # ★ 新模块
│       ├── client.ts                         # API 客户端 (替代直接调用)
│       ├── types.ts                          # 前端类型定义
│       ├── model-registry.ts                 # 前端模型注册表 (缓存+过滤)
│       ├── capability-mapper.ts              # 能力 → 模型映射
│       ├── use-unified-generation.ts         # 统一生成 Hook
│       ├── use-model-capabilities.ts         # 模型能力查询 Hook
│       ├── billing-calculator.ts             # 前端成本估算
│       └── __tests__/
│
├── components/
│   └── unified-model/                        # ★ 新组件
│       ├── ModelSelector.tsx                  # ★ 核心: 统一模型下拉选择器
│       ├── ModelSelectorDropdown.tsx          # 下拉菜单 UI
│       ├── ModelCard.tsx                      # 模型信息卡片
│       ├── ModelComparePanel.tsx              # 多模型对比面板
│       ├── UnifiedParamsForm.tsx              # 统一参数表单
│       ├── ImageParamsPanel.tsx               # 图像参数子面板
│       ├── VideoParamsPanel.tsx               # 视频参数子面板
│       ├── CrossModalFlowPanel.tsx            # 跨模态工作流面板
│       ├── ModelHealthIndicator.tsx           # 模型健康状态指示器
│       ├── BillingPreview.tsx                 # 费用预览
│       └── __tests__/
│
└── app/
    └── api/
        └── models/
            └── unified/
                ├── generate/route.ts          # → 后端代理
                ├── capabilities/route.ts
                ├── providers/route.ts
                └── query/[taskId]/route.ts
```

### 4.2 ModelSelector 组件设计

```
┌─────────────────────────────────────────────┐
│  🎯 选择模型                    [⚡自动推荐] │
├─────────────────────────────────────────────┤
│                                             │
│  📋 模态筛选: [全部] [🖼️图像] [🎬视频]      │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 🔍 搜索模型...                       │    │
│  ├─────────────────────────────────────┤    │
│  │                                      │    │
│  │  ⭐ 推荐 (自动路由)                   │    │
│  │  ├─ ⚡ AI 智能选择                    │    │
│  │  │  质量/速度/成本自动平衡            │    │
│  │                                     │    │
│  │  🏆 顶级 (T0)                        │    │
│  │  ├─ 🖼️ Seedream 5.0 Pro     $0.04  │    │
│  │  ├─ 🖼️ Nano Banana Pro       $0.05  │    │
│  │  ├─ 🎬 Seedance 2.5          $0.15  │    │
│  │  ├─ 🎬 Kling O1              $0.12  │    │
│  │  └─ 🎬 Veo3.1                $0.50  │    │
│  │                                     │    │
│  │  ⚡ 标准 (T1)                         │    │
│  │  ├─ 🖼️ Seedream 5.0 Lite    $0.02  │    │
│  │  ├─ 🖼️ Wan 2.7 Pro          $0.03  │    │
│  │  ├─ 🖼️ GPT Image 2          $0.04  │    │
│  │  └─ 🎬 Kling 3.0            $0.08  │    │
│  │                                     │    │
│  │  💰 经济 (T2-T3)                     │    │
│  │  ├─ 🖼️ ZImage Turbo         $0.015 │    │
│  │  ├─ 🖼️ Qwen Image Plus     $0.006 │    │
│  │  └─ 🎬 Happy Horse           $0.025 │    │
│  │                                     │    │
│  │  🎨 按风格: [写实] [动画] [国潮] ...  │    │
│  │  📐 按能力: [文生图] [图生图] [修复]  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ✅ 已选: AI 智能选择 (7 维自动路由)         │
│  💰 预估: 本次约 ¥0.08 (1张 1080p)          │
└─────────────────────────────────────────────┘
```

### 4.3 关键 React Hook

```typescript
/* use-unified-generation.ts */

function useUnifiedGeneration() {
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    taskId: null,
    results: [],
    progress: 0,
    cost: 0,
    modelUsed: null,
  })

  const generate = useCallback(async (request: UnifiedGenerateRequest) => {
    setState(s => ({ ...s, status: 'submitting' }))

    // 1. 发送到后端统一入口
    const res = await fetch('/api/models/unified/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    const data: UnifiedGenerateResponse = await res.json()

    if (data.status === 'completed') {
      setState(s => ({ ...s, status: 'completed', results: data.results!, cost: data.usage.cost, modelUsed: data.modelUsed }))
    } else if (data.status === 'processing' || data.status === 'queued') {
      setState(s => ({ ...s, status: 'processing', taskId: data.taskId }))
      // 2. 启动轮询
      startPolling(data.taskId!)
    }
  }, [])

  const startPolling = useCallback(async (taskId: string) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/models/unified/query/${taskId}`)
      const data = await res.json()
      setState(s => ({ ...s, progress: data.progress || 0 }))
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(interval)
        setState(s => ({ ...s, status: data.status, results: data.results, cost: data.cost }))
      }
    }, 2000)
  }, [])

  return { state, generate }
}
```

---

## 五、跨模态工作流设计

### 5.1 典型场景

```
场景 1: 文章 → 封面图 → 短视频
  [LLM 写文案] → [图像模型生成封面] → [视频模型生成短视频]
  链路: GPT/Claude → Seedream 5.0 → Kling 3.0

场景 2: 产品图 → 多平台适配 → 视频展示
  [上传产品图] → [图像模型批量生成多尺寸] → [视频模型生成旋转展示]
  链路: 原图 → Nano Banana Pro (img2img×4) → Seedance 2.5 (img2video)

场景 3: GEO 优化全流程
  [SEO关键词分析] → [GEO优化封面] → [多平台适配] → [A/B效果预测]
  链路: LLM → Wan2.7 Pro → ZImage → 效果预测引擎
```

### 5.2 跨模态编排器 (Orchestrator)

```typescript
/* cross-modal-orchestrator.ts */

interface WorkflowStep {
  id: string
  modality: ModelModality
  prompt: string | ((prevResults: UnifiedResult[]) => string)  // 支持动态 Prompt
  preferModel?: string
  dependsOn?: string[]                           // 依赖的上一步 ID
}

interface CrossModalWorkflow {
  id: string
  name: string
  steps: WorkflowStep[]
}

async function executeCrossModalWorkflow(
  workflow: CrossModalWorkflow,
  onStepComplete?: (stepId: string, result: UnifiedResult) => void,
): Promise<Map<string, UnifiedResult[]>> {
  const results = new Map<string, UnifiedResult[]>()

  // 拓扑排序 + 并行执行
  const layers = topologicalSort(workflow.steps)
  for (const layer of layers) {
    const layerPromises = layer.map(async (step) => {
      const prevResults = step.dependsOn?.flatMap(id => results.get(id) || []) || []
      const prompt = typeof step.prompt === 'function' ? step.prompt(prevResults) : step.prompt
      const result = await unifiedGenerate({ modality: step.modality, prompt, preferModel: step.preferModel })
      results.set(step.id, result.results || [])
      onStepComplete?.(step.id, result.results?.[0]!)
    })
    await Promise.all(layerPromises)
  }
  return results
}
```

---

## 六、实施路线图 (分 4 阶段)

### Phase 1: 基础设施 (Week 1-2)

```
□ 1.1 后端 unified-model 模块骨架搭建
  - NestJS Module / Controller / Service 创建
  - MongoDB Schema 扩展 (modality + imageParams + videoParams)
  - BaseModelAdapter 抽象类定义
  - DTO 定义与 Zod Schema

□ 1.2 火山引擎 ARK Adapter (最高优先级, 已有 Seedream 代码)
  - Seedream 5.0/5.0 Lite/4.5 → 基于现有 visual-gateway 改造
  - Nano Banana ×4 → ARK 多模态 API 适配
  - Seedance ×3 + Happy Horse ×2 → ARK 视频 API 适配
  - 覆盖模型: 8 图像 + 5 视频 = 13 个

□ 1.3 统一入口 API 上线
  - POST /api/models/unified/generate
  - GET /api/models/unified/capabilities
  - 前端 API 代理 Route Handler

□ 1.4 前端 ModelSelector 基础组件
  - 模型列表从后端拉取
  - 模态筛选 (全部/图像/视频)
  - Tier 分组展示
```

### Phase 2: 扩展接入 (Week 3-4)

```
□ 2.1 阿里百炼 DashScope Adapter
  - Wan 2.7 Pro 图像
  - Qwen Image ×4 变体
  - Wan 2.7 视频
  - 覆盖模型: 5 图像 + 1 视频 = 6 个

□ 2.2 智谱 BigModel Adapter
  - ZImage Turbo 图像
  - Hailuo 2.3 视频
  - 覆盖模型: 1 图像 + 1 视频 = 2 个

□ 2.3 OpenAI Adapter
  - GPT Image 2
  - 覆盖模型: 1 图像

□ 2.4 前端增强
  - UnifiedParamsForm (图像参数 / 视频参数子面板)
  - BillingPreview 费用预估
  - ModelHealthIndicator 健康状态
  - 异步任务轮询 + 进度条
```

### Phase 3: 完整覆盖 (Week 5-6)

```
□ 3.1 可灵 Kuaishou Adapter
  - Kling O1 / 3.0 / 3.0 Omni / 2.6
  - 覆盖模型: 4 视频

□ 3.2 Google Vertex AI Adapter
  - Veo3.1 / Veo3.1 Fast
  - Gemini Omni Flash
  - 覆盖模型: 3 视频

□ 3.3 MiniMax + Vidu + Midjourney Adapter
  - MiniMax H3
  - Vidu Q2
  - Midjourney Niji7 / V8.2 (第三方代理)
  - 覆盖模型: 1 视频 + 1 视频 + 2 图像 = 4 个

□ 3.4 跨模态工作流
  - CrossModalFlowPanel 组件
  - 工作流模板库 (3+ 预设模板)
  - 步骤间自动传递结果
```

### Phase 4: 运营增强 (Week 7-8)

```
□ 4.1 统一计费系统
  - credits 预扣 + 多退少补
  - 按模型/provder/userTier 分价
  - 月度账单 + Grafana 仪表盘

□ 4.2 模型 A/B 对比
  - POST /api/models/unified/compare
  - 同 prompt 多模型并行生成 + 并排对比

□ 4.3 智能降级与故障转移
  - Provider 健康检查 + 自动切换
  - 同模态 fallback chain 配置
  - 告警 + 自动拉起

□ 4.4 管理后台
  - 模型上下线开关
  - RPM/TPM 配额调整
  - API Key 加密轮换
```

---

## 七、关键风险 & 对策

| 风险 | 等级 | 对策 |
|------|------|------|
| Midjourney 无官方 API | 🔴 高 | 使用第三方代理 (如 midjourney-proxy)，加适配层隔离 |
| Google Vertex AI 认证复杂 (GCP SA) | 🟡 中 | 服务账号 JSON → 环境变量注入，Adapter 内自动刷新 Token |
| 视频模型异步耗时 (5-30min) | 🟡 中 | BullMQ 队列 + WebSocket 实时进度推送 + webhook 回调 |
| API Key 管理 (8 家, 30+ 模型) | 🟡 中 | 加密存储 + 环境变量注入 + 定期轮换 + CI secret scan |
| 模型版本迭代快 (3-6 月周期) | 🟢 低 | modelId/supports 配置化 (MongoDB)，无需改代码 |

---

## 八、核心代码量估算

| 模块 | 文件数 | 代码行数 (估) |
|------|--------|-------------|
| **后端 unified-model 模块** | ~25 | ~3000 |
| ├─ Controller/Service/Router | 5 | 600 |
| ├─ 8 Adapters | 12 | 1500 |
| ├─ DTOs/Schemas | 3 | 300 |
| ├─ Billing/Metrics | 3 | 300 |
| └─ Tests | 8+ | 400 |
| **前端 unified-model 模块** | ~18 | ~2500 |
| ├─ lib/ (client, hooks, registry) | 8 | 800 |
| ├─ components/ (Selector, Form, Panel) | 8 | 1400 |
| └─ Tests | 5 | 300 |
| **模型种子数据** | 1 | 200 |
| **总计** | ~48 | ~5700 |

---

## 九、综合修订：六阶段执行版（融合 Claude 方案 + 本地草案 + 运营建议）

> 本节为最终可执行路线（替代第六节的分 4 阶段版），并记录关键架构决策（ADR）。

### 9.1 架构决策记录（ADR）

| # | 决策 | 结论 | 理由 |
|---|------|------|------|
| ADR-1 | 落点 | **先落地 aibrand-studio（Next.js + Prisma/Postgres）**；aibrand-backend 仅做可选旁路 | 模型目录/visual-gateway/task-runner/前端下拉均已在 Studio；就近复用、当天可真实出图；NestJS 模块可后续从 Studio 网关同步移植 |
| ADR-2 | 存储 | 沿用 **Prisma `ModelCatalog`**（扩字段），不引入 MongoDB | 现有目录/工作流/计费均 Postgres；避免双数据源 |
| ADR-3 | 统一入口 | `GET /api/models/unified/capabilities`、`POST /api/models/unified/generate`、`GET /api/models/unified/query/{taskId}` | 对齐 Claude 设计，前端只调这三类后端端点 |
| ADR-4 | 适配器 | `src/lib/model-gateway/adapters/*`，每 adapter 实现 `translateRequest / translateResponse / healthCheck / getCapabilities` | 统一能力抽象，供应商差异隔离 |
| ADR-5 | 异步任务 | submit → 轮询（前端 2s）+ 可选 webhook；不依赖 WebSocket 首期 | 视频 5-30min，轮询足够且简单；WebSocket 留 P5 增强 |
| ADR-6 | 结果转存 | 后端拉取供应商结果 → 转存 OSS/RustFS → 返回 CDN URL | 前端不直连第三方，防止密钥/直链泄露 |
| ADR-7 | 计费 | 每模型 `costCreditsPerCall`（DB 配置）+ 预扣/结算记录 | 替换前端写死 credits.ts；单价可运营调整 |

### 9.2 六阶段执行路线

**P0 密钥盘点（先决条件）**
- 已就绪（10 模型，4 把密钥）：Seedream ARK ×3（4.5/5.0 Lite/5.0 Pro）、Qwen DashScope ×5（2.0/Plus/2 Pro/3 Pro + ZImage 待校准）、DeepSeek、GLM
- 待提供（20 模型）：OpenAI GPT Image 2、Nano Banana ×4、Veo3.1 ×2 + Gemini、Kling ×4、MiniMax、Vidu、Happy Horse ×2、Midjourney ×2
- 交付物：`.env` 密钥矩阵 + Provider 可用性矩阵（写入 docs/plans/model-keys-matrix.md）

**P1 目录 + 骨架（本周）**
- 后端：`src/lib/model-gateway/`（types/registry/router/billing）+ `src/app/api/models/unified/*` 三端点
- 种子：30 模型入 `ModelCatalog`（enabled 按密钥矩阵；能力：比例/分辨率/数量/时长/配音/帧模式）
- 前端：`useUnifiedGeneration` hook + `ModelSelector`（模态筛选 + enabled 置灰 + 费用预估）
- 验收：`GET /api/models/unified/capabilities` 返回 30 模型 + 可用性 + 单价

**P2 图像真实接通（第一批，已有密钥）**
- ARK Adapter：Seedream 4.5 / 5.0 Lite / 5.0 Pro（改造现有 visual-gateway）
- DashScope Adapter：Qwen Image 2.0 / Plus / 2 Pro / 3 Pro + Wan 2.7 Pro（上游 ID 实测校准）
- task-runner 图片任务改走统一网关；结果转存后入画布
- 验收：工作台选模型 → 生成 → 真实出图入画布（Seedream 4.5 必须通）

**P3 视频异步适配器**
- ARK：Seedance 2 / 2.5 / Pro（需确认已开通视频权限）
- DashScope：Wan 2.7 视频（异步 synthesis → 轮询）
- 异步管线：submit → poll → 结果转存入库；前端进度条
- 验收：视频任务端到端真实生成

**P4 统一计费**
- `BillingService`：预扣 + 结算 + 流水表（复用 credits 前端展示）
- 替换 credits.ts 写死权重；BillingPreview 联动
- 验收：生成扣费 → 账单可查（settings/quota 或新账单页）

**P5 跨模态工作流 + 管理后台**
- `CrossModalFlowPanel`：图文 → 视频联动（3+ 预设模板）
- 模型上下线开关、健康检查、自动降级（fallback chain）
- 验收：跨模态工作流端到端通过（文案→封面→视频）

**P6 其余供应商（待 20 密钥）**
- OpenAI（GPT Image 2）、Google（Veo3.1×2 + Gemini）、Kling ×4、MiniMax、Vidu、Midjourney（代理）、Happy Horse ×2、Nano Banana ×4
- 交付：8 家 adapter 全量 + 管理后台运营能力

### 9.3 补充风险与对策

| 风险 | 等级 | 对策 |
|------|------|------|
| 上游模型 ID 与截图版本不符 | 中 | P2 用真实 API 实测校准；注册表配置化，改配置不改码 |
| ARK 视频权限未开通 | 中 | P3 前置确认；未开通则 Seedance 置灰 |
| 结果 URL 直链泄露/过期 | 中 | ADR-6 后端转存 OSS/RustFS，前端只见 CDN URL |
| 视频长任务（5-30min） | 中 | 轮询 + webhook；任务超时与重试 |
| 成本失控 | 高 | 每模型单价 + 用户额度 + maxBudget；生成前 BillingPreview |
| 密钥管理（8 家） | 中 | .env 矩阵 + 轮换计划 + CI secret scan（纳入 P0） |

### 9.4 待批准确认项

1. ADR-1 落点：Studio 先行（推荐）✅ / 按原文档 NestJS+MongoDB
2. 单价默认表：图 6-30 积分 / 视频 40-100 积分 / 次（P1 种子内可调）
3. 无密钥 20 模型：先入库置灰展示（推荐）还是等密钥再入
4. 批准后从 P0 → P1 → P2 连续执行，每阶段验收后汇报
