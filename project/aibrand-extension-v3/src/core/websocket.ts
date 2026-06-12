/**
 * AiBrand Extension v3 — WebSocket Manager
 *
 * Manages the persistent WebSocket connection between the extension and the
 * AiBrand backend. Provides:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat/Pong keep-alive
 * - JWT auth header injection
 * - Typed message dispatch via EventTarget
 * - Connection state tracking
 */

import {
  WS_ENDPOINT,
  WS_HEARTBEAT_INTERVAL,
  WS_HEARTBEAT_TIMEOUT,
  WS_RECONNECT_BASE_DELAY,
  WS_RECONNECT_MAX_DELAY,
  WS_RECONNECT_MULTIPLIER,
  WS_MAX_RECONNECT_ATTEMPTS,
} from '@/shared/constants';
import type {
  WsMessage,
  WsMessageType,
  RegisterPayload,
  NewTaskPayload,
  TaskProgressPayload,
  TaskCompletePayload,
  ConfigUpdatePayload,
  CommandPayload,
  QualityCheckStartedPayload,
  QualityDimResultPayload,
  QualityVerdictPayload,
} from '@/shared/types';

// ─── Event Types ──────────────────────────────────────────────────────────

export interface WsEventMap {
  connected: CustomEvent<void>;
  disconnected: CustomEvent<{ code: number; reason: string }>;
  reconnecting: CustomEvent<{ attempt: number; delay: number }>;
  message: CustomEvent<WsMessage>;
  'task:new': CustomEvent<NewTaskPayload>;
  'task:progress': CustomEvent<TaskProgressPayload>;
  'task:complete': CustomEvent<TaskCompletePayload>;
  'config:update': CustomEvent<ConfigUpdatePayload>;
  'command': CustomEvent<CommandPayload>;
  'quality:started': CustomEvent<QualityCheckStartedPayload>;
  'quality:dim_result': CustomEvent<QualityDimResultPayload>;
  'quality:verdict': CustomEvent<QualityVerdictPayload>;
  error: CustomEvent<{ message: string }>;
}

type WsEventListener<K extends keyof WsEventMap> = (event: WsEventMap[K]) => void;

// ─── Manager ──────────────────────────────────────────────────────────────

export class WebSocketManager extends EventTarget {
  private ws: WebSocket | null = null;
  private clientId: string;
  private getToken: () => Promise<string | null>;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;
  private _endpoint: string;
  private _intentionalClose = false;

  constructor(opts: {
    clientId: string;
    getToken: () => Promise<string | null>;
    endpoint?: string;
  }) {
    super();
    this.clientId = opts.clientId;
    this.getToken = opts.getToken;
    this._endpoint = opts.endpoint ?? WS_ENDPOINT;
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  get connected(): boolean {
    return this._connected;
  }

  get endpoint(): string {
    return this._endpoint;
  }

  /**
   * Connect to the backend WebSocket server.
   * Automatically retries on failure with exponential backoff.
   */
  async connect(): Promise<void> {
    const token = await this.getToken();
    if (!token) {
      console.warn('[AiBrand:WS] No auth token — deferring connection');
      return;
    }

    this._intentionalClose = false;

    try {
      const url = new URL(this._endpoint);
      url.searchParams.set('token', token);

      this.ws = new WebSocket(url.toString());
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (err) {
      console.error('[AiBrand:WS] Connection failed:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Send a typed message to the backend.
   */
  send<T>(type: WsMessageType, payload: T, traceId?: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[AiBrand:WS] Cannot send — not connected');
      return false;
    }

    const message: WsMessage<T> = {
      type,
      payload,
      traceId: traceId ?? crypto.randomUUID(),
      ts: new Date().toISOString(),
    };

    this.ws.send(JSON.stringify(message));
    return true;
  }

  /**
   * Gracefully close the connection. Will not auto-reconnect.
   */
  disconnect(): void {
    this._intentionalClose = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this._connected = false;
  }

  /**
   * Register typed event listener.
   */
  on<K extends keyof WsEventMap>(
    type: K,
    listener: WsEventListener<K>,
  ): void {
    this.addEventListener(type, listener as EventListener);
  }

  /**
   * Remove typed event listener.
   */
  off<K extends keyof WsEventMap>(
    type: K,
    listener: WsEventListener<K>,
  ): void {
    this.removeEventListener(type, listener as EventListener);
  }

  // ─── Internal Handlers ──────────────────────────────────────────────────

  private handleOpen(): void {
    console.log('[AiBrand:WS] Connected');
    this._connected = true;
    this.reconnectAttempts = 0;

    // Register with backend
    this.send<RegisterPayload>('REGISTER', {
      extensionVersion: chrome.runtime.getManifest().version,
      clientId: this.clientId,
      platformCapabilities: [], // Will be populated by platform registry
    });

    // Start heartbeat
    this.startHeartbeat();

    this.dispatchEvent(new CustomEvent('connected'));
  }

  private handleClose(event: CloseEvent): void {
    console.log(`[AiBrand:WS] Disconnected: ${event.code} ${event.reason}`);
    this._connected = false;
    this.clearTimers();

    this.dispatchEvent(
      new CustomEvent('disconnected', {
        detail: { code: event.code, reason: event.reason },
      }),
    );

    if (!this._intentionalClose) {
      this.scheduleReconnect();
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WsMessage = JSON.parse(event.data as string);
      this.dispatchEvent(
        new CustomEvent('message', { detail: message }),
      );
      this.routeMessage(message);
    } catch (err) {
      console.error('[AiBrand:WS] Failed to parse message:', err);
    }
  }

  private handleError(_event: Event): void {
    console.error('[AiBrand:WS] Connection error');
    // `handleClose` will fire after this, triggering reconnect
  }

  // ─── Message Router ─────────────────────────────────────────────────────

  private routeMessage(message: WsMessage): void {
    switch (message.type) {
      case 'PONG':
        this.handlePong(message);
        break;

      case 'REGISTERED':
        console.log('[AiBrand:WS] Registered with backend:', message.payload);
        break;

      case 'NEW_TASK':
        this.dispatchEvent(
          new CustomEvent('task:new', {
            detail: message.payload as NewTaskPayload,
          }),
        );
        break;

      case 'CONFIG_UPDATE':
        this.dispatchEvent(
          new CustomEvent('config:update', {
            detail: message.payload as ConfigUpdatePayload,
          }),
        );
        break;

      case 'COMMAND':
        this.dispatchEvent(
          new CustomEvent('command', {
            detail: message.payload as CommandPayload,
          }),
        );
        break;

      case 'QUALITY_CHECK_STARTED':
        this.dispatchEvent(
          new CustomEvent('quality:started', {
            detail: message.payload as QualityCheckStartedPayload,
          }),
        );
        break;

      case 'QUALITY_DIM_RESULT':
        this.dispatchEvent(
          new CustomEvent('quality:dim_result', {
            detail: message.payload as QualityDimResultPayload,
          }),
        );
        break;

      case 'QUALITY_VERDICT':
        this.dispatchEvent(
          new CustomEvent('quality:verdict', {
            detail: message.payload as QualityVerdictPayload,
          }),
        );
        break;

      case 'ERROR':
        console.error('[AiBrand:WS] Server error:', message.payload);
        this.dispatchEvent(
          new CustomEvent('error', {
            detail: { message: (message.payload as { message?: string })?.message ?? 'Unknown error' },
          }),
        );
        break;

      default:
        console.debug('[AiBrand:WS] Unhandled message type:', message.type);
    }
  }

  // ─── Heartbeat ──────────────────────────────────────────────────────────

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send<PingPayload>('PING', { ts: Date.now() });

        // Set pong timeout
        this.heartbeatTimeoutTimer = setTimeout(() => {
          console.warn('[AiBrand:WS] Heartbeat timeout — reconnecting');
          this.ws?.close(4000, 'Heartbeat timeout');
        }, WS_HEARTBEAT_TIMEOUT);
      }
    }, WS_HEARTBEAT_INTERVAL);
  }

  private handlePong(_message: WsMessage): void {
    // Clear the heartbeat timeout — we got our pong
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  // ─── Reconnection ───────────────────────────────────────────────────────

  private scheduleReconnect(): void {
    if (this._intentionalClose) return;
    if (this.reconnectAttempts >= WS_MAX_RECONNECT_ATTEMPTS) {
      console.error('[AiBrand:WS] Max reconnect attempts reached');
      this.dispatchEvent(
        new CustomEvent('error', {
          detail: { message: 'Max reconnect attempts reached — giving up' },
        }),
      );
      return;
    }

    const delay = Math.min(
      WS_RECONNECT_BASE_DELAY * Math.pow(WS_RECONNECT_MULTIPLIER, this.reconnectAttempts),
      WS_RECONNECT_MAX_DELAY,
    );

    this.reconnectAttempts++;

    console.log(
      `[AiBrand:WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${WS_MAX_RECONNECT_ATTEMPTS})`,
    );

    this.dispatchEvent(
      new CustomEvent('reconnecting', {
        detail: { attempt: this.reconnectAttempts, delay },
      }),
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

interface PingPayload {
  ts: number;
}
