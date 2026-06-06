/**
 * Agent Registry DTOs — Zod validation for agent CRUD operations
 *
 * 防止 Record<string, any> 导致的 MongoDB 字段注入。
 */

import { z } from 'zod'

// ── Create Agent ──

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  personality: z.string().max(2000).optional(),
  avatar: z.string().max(500).optional(),
  wakeWords: z.array(z.string().max(50)).max(10).optional(),
  capabilities: z.array(z.string().max(50)).max(20).optional(),
  isPublic: z.boolean().optional(),
  category: z.string().max(50).optional(),
  systemPrompt: z.string().max(5000).optional(),
  config: z.record(z.any()).optional(),
})

export type CreateAgentDto = z.infer<typeof CreateAgentSchema>

// ── Update Agent ──

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  personality: z.string().max(2000).optional(),
  avatar: z.string().max(500).optional(),
  wakeWords: z.array(z.string().max(50)).max(10).optional(),
  capabilities: z.array(z.string().max(50)).max(20).optional(),
  isPublic: z.boolean().optional(),
  category: z.string().max(50).optional(),
  systemPrompt: z.string().max(5000).optional(),
  config: z.record(z.any()).optional(),
  /** 恢复为预设的字段列表 */
  resetFields: z.array(z.string()).optional(),
})

export type UpdateAgentDto = z.infer<typeof UpdateAgentSchema>

// ── Quick Config ──

export const QuickConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().max(500).optional(),
  personality: z.string().max(2000).optional(),
  wakeWords: z.array(z.string().max(50)).max(10).optional(),
  capabilities: z.array(z.string().max(50)).max(20).optional(),
})

export type QuickConfigDto = z.infer<typeof QuickConfigSchema>
