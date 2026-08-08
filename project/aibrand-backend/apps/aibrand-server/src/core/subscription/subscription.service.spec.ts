/**
 * SubscriptionService — 订阅计划 / 订阅 / 配额 / 取消 单元测试
 */
import { Test, TestingModule } from '@nestjs/testing'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AppException } from '@yikart/common'
import { SubscriptionRepository } from './subscription.repository'
import { SubscriptionService } from './subscription.service'

describe('SubscriptionService', () => {
  let service: SubscriptionService

  const mockRepo = {
    getActiveByUserId: vi.fn(),
    getMonthlyQuotaUsage: vi.fn(),
    create: vi.fn(),
    incrementQuota: vi.fn(),
    updateStatus: vi.fn(),
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: SubscriptionRepository, useValue: mockRepo },
      ],
    }).compile()
    service = module.get(SubscriptionService)
  })

  describe('listPlans', () => {
    it('returns free / pro / enterprise plans with pricing', async () => {
      const plans = await service.listPlans()
      expect(plans.map(p => p.planId)).toEqual(['free', 'pro', 'enterprise'])
      expect(plans[1].price).toBe(29900)
      expect(plans[2].maxPlatforms).toBe(14)
    })
  })

  describe('getMySubscription', () => {
    it('returns free plan defaults when no active subscription', async () => {
      mockRepo.getActiveByUserId.mockResolvedValue(null)
      mockRepo.getMonthlyQuotaUsage.mockResolvedValue(3)
      const sub = await service.getMySubscription('user-1')
      expect(sub.planId).toBe('free')
      expect(sub.quotaUsed).toBe(3)
      expect(sub.quotaLimit).toBe(10)
    })

    it('returns the active plan info', async () => {
      mockRepo.getActiveByUserId.mockResolvedValue({ planId: 'pro', status: 'active' })
      mockRepo.getMonthlyQuotaUsage.mockResolvedValue(20)
      const sub = await service.getMySubscription('user-1')
      expect(sub.planId).toBe('pro')
      expect(sub.quotaLimit).toBe(100)
    })
  })

  describe('subscribe', () => {
    it('throws when plan not found', async () => {
      await expect(service.subscribe('u1', { planId: 'nonexistent' } as never)).rejects.toBeInstanceOf(AppException)
    })

    it('throws when already subscribed to the same plan', async () => {
      mockRepo.getActiveByUserId.mockResolvedValue({ planId: 'pro' })
      await expect(service.subscribe('u1', { planId: 'pro' } as never)).rejects.toBeInstanceOf(AppException)
    })

    it('creates subscription and returns a payment url', async () => {
      mockRepo.getActiveByUserId.mockResolvedValue(null)
      mockRepo.create.mockResolvedValue({ _id: 'sub-1' })
      const result = await service.subscribe('u1', { planId: 'pro', interval: 'month', paymentMethod: 'stripe' } as never)
      expect(result.paymentUrl).toContain('sub-1')
      expect(result.orderId).toBe('sub-1')
    })
  })

  describe('checkQuota', () => {
    it('allows when usage is below plan limit', async () => {
      mockRepo.getActiveByUserId.mockResolvedValue({ planId: 'free' })
      mockRepo.getMonthlyQuotaUsage.mockResolvedValue(5)
      await expect(service.checkQuota('u1', 'create_content')).resolves.toBe(true)
    })

    it('blocks when usage reaches the plan limit', async () => {
      mockRepo.getActiveByUserId.mockResolvedValue({ planId: 'free' })
      mockRepo.getMonthlyQuotaUsage.mockResolvedValue(10)
      await expect(service.checkQuota('u1', 'create_content')).resolves.toBe(false)
    })
  })

  describe('cancelSubscription', () => {
    it('throws when no active subscription', async () => {
      mockRepo.getActiveByUserId.mockResolvedValue(null)
      await expect(service.cancelSubscription('u1')).rejects.toBeInstanceOf(AppException)
    })

    it('updates status to canceled', async () => {
      mockRepo.getActiveByUserId.mockResolvedValue({ _id: 's1', planId: 'pro' })
      await service.cancelSubscription('u1')
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('s1', 'canceled')
    })
  })
})
