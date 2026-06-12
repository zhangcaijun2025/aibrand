/**
 * 内容智造引擎 — ContentBrief 核心接口定义
 *
 * ContentBrief 是联通意图理解层、生成层、质检层的全局数据契约。
 * 由引导式采访 Agent（Dify）产出，被文案/图片/视频/剪辑模块消费。
 *
 * 设计原则：
 * - 每个字段标注 source，驱动智能跳过逻辑
 * - clarityScore 决定采访路由（快速确认 vs 补齐提问 vs 推荐引导）
 * - 策略层数据由 n8n 工作流异步预取填充
 */

import type {
  BriefStatus,
  ClaritySource,
  ContentGoal,
  ContentTone,
  ContentType,
  DeAIMode,
  EmojiDensity,
  FieldSource,
  HookStyle,
  ImageFormat,
  PlatformCode,
  SentenceLength,
  VideoLevel,
  VideoOrientation,
  VisualStyle,
} from '../enums/content-type.enum'

// ── 行业信息 ──

export interface IndustryInfo {
  /** 一级行业，如 "SaaS"、"餐饮" */
  primary: string
  /** 二级行业，如 "营销工具"、"火锅"，可为空（大类行业不需要细分的场景） */
  secondary?: string
  /** 数据来源 */
  source: FieldSource
}

// ── 目标受众 ──

export interface TargetAudience {
  /** 人群细分标签，如 ["25-35岁女性", "一线城市"] */
  segments: string[]
  /** 痛点描述 */
  painPoints: string[]
  /** 数据来源 */
  source: FieldSource
}

// ── 平台适配参数 ──

export interface VoiceAdaptation {
  /** emoji 使用密度 */
  emojiDensity: EmojiDensity
  /** 句子长度偏好 */
  sentenceLength: SentenceLength
  /** 开篇钩子风格 */
  hookStyle: HookStyle
}

// ── 平台配置 ──

export interface PlatformConfig {
  /** 平台代码 */
  code: PlatformCode
  /** 内容格式/比例 */
  format: ImageFormat
  /** 文案最大字数（0 = 无限制） */
  textMaxLength: number
  /** 话题标签上限 */
  hashtagLimit: number
  /** 该平台的语体转换参数 */
  voiceAdaptation: VoiceAdaptation
  /** 平台特定规则摘要 */
  rules: string[]
  /** 数据来源 */
  source: FieldSource
}

// ── 产品信息 ──

export interface ProductInfo {
  /** 产品名称 */
  name: string
  /** 产品品类 */
  category: string
  /** 独特卖点 */
  usps: string[]
  /** 功能特性 */
  features: Array<{ name: string; value: string }>
  /** 行动号召文案 */
  cta: string
  /** 关联素材 URL 列表 */
  assets: string[]
  /** 数据来源 */
  source: FieldSource
}

// ── 品牌约束 ──

export interface BrandConstraints {
  /** 品牌人设描述 */
  voice: string
  /** 禁用词列表 */
  forbiddenWords: string[]
  /** 固定话术（必须出现的词/短语） */
  fixedPhrases: string[]
  /** 品牌视觉规范 */
  visualIdentity: {
    logoUrl?: string
    primaryColor?: string
    secondaryColor?: string
    fontPreference?: string
  }
  /** 数据来源 */
  source: FieldSource
}

// ── 生成配置 ──

export interface GenerationConfig {
  /** 文案生成配置 */
  copywriting: {
    /** 生成篇数 */
    count: number
    /** 每篇变体数 */
    variants: number
    /** 去 AI 味模式 */
    deAIMode: DeAIMode
  }
  /** 图片生成配置 */
  images: {
    /** 生成数量 */
    count: number
    /** 风格列表 */
    styles: string[]
    /** 是否启用快速预览模式 */
    previewMode: boolean
  }
  /** 视频生成配置 */
  video: {
    /** 视频时长（秒） */
    duration: number
    /** 方向 */
    format: VideoOrientation
    /** 视频层级 */
    level: VideoLevel
  }
}

// ── 意图层 ──

export interface IntentInfo {
  /** 行业分类 */
  industry: IndustryInfo
  /** 目标受众 */
  targetAudience: TargetAudience
  /** 内容类型 */
  contentType: ContentType
  /** 营销目标 */
  goal: ContentGoal
  /** 意图清晰度来源：用户主动指定 / 引导式采访 / AI 推荐 */
  claritySource: ClaritySource
}

// ── 风格约束 ──

export interface StyleConstraints {
  /** 语气 */
  tone: ContentTone
  /** 视觉风格 */
  visualStyle: string
  /** 颜色偏好 */
  colorPreference: string[]
  /** 数据来源 */
  source: FieldSource
  /** 样本反推关联的样本 ID 列表 */
  sampleReferenceIds?: string[]
}

// ── 参考样例 ──

export interface ReferenceSample {
  /** 类型 */
  type: 'url' | 'text' | 'image'
  /** 内容 */
  content: string
  /** 用户备注（如"喜欢这种风格"） */
  note?: string
}

// ── 策略层预取数据（n8n 工作流异步填充） ──

export interface StrategyData {
  /** 竞品近期爆款 */
  competitorTrends: Array<{
    title: string
    url: string
    engagement: number
    platform?: string
  }>
  /** 平台实时热点话题 */
  platformHotTopics: string[]
  /** 历史内容表现数据 */
  historicalPerformance?: Record<string, unknown>
  /** 数据抓取时间 */
  fetchedAt: Date
}

// ── 质量评分（生成后填充） ──

export interface QualityScore {
  /** 综合评分 0-100 */
  overall: number
  /** 各维度评分 */
  dimensions: Record<string, number>
  /** 改进建议 */
  suggestions: string[]
  /** 评分时间 */
  reviewedAt: Date
}

// ── 核心 ContentBrief ──

/**
 * ContentBrief — 内容创作的结构化 Brief
 *
 * 由意图理解层（Dify 采访 Agent + 智能路由引擎）产出，
 * 作为文案/图片/视频/剪辑模块的统一输入。
 */
export interface ContentBrief {
  /** 唯一标识 */
  id: string
  /** 所属用户 */
  userId: string
  /** 关联品牌 */
  brandId: string
  /**
   * 意图清晰度评分 0-1
   * - ≥ 0.7: 快速确认模式
   * - 0.3 ≤ x < 0.7: 补齐式提问（1-3 轮）
   * - < 0.3: AI 主动推荐
   */
  clarityScore: number
  /** 创建时间 */
  createdAt: Date
  /** 状态 */
  status: BriefStatus

  /** 意图层 */
  intent: IntentInfo
  /** 风格约束 */
  style: StyleConstraints
  /** 目标平台列表 */
  platforms: PlatformConfig[]
  /** 产品信息 */
  product: ProductInfo
  /** 品牌约束 */
  brand: BrandConstraints
  /** 生成配置 */
  generation: GenerationConfig
  /** 参考样例 */
  references: ReferenceSample[]
  /** 策略层预取数据（n8n 工作流填充，生成前可用） */
  strategy?: StrategyData
  /** 质量评分（质检层填充，生成后可用） */
  quality?: QualityScore
}

// ── 采访路由相关 ──

/**
 * 采访状态 — 追踪引导式采访的进度
 */
export interface InterviewState {
  /** 关联的 Brief ID */
  briefId: string
  /** 当前步骤 (0-based) */
  currentStep: number
  /** 总步骤数（动态变化，智能跳过后减少） */
  totalSteps: number
  /** 已完成的字段 */
  completedFields: string[]
  /** 已跳过的字段 + 跳过原因 */
  skippedFields: Array<{ field: string; reason: 'brand_library' | 'platform_binding' | 'history' }>
  /** 剩余的必问字段 */
  remainingFields: string[]
  /** 采访是否完成 */
  isComplete: boolean
}

/**
 * 采访卡片 — 渲染引导式采访的单个问题卡片
 */
export interface InterviewCard {
  /** 卡片模式 */
  mode: 'single_select' | 'multi_select' | 'text_input'
  /** 问题文本 */
  question: string
  /** 副标题 / 提示 */
  subtitle?: string
  /** 选项列表（选择模式） */
  options?: Array<{
    label: string
    value: string
    /** 可选的缩略图 URL */
    thumbnail?: string
    /** 是否预选（智能跳过用） */
    preselected?: boolean
  }>
  /** 输入占位符（文本模式） */
  placeholder?: string
  /** 输入示例（文本模式） */
  examples?: string[]
  /** 当前步骤指示，如 "第 2/5 步" */
  stepIndicator: string
  /** 是否允许跳过 */
  allowSkip: boolean
  /** 目标字段（更新 Brief 的哪个字段） */
  targetField: string
}

// ── 品牌知识库 ──

/**
 * 品牌知识库条目 — 自动沉淀 + URL 提取
 */
export interface BrandKnowledgeEntry {
  /** 品牌 ID */
  brandId: string
  /** 品牌名称 */
  name: string
  /** 行业 */
  industry?: IndustryInfo
  /** 目标受众 */
  targetAudience?: TargetAudience
  /** 品牌约束 */
  brand?: BrandConstraints
  /** 风格偏好 */
  style?: StyleConstraints
  /** 产品列表 */
  products?: ProductInfo[]
  /** 素材资产 URL 列表 */
  assets?: string[]
  /** 最后更新时间 */
  updatedAt: Date
}

// ── 智能路由输入/输出 ──

/**
 * 智能路由输入 — 用户原始输入 + 上下文
 */
export interface InterviewRouteInput {
  /** 用户原始输入（可为空字符串） */
  userInput: string
  /** 用户 ID */
  userId: string
  /** 品牌 ID（如果用户已有品牌） */
  brandId?: string
  /** 已绑定的平台列表 */
  boundPlatforms?: PlatformCode[]
  /** 历史 Brief（用于学习偏好） */
  historyBriefs?: ContentBrief[]
}

/**
 * 智能路由输出 — 决定采访策略
 */
export interface InterviewRouteOutput {
  /** 清晰度评分 */
  clarityScore: number
  /**
   * 路由策略
   * - 'fast_confirm': 意图清晰，直接确认 Brief
   * - 'gap_filling': 部分清晰，补齐缺失字段
   * - 'ai_recommend': 极模糊，AI 主动推荐
   * - 'manual_form': 用户选择手动填表
   */
  route: 'fast_confirm' | 'gap_filling' | 'ai_recommend' | 'manual_form'
  /** 预填充的 Brief（品牌库 + 历史数据 + 输入解析） */
  prefilledBrief?: Partial<ContentBrief>
  /** 需要提问的字段列表 */
  fieldsToAsk: string[]
  /** 预计采访轮数 */
  estimatedRounds: number
}
