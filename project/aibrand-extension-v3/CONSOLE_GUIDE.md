# AiBrand 扩展模拟登录控制台使用指南

## 📍 快速开始

### 1. 打开扩展页面

1. 在 Chrome 地址栏输入: `chrome://extensions/`
2. 找到 **AiBrand** 扩展
3. 点击 **"服务工作者"** 链接（这将打开扩展的后台日志）

### 2. 查看扩展日志

在打开的服务工作者控制台中，您将看到：
```
[AiBrand:BG] Extension v3.0.0 bootstrapping...
[AiBrand:BG] Bootstrap complete — extension ready
```

### 3. 打开任意网页

1. 打开新标签页
2. 访问任意网站（如 https://www.baidu.com）
3. 打开开发者控制台（F12）

---

## 🔐 模拟登录命令

在控制台中输入以下命令：

### 登录为管理员
```javascript
await AiBrandMockAuth.loginAsAdmin()
```

**预期输出**：
```
[AiBrand:MockAuth] 🔑 权限分配过程
👤 用户信息:
   - ID: user_admin_001
   - Email: admin@aibrand.ai
   - Name: Admin User
   - Type: admin
🔐 权限分配:
   总权限数: 6
   1. publish:all
   2. manage:users
   3. manage:settings
   4. view:analytics
   5. execute:batch
   6. debug:logs
📝 正在生成 Token...
[AiBrand:MockAuth] 🔐 Token 生成过程
   📋 Token 配置: {...}
   📦 JWT Header: {...}
   📦 JWT Payload: {...}
   ...
🎉 模拟认证设置完成!
   用户类型: ADMIN
   权限数量: 6
   Token 有效期: 120分钟
```

### 登录为普通用户
```javascript
await AiBrandMockAuth.loginAsUser()
```

**预期权限**：
- publish:assigned
- view:own_stats
- manage:own_content

### 登录为开发者
```javascript
await AiBrandMockAuth.loginAsDeveloper()
```

**预期权限**：
- publish:all
- view:analytics
- debug:logs
- test:features

---

## 📊 查看当前状态

### 获取认证状态
```javascript
const state = await AiBrandMockAuth.getMockAuthState()
console.log(state)
```

**输出示例**：
```javascript
{
  isAuthenticated: true,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: {
    id: "user_admin_001",
    email: "admin@aibrand.ai",
    name: "Admin User"
  }
}
```

### 查看预设用户列表
```javascript
console.log(AiBrandMockAuth.MOCK_USERS)
```

---

## 🔓 登出

### 清除认证状态
```javascript
await AiBrandMockAuth.logout()
```

---

## 🎯 完整测试流程

### 测试管理员权限
```javascript
// 1. 登录为管理员
await AiBrandMockAuth.loginAsAdmin()

// 2. 查看状态
const adminState = await AiBrandMockAuth.getMockAuthState()
console.log('管理员状态:', adminState.isAuthenticated)

// 3. 查看权限
console.log('权限:', ['publish:all', 'manage:users', 'manage:settings', 'view:analytics', 'execute:batch', 'debug:logs'])
```

### 测试普通用户权限
```javascript
// 1. 登出
await AiBrandMockAuth.logout()

// 2. 登录为普通用户
await AiBrandMockAuth.loginAsUser()

// 3. 查看状态
const userState = await AiBrandMockAuth.getMockAuthState()
console.log('普通用户状态:', userState.isAuthenticated)

// 4. 查看权限
console.log('权限:', ['publish:assigned', 'view:own_stats', 'manage:own_content'])
```

### 测试开发者权限
```javascript
// 1. 登录为开发者
await AiBrandMockAuth.loginAsDeveloper()

// 2. 查看状态
const devState = await AiBrandMockAuth.getMockAuthState()
console.log('开发者状态:', devState.isAuthenticated)

// 3. 查看权限
console.log('权限:', ['publish:all', 'view:analytics', 'debug:logs', 'test:features'])
```

---

## 🔍 查看 Token 详情

### 生成自定义 Token
```javascript
const customToken = await AiBrandMockAuth.generateMockToken({
  userId: 'custom_user',
  email: 'custom@test.com',
  name: 'Custom User',
  role: 'user',
  expiresInMinutes: 30
})
console.log('自定义 Token:', customToken)
```

### 生成自定义用户
```javascript
const customUser = await AiBrandMockAuth.generateMockUser({
  id: 'custom_001',
  email: 'custom@example.com',
  name: 'Custom Name'
})
console.log('自定义用户:', customUser)
```

---

## 📝 日志输出说明

### Token 生成日志
```
🔐 Token 生成过程
├── 📋 Token 配置
│   ├── userId
│   ├── email
│   ├── name
│   ├── expiresInMinutes
│   └── role
├── 📦 JWT Header
│   ├── alg: HS256
│   └── typ: JWT
├── 📦 JWT Payload
│   ├── id
│   ├── mail
│   ├── name
│   ├── role
│   ├── exp (过期时间)
│   ├── iat (签发时间)
│   ├── iss: aibrand-local
│   └── aud: aibrand-extension
├── 🔒 Base64 编码
│   ├── Header (encoded)
│   └── Payload (encoded)
├── 🔑 签名
└── ✨ Token 生成完成
```

### 权限分配日志
```
🔑 权限分配过程
├── 👤 用户信息
│   ├── ID
│   ├── Email
│   ├── Name
│   └── Type
├── 🔐 权限分配
│   ├── 总权限数
│   └── 1. permission_name
│       2. permission_name
│       ...
├── 📝 正在生成 Token...
├── 💾 正在存储认证数据...
├── ✅ 存储完成
├── 📋 Token Payload (解码后)
└── 🎉 模拟认证设置完成
```

---

## ⚠️ 注意事项

1. **模拟环境**: 这些命令仅用于本地开发测试
2. **Token 签名**: Mock Token 使用固定签名，生产环境不要使用
3. **会话存储**: 认证状态存储在 `chrome.storage.session`（内存级别）
4. **刷新丢失**: 刷新扩展页面会重置认证状态
5. **多标签页**: 认证状态在所有标签页间共享

---

## 🚀 下一步

完成模拟登录测试后，您可以：

1. **重启扩展**: 在 `chrome://extensions/` 页面重新加载扩展
2. **验证功能**: 测试发布、评论、一键操作等功能
3. **查看日志**: 在扩展后台控制台查看详细日志
4. **集成测试**: 与 AiBrand Studio Web 应用进行集成测试

---

**🎉 祝您测试愉快！**
