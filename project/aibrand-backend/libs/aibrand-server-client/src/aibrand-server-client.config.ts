import { createZodDto } from '@yikart/common'
import z from 'zod'

export const aibrandServerClientConfigSchema = z.object({
  baseUrl: z.string(),
  token: z.string(),
})

export class aibrandServerClientConfig extends createZodDto(aibrandServerClientConfigSchema) {}
