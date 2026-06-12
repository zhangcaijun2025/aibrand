/**
 * WebSocket Manager Unit Tests
 *
 * Tests the WebSocket connection management, reconnection logic,
 * heartbeat mechanism, and message routing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock chrome.runtime API
vi.stubGlobal('chrome', {
  runtime: {
    getManifest: () => ({ version: '3.0.0' }),
    sendMessage: vi.fn(),
  },
});

// Mock WebSocket with OPEN static property (must preserve WebSocket.OPEN)
const RealWebSocket = (globalThis as any).WebSocket;
const MockWebSocket = class {
  static OPEN = RealWebSocket?.OPEN ?? 1;
  static CLOSED = RealWebSocket?.CLOSED ?? 3;
  readyState = 0;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send = vi.fn();
  close = vi.fn();

  constructor(url: string) {
    this.url = url;
  }
};

// We need to import dynamically since we mock globals first
const { WebSocketManager } = await import('@/core/websocket');

describe('WebSocketManager', () => {
  let ws: WebSocketManager;
  let mockToken: string;

  beforeEach(() => {
    mockToken = 'test.jwt.token';
    ws = new WebSocketManager({
      clientId: 'test-client-001',
      getToken: async () => mockToken,
      endpoint: 'ws://localhost:6060/ws',
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    ws.disconnect();
  });

  // ─── Connection Tests ─────────────────────────────────────────────────

  describe('connect', () => {
    it('should not connect without a token', async () => {
      mockToken = '' as any;
      await ws.connect();
      expect(ws.connected).toBe(false);
    });

    it('should connect when token is available', async () => {
      let onopenCallback: ((event: Event) => void) | null = null;

      vi.spyOn(globalThis, 'WebSocket').mockImplementation((url) => {
        const mock = new MockWebSocket(url) as any;
        // Intercept onopen assignment
        Object.defineProperty(mock, 'onopen', {
          set(fn) { onopenCallback = fn; },
          get() { return onopenCallback; },
          configurable: true,
        });
        return mock;
      });

      ws.connect();
      // Flush microtasks
      await new Promise((r) => setTimeout(r, 0));

      // Trigger open
      if (onopenCallback) {
        onopenCallback(new Event('open'));
      }

      expect(ws.connected).toBe(true);
    });
  });

  // ─── Disconnect Tests ─────────────────────────────────────────────────

  describe('disconnect', () => {
    it('should set connected to false after disconnect', () => {
      ws.disconnect();
      expect(ws.connected).toBe(false);
    });

    it('should not auto-reconnect after intentional disconnect', () => {
      const reconnectSpy = vi.spyOn(ws as any, 'scheduleReconnect');
      ws.disconnect();
      expect(reconnectSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Send Tests ───────────────────────────────────────────────────────

  describe('send', () => {
    it('should return false when not connected', () => {
      const result = ws.send('PING', { ts: Date.now() });
      expect(result).toBe(false);
    });

    it('should send JSON message when connected', () => {
      // Ensure WebSocket.OPEN is available (previous spyOn may have removed it)
      if (!(globalThis as any).WebSocket?.OPEN) {
        (globalThis as any).WebSocket = { OPEN: 1, CLOSED: 3 };
      }

      const OPEN = (globalThis as any).WebSocket.OPEN;

      const mockWsInstance = {
        readyState: OPEN,
        send: vi.fn(),
        close: vi.fn(),
        url: 'ws://localhost:6060/ws',
        onopen: null as any,
        onclose: null as any,
        onmessage: null as any,
        onerror: null as any,
      };

      (ws as any).ws = mockWsInstance;
      (ws as any)._connected = true;

      const result = ws.send('PING', { ts: Date.now() }, 'trace-123');
      expect(result).toBe(true);
      expect(mockWsInstance.send).toHaveBeenCalledOnce();

      const sentData = JSON.parse(mockWsInstance.send.mock.calls[0][0]);
      expect(sentData.type).toBe('PING');
      expect(sentData.traceId).toBe('trace-123');
      expect(sentData.payload.ts).toBeDefined();
    });
  });

  // ─── Reconnection Tests ──────────────────────────────────────────────

  describe('reconnection', () => {
    it('should schedule reconnect on unexpected close', () => {
      // Set up WebSocket mock with onclose trigger
      const mockWsInstance = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        url: 'ws://localhost:6060/ws',
        onopen: null as any,
        onclose: null as any,
        onmessage: null as any,
        onerror: null as any,
      };

      (ws as any).ws = mockWsInstance;
      (ws as any)._connected = true;
      (ws as any)._intentionalClose = false;

      // Directly call handleClose via scheduleReconnect spy
      const scheduleSpy = vi.spyOn(ws as any, 'scheduleReconnect');
      (ws as any).handleClose(new CloseEvent('close', { code: 1006, reason: 'Abnormal' }));

      expect(scheduleSpy).toHaveBeenCalled();
    });

    it('should increase reconnect attempts on each retry', () => {
      // Reset state for clean test
      (ws as any).reconnectAttempts = 0;

      (ws as any).scheduleReconnect();
      expect((ws as any).reconnectAttempts).toBe(1);

      (ws as any).scheduleReconnect();
      expect((ws as any).reconnectAttempts).toBe(2);
    });

    it('should give up after max reconnect attempts', () => {
      (ws as any).reconnectAttempts = 20;

      const errorEventSpy = vi.fn();
      ws.addEventListener('error', errorEventSpy);

      (ws as any).scheduleReconnect();
      expect(errorEventSpy).toHaveBeenCalled();
    });
  });

  // ─── Event System Tests ──────────────────────────────────────────────

  describe('events', () => {
    it('should dispatch connected event on open', () => {
      const handler = vi.fn();
      ws.on('connected', handler);

      // Directly invoke handleOpen to test event dispatch
      (ws as any).handleOpen();

      expect(handler).toHaveBeenCalled();
    });

    it('should dispatch disconnected event on close', () => {
      let capturedOnClose: ((e: CloseEvent) => void) | null = null;
      const mockWsInstance = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        url: 'ws://localhost:6060/ws',
        onopen: null as any,
        set onclose(fn: any) { capturedOnClose = fn; },
        get onclose() { return capturedOnClose; },
        onmessage: null as any,
        onerror: null as any,
      };

      (ws as any).ws = mockWsInstance;
      (ws as any)._connected = true;
      (ws as any)._intentionalClose = true; // prevent reconnect timer

      const handler = vi.fn();
      ws.on('disconnected', handler);

      // Trigger close through handleClose directly
      (ws as any).handleClose(new CloseEvent('close', { code: 1000, reason: 'Normal' }));

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].detail.code).toBe(1000);
    });
  });
});
