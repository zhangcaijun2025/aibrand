/**
 * AiBrand Mock Auth Token Generator
 * 
 * 用于本地开发测试的模拟认证系统
 * - 生成有效的 JWT 格式 token
 * - 支持多种用户角色
 * - 可配置过期时间
 */

import type { AiBrandUser } from '@/shared/types';

// ─── Mock Token Generator ────────────────────────────────────────────────────

interface MockTokenConfig {
  userId?: string;
  email?: string;
  name?: string;
  expiresInMinutes?: number;
  role?: 'admin' | 'user' | 'developer';
}

/**
 * 生成模拟 JWT token
 */
export function generateMockToken(config: MockTokenConfig = {}): string {
  console.group('[AiBrand:MockAuth] 🔐 Token 生成过程');
  
  const {
    userId = 'user_test_001',
    email = 'test@aibrand.ai',
    name = 'Test User',
    expiresInMinutes = 60,
    role = 'user',
  } = config;

  console.log('📋 Token 配置:', {
    userId,
    email,
    name,
    expiresInMinutes,
    role,
  });

  // JWT Header
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  console.log('📦 JWT Header:', JSON.stringify(header));

  // JWT Payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    id: userId,
    mail: email,
    name: name,
    role: role,
    exp: now + (expiresInMinutes * 60),
    iat: now,
    iss: 'aibrand-local',
    aud: 'aibrand-extension',
  };
  console.log('📦 JWT Payload:', JSON.stringify(payload, null, 2));
  console.log('   - 签发时间:', new Date(payload.iat * 1000).toISOString());
  console.log('   - 过期时间:', new Date(payload.exp * 1000).toISOString());
  console.log('   - 有效期:', expiresInMinutes, '分钟');

  // Base64 encode (URL-safe)
  const base64 = (obj: object): string => {
    return btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const encodedHeader = base64(header);
  const encodedPayload = base64(payload);
  
  console.log('🔒 Base64 编码:');
  console.log('   - Header (encoded):', encodedHeader);
  console.log('   - Payload (encoded):', encodedPayload.substring(0, 50) + '...');

  // Sign (mock signature for testing)
  const signature = 'mock_signature_for_testing_only_should_not_be_used_in_production';
  console.log('🔑 签名:', signature);

  const token = `${encodedHeader}.${encodedPayload}.${signature}`;
  console.log('✨ Token 生成完成!');
  console.log('   Token 长度:', token.length, '字符');
  console.log('   Token 预览:', token.substring(0, 50) + '...');
  
  console.groupEnd();

  return token;
}

/**
 * 生成模拟用户对象
 */
export function generateMockUser(config: Partial<AiBrandUser> = {}): AiBrandUser {
  return {
    id: config.id || 'user_test_001',
    email: config.email || 'test@aibrand.ai',
    name: config.name || 'Test User',
  };
}

// ─── Preset Users ───────────────────────────────────────────────────────────

export const MOCK_USERS = {
  admin: {
    user: generateMockUser({
      id: 'user_admin_001',
      email: 'admin@aibrand.ai',
      name: 'Admin User',
    }),
    token: generateMockToken({
      userId: 'user_admin_001',
      email: 'admin@aibrand.ai',
      name: 'Admin User',
      role: 'admin',
      expiresInMinutes: 120,
    }),
  },
  user: {
    user: generateMockUser({
      id: 'user_normal_001',
      email: 'user@aibrand.ai',
      name: 'Normal User',
    }),
    token: generateMockToken({
      userId: 'user_normal_001',
      email: 'user@aibrand.ai',
      name: 'Normal User',
      role: 'user',
      expiresInMinutes: 60,
    }),
  },
  developer: {
    user: generateMockUser({
      id: 'user_dev_001',
      email: 'dev@aibrand.ai',
      name: 'Developer User',
    }),
    token: generateMockToken({
      userId: 'user_dev_001',
      email: 'dev@aibrand.ai',
      name: 'Developer User',
      role: 'developer',
      expiresInMinutes: 30,
    }),
  },
};

// ─── Storage Helpers ─────────────────────────────────────────────────────────

import { STORAGE_KEY_TOKEN, STORAGE_KEY_USER } from '@/shared/constants';

// ─── Permission Definitions ──────────────────────────────────────────────────

const PERMISSIONS = {
  admin: [
    'publish:all',      // 发布到所有平台
    'manage:users',     // 管理用户
    'manage:settings',  // 修改设置
    'view:analytics',   // 查看分析
    'execute:batch',    // 批量操作
    'debug:logs',       // 调试日志
  ],
  user: [
    'publish:assigned', // 发布到分配的平台
    'view:own_stats',  // 查看自己的统计
    'manage:own_content', // 管理自己的内容
  ],
  developer: [
    'publish:all',
    'view:analytics',
    'debug:logs',
    'test:features',
  ],
};

type UserType = keyof typeof PERMISSIONS;

/**
 * 获取用户权限列表
 */
function getPermissionsForRole(role: UserType): string[] {
  return PERMISSIONS[role] || [];
}

/**
 * 设置模拟认证状态到 session storage
 */
export async function setMockAuth(userType: UserType = 'user'): Promise<void> {
  console.group('[AiBrand:MockAuth] 🔑 权限分配过程');
  
  const mockData = MOCK_USERS[userType];
  if (!mockData) {
    console.error('❌ 未知用户类型:', userType);
    console.groupEnd();
    throw new Error(`Unknown user type: ${userType}`);
  }

  console.log('👤 用户信息:');
  console.log('   - ID:', mockData.user.id);
  console.log('   - Email:', mockData.user.email);
  console.log('   - Name:', mockData.user.name);
  console.log('   - Type:', userType);

  // 获取权限列表
  const permissions = getPermissionsForRole(userType);
  console.log('🔐 权限分配:');
  console.log('   总权限数:', permissions.length);
  permissions.forEach((perm, index) => {
    console.log(`   ${index + 1}. ${perm}`);
  });

  // 模拟 Token 生成过程
  console.log('\n📝 正在生成 Token...');
  const token = generateMockToken({
    userId: mockData.user.id,
    email: mockData.user.email,
    name: mockData.user.name,
    role: userType,
    expiresInMinutes: userType === 'admin' ? 120 : userType === 'developer' ? 30 : 60,
  });

  // 存储 Token 和 User
  console.log('\n💾 正在存储认证数据...');
  await chrome.storage.session.set({
    [STORAGE_KEY_TOKEN]: token,
    [STORAGE_KEY_USER]: mockData.user,
  });

  console.log('✅ 存储完成!');
  console.log('   - Token 存储键:', STORAGE_KEY_TOKEN);
  console.log('   - User 存储键:', STORAGE_KEY_USER);

  // 解码 Token 显示 Payload
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    console.log('\n📋 Token Payload (解码后):');
    console.log('   - id:', payload.id);
    console.log('   - mail:', payload.mail);
    console.log('   - name:', payload.name);
    console.log('   - role:', payload.role);
    console.log('   - exp:', new Date(payload.exp * 1000).toISOString());
  } catch (e) {
    console.log('   (Token 解码失败)');
  }

  console.log('\n🎉 模拟认证设置完成!');
  console.log('   用户类型:', userType.toUpperCase());
  console.log('   权限数量:', permissions.length);
  console.log('   Token 有效期:', userType === 'admin' ? '120分钟' : userType === 'developer' ? '30分钟' : '60分钟');

  console.groupEnd();
}

/**
 * 清除模拟认证状态
 */
export async function clearMockAuth(): Promise<void> {
  await chrome.storage.session.remove([STORAGE_KEY_TOKEN, STORAGE_KEY_USER]);
  console.log('[AiBrand:MockAuth] Cleared mock auth');
}

/**
 * 获取当前认证状态
 */
export async function getMockAuthState(): Promise<{
  token: string | null;
  user: AiBrandUser | null;
  isAuthenticated: boolean;
}> {
  const stored = await chrome.storage.session.get([STORAGE_KEY_TOKEN, STORAGE_KEY_USER]);
  
  return {
    token: stored[STORAGE_KEY_TOKEN] || null,
    user: stored[STORAGE_KEY_USER] || null,
    isAuthenticated: !!stored[STORAGE_KEY_TOKEN],
  };
}

// ─── Quick Auth Functions ───────────────────────────────────────────────────

/**
 * 快速设置管理员认证
 */
export async function loginAsAdmin(): Promise<void> {
  await setMockAuth('admin');
}

/**
 * 快速设置普通用户认证
 */
export async function loginAsUser(): Promise<void> {
  await setMockAuth('user');
}

/**
 * 快速设置开发者认证
 */
export async function loginAsDeveloper(): Promise<void> {
  await setMockAuth('developer');
}

/**
 * 快速登出
 */
export async function logout(): Promise<void> {
  await clearMockAuth();
}

// ─── Console Commands ───────────────────────────────────────────────────────

/**
 * 注册控制台命令（在扩展加载时调用）
 */
export function registerConsoleCommands(): void {
  // @ts-expect-error - Adding to window for testing
  window.AiBrandMockAuth = {
    loginAsAdmin,
    loginAsUser,
    loginAsDeveloper,
    logout,
    getMockAuthState,
    generateMockToken,
    generateMockUser,
    MOCK_USERS,
  };

  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                 AiBrand Mock Auth Commands                          ║
╠══════════════════════════════════════════════════════════════════════╣
║  Usage:                                                             ║
║    AiBrandMockAuth.loginAsAdmin()      - 登录为管理员               ║
║    AiBrandMockAuth.loginAsUser()       - 登录为普通用户             ║
║    AiBrandMockAuth.loginAsDeveloper()  - 登录为开发者               ║
║    AiBrandMockAuth.logout()            - 登出                       ║
║    AiBrandMockAuth.getMockAuthState()  - 获取当前认证状态           ║
║                                                                     ║
║  Example:                                                           ║
║    await AiBrandMockAuth.loginAsAdmin()                             ║
║    // 然后刷新页面或调用扩展API                                     ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
}
