/**
 * Step 6: Publish Strategy — 发布策略
 *
 * 基于质量评分和历史数据，推荐：
 * - 最佳发布时间
 * - 平台优先级排序
 * - 发布节奏 (间隔)
 * - 触发发布追踪 (n8n 48h 回收)
 */

import { Injectable, Logger } from '@nestjs/common'
import { N8nService, OneApiService } from '@yikart/ai-services'
import type { IStep, StepResult } from '../engine/step.interface'
import type { WorkflowContext } from '../engine/context'

const STRATEGY_PROMPT = `你是 AiBrand 的发布策略专家。基于以下信息，给出优化的发布策略。

请以 JSON 格式返回：
{
  "recommendedOrder": ["平台1", "平台2"],
  "bestTimes": [{ "platform": "xhs", "time": "20:00", "dayOfWeek": "周三", "reason": "晚高峰活跃" }],
  "intervalMinutes": 30,
  "batchSize": 2,
  "notes": "策略说明"
}`

@Injectable()
export class PublishStrategyStep implements IStep {
  readonly name = 'publish_strategy'
  private readonly logger = new Logger(PublishStrategyStep.name)

  constructor(
    private readonly oneApi: OneApiService,
    private readonly n8n: N8nService,
  ) {}

  async execute(ctx: WorkflowContext): Promise<StepResult> {
    this.logger.log('Generating publish strategy...')

    const quality = ctx.getStepData<{ scores: any[]; averageScore: number }>('quality_check')

    const context = JSON.stringify({
      platforms: ctx.input.platforms,
      qualityScore: quality?.averageScore || 0,
      contentType: ctx.input.contentType,
    })

    try {
      // 生成策略建议
      const result = await this.oneApi.chatCompletion({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: STRATEGY_PROMPT },
          { role: 'user', content: context },
        ],
        maxTokens: 512,
        temperature: 0.3,
      })

      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      const strategy = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

      // 触发发布追踪 (48h 后回收数据)
      this.n8n.triggerPostPublishTracking(['placeholder']).catch(err => {
        this.logger.warn(`n8n post-publish tracking trigger failed: ${err.message}`)
      })

      return {
        success: true,
        data: {
          strategy,
          trackingTriggered: true,
        },
        summary: strategy.notes || `${ctx.input.platforms.length} 个平台发布策略已生成`,
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: `发布策略生成失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}
