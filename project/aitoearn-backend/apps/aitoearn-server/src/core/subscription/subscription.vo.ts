import { createPaginationVo, createZodDto } from '@yikart/common'
import { z } from 'zod'

// ── Plan VO ──

export const PlanVoSchema = z.object({
  planId: z.string().describe('计划 ID'),
  name: z.string().describe('计划名称'),
  price: z.number().describe('价格（分）'),
  interval: z.string().describe('付费周期'),
  maxAccounts: z.number().describe('最大账号数'),
  maxContentPerMonth: z.number().describe('月内容配额'),
  maxPlatforms: z.number().describe('最大平台数'),
  features: z.array(z.string()).describe('包含功能'),
})

export class PlanVo extends createZodDto(PlanVoSchema, 'PlanVo') {}

// ── Plan List VO ──

export class PlanListVo {
  plans!: PlanVo[]
}

// ── My Subscription VO ──

export const MySubscriptionVoSchema = z.object({
  planId: z.string().describe('当前计划 ID'),
  planName: z.string().describe('计划名称'),
  status: z.string().describe('订阅状态'),
  startedAt: z.date().describe('开始时间'),
  expiresAt: z.date().describe('到期时间'),
  autoRenew: z.boolean().describe('是否自动续费'),
  quotaUsed: z.number().describe('本月已用量'),
  quotaLimit: z.number().describe('本月配额上限'),
  features: z.array(z.string()).describe('当前功能列表'),
})

export class MySubscriptionVo extends createZodDto(MySubscriptionVoSchema, 'MySubscriptionVo') {}

// ── Subscribe Response VO ──

export const SubscribeResponseVoSchema = z.object({
  paymentUrl: z.string().describe('支付页面 URL'),
  orderId: z.string().describe('订单 ID'),
})

export class SubscribeResponseVo extends createZodDto(SubscribeResponseVoSchema, 'SubscribeResponseVo') {}

// ── Quota Usage VO ──

export const QuotaUsageVoSchema = z.object({
  action: z.string().describe('操作类型'),
  month: z.string().describe('月份'),
  count: z.number().describe('使用次数'),
})

export class QuotaUsageVo extends createZodDto(QuotaUsageVoSchema, 'QuotaUsageVo') {}

export class QuotaUsageListVo extends createPaginationVo(QuotaUsageVoSchema, 'QuotaUsageListVo') {}
