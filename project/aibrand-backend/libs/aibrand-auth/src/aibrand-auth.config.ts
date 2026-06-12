import { createZodDto } from '@yikart/common'
import { z } from 'zod'

export const aibrandAuthConfigSchema = z.object({
  secret: z.string().default(''),
  expiresIn: z.number().default(7 * 24 * 60 * 60),
  internalToken: z.string(),
})

export class aibrandAuthConfig extends createZodDto(aibrandAuthConfigSchema) {}
