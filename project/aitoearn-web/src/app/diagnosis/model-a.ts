/**
 * Model A — 数据驱动的笔记评分引擎
 *
 * 基于 NoteRx 的 874 条真实小红书笔记研究数据，
 * 在 AiBrand 中直接使用的 TypeScript 移植版。
 *
 * 纯数学计算，无需 LLM API，50ms 内完成评分。
 */

// ==================== 品类评分参数 ====================

interface CategoryParams {
  weights: Record<string, number>
  title_length: { min: number; max: number; viral_avg: number }
  content_length: { min: number; max: number }
  tag_count: { min: number; max: number; best: number }
  image_count: { min: number; max: number }
  baseline: {
    avg_engagement: number
    median: number
    viral_threshold: number
    sample_size: number
  }
}

const MODEL_PARAMS: Record<string, CategoryParams> = {
  food: {
    weights: { title_quality: 0.573, content_quality: 0.132, visual_quality: 0.086, tag_strategy: 0.097, engagement_potential: 0.111 },
    title_length: { min: 11, max: 19, viral_avg: 18.3 },
    content_length: { min: 105, max: 342 },
    tag_count: { min: 4, max: 8, best: 6 },
    image_count: { min: 2, max: 10 },
    baseline: { avg_engagement: 33462, median: 7333, viral_threshold: 112965, sample_size: 183 },
  },
  fashion: {
    weights: { title_quality: 0.395, content_quality: 0.125, visual_quality: 0.25, tag_strategy: 0.058, engagement_potential: 0.172 },
    title_length: { min: 11, max: 20, viral_avg: 14.0 },
    content_length: { min: 92, max: 224 },
    tag_count: { min: 4, max: 8, best: 6 },
    image_count: { min: 2, max: 10 },
    baseline: { avg_engagement: 7507, median: 2069, viral_threshold: 18037, sample_size: 278 },
  },
  tech: {
    weights: { title_quality: 0.411, content_quality: 0.125, visual_quality: 0.103, tag_strategy: 0.095, engagement_potential: 0.267 },
    title_length: { min: 12, max: 20, viral_avg: 17.5 },
    content_length: { min: 87, max: 517 },
    tag_count: { min: 4, max: 8, best: 6 },
    image_count: { min: 1, max: 6 },
    baseline: { avg_engagement: 1275, median: 175, viral_threshold: 3325, sample_size: 235 },
  },
  travel: {
    weights: { title_quality: 0.376, content_quality: 0.05, visual_quality: 0.12, tag_strategy: 0.312, engagement_potential: 0.142 },
    title_length: { min: 11, max: 20, viral_avg: 14.3 },
    content_length: { min: 123, max: 737 },
    tag_count: { min: 4, max: 8, best: 6 },
    image_count: { min: 4, max: 14 },
    baseline: { avg_engagement: 16563, median: 4538, viral_threshold: 39426, sample_size: 130 },
  },
  lifestyle: {
    weights: { title_quality: 0.407, content_quality: 0.083, visual_quality: 0.071, tag_strategy: 0.277, engagement_potential: 0.162 },
    title_length: { min: 10, max: 20, viral_avg: 19.4 },
    content_length: { min: 24, max: 148 },
    tag_count: { min: 4, max: 8, best: 6 },
    image_count: { min: 1, max: 8 },
    baseline: { avg_engagement: 8038, median: 773, viral_threshold: 17097, sample_size: 48 },
  },
}

const CATEGORY_CN: Record<string, string> = {
  food: '美食', fashion: '穿搭', tech: '科技', travel: '旅游',
  lifestyle: '生活',
}

// ==================== 特征提取 ====================

function detectEmoji(text: string): boolean {
  // Check for common emoji patterns using surrogate pair detection
  if (!text) return false
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    // High surrogate (0xD800-0xDBFF) followed by low surrogate (0xDC00-0xDFFF)
    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1)
      if (next >= 0xDC00 && next <= 0xDFFF) {
        const cp = (code - 0xD800) * 0x400 + (next - 0xDC00) + 0x10000
        if ((cp >= 0x1F600 && cp <= 0x1F64F) || // emoticons
            (cp >= 0x1F300 && cp <= 0x1F5FF) || // symbols & pictographs
            (cp >= 0x1F680 && cp <= 0x1F6FF) || // transport
            (cp >= 0x1F900 && cp <= 0x1F9FF) || // supplemental
            cp === 0x1F525 || cp === 0x1F49A || cp === 0x1F4AF) {
          return true
        }
      }
    }
    // Check for non-surrogate emoji-like characters
    if ((code >= 0x2702 && code <= 0x27B0) || code === 0x2728 || code === 0x203C || code === 0x2B50) {
      return true
    }
  }
  return false
}

function countHooks(title: string): number {
  let hooks = 0
  if (/\d+/.test(title)) hooks++
  if (/[！!？?]/.test(title)) hooks++
  if (/[｜|]/.test(title)) hooks++
  if (/[\u2728\u203C\u2B50]/.test(title)) hooks++
  if (title.indexOf('\uD83D\uDD25') >= 0 || title.indexOf('\uD83D\uDCAF') >= 0) hooks++
  if (/(必|绝了|太|超|巨|神仙|宝藏|救命)/.test(title)) hooks++
  return hooks
}

function rangeScore(value: number, optMin: number, optMax: number, base = 80): number {
  if (value >= optMin && value <= optMax) {
    const mid = (optMin + optMax) / 2
    const half = (optMax - optMin) / 2 + 1
    return base + (100 - base) * (1 - Math.abs(value - mid) / half)
  } else if (value < optMin) {
    return Math.max(20, base * value / Math.max(optMin, 1))
  } else {
    return Math.max(40, base - (value - optMax) * 2)
  }
}

// ==================== Model A 预评分 ====================

export interface ModelAResult {
  total_score: number
  dimensions: {
    title_quality: number
    content_quality: number
    visual_quality: number
    tag_strategy: number
    engagement_potential: number
  }
  weights: Record<string, number>
  level: string
  baseline: { avg_engagement: number; median: number; viral_threshold: number; sample_size: number }
}

export function preScore(
  title: string,
  content: string,
  category: string,
  tagCount = 0,
  imageCount = 0,
): ModelAResult {
  const p = MODEL_PARAMS[category] || MODEL_PARAMS.lifestyle
  const w = p.weights

  // 标题分数
  let titleScore = rangeScore(title.length, p.title_length.min, p.title_length.max)
  titleScore += /\d+/.test(title) ? 5 : 0
  titleScore += Math.min(countHooks(title), 3) * 3
  titleScore += detectEmoji(title + content) ? 2 : 0
  titleScore = Math.min(titleScore, 100)

  // 内容分数
  const contentScore = Math.min(rangeScore(content.length, p.content_length.min, p.content_length.max, 85), 100)

  // 视觉分数
  const visualScore = Math.min(rangeScore(imageCount, p.image_count.min, p.image_count.max), 100)

  // 标签分数
  const tagScore = Math.max(0, 100 - Math.abs(tagCount - p.tag_count.best) * 10)

  // 互动潜力
  let signals = 0
  if (title.length >= p.title_length.min) signals += 25
  if (/\d+/.test(title)) signals += 15
  if (countHooks(title) >= 2) signals += 20
  if (tagCount >= p.tag_count.min && tagCount <= p.tag_count.max) signals += 20
  if (imageCount >= p.image_count.min && imageCount <= p.image_count.max) signals += 20
  const engagementScore = Math.min(signals, 100)

  const dims = {
    title_quality: Math.round(titleScore * 10) / 10,
    content_quality: Math.round(contentScore * 10) / 10,
    visual_quality: Math.round(visualScore * 10) / 10,
    tag_strategy: Math.round(tagScore * 10) / 10,
    engagement_potential: Math.round(engagementScore * 10) / 10,
  }

  const total = Math.min(
    Math.round(
      Object.entries(dims).reduce((sum, [key, val]) => sum + val * (w[key] || 0), 0) * 10,
    ) / 10,
    100,
  )

  const bl = p.baseline
  let level: string
  if (total >= 85) level = '前10%（爆款潜力）'
  else if (total >= 75) level = '前25%（优质内容）'
  else if (total >= 65) level = '中位水平'
  else level = '低于中位，建议优化'

  return {
    total_score: total,
    dimensions: dims,
    weights: w,
    level,
    baseline: { avg_engagement: bl.avg_engagement, median: bl.median, viral_threshold: bl.viral_threshold, sample_size: bl.sample_size },
  }
}

export function getCategoryList(): Array<{ key: string; nameCn: string; sampleSize: number }> {
  return Object.entries(MODEL_PARAMS).map(([key, val]) => ({
    key,
    nameCn: CATEGORY_CN[key] || key,
    sampleSize: val.baseline.sample_size,
  }))
}

export function getCategoryParams(category: string): CategoryParams | undefined {
  return MODEL_PARAMS[category]
}
