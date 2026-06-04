/**
 * DifyService — RAG检索 + Agent调用 + 数据集CRUD + 输入验证测试
 */

import { HttpService } from '@nestjs/axios'
import { AppException } from '@yikart/common'
import { of, throwError } from 'rxjs'
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios'
import { DifyConfig, DifyService } from './dify.service'
import { describe, it, expect, beforeEach, vi } from 'vitest'

function makeResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: 'OK', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() } } as AxiosResponse<T>
}
function makeError(message: string, status = 500): AxiosError {
  return new AxiosError(message, 'ERR', { headers: new AxiosHeaders() }, {}, { status, statusText: 'Err', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() }, data: { error: message } } as AxiosResponse)
}

const cfg: DifyConfig = { apiBase: 'http://localhost:5001', appApiKey: 'app-key', accessToken: 'tok', timeout: 30000 }

describe('DifyService', () => {
  let service: DifyService
  let post: ReturnType<typeof vi.fn>
  let get: ReturnType<typeof vi.fn>

  beforeEach(() => {
    post = vi.fn()
    get = vi.fn()
    service = new DifyService({ post, get } as unknown as HttpService, cfg)
  })

  describe('retrieveKnowledge', () => {
    it('should return fragments on success', async () => {
      post.mockReturnValue(of(makeResponse({ records: [
        { segment: { id: 's1', content: 'AI content', document: { name: 'd1.md' }, dataset: { id: 'ds1' } }, score: 0.95 },
      ]})))
      const r = await service.retrieveKnowledge({ query: 'AI', datasetIds: ['ds1'] })
      expect(r).toHaveLength(1)
      expect(r[0].content).toBe('AI content')
    })

    it('should return [] when no records', async () => {
      post.mockReturnValue(of(makeResponse({})))
      const r = await service.retrieveKnowledge({ query: 'x', datasetIds: ['ds1'] })
      expect(r).toEqual([])
    })

    it('should throw AppException on HTTP failure', async () => {
      post.mockReturnValue(throwError(() => makeError('err')))
      await expect(service.retrieveKnowledge({ query: 'x', datasetIds: ['ds1'] })).rejects.toThrow(AppException)
    })

    it('should reject query > 2000 chars (R2.3)', async () => {
      await expect(service.retrieveKnowledge({ query: 'x'.repeat(2001), datasetIds: ['ds1'] })).rejects.toThrow(AppException)
    })

    it('should reject empty datasetIds (R2.3)', async () => {
      await expect(service.retrieveKnowledge({ query: 'x', datasetIds: [] })).rejects.toThrow(AppException)
    })

    it('should accept max-length query', async () => {
      post.mockReturnValue(of(makeResponse({})))
      await expect(service.retrieveKnowledge({ query: 'x'.repeat(2000), datasetIds: ['ds1'] })).resolves.toBeDefined()
    })
  })

  describe('runAgentApp', () => {
    it('should return agent response', async () => {
      post.mockReturnValue(of(makeResponse({ answer: 'AI回答', conversation_id: 'c1', message_id: 'm1' })))
      const r = await service.runAgentApp({ query: '生成文案' })
      expect(r.answer).toBe('AI回答')
    })

    it('should pass conversation_id for continuation', async () => {
      post.mockReturnValue(of(makeResponse({ answer: '续写', conversation_id: 'c1', message_id: 'm2' })))
      await service.runAgentApp({ query: '继续', conversationId: 'c1' })
      expect(post.mock.calls[0][1].conversation_id).toBe('c1')
    })

    it('should throw AppException on failure', async () => {
      post.mockReturnValue(throwError(() => makeError('timeout', 504)))
      await expect(service.runAgentApp({ query: 'x' })).rejects.toThrow(AppException)
    })
  })

  describe('listDatasets', () => {
    it('should return mapped datasets', async () => {
      get.mockReturnValue(of(makeResponse({ data: [{ id: 'd1', name: 'KB', description: '', document_count: 5, word_count: 100, created_at: '2025-01-01' }], total: 1 })))
      const r = await service.listDatasets()
      expect(r.data).toHaveLength(1)
      expect(r.data[0].name).toBe('KB')
    })
  })

  describe('createDataset', () => {
    it('should return created dataset', async () => {
      post.mockReturnValue(of(makeResponse({ id: 'new', name: '新库', description: '', document_count: 0, word_count: 0, created_at: '2025-06-01' })))
      const r = await service.createDataset({ name: '新库' })
      expect(r.id).toBe('new')
    })
  })

  describe('createDocument', () => {
    it('should add document', async () => {
      post.mockReturnValue(of(makeResponse({ document: { id: 'doc-1', name: 'a.md' } })))
      const r = await service.createDocument({ datasetId: 'd1', name: 'a.md', text: '# Hello' })
      expect(r.id).toBe('doc-1')
    })
  })

  describe('healthCheck', () => {
    it('should return true on success', async () => {
      get.mockReturnValue(of(makeResponse({})))
      expect(await service.healthCheck()).toBe(true)
    })
    it('should return false on failure', async () => {
      get.mockReturnValue(throwError(() => new Error('no')))
      expect(await service.healthCheck()).toBe(false)
    })
  })
})
