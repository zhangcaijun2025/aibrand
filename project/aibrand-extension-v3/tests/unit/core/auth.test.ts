/**
 * Auth Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome.storage.session
const mockStorage = new Map<string, unknown>();
vi.stubGlobal('chrome', {
  storage: {
    session: {
      get: async (keys: string[]) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (mockStorage.has(key)) result[key] = mockStorage.get(key);
        }
        return result;
      },
      set: async (items: Record<string, unknown>) => {
        for (const [key, value] of Object.entries(items)) {
          mockStorage.set(key, value);
        }
      },
      remove: async (keys: string[]) => {
        for (const key of keys) {
          mockStorage.delete(key);
        }
      },
    },
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    sendMessage: vi.fn(),
    getManifest: () => ({ version: '3.0.0' }),
  },
});

const { AuthService, getAuthService } = await import('@/core/auth');

// Helper: generate a valid-looking JWT with expiry
function generateTestJwt(expiresInMs = 3600_000): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      id: 'user_001',
      mail: 'test@aibrand.ai',
      name: 'TestUser',
      exp: Math.floor((Date.now() + expiresInMs) / 1000),
      iat: Math.floor(Date.now() / 1000),
    }),
  );
  const signature = btoa('mock_signature');
  return `${header}.${payload}.${signature}`;
}

describe('AuthService', () => {
  let auth: AuthService;

  beforeEach(() => {
    mockStorage.clear();
    auth = new AuthService();
  });

  // ─── Initialization Tests ────────────────────────────────────────────

  describe('init', () => {
    it('should initialize with no stored token', async () => {
      await auth.init();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.token).toBeNull();
    });

    it('should restore token from session storage', async () => {
      const jwt = generateTestJwt();
      mockStorage.set('aibrand_auth_token', jwt);

      await auth.init();
      expect(auth.token).toBe(jwt);
      expect(auth.isAuthenticated).toBe(true);
    });

    it('should detect expired token', async () => {
      const expiredJwt = generateTestJwt(-1000); // expired 1s ago
      mockStorage.set('aibrand_auth_token', expiredJwt);

      await auth.init();
      expect(auth.isAuthenticated).toBe(false);
    });
  });

  // ─── Token Management Tests ─────────────────────────────────────────

  describe('setToken', () => {
    it('should store token in memory and session storage', async () => {
      const jwt = generateTestJwt();
      await auth.setToken(jwt);

      expect(auth.token).toBe(jwt);
      expect(mockStorage.get('aibrand_auth_token')).toBe(jwt);
      expect(auth.isAuthenticated).toBe(true);
    });

    it('should reject invalid JWT format', async () => {
      await auth.setToken('not.a.jwt');
      expect(auth.token).toBeNull();
    });

    it('should extract user info from JWT payload', async () => {
      const jwt = generateTestJwt();
      await auth.setToken(jwt);

      expect(auth.user).not.toBeNull();
      expect(auth.user?.id).toBe('user_001');
      expect(auth.user?.email).toBe('test@aibrand.ai');
      expect(auth.user?.name).toBe('TestUser');
    });

    it('should dispatch authenticated event', async () => {
      const handler = vi.fn();
      auth.on('authenticated', handler);

      const jwt = generateTestJwt();
      await auth.setToken(jwt);

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].detail.token).toBe(jwt);
    });
  });

  // ─── Clear Tests ────────────────────────────────────────────────────

  describe('clear', () => {
    it('should clear token and user', async () => {
      const jwt = generateTestJwt();
      await auth.setToken(jwt);
      await auth.clear();

      expect(auth.token).toBeNull();
      expect(auth.user).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
      expect(mockStorage.has('aibrand_auth_token')).toBe(false);
    });

    it('should dispatch unauthenticated event', async () => {
      const handler = vi.fn();
      auth.on('unauthenticated', handler);

      const jwt = generateTestJwt();
      await auth.setToken(jwt);
      await auth.clear();

      expect(handler).toHaveBeenCalled();
    });
  });

  // ─── State Tests ────────────────────────────────────────────────────

  describe('state', () => {
    it('should return correct state when unauthenticated', () => {
      expect(auth.state.isAuthenticated).toBe(false);
      expect(auth.state.token).toBeNull();
      expect(auth.state.user).toBeNull();
    });

    it('should return correct state when authenticated', async () => {
      const jwt = generateTestJwt();
      await auth.setToken(jwt);

      const state = auth.state;
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe(jwt);
      expect(state.user?.email).toBe('test@aibrand.ai');
      expect(state.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  // ─── Singleton Tests ────────────────────────────────────────────────

  describe('getAuthService', () => {
    it('should return the same instance', () => {
      const a = getAuthService();
      const b = getAuthService();
      expect(a).toBe(b);
    });
  });
});
