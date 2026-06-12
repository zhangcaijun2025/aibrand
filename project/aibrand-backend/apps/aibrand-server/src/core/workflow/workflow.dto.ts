/**
 * Workflow DTOs — Zod validation schemas
 */

import { z } from 'zod'

export const executeWorkflowSchema = z.object({
  query: z.string().min(1).max(2000).describe('用户需求描述'),
  platforms: z.array(z.string()).min(1).max(10).describe('目标平台列表'),
  industry: z.string().max(100).optional().describe('行业/领域'),
  brand: z.string().max(500).optional().describe('品牌/产品信息'),
  contentType: z.enum(['video', 'image_text', 'all']).optional().default('all'),
  count: z.number().int().min(1).max(10).optional().default(1).describe('生成数量'),
})

export const confirmTopicsSchema = z.object({
  executionId: z.string().min(1),
  selectedTopics: z.array(z.string()).min(1).max(10).describe('选中的选题 ID 列表'),
})

export const retryStepSchema = z.object({
  executionId: z.string().min(1),
  stepName: z.string().min(1),
})

export type ExecuteWorkflowDto = z.infer<typeof executeWorkflowSchema>
export type ConfirmTopicsDto = z.infer<typeof confirmTopicsSchema>
export type RetryStepDto = z.infer<typeof retryStepSchema>
