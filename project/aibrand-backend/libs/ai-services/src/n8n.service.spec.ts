/**
 * N8nService — Webhook触发 + 路径遍历防护 + 便捷方法测试
 */

import { HttpService } from '@nestjs/axios'
import { AppException } from '@yikart/common'
import { of, throwError } from 'rxjs'
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios'
import { N8nConfig, N8nService } from './n8n.service'
import { describe, it, expect, beforeEach, vi } from 'vitest'

function makeResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return { data, status, statusText: 'OK', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() } } as AxiosResponse<T>
}
function makeError(message: string, status = 500): AxiosError {
  return new AxiosError(message, 'ERR', { headers: new AxiosHeaders() }, {}, { status, statusText: 'Err', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() }, data: { error: message } } as AxiosResponse)
}

const cfg: N8nConfig = { baseUrl: 'http://localhost:5678', apiKey: 'key', timeout: 30000 }

describe('N8nService', () => {
  let service: N8nService
  let post: ReturnType<typeof vi.fn>
  let get: ReturnType<typeof vi.fn>

  beforeEach(() => {
    post = vi.fn()
    get = vi.fn()
    service = new N8nService({ post, get } as unknown as HttpService, cfg)
  })

  // ── R2.3: Path traversal prevention ──

  describe('triggerWorkflow — path traversal prevention', () => {
    it('should reject paths with ".."', async () => {
      await expect(service.triggerWorkflow({ webhookPath: '../etc/passwd' })).rejects.toThrow(AppException)
    })
    it('should reject paths starting with "/"', async () => {
      await expect(service.triggerWorkflow({ webhookPath: '/absolute' })).rejects.toThrow(AppException)
    })
    it('should reject paths starting with "http"', async () => {
      await expect(service.triggerWorkflow({ webhookPath: 'http://evil.com' })).rejects.toThrow(AppException)
    })
    it('should accept valid paths', async () => {
      post.mockReturnValue(of(makeResponse({ ok: true })))
      const r = await service.triggerWorkflow({ webhookPath: 'content/analyze' })
      expect(r).toEqual({ ok: true })
    })
    it('should throw AppException on HTTP failure', async () => {
      post.mockReturnValue(throwError(() => makeError('not found', 404)))
      await expect(service.triggerWorkflow({ webhookPath: 'bad/workflow' })).rejects.toThrow(AppException)
    })
  })

  // ── R2.1: Configurable webhook paths ──

  describe('convenience methods', () => {
    it('competitorAnalysis uses default path', async () => {
      post.mockReturnValue(throwError(() => { const e: any = new Error('timeout'); e.code = 'ECONNABORTED'; return e }))
      await service.triggerCompetitorAnalysis(['AI'])
      expect(post.mock.calls[0][0]).toContain('content-research/competitor-analysis')
    })
    it('trendingTopics uses default path', async () => {
      post.mockReturnValue(throwError(() => { const e: any = new Error('timeout'); e.code = 'ECONNABORTED'; return e }))
      await service.triggerTrendingTopics('tech')
      expect(post.mock.calls[0][0]).toContain('content-research/trending-topics')
    })
    it('postPublishTracking uses default path', async () => {
      post.mockReturnValue(throwError(() => { const e: any = new Error('timeout'); e.code = 'ECONNABORTED'; return e }))
      await service.triggerPostPublishTracking(['c1'])
      expect(post.mock.calls[0][0]).toContain('analytics/post-publish-tracking')
    })
    it('accountHealthCheck uses default path', async () => {
      post.mockReturnValue(throwError(() => { const e: any = new Error('timeout'); e.code = 'ECONNABORTED'; return e }))
      await service.triggerAccountHealthCheck(['a1'])
      expect(post.mock.calls[0][0]).toContain('account/health-check')
    })
  })

  // ── Workflow management ──

  describe('listWorkflows', () => {
    it('should map workflows', async () => {
      get.mockReturnValue(of(makeResponse({ data: [{ id: '1', name: 'WF A', active: true, createdAt: '2025-01-01', updatedAt: '2025-06-01' }] })))
      const r = await service.listWorkflows()
      expect(r[0].name).toBe('WF A')
    })
    it('should handle empty', async () => {
      get.mockReturnValue(of(makeResponse({})))
      expect(await service.listWorkflows()).toEqual([])
    })
  })

  describe('toggleWorkflow', () => {
    it('should call activate for active=true', async () => {
      post.mockReturnValue(of(makeResponse({})))
      await service.toggleWorkflow('wf-1', true)
      expect(post.mock.calls[0][0]).toContain('/activate')
    })
    it('should call deactivate for active=false', async () => {
      post.mockReturnValue(of(makeResponse({})))
      await service.toggleWorkflow('wf-1', false)
      expect(post.mock.calls[0][0]).toContain('/deactivate')
    })
  })

  describe('healthCheck', () => {
    it('returns true on success', async () => {
      get.mockReturnValue(of(makeResponse({})))
      expect(await service.healthCheck()).toBe(true)
    })
    it('returns false on failure', async () => {
      get.mockReturnValue(throwError(() => new Error('no')))
      expect(await service.healthCheck()).toBe(false)
    })
  })
})
