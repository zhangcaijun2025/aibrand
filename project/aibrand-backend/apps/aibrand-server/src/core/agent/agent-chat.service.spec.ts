import type { ChatSSEEvent } from './agent-chat.service'
/**
 * AgentChatService — SSE 事件翻译 单元测试
 */
import { Test, TestingModule } from '@nestjs/testing'
import { DifyService, N8nService } from '@yikart/ai-services'
import { of } from 'rxjs'
import { toArray } from 'rxjs/operators'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentChatService } from './agent-chat.service'
import { AgentService } from './agent.service'

describe('agentChatService', () => {
  let service: AgentChatService
  const mockTrackBehavior = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentChatService,
        { provide: DifyService, useValue: { config: { apiBase: 'http://localhost' } } },
        { provide: N8nService, useValue: {} },
        { provide: AgentService, useValue: { trackBehavior: mockTrackBehavior } },
      ],
    }).compile()
    service = module.get(AgentChatService)
  })

  it('tracks user behavior on chat', async () => {
    vi.spyOn(service as unknown as { callDifyStream: () => Promise<unknown> }, 'callDifyStream')
      .mockResolvedValue(of({ event: 'message', answer: 'hi' }))
    const events = await new Promise<ChatSSEEvent[]>((resolve, reject) => {
      service.chat('user-1', { message: '你好' }).then((stream) => {
        stream.pipe(toArray()).subscribe({ next: resolve, error: reject })
      })
    })
    expect(events.length).toBeGreaterThan(0)
    expect(mockTrackBehavior).toHaveBeenCalledWith('user-1', 'agent_chat', expect.objectContaining({ messageLength: 2 }))
  })

  it('translates dify agent_thought and message events to SSE events', async () => {
    vi.spyOn(service as unknown as { callDifyStream: () => Promise<unknown> }, 'callDifyStream')
      .mockResolvedValue(of(
        { event: 'agent_thought', position: 1, tool: 'web_search' },
        { event: 'message', answer: '这是搜索结果' },
        { event: 'message_end' },
      ))

    const events = await new Promise<ChatSSEEvent[]>((resolve, reject) => {
      service.chat('user-1', { message: '帮我搜索' }).then((stream) => {
        stream.pipe(toArray()).subscribe({ next: resolve, error: reject })
      })
    })

    expect(events.some(e => e.type === 'step_start' && e.position === 1 && e.label === '搜索网络')).toBe(true)
    expect(events.some(e => e.type === 'message' && e.content === '这是搜索结果')).toBe(true)
  })

  it('emits step_done when agent_thought has observation', async () => {
    vi.spyOn(service as unknown as { callDifyStream: () => Promise<unknown> }, 'callDifyStream')
      .mockResolvedValue(of(
        { event: 'agent_thought', position: 0, tool: 'api_call', observation: '调用成功' },
      ))

    const events = await new Promise<ChatSSEEvent[]>((resolve, reject) => {
      service.chat('user-1', { message: 'x' }).then((stream) => {
        stream.pipe(toArray()).subscribe({ next: resolve, error: reject })
      })
    })

    expect(events.some(e => e.type === 'step_done' && e.detail === '调用成功')).toBe(true)
  })
})
