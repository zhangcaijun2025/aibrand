import { Test, TestingModule } from '@nestjs/testing'

import { PublishRecordRepository, PublishStatus } from '@yikart/mongodb'
/**
 * PublishRecordService — 发布记录核心操作 单元测试
 */
import { vi } from 'vitest'
import { beforeEach, describe, expect, it } from 'vitest'
import { MaterialService } from '../content/material.service'
import { PublishRecordService } from './publish-record.service'

// @yikart/mongodb 的 User schema 含类类型字段，加载即崩（存量问题）→ 用 mock 隔离
vi.mock('@yikart/mongodb', () => ({
  PublishRecordRepository: class {},
  PublishStatus: { Pending: 0, Publishing: 1, Published: 2, Failed: 3 },
  PublishType: {},
  PublishRecord: class {},
}))
// 本地 MaterialService → media.service → config 链路在测试环境会挂起，整模块替换
vi.mock('../content/material.service', () => ({
  MaterialService: class {},
}))

describe('publishRecordService', () => {
  let service: PublishRecordService

  const mockRepo = {
    create: vi.fn(),
    donePublishRecord: vi.fn(),
    updateStatus: vi.fn(),
    delById: vi.fn(),
  }
  const mockMaterial = { addUseCount: vi.fn() }

  beforeEach(async () => {
    vi.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishRecordService,
        { provide: PublishRecordRepository, useValue: mockRepo },
        { provide: MaterialService, useValue: mockMaterial },
      ],
    }).compile()
    service = module.get(PublishRecordService)
  })

  describe('createPublishRecord', () => {
    it('delegates to repository', async () => {
      const data = { platform: 'xhs', accountType: 'xhs' } as never
      mockRepo.create.mockResolvedValue({ _id: 'p1', ...data })
      const res = await service.createPublishRecord(data)
      expect(mockRepo.create).toHaveBeenCalledWith(data)
      expect(res._id).toBe('p1')
    })
  })

  describe('donePublishRecord', () => {
    it('returns false when repository finds nothing', async () => {
      mockRepo.donePublishRecord.mockResolvedValue(null)
      await expect(service.donePublishRecord({ dataId: 'd1', uid: 'u1' }, { workLink: 'https://example.com' })).resolves.toBe(false)
    })

    it('returns true and triggers completion side effects', async () => {
      const record = { dataId: 'd1', uid: 'u1', materialId: 'm1', status: 2 } as never
      mockRepo.donePublishRecord.mockResolvedValue(record)
      const res = await service.donePublishRecord({ dataId: 'd1', uid: 'u1' }, { workLink: 'https://example.com' })
      expect(res).toBe(true)
      expect(mockRepo.donePublishRecord).toHaveBeenCalledWith(
        { dataId: 'd1', uid: 'u1' },
        { workLink: 'https://example.com' },
      )
    })
  })

  describe('updateStatusById', () => {
    it('delegates status update', async () => {
      mockRepo.updateStatus.mockResolvedValue({ _id: 'p1', status: 3 })
      await service.updateStatusById('p1', PublishStatus.Failed, 'platform rejected')
      expect(mockRepo.updateStatus).toHaveBeenCalledWith('p1', PublishStatus.Failed, 'platform rejected')
    })
  })

  describe('deleteById', () => {
    it('delegates delete', async () => {
      mockRepo.delById.mockResolvedValue(true)
      await expect(service.deleteById('p1')).resolves.toBe(true)
      expect(mockRepo.delById).toHaveBeenCalledWith('p1')
    })
  })
})
