/**
 * AiBrand Extension v3 — Unified Auth Service
 *
 * SOLVES: The v2 token split bug (apiKey ≠ aibrand_token).
 *
 * Design:
 * - Single storage key: "aibrand_auth_token"
 * - Token stored in chrome.storage.session (memory-only, not persisted to disk)
 * - Automatic expiry check with refresh window
 * - Listens for AIBRAND_EXTENSION_SET_TOKEN from web app
 * - Listens for AIBRAND_EXTENSION_CLEAR_AUTH (logout)
 * - Emits events on auth state change
 */

import {
  STORAGE_KEY_TOKEN,
  STORAGE_KEY_USER,
  AUTH_REFRESH_WINDOW,
  AUTH_CHECK_INTERVAL,
} from '@/shared/constants';
import type { AiBrandUser, AuthState } from '@/shared/types';

// ─── Event Types ──────────────────────────────────────────────────────────

export interface AuthEventMap {
  authenticated: CustomEvent<AuthState>;
  unauthenticated: CustomEvent<void>;
  expired: CustomEvent<void>;
  refreshed: CustomEvent<{ expiresAt: number }>;
}

type AuthEventListener<K extends keyof AuthEventMap> = (event: AuthEventMap[K]) => void;

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Decode JWT payload without verification (extension-side only) */
function decodeJwtPayload(token: string): { exp?: number; mail?: string; id?: string; name?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/** Check if token is expired or within refresh window */
function isTokenExpired(exp: number): boolean {
  const now = Date.now();
  // Return true if within refresh window OR already expired
  return now >= (exp * 1000) - AUTH_REFRESH_WINDOW;
}

// ─── Auth Service ─────────────────────────────────────────────────────────

export class AuthService extends EventTarget {
  private _token: string | null = null;
  private _user: AiBrandUser | null = null;
  private checkTimer: ReturnType<typeof setInterval> | null = null;

  // ─── Public API ─────────────────────────────────────────────────────────

  get isAuthenticated(): boolean {
    return this._token !== null && !this.isTokenExpiredNow();
  }

  get token(): string | null {
    return this._token;
  }

  get user(): AiBrandUser | null {
    return this._user;
  }

  get state(): AuthState {
    const payload = this._token ? decodeJwtPayload(this._token) : null;
    return {
      token: this._token,
      user: this._user,
      isAuthenticated: this.isAuthenticated,
      expiresAt: payload?.exp ? payload.exp * 1000 : null,
    };
  }

  /**
   * Initialize the auth service.
   * Restores token from storage and sets up listeners.
   */
  async init(): Promise<void> {
    // Restore token from session storage
    const stored = await chrome.storage.session.get([
      STORAGE_KEY_TOKEN,
      STORAGE_KEY_USER,
    ]);

    if (stored[STORAGE_KEY_TOKEN]) {
      this._token = stored[STORAGE_KEY_TOKEN] as string;
      this.validateAndSetUser();

      if (this.isTokenExpiredNow()) {
        console.log('[AiBrand:Auth] Token expired — requesting refresh');
        this.dispatchEvent(new CustomEvent('expired'));
        await this.clear();
      }
    }

    if (stored[STORAGE_KEY_USER]) {
      this._user = stored[STORAGE_KEY_USER] as AiBrandUser;
    }

    // Start periodic expiry check
    this.checkTimer = setInterval(() => {
      if (this._token && this.isTokenExpiredNow()) {
        console.log('[AiBrand:Auth] Token expired (periodic check)');
        this.dispatchEvent(new CustomEvent('expired'));
      }
    }, AUTH_CHECK_INTERVAL);

    // Listen for token from Web App
    chrome.runtime.onMessage.addListener(this.handleExtensionMessage);

    console.log('[AiBrand:Auth] Initialized:', {
      hasToken: !!this._token,
      hasUser: !!this._user,
      isAuthenticated: this.isAuthenticated,
    });
  }

  /**
   * Set the auth token.
   * Stores in chrome.storage.session and memory.
   */
  async setToken(token: string): Promise<void> {
    const payload = decodeJwtPayload(token);
    if (!payload) {
      console.error('[AiBrand:Auth] Invalid JWT token');
      return;
    }

    this._token = token;
    await chrome.storage.session.set({ [STORAGE_KEY_TOKEN]: token });

    // Extract user info from JWT
    if (payload.id && payload.mail) {
      const user: AiBrandUser = {
        id: payload.id,
        email: payload.mail,
        name: payload.name ?? payload.mail.split('@')[0],
      };
      this._user = user;
      await chrome.storage.session.set({ [STORAGE_KEY_USER]: user });
    }

    this.dispatchEvent(
      new CustomEvent('authenticated', { detail: this.state }),
    );

    console.log('[AiBrand:Auth] Token set — expires:', new Date(payload.exp! * 1000).toISOString());
  }

  /**
   * Get the current token. Returns null if expired.
   */
  async getToken(): Promise<string | null> {
    if (!this._token) return null;

    if (this.isTokenExpiredNow()) {
      this.dispatchEvent(new CustomEvent('expired'));
      return null;
    }

    return this._token;
  }

  /**
   * Clear auth state (logout).
   */
  async clear(): Promise<void> {
    this._token = null;
    this._user = null;
    await chrome.storage.session.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER]);
    this.dispatchEvent(new CustomEvent('unauthenticated'));
    console.log('[AiBrand:Auth] Cleared');
  }

  /**
   * Destroy the service — clean up listeners and timers.
   */
  destroy(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    chrome.runtime.onMessage.removeListener(this.handleExtensionMessage);
  }

  // ─── Event Typed Listeners ──────────────────────────────────────────────

  on<K extends keyof AuthEventMap>(type: K, listener: AuthEventListener<K>): void {
    this.addEventListener(type, listener as EventListener);
  }

  off<K extends keyof AuthEventMap>(type: K, listener: AuthEventListener<K>): void {
    this.removeEventListener(type, listener as EventListener);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private isTokenExpiredNow(): boolean {
    if (!this._token) return true;
    const payload = decodeJwtPayload(this._token);
    if (!payload?.exp) return true;
    return isTokenExpired(payload.exp);
  }

  private validateAndSetUser(): void {
    if (!this._token) return;
    const payload = decodeJwtPayload(this._token);
    if (payload?.id && payload?.mail) {
      this._user = {
        id: payload.id,
        email: payload.mail,
        name: payload.name ?? payload.mail.split('@')[0],
      };
    }
  }

  /**
   * Handle messages from the Web App (SET_TOKEN / CLEAR_AUTH).
   */
  private handleExtensionMessage = (
    request: { action: string; data?: { token?: string } },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: { success: boolean; message?: string }) => void,
  ): boolean => {
    if (request.action === 'AIBRAND_EXTENSION_SET_TOKEN') {
      const token = request.data?.token;
      if (!token) {
        sendResponse({ success: false, message: 'No token provided' });
        return true;
      }
      this.setToken(token).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.action === 'AIBRAND_EXTENSION_CLEAR_AUTH') {
      this.clear().then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    return false;
  };
}

// ─── Singleton ────────────────────────────────────────────────────────────

let instance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!instance) {
    instance = new AuthService();
  }
  return instance;
}
