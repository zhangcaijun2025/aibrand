import { createZodDto } from '@yikart/common'
import z from 'zod'

export const aibrandAiClientConfigSchema = z.object({
  baseUrl: z.string(),
  token: z.string(),
})

export class aibrandAiClientConfig extends createZodDto(aibrandAiClientConfigSchema) {}
