/**
 * WorkflowExecutor — 递归步骤执行器
 *
 * 按注册顺序执行步骤，支持：
 * - 步骤间数据传递 (WorkflowContext)
 * - 失败重试 (可配置次数)
 * - 动态跳转 (StepResult.nextStep)
 * - 提前终止 (StepResult.skipRemaining)
 * - SSE 进度推送
 */

import { Injectable, Logger } from '@nestjs/common'
import type { IStep, StepResult } from './step.interface'
import type { WorkflowContext } from './context'
import { StepRegistry } from './registry'

export interface ExecutorOptions {
  /** 单个步骤最大重试次数 (默认 1) */
  maxRetries?: number
  /** 重试延迟 ms (默认 500) */
  retryDelayMs?: number
  /** 步骤超时 ms (默认 300000 = 5min) */
  stepTimeoutMs?: number
}

@Injectable()
export class WorkflowExecutor {
  private readonly logger = new Logger(WorkflowExecutor.name)
  private readonly defaultOptions: Required<ExecutorOptions> = {
    maxRetries: 1,
    retryDelayMs: 500,
    stepTimeoutMs: 300000,
  }

  constructor(private readonly registry: StepRegistry) {}

  /**
   * 执行完整工作流
   * @param stepNames 步骤名列表 (按顺序)
   * @param ctx 工作流上下文
   * @param options 执行器配置
   * @returns 最终上下文 (含所有步骤产出)
   */
  async execute(
    stepNames: string[],
    ctx: WorkflowContext,
    options?: ExecutorOptions,
  ): Promise<WorkflowContext> {
    const opts = { ...this.defaultOptions, ...options }

    ctx.metadata.status = 'running'
    ctx.emitProgress('workflow_started', { steps: stepNames })

    let currentIndex = 0

    while (currentIndex < stepNames.length) {
      const stepName = stepNames[currentIndex]
      const step = this.registry.get(stepName)

      if (!step) {
        this.logger.error(`Step "${stepName}" not found in registry`)
        ctx.metadata.status = 'failed'
        ctx.metadata.error = `Step "${stepName}" not registered`
        ctx.emitProgress('workflow_error', { error: ctx.metadata.error })
        break
      }

      ctx.emitProgress('step_started', { step: stepName })

      const result = await this.executeStep(step, ctx, opts)

      ctx.setStepResult(stepName, result)

      if (!result.success) {
        ctx.metadata.status = 'failed'
        ctx.emitProgress('step_failed', { step: stepName, error: result.error })
        break
      }

      ctx.emitProgress('step_completed', {
        step: stepName,
        summary: result.summary,
        nextStep: result.nextStep,
        data: result.data, // 传递步骤产出数据给前端
      })

      // 提前终止
      if (result.skipRemaining) {
        ctx.metadata.status = 'completed'
        ctx.emitProgress('workflow_skipped', { reason: `Step "${stepName}" requested skip` })
        break
      }

      // 动态跳转
      if (result.nextStep) {
        const jumpIndex = stepNames.indexOf(result.nextStep)
        if (jumpIndex >= 0) {
          currentIndex = jumpIndex
          this.logger.log(`Jumping to step "${result.nextStep}"`)
          continue
        }
        this.logger.warn(`Next step "${result.nextStep}" not in step list, continuing sequentially`)
      }

      currentIndex++
    }

    // 所有步骤成功完成
    if (ctx.metadata.status === 'running') {
      ctx.metadata.status = 'completed'
      ctx.metadata.completedAt = new Date()
      ctx.emitProgress('workflow_completed', {
        progress: ctx.getProgress(),
      })
    }

    return ctx
  }

  /** 执行单步骤 (含重试逻辑) */
  private async executeStep(
    step: IStep,
    ctx: WorkflowContext,
    opts: Required<ExecutorOptions>,
  ): Promise<StepResult> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        const result = await this.withTimeout(
          step.execute(ctx),
          opts.stepTimeoutMs,
          `Step "${step.name}" timed out after ${opts.stepTimeoutMs}ms`,
        )
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.logger.warn(
          `Step "${step.name}" attempt ${attempt + 1}/${opts.maxRetries + 1} failed: ${lastError.message}`,
        )
        ctx.emitProgress('step_retry', {
          step: step.name,
          attempt: attempt + 1,
          error: lastError.message,
        })

        if (attempt < opts.maxRetries) {
          await this.delay(opts.retryDelayMs * (attempt + 1))
        }
      }
    }

    return {
      success: false,
      data: {},
      error: lastError?.message || 'Unknown error',
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(message)), ms),
      ),
    ])
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
