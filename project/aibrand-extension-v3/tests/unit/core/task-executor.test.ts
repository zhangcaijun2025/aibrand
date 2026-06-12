/**
 * Task Executor Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn(),
    getManifest: () => ({ version: '3.0.0' }),
  },
  tabs: {
    create: vi.fn().mockResolvedValue({ id: 1 }),
    remove: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue({ url: 'https://weibo.com/publish/success' }),
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  scripting: {
    executeScript: vi.fn().mockResolvedValue([{ result: undefined }]),
  },
});

const { TaskExecutor, getTaskExecutor } = await import('@/core/task-executor');

describe('TaskExecutor', () => {
  let executor: TaskExecutor;

  beforeEach(() => {
    executor = new TaskExecutor();
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should register task as active and allow cancellation', async () => {
      const task = {
        taskId: 'task_test_001',
        priority: 'normal' as const,
        platforms: ['weibo'],
        content: { type: 'dynamic' as const, title: 'Test', content: 'Hello' },
        config: { autoPublish: true, requireConfirmation: false, maxRetries: 0, timeoutMs: 500 },
      };

      executor.setPlatformConfigs({
        weibo: {
          id: 'weibo', name: '微博', type: 'dynamic', icon: 'weibo',
          publishUrl: 'https://weibo.com/publish',
          loginUrl: 'https://weibo.com/login',
          pipeline: [],
          aiInjection: { enabled: false, prompt: '', fallbackSelectors: {} },
          mediaConstraints: { images: { max: 9, formats: ['png'], maxSize: 10e6 }, videos: { max: 1, formats: ['mp4'], maxDuration: 300 } },
          contentConstraints: { titleMaxLength: 100, contentMaxLength: 5000, hashtagMaxCount: 10, supportedFeatures: [] },
          loginDetection: {},
        },
      });

      // Execute but don't wait — the promise will hang on tab creation
      const execPromise = executor.execute(task);

      // Verify task is registered
      expect(executor.getActiveTaskIds()).toContain('task_test_001');

      // Cancel immediately
      const cancelled = executor.cancel('task_test_001');
      expect(cancelled).toBe(true);
      expect(executor.getActiveTaskIds()).not.toContain('task_test_001');

      // Wait for the cancelled promise to settle
      await execPromise.catch(() => {});
    }, 10_000);
  });

  describe('cancel', () => {
    it('should cancel a running task', () => {
      const taskId = 'task_cancel_001';
      // Manually set up
      executor['activeTasks'].set(taskId, {
        task: { taskId, priority: 'normal', platforms: [], content: { type: 'dynamic', title: '', content: '' }, config: { autoPublish: false, requireConfirmation: false } },
        attempts: new Map(),
        status: 'in_progress',
        startedAt: Date.now(),
        updatedAt: Date.now(),
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        abortController: new AbortController(),
      });

      const result = executor.cancel(taskId);
      expect(result).toBe(true);
      expect(executor.getActiveTaskIds()).not.toContain(taskId);
    });

    it('should return false for non-existent task', () => {
      expect(executor.cancel('nonexistent')).toBe(false);
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const a = getTaskExecutor();
      const b = getTaskExecutor();
      expect(a).toBe(b);
    });
  });
});
