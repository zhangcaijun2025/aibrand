/**
 * AiBrand Extension v3 — Constants
 */

// ─── Storage Keys ─────────────────────────────────────────────────────────

/** Unified auth token key (replaces old apiKey + aibrand_token split) */
export const STORAGE_KEY_TOKEN = 'aibrand_auth_token' as const;

export const STORAGE_KEY_USER = 'aibrand_user' as const;
export const STORAGE_KEY_CLIENT_ID = 'aibrand_client_id' as const;
export const STORAGE_KEY_OFFLINE_QUEUE = 'aibrand_offline_queue' as const;
export const STORAGE_KEY_CONFIGS = 'aibrand_platform_configs' as const;

// ─── WebSocket ────────────────────────────────────────────────────────────

/** Default WebSocket endpoint (proxy → BFF → backend) */
export const WS_ENDPOINT =
  process.env.NODE_ENV === 'development'
    ? 'ws://localhost:6060/ws'
    : 'wss://aibrand.local/ws';

/** WebSocket protocol version */
export const WS_PROTOCOL_VERSION = '1.0.0';

/** Heartbeat interval (ms) */
export const WS_HEARTBEAT_INTERVAL = 30_000;

/** Heartbeat timeout — if no pong within this window, reconnect */
export const WS_HEARTBEAT_TIMEOUT = 45_000;

/** Reconnect backoff — initial delay (ms) */
export const WS_RECONNECT_BASE_DELAY = 1_000;

/** Reconnect backoff — max delay (ms) */
export const WS_RECONNECT_MAX_DELAY = 60_000;

/** Reconnect backoff — multiplier */
export const WS_RECONNECT_MULTIPLIER = 1.5;

/** Max reconnect attempts before giving up */
export const WS_MAX_RECONNECT_ATTEMPTS = 20;

// ─── Auth ─────────────────────────────────────────────────────────────────

/** How early to refresh token before expiry (ms) */
export const AUTH_REFRESH_WINDOW = 5 * 60 * 1_000; // 5 minutes

/** Token expiry check interval */
export const AUTH_CHECK_INTERVAL = 60 * 1_000; // 1 minute

// ─── Tasks ────────────────────────────────────────────────────────────────

/** Default max retries per platform */
export const TASK_DEFAULT_MAX_RETRIES = 7;

/** Default timeout per platform (ms) */
export const TASK_DEFAULT_TIMEOUT = 120_000; // 2 minutes

/** Retry backoff delays (ms) — exponential */
export const TASK_RETRY_DELAYS = [
  1_000, 2_000, 4_000, 8_000, 30_000, 60_000, 120_000,
] as const;

/** Task TTL — discard offline tasks older than this (ms) */
export const TASK_OFFLINE_TTL = 24 * 60 * 60 * 1_000; // 24 hours

// ─── Content Injection ────────────────────────────────────────────────────

/** Delay after page load before injecting (ms) */
export const INJECT_DELAY_AFTER_LOAD = 2_000;

/** Delay between pipeline steps (ms) */
export const INJECT_STEP_DELAY = 500;

/** Max time to wait for a DOM element to appear (ms) */
export const INJECT_ELEMENT_TIMEOUT = 10_000;

// ─── AI Brand Design Tokens ───────────────────────────────────────────────

export const DESIGN_TOKENS = {
  colors: {
    brand: '#2563eb',
    brandLight: '#3b82f6',
    brandDark: '#1d4ed8',
    surface: '#0a0a0b',
    surfaceElevated: '#18181b',
    surfaceOverlay: '#27272a',
    border: '#3f3f46',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
} as const;
