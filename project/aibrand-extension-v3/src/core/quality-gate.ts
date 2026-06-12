/**
 * AiBrand Extension v3 — Quality Gate (Thin WS Client)
 *
 * This module is a COORDINATOR, not an AI engine.
 *
 * AI quality review is performed by the 质量总监 Agent on the BACKEND.
 * The Extension's job is:
 *   1. Request a quality check (or read pre-existing results from the task)
 *   2. Stream dimension results to the UI as they arrive
 *   3. Deliver the final verdict
 *
 * Two paths:
 *   Path A (95% of cases): Task already has quality review from Content Factory.
 *     → Fast-forward: read verdict from task payload, stream cached dimensions.
 *   Path B (5% of cases): Manual content, no review exists.
 *     → Request QUALITY_CHECK_REQUEST via WS, await streaming results.
 *   Path C (user edited content): Re-check triggered.
 *     → Same as Path B, with recheck: true flag.
 */

import type {
  NewTaskPayload,
  QualityCheckStartedPayload,
  QualityDimResultPayload,
  QualityVerdictPayload,
  QualityDimension,
} from '@/shared/types';

// ─── Callbacks ────────────────────────────────────────────────────────────

export interface QualityGateCallbacks {
  onStarted: (payload: QualityCheckStartedPayload) => void;
  onDimensionResult: (payload: QualityDimResultPayload) => void;
  onVerdict: (payload: QualityVerdictPayload) => void;
  onError: (message: string) => void;
}

// ─── Quality Gate ─────────────────────────────────────────────────────────

export class QualityGate {
  private sendWs: ((type: string, payload: unknown) => boolean) | null = null;

  /**
   * Register the WebSocket send function (from WebSocketManager).
   */
  setTransport(sendFn: (type: string, payload: unknown) => boolean): void {
    this.sendWs = sendFn;
  }

  /**
   * Check if the task already has a quality review embedded.
   * Content Factory tasks include a pre-computed verdict.
   */
  hasPreReview(task: NewTaskPayload): boolean {
    const verdict = (task as any).qualityVerdict as QualityVerdictPayload | undefined;
    return !!verdict && verdict.dimensions.length > 0;
  }

  /**
   * Get the pre-existing quality review from a task.
   */
  getPreReview(task: NewTaskPayload): QualityVerdictPayload | null {
    return ((task as any).qualityVerdict as QualityVerdictPayload) ?? null;
  }

  /**
   * Stream a pre-existing review to callbacks (simulates live streaming).
   * This gives the user a visual "checking" experience even though the
   * review was already completed in the Content Factory.
   */
  async streamPreReview(
    verdict: QualityVerdictPayload,
    callbacks: QualityGateCallbacks,
  ): Promise<void> {
    // Announce start
    callbacks.onStarted({
      taskId: verdict.taskId,
      dimensions: verdict.dimensions.map(d => d.dimension),
      totalSteps: verdict.dimensions.length,
    });

    // Stream each dimension with brief delays for visual pacing
    for (const dim of verdict.dimensions) {
      await delay(400 + Math.random() * 300);
      callbacks.onDimensionResult(dim);
    }

    // Deliver verdict
    await delay(300);
    callbacks.onVerdict(verdict);
  }

  /**
   * Request a NEW quality check from the backend Agent.
   * Used when: no pre-review exists, or user edited content.
   */
  requestCheck(task: NewTaskPayload, recheck = false): boolean {
    if (!this.sendWs) {
      console.error('[QualityGate] No transport registered');
      return false;
    }

    return this.sendWs('QUALITY_CHECK_REQUEST', {
      taskId: task.taskId,
      content: task.content,
      platforms: task.platforms,
      recheck,
    });
  }

  /**
   * Handle incoming WS events. Call this from the WebSocket event listeners.
   */
  handleWsEvent(
    eventType: string,
    payload: unknown,
    callbacks: QualityGateCallbacks,
  ): void {
    switch (eventType) {
      case 'quality:started':
        callbacks.onStarted(payload as QualityCheckStartedPayload);
        break;
      case 'quality:dim_result':
        callbacks.onDimensionResult(payload as QualityDimResultPayload);
        break;
      case 'quality:verdict':
        callbacks.onVerdict(payload as QualityVerdictPayload);
        break;
      default:
        console.debug('[QualityGate] Unhandled event:', eventType);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Singleton ────────────────────────────────────────────────────────────

let instance: QualityGate | null = null;

export function getQualityGate(): QualityGate {
  if (!instance) {
    instance = new QualityGate();
  }
  return instance;
}
