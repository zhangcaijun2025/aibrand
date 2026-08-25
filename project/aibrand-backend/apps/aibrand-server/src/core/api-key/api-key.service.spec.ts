/**
 * ApiKeyService — API Key 生命周期 & 安全校验测试
 */

import { AppException, ResponseCode } from '@yikart/common'

import { ApiKeyRepository } from '@yikart/mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiKeyService } from './api-key.service'

// @yikart/mongodb 的 schema 含类类型字段（AiLog/User 等），测试环境加载即崩 → mock 隔离
vi.mock('@yikart/mongodb', () => ({
  ApiKeyRepository: class {},
}))

describe('apiKeyService', () => {
  let service: ApiKeyService
  let repo: {
    create: ReturnType<typeof vi.fn>
    listByUserId: ReturnType<typeof vi.fn>
    deleteByIdAndUserId: ReturnType<typeof vi.fn>
    getByKeyHash: ReturnType<typeof vi.fn>
    updateLastUsedAt: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    repo = {
      create: vi.fn().mockResolvedValue({ id: 'key-1', name: 'prod', keyHash: 'abc', createdAt: new Date('2025-01-01') }),
      listByUserId: vi.fn().mockResolvedValue([]),
      deleteByIdAndUserId: vi.fn().mockResolvedValue(undefined),
      getByKeyHash: vi.fn().mockResolvedValue(null),
      updateLastUsedAt: vi.fn().mockResolvedValue(undefined),
    }
    service = new ApiKeyService(repo as unknown as ApiKeyRepository)
  })

  describe('create', () => {
    it('should return a prefixed raw key and hashed stored value', async () => {
      const result = await service.create('user-1', 'prod')
      expect(result.key).toMatch(/^ak_/)
      expect(result.id).toBe('key-1')
      expect(result.name).toBe('prod')
      // 存储的是 hash，绝不存储明文 key
      const stored = repo.create.mock.calls[0][0] as { keyHash: string }
      expect(stored.keyHash).toBeTruthy()
      expect(stored.keyHash).not.toBe(result.key)
    })
  })

  describe('listByUserId', () => {
    it('should delegate to repository scoped by userId', async () => {
      await service.listByUserId('user-42')
      expect(repo.listByUserId).toHaveBeenCalledWith('user-42')
    })
  })

  describe('validateKey', () => {
    it('should throw ApiKeyInvalid when key not found', async () => {
      repo.getByKeyHash.mockResolvedValue(null)
      await expect(service.validateKey('ak_nope')).rejects.toBeInstanceOf(AppException)
      await expect(service.validateKey('ak_nope')).rejects.toMatchObject({ code: ResponseCode.ApiKeyInvalid })
    })

    it('should return the key and bump lastUsedAt when valid', async () => {
      const key = { id: 'key-1', userId: 'user-1', keyHash: 'abc' }
      repo.getByKeyHash.mockResolvedValue(key)
      const result = await service.validateKey('ak_valid')
      expect(result).toEqual(key)
      expect(repo.updateLastUsedAt).toHaveBeenCalledWith('key-1')
    })
  })

  describe('deleteByIdAndUserId', () => {
    it('should scope deletion by both id and userId (ownership enforced)', async () => {
      await service.deleteByIdAndUserId('key-1', 'user-1')
      expect(repo.deleteByIdAndUserId).toHaveBeenCalledWith('key-1', 'user-1')
    })
  })
})
