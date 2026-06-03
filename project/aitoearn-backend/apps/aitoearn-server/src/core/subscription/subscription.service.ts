import { Injectable, Logger } from '@nestjs/common'
import { AppException, ResponseCode } from '@yikart/common'
import { SubscribeDto } from './subscription.dto'
import { SubscriptionRepository } from './subscription.repository'

// MVP: 默认订阅计划（硬编码，后续可移至数据库）
const DEFAULT_PLANS = [
  {
    planId: 'free',
    name: '免费版',
    price: 0,
    interval: 'month' as const,
    maxAccounts: 3,
    maxContentPerMonth: 10,
    maxPlatforms: 3,
    features: ['ai_content', 'basic_publish', 'basic_analytics'],
  },
  {
    planId: 'pro',
    name: 'Pro 版',
    price: 29900, // ¥299 in cents
    interval: 'month' as const,
    maxAccounts: 10,
    maxContentPerMonth: 100,
    maxPlatforms: 6,
    features: ['ai_content', 'advanced_publish', 'ai_auto_reply', 'advanced_analytics', 'priority_support'],
  },
  {
    planId: 'enterprise',
    name: '企业版',
    price: 99900, // ¥999 in cents
    interval: 'month' as const,
    maxAccounts: 30,
    maxContentPerMonth: 500,
    maxPlatforms: 14,
    features: ['ai_content', 'advanced_publish', 'ai_auto_reply', 'lead_detection', 'rag_knowledge', 'full_analytics', 'white_label', 'dedicated_support'],
  },
]

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name)

  constructor(private readonly subscriptionRepo: SubscriptionRepository) {}

  // ── Plans ──

  async listPlans() {
    // MVP: return hardcoded plans. V2: load from DB
    return DEFAULT_PLANS
  }

  // ── My Subscription ──

  async getMySubscription(userId: string) {
    const sub = await this.subscriptionRepo.getActiveByUserId(userId)

    // If no active subscription, return free plan info
    if (!sub) {
      const freePlan = DEFAULT_PLANS.find(p => p.planId === 'free')!
      const quotaUsed = await this.subscriptionRepo.getMonthlyQuotaUsage(userId, 'create_content')
      return {
        planId: freePlan.planId,
        planName: freePlan.name,
        status: 'active',
        startedAt: new Date(0),
        expiresAt: new Date(9999, 11, 31),
        autoRenew: false,
        quotaUsed,
        quotaLimit: freePlan.maxContentPerMonth,
        features: freePlan.features,
      }
    }

    const plan = DEFAULT_PLANS.find(p => p.planId === sub.planId) || DEFAULT_PLANS[0]
    const quotaUsed = await this.subscriptionRepo.getMonthlyQuotaUsage(userId, 'create_content')

    return {
      planId: sub.planId,
      planName: plan.name,
      status: sub.status,
      startedAt: sub.startedAt,
      expiresAt: sub.expiresAt,
      autoRenew: sub.autoRenew,
      quotaUsed,
      quotaLimit: plan.maxContentPerMonth,
      features: plan.features,
    }
  }

  // ── Subscribe ──

  async subscribe(userId: string, dto: SubscribeDto) {
    const plan = DEFAULT_PLANS.find(p => p.planId === dto.planId)
    if (!plan) {
      throw new AppException(ResponseCode.PlanNotFound)
    }

    // Check existing active subscription
    const existing = await this.subscriptionRepo.getActiveByUserId(userId)
    if (existing && existing.planId === dto.planId) {
      throw new AppException(ResponseCode.AlreadySubscribed)
    }

    // MVP: return a placeholder payment URL
    // T2.3 will implement actual Stripe session creation
    const now = new Date()
    let expiresAt: Date
    if (dto.interval === 'year') {
      expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
    } else {
      expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    }

    const sub = await this.subscriptionRepo.create({
      userId,
      planId: dto.planId,
      status: 'active', // MVP: auto-activate. Production: activate after payment
      startedAt: now,
      expiresAt,
      autoRenew: true,
      paymentMethod: dto.paymentMethod,
    })

    this.logger.log(`Subscription created: userId=${userId}, plan=${dto.planId}`)

    // Return a mock payment URL for MVP
    const paymentUrl = `/zh-CN/settings/billing?sub_id=${(sub as any)._id}&status=success`
    return { paymentUrl, orderId: (sub as any)._id.toString() }
  }

  // ── Quota Check ──

  async checkQuota(userId: string, action: string): Promise<boolean> {
    const sub = await this.subscriptionRepo.getActiveByUserId(userId)
    const planId = sub?.planId || 'free'
    const plan = DEFAULT_PLANS.find(p => p.planId === planId) || DEFAULT_PLANS[0]

    const used = await this.subscriptionRepo.getMonthlyQuotaUsage(userId, action)
    return used < plan.maxContentPerMonth
  }

  async incrementQuota(userId: string, action: string): Promise<void> {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    await this.subscriptionRepo.incrementQuota(userId, action, month)
  }

  // ── Cancel ──

  async cancelSubscription(userId: string) {
    const sub = await this.subscriptionRepo.getActiveByUserId(userId)
    if (!sub) {
      throw new AppException(ResponseCode.SubscriptionNotFound)
    }
    await this.subscriptionRepo.updateStatus((sub._id as unknown) as string, 'canceled')
    this.logger.log(`Subscription canceled: userId=${userId}`)
  }
}
