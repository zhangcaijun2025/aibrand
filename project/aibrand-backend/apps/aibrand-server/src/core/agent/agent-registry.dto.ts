/**
 * Agent Registry DTOs — Zod validation for agent CRUD operations
 *
 * 防止 Record<string, any> 导致的 MongoDB 字段注入。
 */

import { z } from 'zod'

// ── Shared sub-schemas ──

const avatarFullSchema = z.object({
  style: z.enum(['2d', '3d', 'lottie', 'css']),
  appearance: z.string().max(200),
  color: z.string().max(100),
})

const avatarPartialSchema = z.object({
  style: z.enum(['css', 'lottie']).optional(),
  appearance: z.string().max(200).optional(),
  color: z.string().max(100).optional(),
})

const personalitySchema = z.object({
  tone: z.enum(['professional', 'friendly', 'humorous', 'custom']),
  pace: z.enum(['fast', 'normal', 'thoughtful']),
  proactivity: z.number().min(0).max(1),
})

const personalityPartialSchema = z.object({
  tone: z.enum(['professional', 'friendly', 'humorous']).optional(),
  pace: z.enum(['fast', 'normal', 'thoughtful']).optional(),
  proactivity: z.number().min(0).max(1).optional(),
})

// ── Create Agent ──

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  personality: personalitySchema.optional(),
  avatar: avatarFullSchema.optional(),
  wakeWords: z.array(z.string().max(50)).max(10).optional(),
  capabilities: z.array(z.string().max(50)).max(20).optional(),
  isPublic: z.boolean().optional(),
  category: z.string().max(50).optional(),
  systemPrompt: z.string().max(5000).optional(),
  config: z.record(z.string(), z.any()).optional(),
})

export type CreateAgentDto = z.infer<typeof CreateAgentSchema>

// ── Update Agent ──

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  personality: personalitySchema.optional(),
  avatar: avatarFullSchema.optional(),
  wakeWords: z.array(z.string().max(50)).max(10).optional(),
  capabilities: z.array(z.string().max(50)).max(20).optional(),
  isPublic: z.boolean().optional(),
  category: z.string().max(50).optional(),
  systemPrompt: z.string().max(5000).optional(),
  config: z.record(z.string(), z.any()).optional(),
  /** 恢复为预设的字段列表 */
  resetFields: z.array(z.string()).optional(),
})

export type UpdateAgentDto = z.infer<typeof UpdateAgentSchema>

// ── Quick Config ──

export const QuickConfigSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: avatarPartialSchema.optional(),
  personality: personalityPartialSchema.optional(),
  wakeWords: z.array(z.string().max(50)).max(10).optional(),
  capabilities: z.array(z.string().max(50)).max(20).optional(),
})

export type QuickConfigDto = z.infer<typeof QuickConfigSchema>
