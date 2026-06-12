/**
 * 内容智造引擎 — ContentBrief DTO（Zod Schema）
 *
 * 所有 Zod Schema + createZodDto 导出。
 * 用于 API 请求验证和类型推导。
 */

import { createZodDto } from '../utils/zod-dto.util'
import { z } from 'zod'

// ── 引用枚举 ──

import {
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
} from '../enums/content-type.enum'

// ═══════════════════════════════════════════════════════════════
// 基础 Schema
// ═══════════════════════════════════════════════════════════════

const industryInfoSchema = z.object({
  primary: z.string().min(1).describe('一级行业'),
  secondary: z.string().optional().describe('二级细分行业'),
  source: z.enum(FieldSource).describe('数据来源'),
})

const targetAudienceSchema = z.object({
  segments: z.array(z.string()).describe('人群细分标签'),
  painPoints: z.array(z.string()).describe('痛点描述'),
  source: z.enum(FieldSource).describe('数据来源'),
})

const voiceAdaptationSchema = z.object({
  emojiDensity: z.enum(EmojiDensity).describe('emoji 密度'),
  sentenceLength: z.enum(SentenceLength).describe('句子长度偏好'),
  hookStyle: z.enum(HookStyle).describe('钩子风格'),
})

const platformConfigSchema = z.object({
  code: z.enum(PlatformCode).describe('平台代码'),
  format: z.enum(ImageFormat).describe('内容格式'),
  textMaxLength: z.number().int().min(0).describe('文案最大字数'),
  hashtagLimit: z.number().int().min(0).describe('话题标签上限'),
  voiceAdaptation: voiceAdaptationSchema.describe('语体适配参数'),
  rules: z.array(z.string()).describe('平台特定规则'),
  source: z.enum(FieldSource).describe('数据来源'),
})

const productInfoSchema = z.object({
  name: z.string().min(1).describe('产品名称'),
  category: z.string().describe('产品品类'),
  usps: z.array(z.string()).describe('独特卖点'),
  features: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).describe('功能特性'),
  cta: z.string().describe('行动号召'),
  assets: z.array(z.string()).describe('关联素材 URL'),
  source: z.enum(FieldSource).describe('数据来源'),
})

const brandConstraintsSchema = z.object({
  voice: z.string().describe('品牌人设描述'),
  forbiddenWords: z.array(z.string()).describe('禁用词'),
  fixedPhrases: z.array(z.string()).describe('固定话术'),
  visualIdentity: z.object({
    logoUrl: z.string().optional().describe('Logo URL'),
    primaryColor: z.string().optional().describe('主色'),
    secondaryColor: z.string().optional().describe('辅色'),
    fontPreference: z.string().optional().describe('字体偏好'),
  }).describe('品牌视觉规范'),
  source: z.enum(FieldSource).describe('数据来源'),
})

const generationConfigSchema = z.object({
  copywriting: z.object({
    count: z.number().int().min(1).max(10).default(2).describe('生成篇数'),
    variants: z.number().int().min(1).max(5).default(1).describe('每篇变体数'),
    deAIMode: z.enum(DeAIMode).default('natural').describe('去 AI 味模式'),
  }).describe('文案生成配置'),
  images: z.object({
    count: z.number().int().min(1).max(20).default(4).describe('生成数量'),
    styles: z.array(z.string()).describe('风格列表'),
    previewMode: z.boolean().default(true).describe('快速预览模式'),
  }).describe('图片生成配置'),
  video: z.object({
    duration: z.number().int().min(5).max(300).default(15).describe('视频时长（秒）'),
    format: z.enum(VideoOrientation).default('vertical').describe('方向'),
    level: z.enum(VideoLevel).default('L1').describe('视频层级'),
  }).describe('视频生成配置'),
})

const referenceSampleSchema = z.object({
  type: z.enum(['url', 'text', 'image']).describe('参考类型'),
  content: z.string().describe('参考内容'),
  note: z.string().optional().describe('用户备注'),
})

// ═══════════════════════════════════════════════════════════════
// ContentBrief Schema
// ═══════════════════════════════════════════════════════════════

export const contentBriefSchema = z.object({
  id: z.string().min(1).describe('Brief ID'),
  userId: z.string().min(1).describe('用户 ID'),
  brandId: z.string().min(1).describe('品牌 ID'),
  clarityScore: z.number().min(0).max(1).describe('意图清晰度评分'),
  createdAt: z.date().describe('创建时间'),
  status: z.enum(BriefStatus).describe('状态'),

  intent: z.object({
    industry: industryInfoSchema.describe('行业信息'),
    targetAudience: targetAudienceSchema.describe('目标受众'),
    contentType: z.enum(ContentType).describe('内容类型'),
    goal: z.enum(ContentGoal).describe('营销目标'),
    claritySource: z.enum(ClaritySource).describe('清晰度来源'),
  }).describe('意图信息'),

  style: z.object({
    tone: z.enum(ContentTone).describe('语气'),
    visualStyle: z.string().describe('视觉风格'),
    colorPreference: z.array(z.string()).describe('颜色偏好'),
    source: z.enum(FieldSource).describe('数据来源'),
    sampleReferenceIds: z.array(z.string()).optional().describe('样本反推关联 ID'),
  }).describe('风格约束'),

  platforms: z.array(platformConfigSchema).describe('目标平台列表'),

  product: productInfoSchema.describe('产品信息'),

  brand: brandConstraintsSchema.describe('品牌约束'),

  generation: generationConfigSchema.describe('生成配置'),

  references: z.array(referenceSampleSchema).describe('参考样例'),

  strategy: z.object({
    competitorTrends: z.array(z.object({
      title: z.string(),
      url: z.string(),
      engagement: z.number(),
      platform: z.string().optional(),
    })).describe('竞品爆款'),
    platformHotTopics: z.array(z.string()).describe('平台热点'),
    historicalPerformance: z.record(z.string(), z.unknown()).optional().describe('历史表现'),
    fetchedAt: z.date().describe('抓取时间'),
  }).optional().describe('策略层预取数据'),

  quality: z.object({
    overall: z.number().min(0).max(100).describe('综合评分'),
    dimensions: z.record(z.string(), z.number()).describe('各维度评分'),
    suggestions: z.array(z.string()).describe('改进建议'),
    reviewedAt: z.date().describe('评分时间'),
  }).optional().describe('质量评分'),
})

export type ContentBriefDto = z.infer<typeof contentBriefSchema>

// ═══════════════════════════════════════════════════════════════
// API 请求/响应 DTO
// ═══════════════════════════════════════════════════════════════

// ── 智能路由 ──

export const interviewRouteInputSchema = z.object({
  userInput: z.string().max(2000).describe('用户原始输入'),
  brandId: z.string().optional().describe('品牌 ID'),
})

export class InterviewRouteInputDto extends createZodDto(interviewRouteInputSchema, 'InterviewRouteInputDto') {}

// ── 创建 Brief ──

export const createBriefFromInterviewSchema = z.object({
  userId: z.string().min(1).describe('用户 ID'),
  brandId: z.string().min(1).describe('品牌 ID'),
  clarityScore: z.number().min(0).max(1).describe('清晰度评分'),
  intent: z.object({
    industry: industryInfoSchema,
    targetAudience: targetAudienceSchema,
    contentType: z.enum(ContentType),
    goal: z.enum(ContentGoal),
    claritySource: z.enum(ClaritySource),
  }),
  style: z.object({
    tone: z.enum(ContentTone),
    visualStyle: z.string(),
    colorPreference: z.array(z.string()),
    source: z.enum(FieldSource),
    sampleReferenceIds: z.array(z.string()).optional(),
  }),
  platforms: z.array(platformConfigSchema).min(1).describe('至少一个平台'),
  product: productInfoSchema,
  brand: brandConstraintsSchema,
  generation: generationConfigSchema.optional(),
  references: z.array(referenceSampleSchema).optional(),
})

export class CreateBriefFromInterviewDto extends createZodDto(createBriefFromInterviewSchema, 'CreateBriefFromInterviewDto') {}

// ── 更新 Brief 单个字段（采访过程中逐步填充） ──

export const updateBriefFieldSchema = z.object({
  briefId: z.string().min(1).describe('Brief ID'),
  fieldPath: z.string().min(1).describe('字段路径，如 "intent.industry"'),
  value: z.unknown().describe('字段值'),
  source: z.enum(FieldSource).optional().describe('数据来源'),
})

export class UpdateBriefFieldDto extends createZodDto(updateBriefFieldSchema, 'UpdateBriefFieldDto') {}

// ── 采访状态查询 ──

export const interviewStateQuerySchema = z.object({
  briefId: z.string().min(1).describe('Brief ID'),
})

export class InterviewStateQueryDto extends createZodDto(interviewStateQuerySchema, 'InterviewStateQueryDto') {}

// ── 样本反推 ──

export const sampleReverseQuerySchema = z.object({
  industry: z.string().describe('行业'),
  contentType: z.enum(ContentType).optional().describe('内容类型过滤'),
  sampleIds: z.array(z.string()).min(1).max(10).describe('选中的样本 ID 列表'),
})

export class SampleReverseQueryDto extends createZodDto(sampleReverseQuerySchema, 'SampleReverseQueryDto') {}

// ── 品牌知识库 ──

export const brandKnowledgeExtractSchema = z.object({
  url: z.string().url().describe('品牌官网 URL'),
  brandId: z.string().min(1).describe('品牌 ID'),
  overwrite: z.boolean().default(false).describe('是否覆盖已有数据'),
})

export class BrandKnowledgeExtractDto extends createZodDto(brandKnowledgeExtractSchema, 'BrandKnowledgeExtractDto') {}

// ── 采访卡片响应 ──

export const interviewCardResponseSchema = z.object({
  briefId: z.string().describe('Brief ID'),
  cardIndex: z.number().int().describe('当前卡片序号'),
  answer: z.unknown().describe('用户回答'),
  skipped: z.boolean().default(false).describe('是否跳过'),
})

export class InterviewCardResponseDto extends createZodDto(interviewCardResponseSchema, 'InterviewCardResponseDto') {}
