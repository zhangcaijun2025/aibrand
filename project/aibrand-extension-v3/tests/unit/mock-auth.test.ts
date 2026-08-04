/**
 * AiBrand Mock Auth Integration Test
 * 
 * 验证模拟登录凭证是否能正确触发扩展的权限获取逻辑
 * 测试内容：
 * 1. JWT Token 生成和验证
 * 2. 用户信息解析
 * 3. 认证状态管理
 * 4. 权限获取逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock chrome.storage.session
const mockStorage: Record<string, unknown> = {};

// @ts-expect-error - Mock chrome API
global.chrome = {
  storage: {
    session: {
      get: (keys: string[]) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        }
        return Promise.resolve(result);
      },
      set: (items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      },
      remove: (keys: string[]) => {
        for (const key of keys) {
          delete mockStorage[key];
        }
        return Promise.resolve();
      },
    },
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: () => 'chrome-extension://test123/',
  },
};

// Import after mocking
import {
  generateMockToken,
  generateMockUser,
  MOCK_USERS,
  setMockAuth,
  clearMockAuth,
  getMockAuthState,
  loginAsAdmin,
  loginAsUser,
  loginAsDeveloper,
  logout,
} from '@/core/mock-auth';
import { getAuthService } from '@/core/auth';
import { STORAGE_KEY_TOKEN, STORAGE_KEY_USER } from '@/shared/constants';

describe('Mock Auth Token Generator', () => {
  beforeEach(() => {
    // Clear storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  describe('Token Generation', () => {
    it('should generate valid JWT format token', () => {
      const token = generateMockToken();
      const parts = token.split('.');
      
      expect(parts.length).toBe(3);
      expect(parts[0]).toBeTruthy();
      expect(parts[1]).toBeTruthy();
      expect(parts[2]).toBeTruthy();
    });

    it('should contain correct user info in payload', () => {
      const token = generateMockToken({
        userId: 'test_user_123',
        email: 'test@example.com',
        name: 'Test User',
      });
      
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      
      expect(payload.id).toBe('test_user_123');
      expect(payload.mail).toBe('test@example.com');
      expect(payload.name).toBe('Test User');
    });

    it('should set correct expiration time', () => {
      const token = generateMockToken({ expiresInMinutes: 30 });
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      
      const expectedExp = Math.floor(Date.now() / 1000) + (30 * 60);
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(payload.exp).toBeLessThanOrEqual(expectedExp + 1);
    });

    it('should set issuer and audience', () => {
      const token = generateMockToken();
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      
      expect(payload.iss).toBe('aibrand-local');
      expect(payload.aud).toBe('aibrand-extension');
    });
  });

  describe('Preset Users', () => {
    it('should have admin user with correct role', () => {
      expect(MOCK_USERS.admin).toBeDefined();
      expect(MOCK_USERS.admin.user.email).toBe('admin@aibrand.ai');
      
      const payload = JSON.parse(
        atob(MOCK_USERS.admin.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      expect(payload.role).toBe('admin');
    });

    it('should have normal user with correct role', () => {
      expect(MOCK_USERS.user).toBeDefined();
      expect(MOCK_USERS.user.user.email).toBe('user@aibrand.ai');
      
      const payload = JSON.parse(
        atob(MOCK_USERS.user.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      expect(payload.role).toBe('user');
    });

    it('should have developer user with correct role', () => {
      expect(MOCK_USERS.developer).toBeDefined();
      expect(MOCK_USERS.developer.user.email).toBe('dev@aibrand.ai');
      
      const payload = JSON.parse(
        atob(MOCK_USERS.developer.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      expect(payload.role).toBe('developer');
    });
  });

  describe('Storage Operations', () => {
    it('should set mock auth correctly', async () => {
      await setMockAuth('user');
      
      const stored = await chrome.storage.session.get([STORAGE_KEY_TOKEN, STORAGE_KEY_USER]);
      expect(stored[STORAGE_KEY_TOKEN]).toBeTruthy();
      expect(stored[STORAGE_KEY_USER]).toBeTruthy();
      
      const user = stored[STORAGE_KEY_USER] as { email: string };
      expect(user.email).toBe('user@aibrand.ai');
    });

    it('should clear mock auth correctly', async () => {
      await setMockAuth('user');
      await clearMockAuth();
      
      const stored = await chrome.storage.session.get([STORAGE_KEY_TOKEN, STORAGE_KEY_USER]);
      expect(stored[STORAGE_KEY_TOKEN]).toBeUndefined();
      expect(stored[STORAGE_KEY_USER]).toBeUndefined();
    });

    it('should get current auth state', async () => {
      const stateBefore = await getMockAuthState();
      expect(stateBefore.isAuthenticated).toBe(false);
      
      await setMockAuth('admin');
      
      const stateAfter = await getMockAuthState();
      expect(stateAfter.isAuthenticated).toBe(true);
      expect(stateAfter.user?.email).toBe('admin@aibrand.ai');
    });
  });

  describe('Quick Login Functions', () => {
    it('loginAsAdmin should set admin auth', async () => {
      await loginAsAdmin();
      const state = await getMockAuthState();
      
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('admin@aibrand.ai');
    });

    it('loginAsUser should set normal user auth', async () => {
      await loginAsUser();
      const state = await getMockAuthState();
      
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('user@aibrand.ai');
    });

    it('loginAsDeveloper should set developer auth', async () => {
      await loginAsDeveloper();
      const state = await getMockAuthState();
      
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.email).toBe('dev@aibrand.ai');
    });

    it('logout should clear auth', async () => {
      await loginAsAdmin();
      await logout();
      
      const state = await getMockAuthState();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});

describe('Auth Service Integration', () => {
  beforeEach(async () => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    // Clear auth state before each test
    const auth = getAuthService();
    await auth.clear();
  });

  describe('Token Validation', () => {
    it('should validate and extract user from mock token', async () => {
      const auth = getAuthService();
      
      const token = generateMockToken({
        userId: 'integration_test',
        email: 'integration@test.com',
        name: 'Integration Test',
      });
      
      await auth.setToken(token);
      
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.user?.id).toBe('integration_test');
      expect(auth.user?.email).toBe('integration@test.com');
      expect(auth.user?.name).toBe('Integration Test');
    });

    it('should reject invalid JWT format', async () => {
      const auth = getAuthService();
      
      // Ensure we start with clean state
      expect(auth.isAuthenticated).toBe(false);
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      await auth.setToken('invalid-token');
      
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JWT token')
      );
      expect(auth.isAuthenticated).toBe(false);
      
      consoleError.mockRestore();
    });

    it('should detect expired token', async () => {
      const auth = getAuthService();
      
      const expiredToken = generateMockToken({
        userId: 'expired_user',
        expiresInMinutes: -1, // Expired 1 minute ago
      });
      
      await auth.setToken(expiredToken);
      
      // Token was set but should be detected as expired
      expect(auth.token).toBe(expiredToken);
      expect(auth.isAuthenticated).toBe(false); // Should be expired
    });
  });

  describe('Auth State Flow', () => {
    it('should complete full auth lifecycle', async () => {
      const auth = getAuthService();
      
      // Initial state: not authenticated
      expect(auth.isAuthenticated).toBe(false);
      
      // Login
      await setMockAuth('user');
      const state1 = await getMockAuthState();
      expect(state1.isAuthenticated).toBe(true);
      
      // Logout
      await logout();
      const state2 = await getMockAuthState();
      expect(state2.isAuthenticated).toBe(false);
    });

    it('should switch between user types', async () => {
      await loginAsAdmin();
      const adminState = await getMockAuthState();
      expect(adminState.user?.email).toBe('admin@aibrand.ai');
      
      await loginAsUser();
      const userState = await getMockAuthState();
      expect(userState.user?.email).toBe('user@aibrand.ai');
      
      await loginAsDeveloper();
      const devState = await getMockAuthState();
      expect(devState.user?.email).toBe('dev@aibrand.ai');
    });
  });
});

describe('Permission / Capability Tests', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  it('admin should have all capabilities', async () => {
    await loginAsAdmin();
    const state = await getMockAuthState();
    
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toBeTruthy();
    
    // Verify admin token has admin role
    const payload = JSON.parse(
      atob((state.token as string).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    expect(payload.role).toBe('admin');
  });

  it('normal user should have standard capabilities', async () => {
    await loginAsUser();
    const state = await getMockAuthState();
    
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toBeTruthy();
    
    const payload = JSON.parse(
      atob((state.token as string).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    expect(payload.role).toBe('user');
  });
});

// Test summary
console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           AiBrand Mock Auth Integration Test Suite                  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Tests included:                                                   ║
║  ├── Token Generation Tests (4)                                    ║
║  ├── Preset Users Tests (3)                                        ║
║  ├── Storage Operations Tests (3)                                  ║
║  ├── Quick Login Functions Tests (4)                               ║
║  ├── Token Validation Tests (3)                                    ║
║  ├── Auth State Flow Tests (2)                                     ║
║  └── Permission Tests (2)                                          ║
║                                                                    ║
║  Total: 21 test cases                                              ║
║                                                                    ║
║  Run with: npm run test:run                                        ║
║                                                                    ║
╚══════════════════════════════════════════════════════════════════════╝
`);
