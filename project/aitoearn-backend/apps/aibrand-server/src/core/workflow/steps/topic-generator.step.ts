/**
 * Step 3: Topic Generator — 选题生成
 *
 * 基于意图分析和策略研究结果，生成 3 个选题方向。
 * 用户确认后继续，支持"全部采用"或"选择部分"。
 */

import { Injectable, Logger } from '@nestjs/common'
import { OneApiService } from '@yikart/ai-services'
import type { IStep, StepResult } from '../engine/step.interface'
import type { WorkflowContext } from '../engine/context'

const TOPIC_PROMPT = `你是 AiBrand 的创意选题师。基于以下信息，生成 3 个高质量的选题方向。

要求:
- 每个选题包含: id, title(吸引眼球), angle(切入角度), hook(开头钩子), outline(3-5点大纲), platforms(最适合的平台)
- 3 个选题应有差异化角度 (不同切入点/受众/风格)
- 考虑当前行业趋势和平台算法偏好

请以 JSON 数组格式返回：[{ "id": "topic_1", ... }, ...]`

@Injectable()
export class TopicGeneratorStep implements IStep {
  readonly name = 'topic_generator'
  private readonly logger = new Logger(TopicGeneratorStep.name)

  constructor(private readonly oneApi: OneApiService) {}

  async execute(ctx: WorkflowContext): Promise<StepResult> {
    this.logger.log('Generating topic suggestions...')

    const intent = ctx.getStepData('intent_analysis')
    const research = ctx.getStepData('strategy_research')

    const context = JSON.stringify({
      intent: intent?.['intent'],
      industry: research?.['industry'],
      keywords: research?.['keywords'],
      ragCount: (research?.['ragDocuments'] as any)?.length || 0,
    })

    try {
      const result = await this.oneApi.chatCompletion({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: TOPIC_PROMPT },
          { role: 'user', content: `用户需求: ${ctx.input.query}\n\n分析结果: ${context}` },
        ],
        maxTokens: 1024,
        temperature: 0.8, // 创意生成需要更高温度
      })

      const jsonMatch = result.content.match(/\[[\s\S]*\]/)
      const topics = jsonMatch ? JSON.parse(jsonMatch[0]) : []

      if (!Array.isArray(topics) || topics.length === 0) {
        return {
          success: false,
          data: {},
          error: '选题生成失败: LLM 返回空结果',
        }
      }

      return {
        success: true,
        data: {
          topics,
          totalCount: topics.length,
          needsConfirmation: true, // 标记需要用户确认
        },
        summary: `生成 ${topics.length} 个选题方向:\n${topics.map((t: any) => `  • ${t['title']}`).join('\n')}`,
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: `选题生成失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}
