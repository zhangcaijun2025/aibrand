/**
 * StepRegistry — 步骤注册表
 *
 * 所有步骤在模块初始化时注册到此表。
 * Executor 通过注册表按名称查找步骤实例。
 */

import { Injectable, Logger } from '@nestjs/common'
import type { IStep } from './step.interface'

@Injectable()
export class StepRegistry {
  private readonly logger = new Logger(StepRegistry.name)
  private steps = new Map<string, IStep>()

  /** 注册一个步骤 */
  register(step: IStep): void {
    if (this.steps.has(step.name)) {
      this.logger.warn(`Step "${step.name}" is already registered, overwriting`)
    }
    this.steps.set(step.name, step)
    this.logger.log(`Step "${step.name}" registered`)
  }

  /** 批量注册 */
  registerAll(steps: IStep[]): void {
    steps.forEach(s => this.register(s))
  }

  /** 获取指定步骤 */
  get(name: string): IStep | undefined {
    return this.steps.get(name)
  }

  /** 获取所有注册的步骤名 (按注册顺序) */
  getNames(): string[] {
    return Array.from(this.steps.keys())
  }

  /** 获取所有步骤 */
  getAll(): IStep[] {
    return Array.from(this.steps.values())
  }
}
