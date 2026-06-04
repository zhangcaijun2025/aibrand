/**
 * Step 2: Strategy Research — 策略研究
 *
 * 并行调用:
 * - Dify RAG 知识库检索 (品牌/平台规则/行业趋势)
 * - n8n 竞品分析工作流 (异步触发)
 *
 * 产出: 趋势洞察 + 竞品分析 + 历史数据
 */

import { Injectable, Logger } from '@nestjs/common'
import { DifyService, N8nService } from '@yikart/ai-services'
import type { IStep, StepResult } from '../engine/step.interface'
import type { WorkflowContext } from '../engine/context'

@Injectable()
export class StrategyResearchStep implements IStep {
  readonly name = 'strategy_research'
  private readonly logger = new Logger(StrategyResearchStep.name)

  constructor(
    private readonly dify: DifyService,
    private readonly n8n: N8nService,
  ) {}

  async execute(ctx: WorkflowContext): Promise<StepResult> {
    this.logger.log('Running strategy research...')

    const intent = ctx.getStepData<{ intent: any }>('intent_analysis')
    const keywords = intent?.intent?.keywords || []
    const industry = intent?.intent?.industry || ctx.input.industry || '通用'

    try {
      // 并行执行 RAG 检索 + 竞品分析触发
      const [ragResult, trendingResult] = await Promise.allSettled([
        // Dify RAG 检索
        this.dify.retrieveKnowledge({
          query: `${industry} ${ctx.input.query}`,
          datasetIds: [], // 将从 Dify 动态获取
          topK: 5,
          scoreThreshold: 0.5,
        }).catch(err => {
          this.logger.warn(`Dify RAG failed (non-blocking): ${err.message}`)
          return [] // 降级: 返回空结果，不阻塞工作流
        }),

        // n8n 热搜话题拉取 (fire-and-forget)
        this.n8n.triggerTrendingTopics(industry).catch(err => {
          this.logger.warn(`n8n trending failed (non-blocking): ${err.message}`)
        }),
      ])

      const ragDocs = ragResult.status === 'fulfilled' ? ragResult.value : []
      const ragSummary = ragDocs.length > 0
        ? `检索到 ${ragDocs.length} 条相关知识片段`
        : '知识库暂无相关数据 (降级)'

      return {
        success: true,
        data: {
          ragDocuments: ragDocs,
          industry,
          keywords,
        },
        summary: `${ragSummary} | 行业: ${industry} | 热搜抓取已触发`,
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: `策略研究失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}
