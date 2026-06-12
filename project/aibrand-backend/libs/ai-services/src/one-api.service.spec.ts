/**
 * OneApiService — 错误处理回归测试
 *
 * 验证 R1.2 修复: try/catch + AppException 包装 + diagnose 不再静默吞错误
 */

import { HttpService } from '@nestjs/axios'
import { AppException } from '@yikart/common'
import { of, throwError } from 'rxjs'
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios'
import { OneApiConfig, OneApiService } from './one-api.service'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Helpers ──

function makeResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data, status, statusText: 'OK',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse<T>
}

function makeError(message: string, status = 500): AxiosError {
  return new AxiosError(
    message, 'ERR_BAD_RESPONSE',
    { headers: new AxiosHeaders() }, {},
    { status, statusText: 'Error', headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() }, data: { error: message } } as AxiosResponse,
  )
}

const testConfig: OneApiConfig = { baseUrl: 'http://localhost:4012', token: 'test-token' }

// ── Tests ──

describe('OneApiService', () => {
  let service: OneApiService
  let mockPost: ReturnType<typeof vi.fn>
  let mockGet: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockPost = vi.fn()
    mockGet = vi.fn()
    // 直接实例化避免 NestJS DI interface token 问题
    service = new OneApiService(
      { post: mockPost, get: mockGet } as unknown as HttpService,
      testConfig,
    )
  })

  // ── R1.2 CRITICAL: Error handling ──

  describe('chatCompletion — error handling', () => {
    it('should throw AppException on HTTP failure', async () => {
      mockPost.mockReturnValue(throwError(() => makeError('Connection refused', 503)))

      await expect(
        service.chatCompletion({ messages: [{ role: 'user', content: 'hello' }] }),
      ).rejects.toThrow(AppException)

      // 验证重试 (maxRetries=2 → 2 attempts)
      expect(mockPost).toHaveBeenCalledTimes(2)
    })

    it('should throw AppException on network timeout', async () => {
      mockPost.mockReturnValue(throwError(() => new Error('ETIMEDOUT')))

      await expect(
        service.chatCompletion({ messages: [{ role: 'user', content: 'test' }] }),
      ).rejects.toThrow(AppException)
    })

    it('should return result on successful API call', async () => {
      mockPost.mockReturnValue(of(makeResponse({
        choices: [{ message: { content: 'Hello from AI' } }],
        model: 'deepseek-chat',
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      })))

      const result = await service.chatCompletion({
        messages: [{ role: 'user', content: 'hello' }],
      })

      expect(result.content).toBe('Hello from AI')
      expect(result.usage.totalTokens).toBe(15)
    })

    it('should handle empty choices gracefully', async () => {
      mockPost.mockReturnValue(of(makeResponse({
        choices: [],
        model: 'deepseek-chat',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      })))

      const result = await service.chatCompletion({
        messages: [{ role: 'user', content: 'hello' }],
      })
      expect(result.content).toBe('')
    })
  })

  // ── R2.3: Input validation ──

  describe('chatCompletion — input validation', () => {
    it('should throw on empty messages array', async () => {
      await expect(service.chatCompletion({ messages: [] })).rejects.toThrow(AppException)
    })

    it('should throw on messages > 100', async () => {
      const msgs = Array.from({ length: 101 }, () => ({ role: 'user' as const, content: 'x' }))
      await expect(service.chatCompletion({ messages: msgs })).rejects.toThrow(AppException)
    })

    it('should accept 100 messages', async () => {
      mockPost.mockReturnValue(of(makeResponse({
        choices: [{ message: { content: 'ok' } }],
        model: 'test',
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      })))
      const msgs = Array.from({ length: 100 }, () => ({ role: 'user' as const, content: 'x' }))
      await expect(service.chatCompletion({ messages: msgs })).resolves.toBeDefined()
    })
  })

  // ── R1.2 CRITICAL: diagnose — no silent error swallowing ──

  describe('diagnose', () => {
    it('should return zero scores when LLM returns non-JSON', async () => {
      mockPost.mockReturnValue(of(makeResponse({
        choices: [{ message: { content: 'This is not JSON' } }],
        model: 'deepseek-chat',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      })))

      const result = await service.diagnose('some content')
      expect(result.overallScore).toBe(0)
      expect(result.dimensions).toEqual([])
    })

    it('should parse valid JSON diagnostic response', async () => {
      mockPost.mockReturnValue(of(makeResponse({
        choices: [{ message: { content: JSON.stringify({
          overallScore: 85,
          dimensions: [{ name: '标题质量', score: 90, suggestion: '很好' }],
        }) } }],
        model: 'deepseek-chat',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      })))

      const result = await service.diagnose('content')
      expect(result.overallScore).toBe(85)
      expect(result.dimensions).toHaveLength(1)
    })

    it('should re-throw AppException from API failure', async () => {
      mockPost.mockReturnValue(throwError(() => makeError('Server error', 500)))
      await expect(service.diagnose('content')).rejects.toThrow(AppException)
    })
  })

  // ── Health check ──

  describe('healthCheck', () => {
    it('should return true on 200', async () => {
      mockGet.mockReturnValue(of(makeResponse({})))
      expect(await service.healthCheck()).toBe(true)
    })

    it('should return false on error (no throw)', async () => {
      mockGet.mockReturnValue(throwError(() => new Error('ECONNREFUSED')))
      expect(await service.healthCheck()).toBe(false)
    })
  })
})
