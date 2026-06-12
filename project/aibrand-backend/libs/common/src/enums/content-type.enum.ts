/**
 * 内容智造引擎 — 内容类型 & 相关枚举
 *
 * 用于 ContentBrief Schema 的所有枚举值定义。
 * 覆盖内容类型、风格、平台、素材来源等全链路枚举。
 */

// ── 内容类型 ──

export const ContentType = [
  'product_intro',
  'brand_story',
  'tutorial',
  'promotion',
  'social_proof',
  'trend_hijack',
] as const
export type ContentType = (typeof ContentType)[number]

// ── 营销目标 ──

export const ContentGoal = [
  'awareness',
  'conversion',
  'engagement',
  'retention',
] as const
export type ContentGoal = (typeof ContentGoal)[number]

// ── 语气/语调 ──

export const ContentTone = [
  'professional',
  'warm',
  'trendy',
  'humorous',
  'emotional',
  'minimalist',
] as const
export type ContentTone = (typeof ContentTone)[number]

// ── 平台代码 ──

export const PlatformCode = [
  'xiaohongshu',
  'douyin',
  'wechat_article',
  'wechat_video',
  'weibo',
  'bilibili',
  'kuaishou',
  'instagram',
  'tiktok',
  'youtube',
  'facebook',
  'twitter',
  'linkedin',
  'zhihu',
  'toutiao',
  'jd',
  'taobao',
  'pinduoduo',
  'amazon',
  'shopee',
] as const
export type PlatformCode = (typeof PlatformCode)[number]

// ── 视觉风格 ──

export const VisualStyle = [
  'minimalist_white',
  'guochao_illustration',
  'render_3d',
  'cyberpunk',
  'japanese_fresh',
  'light_luxury',
  'tech_sense',
  'hand_drawn',
  'vintage_retro',
  'bold_typography',
  'natural_organic',
  'dark_moody',
  'vibrant_pop',
  'clean_corporate',
  'editorial',
  'scandinavian',
  'brutalist',
  'glassmorphism',
  'bento_grid',
  'scrollytelling',
] as const
export type VisualStyle = (typeof VisualStyle)[number]

// ── 图片格式 ──

export const ImageFormat = ['1:1', '3:4', '9:16', '16:9'] as const
export type ImageFormat = (typeof ImageFormat)[number]

// ── 视频层级 ──

export const VideoLevel = ['L1', 'L2', 'L3'] as const
export type VideoLevel = (typeof VideoLevel)[number]

// ── 视频方向 ──

export const VideoOrientation = ['vertical', 'horizontal'] as const
export type VideoOrientation = (typeof VideoOrientation)[number]

// ── emoji 密度 ──

export const EmojiDensity = ['none', 'low', 'high'] as const
export type EmojiDensity = (typeof EmojiDensity)[number]

// ── 句子长度偏好 ──

export const SentenceLength = ['short', 'medium', 'long'] as const
export type SentenceLength = (typeof SentenceLength)[number]

// ── 钩子风格 ──

export const HookStyle = ['pain_point', 'curiosity', 'result_first', 'story'] as const
export type HookStyle = (typeof HookStyle)[number]

// ── 字段来源（追踪每个字段的获取方式，驱动智能跳过逻辑） ──

export const FieldSource = [
  'brand_library',
  'user_input',
  'inferred',
  'platform_binding',
  'url_extraction',
  'sample_reverse',
  'manual',
] as const
export type FieldSource = (typeof FieldSource)[number]

// ── 意图清晰度来源 ──

export const ClaritySource = [
  'user_specified',
  'guided_interview',
  'ai_recommended',
] as const
export type ClaritySource = (typeof ClaritySource)[number]

// ── Brief 状态 ──

export const BriefStatus = [
  'draft',
  'confirmed',
  'in_progress',
  'completed',
] as const
export type BriefStatus = (typeof BriefStatus)[number]

// ── 去 AI 味模式 ──

export const DeAIMode = ['natural', 'professional', 'raw'] as const
export type DeAIMode = (typeof DeAIMode)[number]

// ── 采访卡片模式 ──

export const InterviewCardMode = [
  'single_select',
  'multi_select',
  'text_input',
] as const
export type InterviewCardMode = (typeof InterviewCardMode)[number]
