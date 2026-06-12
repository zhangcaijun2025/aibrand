/**
 * AiBrand Extension v3 — Telemetry Module
 *
 * Lightweight event tracking for operational visibility.
 * All events are anonymous and contain no user content.
 *
 * Events tracked:
 *   - extension_startup / extension_shutdown
 *   - ws_connected / ws_disconnected / ws_reconnect
 *   - quality_check_started / quality_verdict
 *   - publish_started / publish_completed / publish_failed
 *   - task_retry / offline_queue_flush
 */

// ─── Types ────────────────────────────────────────────────────────────────

interface TelemetryEvent {
  name: string;
  timestamp: string;
  properties?: Record<string, string | number | boolean>;
}

type TelemetryHandler = (event: TelemetryEvent) => void;

// ─── Telemetry ────────────────────────────────────────────────────────────

export class Telemetry {
  private buffer: TelemetryEvent[] = [];
  private handlers: TelemetryHandler[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly MAX_BUFFER = 100;
  private readonly FLUSH_INTERVAL = 60_000;

  /** Register a custom handler (e.g., send to backend API) */
  onEvent(handler: TelemetryHandler): void {
    this.handlers.push(handler);
  }

  /** Start periodic flush */
  start(): void {
    this.track('extension_startup', { version: '3.0.0' });
    this.flushInterval = setInterval(() => this.flush(), this.FLUSH_INTERVAL);
  }

  /** Stop and flush remaining events */
  stop(): void {
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.track('extension_shutdown');
    this.flush();
  }

  /** Track an event */
  track(name: string, properties?: Record<string, string | number | boolean>): void {
    const event: TelemetryEvent = {
      name,
      timestamp: new Date().toISOString(),
      properties,
    };
    this.buffer.push(event);
    if (this.buffer.length >= this.MAX_BUFFER) this.flush();
  }

  /** Track publish success/failure */
  trackPublish(taskId: string, platform: string, success: boolean, error?: string): void {
    this.track(success ? 'publish_completed' : 'publish_failed', {
      taskId: taskId.slice(0, 8),
      platform,
      error: error ?? '',
    });
  }

  /** Track quality gate result */
  trackQuality(score: number, passed: boolean): void {
    this.track('quality_verdict', { score, passed });
  }

  /** Track WebSocket connection */
  trackWsConnection(connected: boolean, attempt?: number): void {
    this.track(connected ? 'ws_connected' : 'ws_disconnected', {
      reconnectAttempt: attempt ?? 0,
    });
  }

  /** Flush buffered events to all handlers */
  private flush(): void {
    if (this.buffer.length === 0) return;
    const events = [...this.buffer];
    this.buffer = [];
    for (const handler of this.handlers) {
      for (const event of events) {
        try { handler(event); } catch { /* Don't crash on handler error */ }
      }
    }
  }

  /** Get event count (for debugging) */
  getBufferSize(): number {
    return this.buffer.length;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────

let instance: Telemetry | null = null;

export function getTelemetry(): Telemetry {
  if (!instance) instance = new Telemetry();
  return instance;
}
