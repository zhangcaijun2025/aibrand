/**
 * AiBrand Extension v3 — Task Executor
 *
 * Executes publish tasks across multiple platforms.
 *
 * Flow:
 *   1. Receive NEW_TASK from WebSocket (via background SW)
 *   2. Validate task and platform availability
 *   3. Execute each platform in parallel:
 *      a. Open platform publish page in new tab
 *      b. Wait for page load
 *      c. Execute platform pipeline (fill form, upload media, submit)
 *      d. Capture result (success URL or error)
 *      e. Report progress to backend
 *   4. Report completion to backend
 *   5. Clean up tabs based on config
 *
 * Retry strategy:
 *   - Exponential backoff: 1s → 2s → 4s → 8s → 30s → 1min → 2min
 *   - Max 7 retries per platform
 *   - Non-retryable errors (auth, banned, content violation) → immediate fail
 */

import type {
  NewTaskPayload,
  PublishTask,
  TaskStepStatus,
  TaskStatus,
  PlatformResult,
  PlatformConfig,
  PipelineStep,
} from '@/shared/types';
import {
  TASK_DEFAULT_MAX_RETRIES,
  TASK_DEFAULT_TIMEOUT,
  TASK_RETRY_DELAYS,
  TASK_OFFLINE_TTL,
} from '@/shared/constants';
import { sleep, generateTraceId } from '@/shared/utils';

// ─── Types ────────────────────────────────────────────────────────────────

interface PublishAttempt {
  platform: string;
  tabId: number | null;
  stepIndex: number;
  retries: number;
  status: TaskStepStatus;
  startTime: number;
  result?: PlatformResult;
}

interface TaskExecutionContext {
  task: NewTaskPayload;
  attempts: Map<string, PublishAttempt>;
  status: TaskStatus;
  startedAt: number;
  updatedAt: number;
  onProgress: (platform: string, status: TaskStepStatus, progress: number, message?: string) => void;
  onComplete: (results: PlatformResult[]) => void;
  abortController: AbortController;
}

// ─── Constants ────────────────────────────────────────────────────────────

const NON_RETRYABLE_ERRORS = [
  'ACCOUNT_BANNED',
  'CONTENT_VIOLATION',
  'AUTH_EXPIRED',
  'PLATFORM_UNAVAILABLE',
  'RATE_LIMITED',
] as const;

// ─── Executor ─────────────────────────────────────────────────────────────

export class TaskExecutor {
  private activeTasks = new Map<string, TaskExecutionContext>();
  private platformConfigs: Record<string, PlatformConfig> = {};
  private executeStepFn: ((step: PipelineStep, tabId: number) => Promise<void>) | null = null;
  private uploadMediaFn: ((files: any[], tabId: number) => Promise<void>) | null = null;

  // ─── Configuration ─────────────────────────────────────────────────────

  /** Set platform configs from the registry */
  setPlatformConfigs(configs: Record<string, PlatformConfig>): void {
    this.platformConfigs = configs;
  }

  /** Register the step execution function (from injector) */
  onExecuteStep(fn: (step: PipelineStep, tabId: number) => Promise<void>): void {
    this.executeStepFn = fn;
  }

  /** Register the media upload function (from uploader) */
  onUploadMedia(fn: (files: any[], tabId: number) => Promise<void>): void {
    this.uploadMediaFn = fn;
  }

  // ─── Public API ────────────────────────────────────────────────────────

  /**
   * Execute a new publish task.
   * Called when NEW_TASK is received from the backend.
   */
  async execute(task: NewTaskPayload): Promise<void> {
    if (this.activeTasks.has(task.taskId)) {
      console.warn(`[TaskExecutor] Task ${task.taskId} already running`);
      return;
    }

    const ctx: TaskExecutionContext = {
      task,
      attempts: new Map(),
      status: 'in_progress',
      startedAt: Date.now(),
      updatedAt: Date.now(),
      onProgress: (platform, status, progress, message) => {
        chrome.runtime.sendMessage({
          action: 'AIBRAND_REPORT_PROGRESS',
          data: {
            taskId: task.taskId,
            platform,
            status,
            progress,
            message,
          },
        });
      },
      onComplete: (results) => {
        chrome.runtime.sendMessage({
          action: 'AIBRAND_COMPLETE_TASK',
          data: {
            taskId: task.taskId,
            results,
          },
        });
        this.activeTasks.delete(task.taskId);
      },
      abortController: new AbortController(),
    };

    this.activeTasks.set(task.taskId, ctx);
    console.log(`[TaskExecutor] Starting task: ${task.taskId} (${task.platforms.length} platforms)`);

    // Execute platforms in parallel
    const platformPromises = task.platforms.map((platform) =>
      this.executePlatform(task.taskId, platform),
    );

    const results = await Promise.all(platformPromises);

    // Mark task complete
    ctx.status = results.every((r) => r.success) ? 'completed' : 'failed';
    ctx.updatedAt = Date.now();
    ctx.onComplete(results);
  }

  /**
   * Cancel a running task.
   */
  cancel(taskId: string): boolean {
    const ctx = this.activeTasks.get(taskId);
    if (!ctx) return false;

    ctx.abortController.abort();
    ctx.status = 'cancelled';
    ctx.updatedAt = Date.now();

    // Close all open tabs for this task
    for (const attempt of ctx.attempts.values()) {
      if (attempt.tabId !== null) {
        chrome.tabs.remove(attempt.tabId).catch(() => {});
      }
    }

    ctx.onComplete(
      Array.from(ctx.attempts.keys()).map((platform) => ({
        platform,
        success: false,
        error: 'Task cancelled',
      })),
    );

    this.activeTasks.delete(taskId);
    return true;
  }

  /**
   * Get the status of a task.
   */
  getTask(taskId: string): PublishTask | null {
    const ctx = this.activeTasks.get(taskId);
    if (!ctx) return null;

    return {
      taskId: ctx.task.taskId,
      priority: ctx.task.priority,
      status: ctx.status,
      platforms: ctx.task.platforms,
      content: ctx.task.content,
      config: ctx.task.config,
      createdAt: ctx.startedAt,
      updatedAt: ctx.updatedAt,
      results: Array.from(ctx.attempts.values())
        .filter((a) => a.result)
        .map((a) => a.result!),
    };
  }

  /**
   * Get all active task IDs.
   */
  getActiveTaskIds(): string[] {
    return Array.from(this.activeTasks.keys());
  }

  // ─── Platform Execution ────────────────────────────────────────────────

  private async executePlatform(
    taskId: string,
    platform: string,
  ): Promise<PlatformResult> {
    const ctx = this.activeTasks.get(taskId);
    if (!ctx) {
      return { platform, success: false, error: 'Task not found' };
    }

    const config = this.platformConfigs[platform];
    if (!config) {
      console.warn(`[TaskExecutor] No config for platform: ${platform}`);
      return { platform, success: false, error: `Unknown platform: ${platform}` };
    }

    const attempt: PublishAttempt = {
      platform,
      tabId: null,
      stepIndex: 0,
      retries: 0,
      status: 'pending',
      startTime: Date.now(),
    };
    ctx.attempts.set(platform, attempt);

    // Retry loop
    while (attempt.retries <= (ctx.task.config.maxRetries ?? TASK_DEFAULT_MAX_RETRIES)) {
      if (ctx.abortController.signal.aborted) {
        return { platform, success: false, error: 'Task aborted' };
      }

      try {
        // Timeout per platform
        const timeout = ctx.task.config.timeoutMs ?? TASK_DEFAULT_TIMEOUT;
        const result = await this.withTimeout(
          this.executePlatformOnce(taskId, platform, config, attempt),
          timeout,
        );

        if (result.success) {
          attempt.status = 'completed';
          attempt.result = result;
          ctx.onProgress(platform, 'completed', 100, result.url);
          return result;
        }

        // Check if error is retryable
        if (result.error && this.isNonRetryable(result.error)) {
          attempt.status = 'error';
          attempt.result = result;
          ctx.onProgress(platform, 'error', 0, result.error);
          return result;
        }

        // Will retry
        attempt.retries++;
        if (attempt.retries <= (ctx.task.config.maxRetries ?? TASK_DEFAULT_MAX_RETRIES)) {
          const delay = TASK_RETRY_DELAYS[Math.min(attempt.retries - 1, TASK_RETRY_DELAYS.length - 1)];
          console.log(`[TaskExecutor] Retry ${platform} in ${delay}ms (attempt ${attempt.retries})`);
          ctx.onProgress(platform, 'pending', 0, `Retry ${attempt.retries} in ${delay / 1000}s...`);
          await sleep(delay);
        }
      } catch (err) {
        attempt.retries++;
        if (attempt.retries > (ctx.task.config.maxRetries ?? TASK_DEFAULT_MAX_RETRIES)) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          attempt.status = 'error';
          const result = { platform, success: false, error: errorMsg };
          attempt.result = result;
          ctx.onProgress(platform, 'error', 0, errorMsg);
          return result;
        }

        const delay = TASK_RETRY_DELAYS[Math.min(attempt.retries - 1, TASK_RETRY_DELAYS.length - 1)];
        await sleep(delay);
      }
    }

    return { platform, success: false, error: 'Max retries exceeded' };
  }

  /**
   * Execute a single platform publish attempt (no retries).
   */
  private async executePlatformOnce(
    taskId: string,
    platform: string,
    config: PlatformConfig,
    attempt: PublishAttempt,
  ): Promise<PlatformResult> {
    // 1. Open platform publish page
    const ctx = this.activeTasks.get(taskId)!;
    const publishUrl = this.buildPublishUrl(config, ctx.task);

    ctx.onProgress(platform, 'publishing', 5, 'Opening platform page...');

    const tab = await chrome.tabs.create({ url: publishUrl, active: false });
    attempt.tabId = tab.id!;

    // 2. Wait for page load
    await this.waitForTabLoad(tab.id!);

    ctx.onProgress(platform, 'publishing', 15, 'Platform page loaded');

    // 3. Upload media first (if any)
    if (ctx.task.content.media && ctx.task.content.media.length > 0 && this.uploadMediaFn) {
      ctx.onProgress(platform, 'uploading', 20, 'Uploading media...');
      try {
        await this.uploadMediaFn(ctx.task.content.media, tab.id!);
        ctx.onProgress(platform, 'uploading', 40, 'Media uploaded');
      } catch (err) {
        await this.closeTab(tab.id!);
        throw new Error(`Media upload failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 4. Execute pipeline steps
    ctx.onProgress(platform, 'publishing', 45, `Executing ${config.pipeline.length} steps...`);

    const totalSteps = config.pipeline.length;
    for (let i = 0; i < totalSteps; i++) {
      if (ctx.abortController.signal.aborted) {
        await this.closeTab(tab.id!);
        throw new Error('Aborted');
      }

      const step = config.pipeline[i];
      attempt.stepIndex = i;

      try {
        await this.executeStep(step, tab.id!);
        const progress = 45 + Math.floor((i / totalSteps) * 45); // 45-90% for pipeline
        ctx.onProgress(platform, 'publishing', progress, `Step ${i + 1}/${totalSteps}: ${step.id}`);
      } catch (err) {
        if (!step.optional) {
          await this.closeTab(tab.id!);
          throw new Error(`Step "${step.id}" failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        console.warn(`[TaskExecutor] Optional step "${step.id}" failed — continuing`);
      }
    }

    // 5. Submit (if there's a final submit step or auto-submit)
    // The last step in the pipeline should trigger submission
    ctx.onProgress(platform, 'publishing', 95, 'Submitting...');

    // 6. Wait for success indicator
    const resultUrl = await this.waitForPublishResult(tab.id!, config);

    // 7. Cleanup
    if (!ctx.task.config.requireConfirmation) {
      await sleep(3000); // Brief pause to see the result
      await this.closeTab(tab.id!);
    }

    attempt.tabId = null;
    return { platform, success: true, url: resultUrl };
  }

  // ─── Pipeline Steps ────────────────────────────────────────────────────

  private async executeStep(step: PipelineStep, tabId: number): Promise<void> {
    if (this.executeStepFn) {
      await this.executeStepFn(step, tabId);
      return;
    }

    // Fallback: execute via content script message
    const selector = step.target.selector;
    if (!selector) {
      if (step.optional) return;
      throw new Error(`No selector or aiHint for step: ${step.id}`);
    }

    // Resolve template variables
    const value = typeof step.value === 'object' && 'template' in step.value
      ? step.value.template // Template resolution happens in content script
      : (step.value ?? '');

    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'AIBRAND_EXECUTE_STEP',
      data: {
        stepId: step.id,
        type: step.type,
        selector,
        value,
      },
    });

    if (!response?.success) {
      throw new Error(response?.error ?? `Step ${step.id} failed`);
    }

    if (step.waitAfter) {
      await sleep(step.waitAfter);
    }

    await sleep(500); // Inter-step delay
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private buildPublishUrl(config: PlatformConfig, task: NewTaskPayload): string {
    // Replace template variables in URL
    let url = config.publishUrl;
    url = url.replace('{{taskId}}', task.taskId);
    url = url.replace('{{type}}', task.content.type);
    return url;
  }

  private waitForTabLoad(tabId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Tab load timeout'));
      }, 30_000);

      const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  private waitForPublishResult(tabId: number, config: PlatformConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Publish result timeout — check platform manually'));
      }, 60_000);

      // Poll the tab URL for success indicators
      const checkInterval = setInterval(async () => {
        try {
          const tab = await chrome.tabs.get(tabId);
          if (!tab.url) return;

          // Common success URL patterns
          const successPatterns = [
            '/success',
            '/published',
            '/detail/',
            'status=success',
            'result=ok',
          ];

          if (successPatterns.some((p) => tab.url!.includes(p))) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve(tab.url);
          }
        } catch {
          // Tab might be closed
          clearInterval(checkInterval);
          clearTimeout(timeout);
          reject(new Error('Tab closed before publish result'));
        }
      }, 2_000);
    });
  }

  private async closeTab(tabId: number): Promise<void> {
    try {
      await chrome.tabs.remove(tabId);
    } catch {
      // Tab might already be closed
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private isNonRetryable(error: string): boolean {
    return NON_RETRYABLE_ERRORS.some((err) =>
      error.toUpperCase().includes(err),
    );
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────

let instance: TaskExecutor | null = null;

export function getTaskExecutor(): TaskExecutor {
  if (!instance) {
    instance = new TaskExecutor();
  }
  return instance;
}
