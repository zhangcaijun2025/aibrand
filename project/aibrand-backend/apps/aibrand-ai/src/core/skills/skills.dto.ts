import { createZodDto } from '@yikart/common'
import { z } from 'zod'

/**
 * POST /skills/:key/execute 请求 DTO
 *
 * 仅 expert 类 skillKey 支持执行。
 * prompt 会与 skill 的 name/description 组合成增强提示词。
 *
 * model enum 与 agent.dto.ts AllowedModelSchema 保持一致。
 */
export const ExecuteSkillSchema = z.object({
  prompt: z.string().min(1).max(4000).describe('用户提示词'),
  model: z
    .enum([
      'claude-opus-4-6',
      'claude-haiku-4-5-20251001-thinking',
      'claude-opus-4-5-20251101-thinking',
      'claude-opus-4-5-20251101',
      'claude-sonnet-4-5-20250929-thinking',
      'claude-haiku-4-5-20251001',
      'claude-opus-4-1-20250805',
      'claude-opus-4-1-20250805-thinking',
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-6',
      'claude-opus-4-6-thinking',
    ])
    .optional()
    .describe('模型(可选,默认使用 skill 配置的 model)'),
  taskId: z
    .string()
    .transform((val) => (val.trim() === '' ? undefined : val))
    .optional()
    .describe('任务ID(恢复对话时使用)'),
})
export class ExecuteSkillDto extends createZodDto(ExecuteSkillSchema, 'ExecuteSkillDto') {}
