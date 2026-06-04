import { createZodDto, PaginationDtoSchema } from '@yikart/common'
import { z } from 'zod'

// ── Subscribe ──

export const SubscribeDtoSchema = z.object({
  planId: z.enum(['pro', 'enterprise']).describe('订阅计划 ID'),
  interval: z.enum(['month', 'year']).describe('付费周期'),
  paymentMethod: z.enum(['stripe', 'alipay']).describe('支付方式'),
  returnUrl: z.string().url().optional().describe('支付完成后回跳地址'),
})

export class SubscribeDto extends createZodDto(SubscribeDtoSchema, 'SubscribeDto') {}

// ── Quota Usage Query ──

export const QuotaUsageQuerySchema = PaginationDtoSchema.extend({
  action: z.string().optional().describe('按操作类型筛选'),
  month: z.string().optional().describe('按月份筛选，格式 YYYY-MM'),
})

export class QuotaUsageQueryDto extends createZodDto(QuotaUsageQuerySchema, 'QuotaUsageQueryDto') {}

// ── Stripe Webhook ──

export const StripeWebhookDtoSchema = z.object({
  type: z.string().describe('事件类型'),
  data: z.object({
    object: z.any().describe('Stripe 事件对象'),
  }),
})

export class StripeWebhookDto extends createZodDto(StripeWebhookDtoSchema, 'StripeWebhookDto') {}
