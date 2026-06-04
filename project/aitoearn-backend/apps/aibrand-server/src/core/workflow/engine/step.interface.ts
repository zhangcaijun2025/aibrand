/**
 * IStep — 工作流步骤合约
 *
 * 每个步骤实现此接口，通过 WorkflowContext 获取上游数据、
 * 产出结果给下游步骤消费。
 */

import type { WorkflowContext } from './context'

export interface StepResult {
  /** 步骤是否成功 */
  success: boolean
  /** 产出数据，写入 context 供后续步骤读取 */
  data: Record<string, any>
  /** 动态指定下一步 (默认按注册顺序) */
  nextStep?: string
  /** 提前终止工作流 */
  skipRemaining?: boolean
  /** 错误信息 (success=false 时填充) */
  error?: string
  /** 给前端展示的摘要信息 */
  summary?: string
}

export interface IStep {
  /** 步骤唯一标识 */
  readonly name: string
  /** 执行步骤 */
  execute(ctx: WorkflowContext): Promise<StepResult>
  /** 回滚 (可选) */
  rollback?(ctx: WorkflowContext): Promise<void>
}
