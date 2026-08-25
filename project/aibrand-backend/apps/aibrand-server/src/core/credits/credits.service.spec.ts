import { Test, TestingModule } from '@nestjs/testing'

import { CreditsType } from '@yikart/common'
import { CreditsHelperService } from '@yikart/helpers'
import { CreditsBalanceRepository, CreditsRecordRepository } from '@yikart/mongodb'
/**
 * CreditsService — 余额 / 流水 / 过期回收 单元测试
 */
import { vi } from 'vitest'
import { beforeEach, describe, expect, it } from 'vitest'
import { CreditsService } from './credits.service'

// @yikart/mongodb 的 User schema 含类类型字段，加载即崩（存量问题）→ 用 mock 隔离
vi.mock('@yikart/common', () => ({
  CreditsType: { Expired: 'expired', Purchase: 'purchase', Refund: 'refund' },
  WithLoggerContext: () => () => {},
}))
vi.mock('@yikart/helpers', () => ({
  CreditsHelperService: class {},
}))
vi.mock('@yikart/mongodb', () => ({
  CreditsRecordRepository: class {},
  CreditsBalanceRepository: class {},
  Transactional: () => () => {},
}))
// redlock → redis 链路在测试环境无连接，整模块替换为 no-op
vi.mock('@yikart/redlock', () => ({
  Redlock: () => () => {},
  RedlockService: class {},
  RedlockModule: class {},
  RedlockInjector: class {},
  RedlockConfig: class {},
}))

describe('creditsService', () => {
  let service: CreditsService

  const mockCreditsHelper = {
    getBalance: vi.fn(),
    addCredits: vi.fn(),
    deductCredits: vi.fn(),
  }
  const mockRecordRepo = {
    listWithPagination: vi.fn(),
    listExpiredCredits: vi.fn(),
    resetBalances: vi.fn(),
    create: vi.fn(),
  }
  const mockBalanceRepo = { decrement: vi.fn() }

  beforeEach(async () => {
    vi.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditsService,
        { provide: CreditsHelperService, useValue: mockCreditsHelper },
        { provide: CreditsRecordRepository, useValue: mockRecordRepo },
        { provide: CreditsBalanceRepository, useValue: mockBalanceRepo },
      ],
    }).compile()
    service = module.get(CreditsService)
  })

  describe('getBalance', () => {
    it('delegates to credits helper', async () => {
      mockCreditsHelper.getBalance.mockResolvedValue(1200)
      await expect(service.getBalance('user-1')).resolves.toBe(1200)
      expect(mockCreditsHelper.getBalance).toHaveBeenCalledWith('user-1')
    })
  })

  describe('getRecords', () => {
    it('returns paginated records with total', async () => {
      const list = [{ id: 'r1' }, { id: 'r2' }]
      mockRecordRepo.listWithPagination.mockResolvedValue([list, 2])
      const [rows, total] = await service.getRecords('user-1', { page: 1, pageSize: 10 } as never)
      expect(rows).toEqual(list)
      expect(total).toBe(2)
      expect(mockRecordRepo.listWithPagination).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }))
    })
  })

  describe('addCredits / deductCredits', () => {
    it('delegates addCredits', async () => {
      const dto = { userId: 'u1', amount: 100 } as never
      await service.addCredits(dto)
      expect(mockCreditsHelper.addCredits).toHaveBeenCalledWith(dto)
    })

    it('delegates deductCredits', async () => {
      const dto = { userId: 'u1', amount: -50 } as never
      await service.deductCredits(dto)
      expect(mockCreditsHelper.deductCredits).toHaveBeenCalledWith(dto)
    })
  })

  describe('checkCreditsExpiration', () => {
    it('no-op when there are no expired records', async () => {
      mockRecordRepo.listExpiredCredits.mockResolvedValue([])
      await service.checkCreditsExpiration()
      expect(mockBalanceRepo.decrement).not.toHaveBeenCalled()
      expect(mockRecordRepo.resetBalances).not.toHaveBeenCalled()
    })

    it('decrements balance, resets records and writes expiry record', async () => {
      mockRecordRepo.listExpiredCredits.mockResolvedValue([
        { id: 'r1', userId: 'u1', balance: 100, amount: 50 },
        { id: 'r2', userId: 'u1', balance: 30, amount: 30 },
      ])
      await service.checkCreditsExpiration()
      expect(mockBalanceRepo.decrement).toHaveBeenCalledWith('u1', 130)
      expect(mockRecordRepo.resetBalances).toHaveBeenCalledWith(['r1', 'r2'])
      expect(mockRecordRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u1',
        amount: -130,
        balance: 0,
        type: CreditsType.Expired,
      }))
    })

    it('continues processing other users when one fails', async () => {
      mockRecordRepo.listExpiredCredits.mockResolvedValue([
        { id: 'r1', userId: 'u1', balance: 100, amount: 100 },
        { id: 'r2', userId: 'u2', balance: 50, amount: 50 },
      ])
      mockBalanceRepo.decrement.mockRejectedValueOnce(new Error('db down'))
      await expect(service.checkCreditsExpiration()).resolves.toBeUndefined()
      expect(mockBalanceRepo.decrement).toHaveBeenCalledWith('u2', 50)
    })
  })
})
