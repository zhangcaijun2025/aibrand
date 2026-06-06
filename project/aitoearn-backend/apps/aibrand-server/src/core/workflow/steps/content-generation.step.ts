/**
 * Step 4: Content Generation — AI 内容生成
 *
 * 基于选题和平台，调用 LLM 生成多平台版本的内容。
 * - 视频平台: 脚本 + 描述 + 标签 + 封面建议
 * - 图文平台: 标题 + 正文 + 标签 + 配图建议
 *
 * 复用 OneApiService (统一 LLM 网关)，与 TopicGeneratorStep 同模式。
 */

import { Injectable, Logger } from '@nestjs/common'
import { OneApiService } from '@yikart/ai-services'
import type { IStep, StepResult } from '../engine/step.interface'
import type { WorkflowContext } from '../engine/context'

// ─── Types ──────────────────────────────────────

interface GeneratedContent {
  /** 平台标识 */
  platform: string
  /** 选题标题 */
  topic: string
  /** 内容类型 */
  contentType: string
  /** 标题 (所有类型) */
  title: string
  /** 正文/描述/脚本 */
  body: string
  /** 标签 (3-10个) */
  tags: string[]
  /** 视频脚本分段 (仅 video) */
  script?: Array<{ scene: string; narration: string; duration: number }>
  /** 封面/配图描述 (用于后续图片生成) */
  imagePrompt?: string
}

interface ContentGenInput {
  topics: Array<{ id: string; title: string; angle: string; hook: string; outline: string[] }>
  platforms: string[]
  contentType: string
  brand?: string
  industry?: string
}

// ─── Prompt Templates ────────────────────────────

const VIDEO_CONTENT_PROMPT = `你是 AiBrand 的资深内容创作专家。基于以下信息，为指定视频平台创作内容。

平台特性:
- 抖音/TikTok: 快节奏、强钩子、口语化、15-60秒节奏
- YouTube: 深度内容、结构化、5-15分钟
- Bilibili: Z世代文化、弹幕梗、知识密度高
- 快手: 接地气、有共鸣、真实感

请以 JSON 格式返回：
{
  "title": "视频标题 (吸引点击，<50字)",
  "body": "视频描述文案 (含引导互动语)",
  "tags": ["标签1", "标签2", ...],
  "script": [
    { "scene": "场景描述", "narration": "旁白/台词", "duration": 秒数 }
  ],
  "imagePrompt": "封面图AI生成提示词"
}`

const IMAGE_TEXT_CONTENT_PROMPT = `你是 AiBrand 的资深内容创作专家。基于以下信息，为指定图文平台创作内容。

平台特性:
- 小红书: 种草风、emoji丰富、#话题标签、经验分享
- 微博: 热点感、互动性强、可适度争议
- 知乎: 深度专业、数据支撑、逻辑严谜
- 微信公众号: 排版精致、标题党适度、长文友好
- LinkedIn: 专业商务、行业洞察、克制正式
- X/Twitter: 简洁有力、Thread串、热点参与
- Instagram: 视觉导向、Hashtag策略、生活方式

请以 JSON 格式返回：
{
  "title": "标题 (抓眼球，<30字)",
  "body": "正文内容 (平台适配风格，200-500字)",
  "tags": ["标签1", "标签2", ...],
  "imagePrompt": "配图AI生成提示词 (描述画面元素和风格)"
}`

// ─── Platform classification ─────────────────────

const VIDEO_PLATFORMS = new Set([
  'douyin', 'tiktok', 'youtube', 'bilibili', 'kuaishou',
  'weishi', 'xiaohongshu_video', 'instagram_reels', 'youtube_shorts',
])

// ─── Implementation ──────────────────────────────

@Injectable()
export class ContentGenerationStep implements IStep {
  readonly name = 'content_generation'
  private readonly logger = new Logger(ContentGenerationStep.name)

  constructor(private readonly oneApi: OneApiService) {}

  async execute(ctx: WorkflowContext): Promise<StepResult> {
    this.logger.log('Generating content with AI...')

    // 读取上游步骤数据
    const topicData = ctx.getStepData<{
      topics: Array<{ id: string; title: string; angle: string; hook: string; outline: string[] }>
      selectedTopics?: string[]
    }>('topic_generator')

    const intent = ctx.getStepData<{ intent: any }>('intent_analysis')
    const research = ctx.getStepData<{ industry?: string }>('strategy_research')

    // 确定要生成的选题
    const allTopics = topicData?.topics || []
    const selectedIds = topicData?.selectedTopics
    const activeTopics = selectedIds
      ? allTopics.filter((t) => selectedIds.includes(t.id))
      : allTopics

    if (activeTopics.length === 0) {
      return { success: false, data: {}, error: '没有可生成的选题' }
    }

    const platforms = ctx.input.platforms
    const contentType = ctx.input.contentType || 'all'
    const brand = ctx.input.brand || intent?.intent?.brand || ''
    const industry = research?.industry || ctx.input.industry || '通用'

    try {
      const results: GeneratedContent[] = []
      const failures: Array<{ topic: string; platform: string; error: string }> = []

      // 逐个选题 × 逐平台生成 (使用 Promise.allSettled 实现降级)
      for (const topic of activeTopics) {
        const platformTasks = platforms.map(async (platform) => {
          const isVideo = VIDEO_PLATFORMS.has(platform) || contentType === 'video'
          const prompt = isVideo ? VIDEO_CONTENT_PROMPT : IMAGE_TEXT_CONTENT_PROMPT

          const userContext = [
            `行业: ${industry}`,
            brand ? `品牌/产品: ${brand}` : '',
            `目标平台: ${platform} (${isVideo ? '视频' : '图文'})`,
            `选题: ${topic.title}`,
            `切入角度: ${topic.angle}`,
            `开头钩子: ${topic.hook}`,
            `大纲: ${topic.outline?.join(' → ')}`,
            `用户原始需求: ${ctx.input.query}`,
          ].filter(Boolean).join('\n')

          const result = await this.oneApi.chatCompletion({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: userContext },
            ],
            maxTokens: 2048,
            temperature: 0.8,
          })

          // 解析 JSON 响应
          const jsonMatch = result.content.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            throw new Error(`LLM returned non-JSON response for ${platform}`)
          }

          const parsed = JSON.parse(jsonMatch[0])
          return {
            platform,
            topic: topic.title,
            contentType: isVideo ? 'video' : 'image_text',
            title: parsed.title || topic.title,
            body: parsed.body || '',
            tags: parsed.tags || [],
            script: parsed.script,
            imagePrompt: parsed.imagePrompt,
          } satisfies GeneratedContent
        })

        // 并行生成所有平台的内容，允许部分失败
        const settled = await Promise.allSettled(platformTasks)

        settled.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            results.push(result.value)
            this.logger.log(`Generated: ${topic.title} → ${platforms[idx]} (${result.value.contentType})`)
          } else {
            const platform = platforms[idx]
            const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
            failures.push({ topic: topic.title, platform, error: errorMsg })
            this.logger.warn(`Content generation failed: ${topic.title} → ${platform}: ${errorMsg}`)
          }
        })
      }

      // 全部失败 → 报错
      if (results.length === 0 && activeTopics.length > 0) {
        return {
          success: false,
          data: { failures },
          error: `全部内容生成失败: ${failures.length} 个任务均未成功`,
        }
      }

      const summaryParts = [`已生成 ${results.length} 条内容 (${activeTopics.length} 选题 × ${platforms.length} 平台)`]
      if (failures.length > 0) {
        summaryParts.push(`${failures.length} 条失败 (降级)`)
      }

      return {
        success: true,
        data: {
          contents: results,
          failures,
          totalGenerated: results.length,
          totalFailed: failures.length,
        },
        summary: summaryParts.join('，'),
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: `内容生成失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}
