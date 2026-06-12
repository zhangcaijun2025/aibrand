import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock idb-keyval — uses in-memory Map instead of IndexedDB
const memStore = new Map<string, any>();
vi.mock('idb-keyval', () => ({
  createStore: () => 'mockStore',
  get: async (key: string) => memStore.get(key) ?? null,
  set: async (key: string, val: any) => { memStore.set(key, val); },
  del: async (key: string) => { memStore.delete(key); },
  keys: async () => Array.from(memStore.keys()),
}));

const { OfflineQueue, getOfflineQueue } = await import('@/core/offline-queue');

describe('OfflineQueue', () => {
  let queue: OfflineQueue;

  beforeEach(() => {
    memStore.clear();
    queue = new OfflineQueue();
  });

  it('starts empty', async () => {
    expect(await queue.size()).toBe(0);
  });

  it('enqueues and retrieves tasks', async () => {
    await queue.enqueue({
      taskId: 'task_1', priority: 'normal', platforms: ['weibo'],
      content: { type: 'dynamic', title: 'Test', content: 'Hello' },
      config: { autoPublish: false, requireConfirmation: true },
    });
    expect(await queue.size()).toBe(1);
    const all = await queue.getAll();
    expect(all[0].taskId).toBe('task_1');
  });

  it('sorts by priority then time', async () => {
    await queue.enqueue({
      taskId: 'low_1', priority: 'low', platforms: [],
      content: { type: 'dynamic', title: '', content: '' },
      config: { autoPublish: false, requireConfirmation: false },
    });
    await queue.enqueue({
      taskId: 'high_1', priority: 'high', platforms: [],
      content: { type: 'dynamic', title: '', content: '' },
      config: { autoPublish: false, requireConfirmation: false },
    });
    const all = await queue.getAll();
    expect(all[0].task.priority).toBe('high');
  });

  it('clears all tasks', async () => {
    await queue.enqueue({
      taskId: 'task_1', priority: 'normal', platforms: [],
      content: { type: 'dynamic', title: '', content: '' },
      config: { autoPublish: false, requireConfirmation: false },
    });
    await queue.clear();
    expect(await queue.size()).toBe(0);
  });

  it('works as singleton', () => {
    expect(getOfflineQueue()).toBe(getOfflineQueue());
  });
});
