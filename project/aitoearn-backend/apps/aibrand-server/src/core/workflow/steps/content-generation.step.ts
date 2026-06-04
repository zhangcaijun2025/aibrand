/**
 * Step 4: Content Generation — 内容生成
 *
 * 复用现有 DraftGenerationService (V1 Agent 型 + V2 固定管线)，
 * 按选题生成多平台版本的内容。
 *
 * 注: DraftGenerationService 在 aibrand-ai 应用中，
 * 这里通过 AibrandAiClientService 调用。
 */

import { Injectable, Logger } from '@nestjs/common'
import type { IStep, StepResult } from '../engine/step.interface'
import type { WorkflowContext } from '../engine/context'

@Injectable()
export class ContentGenerationStep implements IStep {
  readonly name = 'content_generation'
  private readonly logger = new Logger(ContentGenerationStep.name)

  async execute(ctx: WorkflowContext): Promise<StepResult> {
    this.logger.log('Generating content...')

    const topics = ctx.getStepData<{ topics: any[]; selectedTopics?: string[] }>('topic_generator')
    const intent = ctx.getStepData<{ intent: any }>('intent_analysis')

    // 如果有选定选题则用选定，否则用全部
    const selectedIds = topics?.selectedTopics
    const allTopics = topics?.topics || []
    const activeTopics = selectedIds
      ? allTopics.filter((t: any) => selectedIds.includes(t.id))
      : allTopics

    if (activeTopics.length === 0) {
      return {
        success: false,
        data: {},
        error: '没有可生成的选题',
      }
    }

    try {
      const platforms = ctx.input.platforms
      const contentType = ctx.input.contentType || 'all'
      const results: Array<{ topic: string; platform: string; status: string }> = []

      // 逐个选题 × 逐平台生成 (实际应通过 DraftGenerationService + BullMQ 队列执行)
      for (const topic of activeTopics) {
        for (const platform of platforms) {
          const key = `${topic.id}-${platform}`
          this.logger.log(`Would generate: ${topic.title} → ${platform} (${contentType})`)

          // TODO: 接入 DraftGenerationService 或 AgentRuntimeService
          // await this.aiClient.generateDraft({ topic, platform, contentType })
          results.push({ topic: topic.title, platform, status: 'queued' })
        }
      }

      return {
        success: true,
        data: {
          generated: results,
          totalCount: results.length,
        },
        summary: `已提交 ${results.length} 个内容生成任务 (${activeTopics.length} 选题 × ${platforms.length} 平台)`,
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
