/**
 * Step 1: Intent Analysis — 意图分析
 *
 * 使用 LLM 解析用户的自然语言输入，提取：
 * - 行业/领域
 * - 内容目标 (获客/品牌/转化)
 * - 目标平台偏好
 * - 内容调性
 * - 关键词/话题
 */

import { Injectable, Logger } from '@nestjs/common'
import { OneApiService } from '@yikart/ai-services'
import type { IStep, StepResult } from '../engine/step.interface'
import type { WorkflowContext } from '../engine/context'

const SYSTEM_PROMPT = `你是 AiBrand 的内容策略分析专家。分析用户的内容创作需求，提取关键信息。

请以 JSON 格式返回：
{
  "industry": "行业/领域",
  "goal": "内容目标 (branding/lead_gen/conversion/engagement/education)",
  "tone": "内容调性 (professional/casual/humorous/inspirational/authoritative)",
  "targetAudience": "目标受众描述",
  "keywords": ["关键词1", "关键词2"],
  "preferredFormats": ["video", "image_text"],
  "competitorReferences": ["可参考的竞品方向"],
  "confidence": 0.85
}`

@Injectable()
export class IntentAnalysisStep implements IStep {
  readonly name = 'intent_analysis'
  private readonly logger = new Logger(IntentAnalysisStep.name)

  constructor(private readonly oneApi: OneApiService) {}

  async execute(ctx: WorkflowContext): Promise<StepResult> {
    this.logger.log(`Analyzing intent for: "${ctx.input.query.slice(0, 100)}..."`)

    try {
      const result = await this.oneApi.chatCompletion({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: ctx.input.query },
        ],
        maxTokens: 512,
        temperature: 0.3,
      })

      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
      const summary = `${analysis.industry || '通用'} | ${analysis.goal || '品牌'} | ${analysis.tone || '专业'}`

      return {
        success: true,
        data: { intent: analysis },
        summary,
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: `意图分析失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}
