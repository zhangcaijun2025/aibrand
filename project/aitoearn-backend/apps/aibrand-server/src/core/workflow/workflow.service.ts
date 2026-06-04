/**
 * WorkflowService — 工作流编排服务
 *
 * 核心职责:
 * 1. 接收执行请求 → 创建 WorkflowContext → 委托 Executor 执行
 * 2. 管理执行记录 (MongoDB 持久化)
 * 3. 用户确认回调 (Step 3 选题确认)
 * 4. 重试/取消
 */

import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { v4 as uuid } from 'uuid'
import { WorkflowExecution } from './workflow.schema'
import { WorkflowRepository } from './workflow.repository'
import { WorkflowExecutor } from './engine/executor'
import { StepRegistry } from './engine/registry'
import { WorkflowContext } from './engine/context'
import type { ExecuteWorkflowDto, ConfirmTopicsDto, RetryStepDto } from './workflow.dto'

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name)

  /** 6 步工作流步骤顺序 */
  static readonly STEPS = [
    'intent_analysis',
    'strategy_research',
    'topic_generator',
    'content_generation',
    'quality_check',
    'publish_strategy',
  ]

  constructor(
    private readonly repository: WorkflowRepository,
    private readonly executor: WorkflowExecutor,
    private readonly registry: StepRegistry,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** 启动工作流执行 */
  async execute(userId: string, dto: ExecuteWorkflowDto): Promise<{ executionId: string }> {
    const executionId = uuid()

    const ctx = new WorkflowContext(executionId, userId, dto, this.eventEmitter)

    // 持久化初始状态
    const doc: any = {
      userId,
      status: 'pending' as const,
      input: ctx.input,
      steps: [],
    }
    doc._id = executionId as any
    await this.repository.create(doc)

    // 异步执行 (不阻塞 HTTP 响应)
    this.runWorkflow(ctx).catch(err => {
      this.logger.error(`Workflow ${executionId} execution error: ${err.message}`, err.stack)
    })

    return { executionId }
  }

  /** 用户确认选题 (Step 3 → Step 4) */
  async confirmTopics(userId: string, dto: ConfirmTopicsDto): Promise<void> {
    const ctx = await this.getContext(dto.executionId, userId)

    ctx.setStepResult('topic_generator', {
      success: true,
      data: {
        topics: (ctx.getStepData('topic_generator') as any)?.['topics'] || [],
        selectedTopics: dto.selectedTopics,
      },
      summary: `用户选定 ${dto.selectedTopics.length} 个选题`,
    })

    // 继续执行后续步骤
    await this.runWorkflow(ctx, 4) // 从 Step 4 继续
  }

  /** 重试失败步骤 */
  async retryStep(userId: string, dto: RetryStepDto): Promise<void> {
    const ctx = await this.getContext(dto.executionId, userId)

    const stepIndex = WorkflowService.STEPS.indexOf(dto.stepName)
    if (stepIndex < 0) {
      throw new Error(`Unknown step: ${dto.stepName}`)
    }

    // 清除该步骤之前的失败结果
    ctx.metadata.status = 'running'
    ctx.metadata.error = undefined

    await this.runWorkflow(ctx, stepIndex + 1) // 从该步骤继续
  }

  /** 取消工作流 */
  async cancel(executionId: string, userId: string): Promise<void> {
    const doc = await this.repository.findById(executionId)
    if (!doc || doc.userId !== userId) {
      throw new Error('Workflow not found')
    }
    await this.repository.updateStatus(executionId, 'cancelled')
    this.eventEmitter.emit(`workflow.${executionId}`, { event: 'workflow_cancelled' })
  }

  /** 获取历史记录 */
  async getHistory(userId: string, limit = 20, skip = 0) {
    return this.repository.findByUserId(userId, limit, skip)
  }

  /** 获取执行上下文 */
  private async getContext(executionId: string, userId: string): Promise<WorkflowContext> {
    const doc = await this.repository.findById(executionId)
    if (!doc || doc.userId !== userId) {
      throw new Error('Workflow not found')
    }

    const ctx = new WorkflowContext(executionId, userId, doc.input as any, this.eventEmitter)

    // 恢复已完成的步骤结果
    for (const step of doc.steps || []) {
      ctx.setStepResult(step.name, {
        success: step.status === 'completed',
        data: step.data,
        summary: step.summary,
        error: step.error,
      })
    }

    return ctx
  }

  /** 异步运行工作流 */
  private async runWorkflow(ctx: WorkflowContext, startIndex = 0): Promise<void> {
    const steps = WorkflowService.STEPS.slice(startIndex)

    try {
      await this.executor.execute(steps, ctx)

      // 持久化最终状态
      const stepRecords: WorkflowExecution['steps'] = []
      for (const name of WorkflowService.STEPS) {
        const result = ctx.getStepData(name)
        const stepResult = (ctx as any).stepResults?.get(name)
        if (stepResult) {
          stepRecords.push({
            name,
            status: stepResult.success ? 'completed' : 'failed',
            data: stepResult.data,
            summary: stepResult.summary,
            error: stepResult.error,
          })
        }
      }

      await this.repository.updateStatus(ctx.executionId, ctx.metadata.status, {
        steps: stepRecords as any,
        completedAt: ctx.metadata.completedAt,
        error: ctx.metadata.error,
      })
    } catch (error) {
      this.logger.error(`Workflow ${ctx.executionId} failed: ${error}`)
      await this.repository.updateStatus(ctx.executionId, 'failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
