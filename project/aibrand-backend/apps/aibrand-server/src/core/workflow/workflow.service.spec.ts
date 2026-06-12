/**
 * WorkflowService — 核心编排逻辑测试
 */

import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { getModelToken } from '@nestjs/mongoose'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkflowService } from './workflow.service'
import { WorkflowRepository } from './workflow.repository'
import { WorkflowExecutor } from './engine/executor'
import { StepRegistry } from './engine/registry'

describe('WorkflowService', () => {
  let service: WorkflowService
  let mockEmitter: EventEmitter2

  beforeEach(async () => {
    mockEmitter = { emit: vi.fn(), on: vi.fn(), removeAllListeners: vi.fn() } as any

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: WorkflowRepository,
          useValue: {
            create: vi.fn().mockResolvedValue({ _id: 'wf-1' }),
            findById: vi.fn().mockResolvedValue(null),
            findByUserId: vi.fn().mockResolvedValue([]),
            updateStatus: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: WorkflowExecutor,
          useValue: { execute: vi.fn().mockResolvedValue({ metadata: { status: 'completed' } }) },
        },
        {
          provide: StepRegistry,
          useValue: { get: vi.fn(), getNames: vi.fn(() => WorkflowService.STEPS), getAll: vi.fn() },
        },
        { provide: EventEmitter2, useValue: mockEmitter },
      ],
    }).compile()

    service = module.get(WorkflowService)
  })

  describe('execute', () => {
    it('should create a workflow execution and return executionId', async () => {
      const result = await service.execute('user-1', {
        query: '帮我做科技类小红书内容',
        platforms: ['xhs'],
        industry: '科技',
      })

      expect(result.executionId).toBeDefined()
      expect(result.executionId.length).toBeGreaterThan(0)
    })

    it('should accept optional params', async () => {
      const result = await service.execute('user-1', {
        query: 'test',
        platforms: ['xhs', 'douyin'],
        contentType: 'video',
        count: 3,
      })

      expect(result.executionId).toBeDefined()
    })
  })

  describe('STEPS', () => {
    it('should have 6 steps in correct order', () => {
      expect(WorkflowService.STEPS).toEqual([
        'intent_analysis',
        'strategy_research',
        'topic_generator',
        'content_generation',
        'quality_check',
        'publish_strategy',
      ])
    })
  })

  describe('getHistory', () => {
    it('should return workflow history', async () => {
      const result = await service.getHistory('user-1', 10, 0)
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
