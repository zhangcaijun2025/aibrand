/**
 * AiBrand Mock Auth Demo - 生成模拟登录演示页面
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 模拟 Token 生成函数
function generateMockToken(config = {}) {
  const {
    userId = 'user_test_001',
    email = 'test@aibrand.ai',
    name = 'Test User',
    expiresInMinutes = 60,
    role = 'user',
  } = config;

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    id: userId,
    mail: email,
    name: name,
    role: role,
    exp: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
    iat: Math.floor(Date.now() / 1000),
    iss: 'aibrand-local',
    aud: 'aibrand-extension',
  };

  const base64 = (obj) => {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const signature = 'mock_signature_for_testing_only';
  return `${base64(header)}.${base64(payload)}.${signature}`;
}

// 预设用户
const MOCK_USERS = {
  admin: {
    user: { id: 'user_admin_001', email: 'admin@aibrand.ai', name: 'Admin User' },
    token: generateMockToken({
      userId: 'user_admin_001', email: 'admin@aibrand.ai', name: 'Admin User', role: 'admin', expiresInMinutes: 120,
    }),
    permissions: ['publish:all', 'manage:users', 'manage:settings', 'view:analytics', 'execute:batch', 'debug:logs'],
  },
  normal: {
    user: { id: 'user_normal_001', email: 'user@aibrand.ai', name: 'Normal User' },
    token: generateMockToken({
      userId: 'user_normal_001', email: 'user@aibrand.ai', name: 'Normal User', role: 'user', expiresInMinutes: 60,
    }),
    permissions: ['publish:assigned', 'view:own_stats', 'manage:own_content'],
  },
  developer: {
    user: { id: 'user_dev_001', email: 'dev@aibrand.ai', name: 'Developer User' },
    token: generateMockToken({
      userId: 'user_dev_001', email: 'dev@aibrand.ai', name: 'Developer User', role: 'developer', expiresInMinutes: 30,
    }),
    permissions: ['publish:all', 'view:analytics', 'debug:logs', 'test:features'],
  },
};

// 生成演示页面
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AiBrand - 模拟登录演示</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: white; text-align: center; margin-bottom: 30px; font-size: 2rem; }
    .subtitle { color: rgba(255,255,255,0.8); text-align: center; margin-bottom: 40px; }
    
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }
    .card:hover { transform: translateY(-4px); }
    
    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #eee;
    }
    
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: white;
      font-weight: bold;
    }
    .admin .avatar { background: #ef4444; }
    .normal .avatar { background: #3b82f6; }
    .developer .avatar { background: #10b981; }
    
    .user-info h3 { font-size: 18px; color: #1f2937; }
    .user-info p { font-size: 14px; color: #6b7280; }
    
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .admin .badge { background: #fef2f2; color: #dc2626; }
    .normal .badge { background: #eff6ff; color: #2563eb; }
    .developer .badge { background: #ecfdf5; color: #059669; }
    
    .permissions { margin-top: 16px; }
    .permissions h4 { font-size: 14px; color: #374151; margin-bottom: 8px; }
    .perm-list { list-style: none; }
    .perm-list li {
      padding: 6px 10px;
      background: #f9fafb;
      border-radius: 6px;
      margin-bottom: 4px;
      font-size: 13px;
      color: #4b5563;
      font-family: 'Monaco', 'Consolas', monospace;
    }
    
    .token-section { margin-top: 16px; }
    .token-section h4 { font-size: 14px; color: #374151; margin-bottom: 8px; }
    .token-box {
      background: #1f2937;
      color: #10b981;
      padding: 12px;
      border-radius: 8px;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 11px;
      word-break: break-all;
      max-height: 100px;
      overflow-y: auto;
    }
    
    .btn {
      display: block;
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .admin .btn { background: #ef4444; color: white; }
    .normal .btn { background: #3b82f6; color: white; }
    .developer .btn { background: #10b981; color: white; }
    
    .console-section {
      background: #1e1e1e;
      border-radius: 12px;
      padding: 20px;
      color: #d4d4d4;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 13px;
    }
    .console-section h2 {
      color: #fff;
      font-family: inherit;
      margin-bottom: 16px;
      font-size: 16px;
    }
    .log-line { padding: 4px 0; }
    .log-info { color: #60a5fa; }
    .log-success { color: #4ade80; }
    .log-warn { color: #fbbf24; }
    .log-group { color: #c084fc; font-weight: bold; }
    .log-muted { color: #6b7280; }
    
    .command-hint {
      background: #2d2d2d;
      padding: 12px;
      border-radius: 8px;
      margin-top: 20px;
      border-left: 4px solid #10b981;
    }
    .command-hint code { color: #fbbf24; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 AiBrand 模拟登录演示</h1>
    <p class="subtitle">Mock Authentication System - 本地开发测试用</p>
    
    <div class="cards">
      <!-- Admin Card -->
      <div class="card admin">
        <div class="card-header">
          <div class="avatar">A</div>
          <div class="user-info">
            <h3>管理员</h3>
            <p>admin@aibrand.ai</p>
            <span class="badge">ADMIN</span>
          </div>
        </div>
        <div class="permissions">
          <h4>📋 权限列表 (6个)</h4>
          <ul class="perm-list">
            <li>✅ publish:all</li>
            <li>✅ manage:users</li>
            <li>✅ manage:settings</li>
            <li>✅ view:analytics</li>
            <li>✅ execute:batch</li>
            <li>✅ debug:logs</li>
          </ul>
        </div>
        <div class="token-section">
          <h4>🔑 Token 预览</h4>
          <div class="token-box">${MOCK_USERS.admin.token.substring(0, 100)}...</div>
        </div>
        <p style="font-size:12px;color:#6b7280;margin-top:8px;">有效期: 120 分钟</p>
      </div>
      
      <!-- Normal User Card -->
      <div class="card normal">
        <div class="card-header">
          <div class="avatar">U</div>
          <div class="user-info">
            <h3>普通用户</h3>
            <p>user@aibrand.ai</p>
            <span class="badge">USER</span>
          </div>
        </div>
        <div class="permissions">
          <h4>📋 权限列表 (3个)</h4>
          <ul class="perm-list">
            <li>✅ publish:assigned</li>
            <li>✅ view:own_stats</li>
            <li>✅ manage:own_content</li>
          </ul>
        </div>
        <div class="token-section">
          <h4>🔑 Token 预览</h4>
          <div class="token-box">${MOCK_USERS.normal.token.substring(0, 100)}...</div>
        </div>
        <p style="font-size:12px;color:#6b7280;margin-top:8px;">有效期: 60 分钟</p>
      </div>
      
      <!-- Developer Card -->
      <div class="card developer">
        <div class="card-header">
          <div class="avatar">D</div>
          <div class="user-info">
            <h3>开发者</h3>
            <p>dev@aibrand.ai</p>
            <span class="badge">DEVELOPER</span>
          </div>
        </div>
        <div class="permissions">
          <h4>📋 权限列表 (4个)</h4>
          <ul class="perm-list">
            <li>✅ publish:all</li>
            <li>✅ view:analytics</li>
            <li>✅ debug:logs</li>
            <li>✅ test:features</li>
          </ul>
        </div>
        <div class="token-section">
          <h4>🔑 Token 预览</h4>
          <div class="token-box">${MOCK_USERS.developer.token.substring(0, 100)}...</div>
        </div>
        <p style="font-size:12px;color:#6b7280;margin-top:8px;">有效期: 30 分钟</p>
      </div>
    </div>
    
    <!-- Console Output -->
    <div class="console-section">
      <h2>🖥️ 控制台输出示例 (管理员登录)</h2>
      <div class="log-line log-group">▼ [AiBrand:MockAuth] 🔐 权限分配过程</div>
      <div class="log-line log-muted">   👤 用户信息:</div>
      <div class="log-line log-muted">      - ID: user_admin_001</div>
      <div class="log-line log-muted">      - Email: admin@aibrand.ai</div>
      <div class="log-line log-muted">      - Name: Admin User</div>
      <div class="log-line log-muted">      - Type: admin</div>
      <div class="log-line log-muted">   🔐 权限分配:</div>
      <div class="log-line log-muted">      总权限数: 6</div>
      <div class="log-line log-muted">      1. publish:all</div>
      <div class="log-line log-muted">      2. manage:users</div>
      <div class="log-line log-muted">      3. manage:settings</div>
      <div class="log-line log-muted">      4. view:analytics</div>
      <div class="log-line log-muted">      5. execute:batch</div>
      <div class="log-line log-muted">      6. debug:logs</div>
      <div class="log-line log-muted">   📝 正在生成 Token...</div>
      <div class="log-line log-group">      ▼ [AiBrand:MockAuth] 🔐 Token 生成过程</div>
      <div class="log-line log-muted">         📋 Token 配置: {...}</div>
      <div class="log-line log-muted">         📦 JWT Header: {"alg":"HS256","typ":"JWT"}</div>
      <div class="log-line log-muted">         📦 JWT Payload: {...}</div>
      <div class="log-line log-muted">         🔒 Base64 编码: ...</div>
      <div class="log-line log-muted">         🔑 签名: mock_signature...</div>
      <div class="log-line log-success">         ✨ Token 生成完成! (324 字符)</div>
      <div class="log-line log-muted">   💾 正在存储认证数据...</div>
      <div class="log-line log-success">   ✅ 存储完成!</div>
      <div class="log-line log-muted">   📋 Token Payload (解码后):</div>
      <div class="log-line log-muted">      - id: user_admin_001</div>
      <div class="log-line log-muted">      - mail: admin@aibrand.ai</div>
      <div class="log-line log-muted">      - role: admin</div>
      <div class="log-line log-success">   🎉 模拟认证设置完成! (ADMIN, 6权限, 120分钟)</div>
      
      <div class="command-hint">
        <strong>💡 提示：</strong>在扩展后台控制台中执行以下命令测试：<br>
        <code>await AiBrandMockAuth.loginAsAdmin()</code><br>
        <code>await AiBrandMockAuth.loginAsUser()</code><br>
        <code>await AiBrandMockAuth.loginAsDeveloper()</code><br>
        <code>await AiBrandMockAuth.getMockAuthState()</code>
      </div>
    </div>
  </div>
</body>
</html>`;

const outputPath = path.join(__dirname, '../public/mock-auth-demo.html');
fs.writeFileSync(outputPath, html);
console.log('✅ 演示页面已生成:', outputPath);
console.log('📁 文件路径:', outputPath);
