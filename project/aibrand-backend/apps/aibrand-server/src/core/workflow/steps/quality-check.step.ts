/**
 * Step 5: Quality Check — 质量检测
 *
 * 复用 OneApiService.diagnose() 对生成内容进行多维度评分：
 * - 标题质量
 * - 内容质量
 * - 视觉建议
 * - 标签策略
 * - 互动潜力
 */

import { Injectable, Logger } from '@nestjs/common'
import { OneApiService } from '@yikart/ai-services'
import type { IStep, StepResult } from '../engine/step.interface'
import type { WorkflowContext } from '../engine/context'

@Injectable()
export class QualityCheckStep implements IStep {
  readonly name = 'quality_check'
  private readonly logger = new Logger(QualityCheckStep.name)

  constructor(private readonly oneApi: OneApiService) {}

  async execute(ctx: WorkflowContext): Promise<StepResult> {
    this.logger.log('Running quality check...')

    const generation = ctx.getStepData<{ generated: any[] }>('content_generation')
    const generated = generation?.generated || []

    if (generated.length === 0) {
      return {
        success: false,
        data: {},
        error: '没有可检测的内容',
      }
    }

    try {
      // 批量诊断 (逐个调用)
      const results: Array<{ topic: string; score: number; dimensions: any[] }> = []

      for (const item of generated.slice(0, 3)) { // 最多诊断 3 条
        const diagnosis = await this.oneApi.diagnose(
          `标题: ${item.topic}\n平台: ${item.platform}`,
          ctx.input.industry,
        )
        results.push({
          topic: item.topic,
          score: diagnosis.overallScore,
          dimensions: diagnosis.dimensions,
        })
      }

      const avgScore = results.length > 0
        ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
        : 0

      const passCount = results.filter(r => r.score >= 70).length

      return {
        success: true,
        data: {
          scores: results,
          averageScore: avgScore,
          passCount,
          totalCount: results.length,
          passRate: results.length > 0 ? Math.round((passCount / results.length) * 100) : 0,
        },
        summary: `质量评分: 均分 ${avgScore}/100, 通过率 ${results.length > 0 ? Math.round((passCount / results.length) * 100) : 0}%`,
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: `质量检测失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}
