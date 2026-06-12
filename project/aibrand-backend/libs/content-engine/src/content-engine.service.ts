/**
 * ContentEngineService — 内容智造引擎核心服务
 *
 * 职责：
 * 1. 智能路由：分析用户输入清晰度，决定采访策略
 * 2. 动态采访：驱动多轮选择题式引导，产出结构化 Brief
 * 3. Brief 生命周期管理：创建、更新、查询、确认
 * 4. 样本反推：从用户选中的内容样本提取风格向量
 *
 * 依赖：DifyService（对话引擎）、N8nService（策略层数据预取）
 */

import { Injectable, Logger } from '@nestjs/common'
import {
  AppException,
  BriefStatus,
  ClaritySource,
  ContentBrief,
  ContentGoal,
  ContentTone,
  ContentType,
  createZodDto,
  FieldSource,
  InterviewCard,
  InterviewRouteInput,
  InterviewRouteOutput,
  InterviewState,
  PlatformCode,
  ResponseCode,
  VisualStyle,
} from '@yikart/common'
import { DifyService, N8nService } from '@yikart/ai-services'
import { z } from 'zod'

// ── 清晰度分析 Schema ──
// Dify Agent 返回的 JSON 格式

const clarityAnalysisSchema = z.object({
  clarityScore: z.number().min(0).max(1),
  route: z.enum(['fast_confirm', 'gap_filling', 'ai_recommend', 'manual_form']),
  extractedFields: z.object({
    industry: z.object({ primary: z.string(), secondary: z.string().optional() }).optional(),
    targetAudience: z.object({ segments: z.array(z.string()), painPoints: z.array(z.string()) }).optional(),
    contentType: z.enum(ContentType).optional(),
    goal: z.enum(ContentGoal).optional(),
    tone: z.enum(ContentTone).optional(),
    platforms: z.array(z.enum(PlatformCode)).optional(),
    productName: z.string().optional(),
    productUsps: z.array(z.string()).optional(),
    cta: z.string().optional(),
  }).optional(),
  fieldsToAsk: z.array(z.string()),
  estimatedRounds: z.number().int().min(0).max(5),
  missingContext: z.string().optional(),
})

type ClarityAnalysis = z.infer<typeof clarityAnalysisSchema>

// ── 采访问题模板库 ──

interface QuestionTemplate {
  field: string
  questions: {
    'zh-CN': string
    'en-US': string
  }
  mode: 'single_select' | 'multi_select' | 'text_input'
  options?: Array<{
    label: { 'zh-CN': string; 'en-US': string }
    value: string
  }>
  allowSkip: boolean
  dependsOn?: string
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    field: 'intent.industry',
    questions: {
      'zh-CN': '你的产品属于哪个行业？',
      'en-US': 'Which industry does your product belong to?',
    },
    mode: 'single_select',
    options: [
      { label: { 'zh-CN': '餐饮美食', 'en-US': 'Food & Beverage' }, value: '餐饮' },
      { label: { 'zh-CN': '服饰穿搭', 'en-US': 'Fashion' }, value: '服饰' },
      { label: { 'zh-CN': '美妆护肤', 'en-US': 'Beauty' }, value: '美妆' },
      { label: { 'zh-CN': 'SaaS / 软件', 'en-US': 'SaaS' }, value: 'SaaS' },
      { label: { 'zh-CN': '教育培训', 'en-US': 'Education' }, value: '教育' },
      { label: { 'zh-CN': '3C 数码', 'en-US': 'Electronics' }, value: '3C数码' },
      { label: { 'zh-CN': '母婴亲子', 'en-US': 'Parenting' }, value: '母婴' },
      { label: { 'zh-CN': '家居生活', 'en-US': 'Home & Living' }, value: '家居' },
      { label: { 'zh-CN': '医疗健康', 'en-US': 'Healthcare' }, value: '医疗' },
      { label: { 'zh-CN': '其他', 'en-US': 'Other' }, value: '其他' },
    ],
    allowSkip: false,
  },
  {
    field: 'intent.targetAudience',
    questions: {
      'zh-CN': '你的目标受众是谁？',
      'en-US': 'Who is your target audience?',
    },
    mode: 'multi_select',
    options: [
      { label: { 'zh-CN': '职场白领', 'en-US': 'Office workers' }, value: '职场白领' },
      { label: { 'zh-CN': '学生党', 'en-US': 'Students' }, value: '学生' },
      { label: { 'zh-CN': '宝妈/宝爸', 'en-US': 'Parents' }, value: '宝妈宝爸' },
      { label: { 'zh-CN': '中小企业主', 'en-US': 'Small business owners' }, value: '中小企业主' },
      { label: { 'zh-CN': '市场/运营人', 'en-US': 'Marketers' }, value: '市场运营' },
      { label: { 'zh-CN': '科技爱好者', 'en-US': 'Tech enthusiasts' }, value: '科技爱好者' },
      { label: { 'zh-CN': 'Z 世代', 'en-US': 'Gen Z' }, value: 'Z世代' },
      { label: { 'zh-CN': '自定义', 'en-US': 'Custom' }, value: '自定义' },
    ],
    allowSkip: true,
  },
  {
    field: 'intent.contentType',
    questions: {
      'zh-CN': '你想要创作什么类型的内容？',
      'en-US': 'What type of content do you want to create?',
    },
    mode: 'single_select',
    options: [
      { label: { 'zh-CN': '产品种草/介绍', 'en-US': 'Product intro' }, value: 'product_intro' },
      { label: { 'zh-CN': '品牌故事', 'en-US': 'Brand story' }, value: 'brand_story' },
      { label: { 'zh-CN': '教程/攻略', 'en-US': 'Tutorial' }, value: 'tutorial' },
      { label: { 'zh-CN': '促销/活动', 'en-US': 'Promotion' }, value: 'promotion' },
      { label: { 'zh-CN': '用户案例/口碑', 'en-US': 'Social proof' }, value: 'social_proof' },
      { label: { 'zh-CN': '蹭热点/话题', 'en-US': 'Trend hijack' }, value: 'trend_hijack' },
    ],
    allowSkip: false,
  },
  {
    field: 'style.tone',
    questions: {
      'zh-CN': '你希望内容是什么风格/语气？',
      'en-US': 'What tone would you like for the content?',
    },
    mode: 'single_select',
    options: [
      { label: { 'zh-CN': '专业正式', 'en-US': 'Professional' }, value: 'professional' },
      { label: { 'zh-CN': '亲切温暖', 'en-US': 'Warm' }, value: 'warm' },
      { label: { 'zh-CN': '年轻潮流', 'en-US': 'Trendy' }, value: 'trendy' },
      { label: { 'zh-CN': '幽默风趣', 'en-US': 'Humorous' }, value: 'humorous' },
      { label: { 'zh-CN': '情感共鸣', 'en-US': 'Emotional' }, value: 'emotional' },
      { label: { 'zh-CN': '简约克制', 'en-US': 'Minimalist' }, value: 'minimalist' },
    ],
    allowSkip: true,
  },
  {
    field: 'platforms',
    questions: {
      'zh-CN': '你打算发布到哪些平台？',
      'en-US': 'Which platforms do you plan to publish on?',
    },
    mode: 'multi_select',
    options: [
      { label: { 'zh-CN': '小红书', 'en-US': 'Xiaohongshu' }, value: 'xiaohongshu' },
      { label: { 'zh-CN': '抖音', 'en-US': 'Douyin' }, value: 'douyin' },
      { label: { 'zh-CN': '公众号', 'en-US': 'WeChat Article' }, value: 'wechat_article' },
      { label: { 'zh-CN': '视频号', 'en-US': 'WeChat Video' }, value: 'wechat_video' },
      { label: { 'zh-CN': '微博', 'en-US': 'Weibo' }, value: 'weibo' },
      { label: { 'zh-CN': 'B站', 'en-US': 'Bilibili' }, value: 'bilibili' },
      { label: { 'zh-CN': 'Instagram', 'en-US': 'Instagram' }, value: 'instagram' },
      { label: { 'zh-CN': 'TikTok', 'en-US': 'TikTok' }, value: 'tiktok' },
    ],
    allowSkip: true,
  },
]

// ── 行业细分追问映射 ──

const INDUSTRY_REFINEMENT_MAP: Record<string, Array<{ label: { 'zh-CN': string; 'en-US': string }; value: string }>> = {
  'SaaS': [
    { label: { 'zh-CN': 'CRM', 'en-US': 'CRM' }, value: 'CRM' },
    { label: { 'zh-CN': '财税', 'en-US': 'Finance & Tax' }, value: '财税' },
    { label: { 'zh-CN': 'HR', 'en-US': 'HR' }, value: 'HR' },
    { label: { 'zh-CN': '协同办公', 'en-US': 'Collaboration' }, value: '协同办公' },
    { label: { 'zh-CN': '营销工具', 'en-US': 'Marketing tools' }, value: '营销工具' },
    { label: { 'zh-CN': '其他 SaaS', 'en-US': 'Other SaaS' }, value: '其他SaaS' },
  ],
  '餐饮': [
    { label: { 'zh-CN': '火锅', 'en-US': 'Hotpot' }, value: '火锅' },
    { label: { 'zh-CN': '茶饮/咖啡', 'en-US': 'Tea & Coffee' }, value: '茶饮咖啡' },
    { label: { 'zh-CN': '快餐/简餐', 'en-US': 'Fast food' }, value: '快餐' },
    { label: { 'zh-CN': '烘焙甜品', 'en-US': 'Bakery' }, value: '烘焙' },
    { label: { 'zh-CN': '正餐/私房菜', 'en-US': 'Fine dining' }, value: '正餐' },
    { label: { 'zh-CN': '其他餐饮', 'en-US': 'Other' }, value: '其他餐饮' },
  ],
  '美妆': [
    { label: { 'zh-CN': '护肤', 'en-US': 'Skincare' }, value: '护肤' },
    { label: { 'zh-CN': '彩妆', 'en-US': 'Makeup' }, value: '彩妆' },
    { label: { 'zh-CN': '香水', 'en-US': 'Fragrance' }, value: '香水' },
    { label: { 'zh-CN': '个护', 'en-US': 'Personal care' }, value: '个护' },
    { label: { 'zh-CN': '其他美妆', 'en-US': 'Other beauty' }, value: '其他美妆' },
  ],
}

// ── 服务实现 ──

@Injectable()
export class ContentEngineService {
  private readonly logger = new Logger(ContentEngineService.name)

  /** 内存中的采访状态缓存（生产环境应迁至 Redis） */
  private readonly interviewStates = new Map<string, InterviewState>()

  /** 内存中的 Brief 缓存（生产环境应迁至 MongoDB） */
  private readonly briefCache = new Map<string, ContentBrief>()

  constructor(
    private readonly difyService: DifyService,
    private readonly n8nService: N8nService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // 智能路由
  // ═══════════════════════════════════════════════════════════

  /**
   * 分析用户输入并决定采访策略
   *
   * 调用 Dify「意图解析」Agent，返回清晰度评分 + 路由决策 + 预提取字段。
   */
  async routeInterview(input: InterviewRouteInput): Promise<InterviewRouteOutput> {
    this.logger.log(`Routing interview for user ${input.userId}: "${input.userInput.slice(0, 100)}"`)

    // 空输入 → AI 推荐模式
    if (!input.userInput.trim()) {
      return {
        clarityScore: 0,
        route: 'ai_recommend',
        fieldsToAsk: QUESTION_TEMPLATES.map(q => q.field),
        estimatedRounds: 3,
      }
    }

    try {
      // 调用 Dify Agent 进行意图解析
      const result = await this.difyService.runAgentApp({
        query: `分析以下用户创作意图的清晰度，返回 JSON：

用户输入：${input.userInput}
用户已绑定平台：${input.boundPlatforms?.join(', ') ?? '无'}
${input.brandId ? `用户已有品牌档案 (brandId: ${input.brandId})` : '用户暂无品牌档案'}

返回 JSON 格式：
{
  "clarityScore": 0-1,
  "route": "fast_confirm" | "gap_filling" | "ai_recommend" | "manual_form",
  "extractedFields": { 从用户输入中提取的字段 },
  "fieldsToAsk": ["需要提问的字段"],
  "estimatedRounds": 预计采访轮数,
  "missingContext": "一句话说明还缺什么信息"
}`,
        inputs: {
          task: 'intent_clarity_analysis',
          user_input: input.userInput,
          bound_platforms: input.boundPlatforms ?? [],
        },
      })

      // 解析 Dify 返回的 JSON
      const parsed = this.parseDifyJson<ClarityAnalysis>(result.answer, clarityAnalysisSchema)
      return {
        clarityScore: parsed.clarityScore,
        route: parsed.route as InterviewRouteOutput['route'],
        fieldsToAsk: parsed.fieldsToAsk,
        estimatedRounds: parsed.estimatedRounds,
      }
    } catch (error: any) {
      this.logger.error(`Interview routing failed: ${error.message}`)
      // Fallback: 补齐式提问
      return {
        clarityScore: 0.3,
        route: 'gap_filling',
        fieldsToAsk: QUESTION_TEMPLATES.map(q => q.field),
        estimatedRounds: 3,
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 动态采访
  // ═══════════════════════════════════════════════════════════

  /**
   * 获取下一个采访卡片
   * 根据品牌知识库和历史数据智能跳过已获取的字段
   */
  async getNextInterviewCard(briefId: string): Promise<InterviewCard | null> {
    const state = this.interviewStates.get(briefId)
    if (!state) {
      throw new AppException(ResponseCode.ContentBriefNotFound, { briefId })
    }

    if (state.isComplete) {
      return null
    }

    // 找到下一个需要提问的字段
    const nextField = state.remainingFields[0]
    if (!nextField) {
      state.isComplete = true
      return null
    }

    // 查询模板
    const template = QUESTION_TEMPLATES.find(t => t.field === nextField)
    if (!template) {
      // 跳过未知字段
      state.remainingFields.shift()
      state.currentStep++
      return this.getNextInterviewCard(briefId)
    }

    // 检查是否需要行业细分追问
    const brief = this.briefCache.get(briefId)
    if (nextField === 'intent.industry' && brief?.intent?.industry?.primary) {
      const primaryIndustry = brief.intent.industry.primary
      const refinements = INDUSTRY_REFINEMENT_MAP[primaryIndustry]
      if (refinements && !brief.intent.industry.secondary) {
        // 构建行业细分追问卡片
        return {
          mode: 'single_select',
          question: `更具体是哪一类${primaryIndustry}？`,
          subtitle: '选择细分行业可以让内容更精准',
          options: refinements.map(r => ({
            label: r.label['zh-CN'],
            value: r.value,
          })),
          stepIndicator: `第 ${state.currentStep + 1}/${state.totalSteps} 步`,
          allowSkip: false,
          targetField: 'intent.industry.secondary',
        }
      }
    }

    return {
      mode: template.mode,
      question: template.questions['zh-CN'],
      options: template.options?.map(o => ({
        label: o.label['zh-CN'],
        value: o.value,
      })),
      stepIndicator: `第 ${state.currentStep + 1}/${state.totalSteps} 步`,
      allowSkip: template.allowSkip,
      targetField: template.field,
    }
  }

  /**
   * 处理用户对采访卡片的回答
   */
  async submitInterviewAnswer(
    briefId: string,
    cardIndex: number,
    answer: unknown,
    skipped: boolean,
  ): Promise<{ nextCard: InterviewCard | null; state: InterviewState }> {
    const state = this.interviewStates.get(briefId)
    if (!state) {
      throw new AppException(ResponseCode.ContentBriefNotFound, { briefId })
    }

    const brief = this.briefCache.get(briefId)
    if (!brief) {
      throw new AppException(ResponseCode.ContentBriefNotFound, { briefId })
    }

    const field = state.remainingFields[0]

    if (!skipped && field && answer !== undefined) {
      // 将答案写入 Brief
      this.applyAnswerToBrief(brief, field, answer)
      state.completedFields.push(field)
    } else if (skipped && field) {
      state.skippedFields.push({ field, reason: 'user_skip' as any })
    }

    // 从待问列表中移除当前字段
    if (field) {
      state.remainingFields.shift()
    }
    state.currentStep++

    // 检查是否所有字段都已处理
    if (state.remainingFields.length === 0) {
      // 全部完成 → 调用 Dify 补充生成缺失字段
      state.isComplete = true
      await this.finalizeBrief(briefId)
    }

    this.interviewStates.set(briefId, state)
    this.briefCache.set(briefId, brief)

    const nextCard = await this.getNextInterviewCard(briefId)
    return { nextCard, state }
  }

  // ═══════════════════════════════════════════════════════════
  // Brief 生命周期
  // ═══════════════════════════════════════════════════════════

  /**
   * 初始化采访会话，创建 Draft Brief
   */
  async startInterview(userId: string, brandId: string): Promise<{ brief: ContentBrief; state: InterviewState }> {
    const briefId = `brief_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const brief: ContentBrief = {
      id: briefId,
      userId,
      brandId,
      clarityScore: 0,
      createdAt: new Date(),
      status: 'draft' as BriefStatus,
      intent: {
        industry: { primary: '', source: 'user_input' as FieldSource },
        targetAudience: { segments: [], painPoints: [], source: 'user_input' as FieldSource },
        contentType: 'product_intro' as ContentType,
        goal: 'awareness' as ContentGoal,
        claritySource: 'guided_interview' as ClaritySource,
      },
      style: {
        tone: 'professional' as ContentTone,
        visualStyle: 'minimalist_white' as VisualStyle,
        colorPreference: [],
        source: 'user_input' as FieldSource,
      },
      platforms: [],
      product: {
        name: '',
        category: '',
        usps: [],
        features: [],
        cta: '',
        assets: [],
        source: 'user_input' as FieldSource,
      },
      brand: {
        voice: '',
        forbiddenWords: [],
        fixedPhrases: [],
        visualIdentity: {},
        source: 'brand_library' as FieldSource,
      },
      generation: {
        copywriting: { count: 2, variants: 1, deAIMode: 'natural' },
        images: { count: 4, styles: [], previewMode: true },
        video: { duration: 15, format: 'vertical', level: 'L1' },
      },
      references: [],
    }

    const fields = QUESTION_TEMPLATES.map(q => q.field)
    const state: InterviewState = {
      briefId,
      currentStep: 0,
      totalSteps: fields.length,
      completedFields: [],
      skippedFields: [],
      remainingFields: fields,
      isComplete: false,
    }

    this.briefCache.set(briefId, brief)
    this.interviewStates.set(briefId, state)

    this.logger.log(`Interview started: ${briefId}`)
    return { brief, state }
  }

  /**
   * 获取 Brief（含策略层数据预取触发）
   */
  async getBrief(briefId: string): Promise<ContentBrief> {
    const brief = this.briefCache.get(briefId)
    if (!brief) {
      throw new AppException(ResponseCode.ContentBriefNotFound, { briefId })
    }

    // 异步触发策略层数据预取（不阻塞返回）
    this.prefetchStrategyData(briefId).catch(err =>
      this.logger.warn(`Strategy prefetch failed for ${briefId}: ${err.message}`),
    )

    return brief
  }

  /**
   * 确认 Brief，标记为 confirmed 状态
   */
  async confirmBrief(briefId: string): Promise<ContentBrief> {
    const brief = this.briefCache.get(briefId)
    if (!brief) {
      throw new AppException(ResponseCode.ContentBriefNotFound, { briefId })
    }

    brief.status = 'confirmed' as BriefStatus
    this.briefCache.set(briefId, brief)

    this.logger.log(`Brief confirmed: ${briefId}`)
    return brief
  }

  /**
   * 获取采访状态
   */
  getInterviewState(briefId: string): InterviewState {
    const state = this.interviewStates.get(briefId)
    if (!state) {
      throw new AppException(ResponseCode.ContentBriefNotFound, { briefId })
    }
    return state
  }

  // ═══════════════════════════════════════════════════════════
  // 样本反推
  // ═══════════════════════════════════════════════════════════

  /**
   * 从用户选中的样本中提取风格向量
   */
  async reverseStyleFromSamples(
    industry: string,
    sampleIds: string[],
  ): Promise<{ tone: ContentTone; visualStyle: string; colorPreference: string[] }> {
    try {
      const result = await this.difyService.runAgentApp({
        query: `分析以下用户选中的 ${sampleIds.length} 个内容样本，提取共同的风格特征。

行业：${industry}
样本 ID：${sampleIds.join(', ')}

请返回 JSON：
{
  "tone": "professional|warm|trendy|humorous|emotional|minimalist",
  "visualStyle": "视觉风格描述，如 minimalist_white, japanese_fresh, bold_typography",
  "colorPreference": ["主色系1", "主色系2"],
  "styleKeywords": ["风格关键词1", "风格关键词2"]
}`,
        inputs: {
          task: 'style_reverse_analysis',
          industry,
          sample_ids: sampleIds,
        },
      })

      const parsed = this.parseDifyJson<{
        tone: ContentTone
        visualStyle: string
        colorPreference: string[]
      }>(result.answer)

      return {
        tone: parsed.tone ?? 'professional',
        visualStyle: parsed.visualStyle ?? 'minimalist_white',
        colorPreference: parsed.colorPreference ?? [],
      }
    } catch (error: any) {
      this.logger.error(`Sample reverse failed: ${error.message}`)
      throw new AppException(ResponseCode.SampleReverseFailed)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════════

  /**
   * 将用户回答应用到 Brief 的对应字段
   */
  private applyAnswerToBrief(brief: ContentBrief, field: string, answer: unknown): void {
    switch (field) {
      case 'intent.industry': {
        const val = answer as string
        brief.intent.industry.primary = val
        brief.intent.industry.source = 'user_input'
        break
      }
      case 'intent.industry.secondary': {
        brief.intent.industry.secondary = answer as string
        break
      }
      case 'intent.targetAudience': {
        const segments = Array.isArray(answer) ? answer : [answer as string]
        brief.intent.targetAudience.segments = segments
        brief.intent.targetAudience.source = 'user_input'
        break
      }
      case 'intent.contentType': {
        brief.intent.contentType = answer as ContentType
        break
      }
      case 'style.tone': {
        brief.style.tone = answer as ContentTone
        brief.style.source = 'user_input'
        break
      }
      case 'platforms': {
        const platforms = Array.isArray(answer) ? answer : [answer as string]
        brief.platforms = platforms.map(p => ({
          code: p as PlatformCode,
          format: '1:1',
          textMaxLength: 0,
          hashtagLimit: 0,
          voiceAdaptation: {
            emojiDensity: 'high',
            sentenceLength: 'short',
            hookStyle: 'pain_point',
          },
          rules: [],
          source: 'user_input',
        }))
        break
      }
      default:
        this.logger.warn(`Unknown field: ${field}`)
    }
  }

  /**
   * 使用 Dify 补充生成缺失的 Brief 字段
   */
  private async finalizeBrief(briefId: string): Promise<void> {
    const brief = this.briefCache.get(briefId)
    if (!brief) return

    try {
      const result = await this.difyService.runAgentApp({
        query: `根据以下已填充的信息，补充完整的 Content Brief JSON。

已填充字段：
- 行业：${brief.intent.industry.primary}${brief.intent.industry.secondary ? ` / ${brief.intent.industry.secondary}` : ''}
- 目标受众：${brief.intent.targetAudience.segments.join(', ') ?? '未指定'}
- 内容类型：${brief.intent.contentType}
- 风格语气：${brief.style.tone}
- 平台：${brief.platforms.map(p => p.code).join(', ') ?? '未指定'}

请补充：
1. 目标受众痛点
2. 产品独特卖点建议
3. 视觉风格建议
4. 各平台适配参数`,
        inputs: { task: 'brief_finalization' },
      })

      // 将 Dify 补充的内容合并到 Brief
      if (result.answer) {
        try {
          const supplement = JSON.parse(this.extractJson(result.answer))
          if (supplement.painPoints) {
            brief.intent.targetAudience.painPoints = supplement.painPoints
          }
          if (supplement.usps) {
            brief.product.usps = supplement.usps
          }
          if (supplement.visualStyle) {
            brief.style.visualStyle = supplement.visualStyle
          }
        } catch {
          this.logger.warn(`Failed to parse Dify supplement for brief ${briefId}`)
        }
      }
    } catch (error: any) {
      this.logger.warn(`Brief finalization supplement failed: ${error.message}`)
    }

    // 触发策略层数据预取（异步，不阻塞）
    this.prefetchStrategyData(briefId).catch(err =>
      this.logger.warn(`Strategy prefetch failed: ${err.message}`),
    )
  }

  /**
   * 策略层数据预取（竞品+热点+历史表现）
   */
  private async prefetchStrategyData(briefId: string): Promise<void> {
    const brief = this.briefCache.get(briefId)
    if (!brief || brief.status !== 'confirmed') return

    try {
      // 通过 n8n 触发器触发竞品分析和热点追踪工作流
      // 此调用异步触发，不等待完成
      this.logger.log(`Triggering strategy prefetch for brief ${briefId}`)
      // TODO: 调用 n8n webhook 触发器
      // await this.n8nService.triggerWorkflow('strategy-prefetch', { briefId })
    } catch (error: any) {
      this.logger.warn(`Strategy prefetch trigger failed: ${error.message}`)
    }
  }

  /**
   * 从 Dify 返回文本中解析 JSON
   * 处理 Dify 返回的可能包含 markdown 代码块的情况
   */
  private parseDifyJson<T = Record<string, unknown>>(text: string, schema?: z.ZodType<T>): T {
    const json = this.extractJson(text)
    const parsed = JSON.parse(json)
    if (schema) {
      return schema.parse(parsed)
    }
    return parsed as T
  }

  /**
   * 从文本中提取 JSON（处理 markdown 代码块等包装）
   */
  private extractJson(text: string): string {
    // 处理 ```json ... ``` 包装
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }
    // 处理直接的 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return jsonMatch[0]
    }
    return text
  }
}
