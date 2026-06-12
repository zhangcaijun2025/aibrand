/**
 * AiBrand Extension v3 — Offline Queue
 *
 * IndexedDB-backed offline task queue.
 *
 * When the extension has no network or WebSocket connection:
 *   1. Tasks are persisted to IndexedDB
 *   2. chrome.alarms periodically checks for connectivity
 *   3. On reconnect, queued tasks are flushed and executed
 *   4. Expired tasks (older than TASK_OFFLINE_TTL) are discarded
 *
 * Uses idb-keyval for simple key-value IndexedDB access.
 */

import { get, set, del, keys, createStore } from 'idb-keyval';
import type { NewTaskPayload } from '@/shared/types';
import {
  STORAGE_KEY_OFFLINE_QUEUE,
  TASK_OFFLINE_TTL,
} from '@/shared/constants';

// ─── Types ────────────────────────────────────────────────────────────────

interface QueuedTask {
  taskId: string;
  task: NewTaskPayload;
  queuedAt: number;
  retries: number;
}

// ─── Store ────────────────────────────────────────────────────────────────

const queueStore = createStore('aibrand-offline-queue', 'tasks');

// ─── Offline Queue ────────────────────────────────────────────────────────

export class OfflineQueue {
  private flushInProgress = false;
  private onFlushFn: ((task: NewTaskPayload) => Promise<void>) | null = null;

  /**
   * Register the callback that executes a task when flushing.
   */
  onFlush(fn: (task: NewTaskPayload) => Promise<void>): void {
    this.onFlushFn = fn;
  }

  /**
   * Enqueue a task for later execution.
   */
  async enqueue(task: NewTaskPayload): Promise<void> {
    const record: QueuedTask = {
      taskId: task.taskId,
      task,
      queuedAt: Date.now(),
      retries: 0,
    };

    await set(task.taskId, record, queueStore);
    console.log(`[OfflineQueue] Task enqueued: ${task.taskId}`);
  }

  /**
   * Dequeue (remove) a task from the queue.
   */
  async dequeue(taskId: string): Promise<void> {
    await del(taskId, queueStore);
  }

  /**
   * Get all queued tasks, sorted by oldest first.
   */
  async getAll(): Promise<QueuedTask[]> {
    const allKeys = await keys(queueStore);
    const tasks: QueuedTask[] = [];

    for (const key of allKeys) {
      const task = await get<QueuedTask>(key as string, queueStore);
      if (task) tasks.push(task);
    }

    // Sort by queuedAt (oldest first) then by priority
    tasks.sort((a, b) => {
      const prioOrder = { high: 0, normal: 1, low: 2 };
      const prioDiff =
        prioOrder[a.task.priority] - prioOrder[b.task.priority];
      if (prioDiff !== 0) return prioDiff;
      return a.queuedAt - b.queuedAt;
    });

    return tasks;
  }

  /**
   * Get the number of queued tasks.
   */
  async size(): Promise<number> {
    const allKeys = await keys(queueStore);
    return allKeys.length;
  }

  /**
   * Flush all queued tasks to the executor.
   * Called when WebSocket reconnects.
   */
  async flush(): Promise<{ succeeded: number; failed: number }> {
    if (this.flushInProgress) {
      console.log('[OfflineQueue] Flush already in progress');
      return { succeeded: 0, failed: 0 };
    }

    this.flushInProgress = true;
    const tasks = await this.getAll();
    let succeeded = 0;
    let failed = 0;

    console.log(`[OfflineQueue] Flushing ${tasks.length} queued tasks`);

    for (const queued of tasks) {
      // Discard expired tasks
      if (Date.now() - queued.queuedAt > TASK_OFFLINE_TTL) {
        console.log(`[OfflineQueue] Discarding expired task: ${queued.taskId}`);
        await this.dequeue(queued.taskId);
        failed++;
        continue;
      }

      try {
        if (this.onFlushFn) {
          await this.onFlushFn(queued.task);
        }
        await this.dequeue(queued.taskId);
        succeeded++;
        console.log(`[OfflineQueue] Flushed: ${queued.taskId}`);
      } catch (err) {
        queued.retries++;
        if (queued.retries >= 3) {
          console.error(`[OfflineQueue] Task ${queued.taskId} failed after 3 retries — discarding`);
          await this.dequeue(queued.taskId);
        } else {
          await set(queued.taskId, queued, queueStore);
        }
        failed++;
      }
    }

    this.flushInProgress = false;
    console.log(`[OfflineQueue] Flush complete: ${succeeded} success, ${failed} failed`);
    return { succeeded, failed };
  }

  /**
   * Clear all queued tasks.
   */
  async clear(): Promise<void> {
    const allKeys = await keys(queueStore);
    for (const key of allKeys) {
      await del(key, queueStore);
    }
    console.log(`[OfflineQueue] Cleared ${allKeys.length} tasks`);
  }

  /**
   * Clean up expired tasks without executing them.
   */
  async purgeExpired(): Promise<number> {
    const tasks = await this.getAll();
    let purged = 0;

    for (const queued of tasks) {
      if (Date.now() - queued.queuedAt > TASK_OFFLINE_TTL) {
        await this.dequeue(queued.taskId);
        purged++;
      }
    }

    if (purged > 0) {
      console.log(`[OfflineQueue] Purged ${purged} expired tasks`);
    }

    return purged;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────

let instance: OfflineQueue | null = null;

export function getOfflineQueue(): OfflineQueue {
  if (!instance) {
    instance = new OfflineQueue();
  }
  return instance;
}
