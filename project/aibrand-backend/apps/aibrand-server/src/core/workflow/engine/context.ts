/**
 * WorkflowContext — 工作流执行上下文
 *
 * 承载一次工作流执行的全部状态：输入参数、步骤间共享数据、
 * 进度推送回调等。每个步骤通过 context 读取上游输出。
 */

import { EventEmitter2 } from '@nestjs/event-emitter'

export interface WorkflowInput {
  /** 用户自然语言描述的需求 */
  query: string
  /** 目标平台列表 (如 ['xhs', 'douyin', 'bilibili']) */
  platforms: string[]
  /** 行业/领域 (可选) */
  industry?: string
  /** 品牌/产品信息 (可选) */
  brand?: string
  /** 内容类型偏好: 'video' | 'image_text' | 'all' */
  contentType?: 'video' | 'image_text' | 'all'
  /** 生成数量 */
  count?: number
}

export type WorkflowStatus = 'pending' | 'running' | 'waiting_confirm' | 'completed' | 'failed' | 'cancelled'

export interface WorkflowMetadata {
  executionId: string
  userId: string
  status: WorkflowStatus
  currentStep: string
  startedAt: Date
  updatedAt: Date
  completedAt?: Date
  error?: string
}

export class WorkflowContext {
  readonly executionId: string
  readonly userId: string
  readonly input: WorkflowInput
  readonly metadata: WorkflowMetadata

  /** 步骤名 → 该步骤的产出 */
  private stepResults = new Map<string, import('./step.interface').StepResult>()

  /** 事件发射器 (用于 SSE 进度推送) */
  private eventEmitter?: EventEmitter2

  constructor(
    executionId: string,
    userId: string,
    input: WorkflowInput,
    eventEmitter?: EventEmitter2,
  ) {
    this.executionId = executionId
    this.userId = userId
    this.input = input
    this.eventEmitter = eventEmitter
    this.metadata = {
      executionId,
      userId,
      status: 'pending',
      currentStep: '',
      startedAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /** 获取指定步骤的产出 (类型安全) */
  getStepData<T = Record<string, any>>(stepName: string): T | undefined {
    return this.stepResults.get(stepName)?.data as T | undefined
  }

  /** 写入当前步骤的产出 */
  setStepResult(stepName: string, result: import('./step.interface').StepResult): void {
    this.stepResults.set(stepName, result)
    this.metadata.currentStep = stepName
    this.metadata.updatedAt = new Date()
    if (!result.success && !this.metadata.error) {
      this.metadata.error = result.error
    }
  }

  /** 获取所有已完成步骤的产出 (摘要) */
  getProgress(): Array<{ step: string; success: boolean; summary?: string }> {
    return Array.from(this.stepResults.entries()).map(([step, result]) => ({
      step,
      success: result.success,
      summary: result.summary,
    }))
  }

  /** SSE 进度推送 */
  emitProgress(event: string, payload: Record<string, any>): void {
    this.eventEmitter?.emit(`workflow.${this.executionId}`, {
      event,
      executionId: this.executionId,
      currentStep: this.metadata.currentStep,
      timestamp: Date.now(),
      ...payload,
    })
  }
}
