# AiBrand OAuth 自建方案

> 2026-06-04 · 切断 `aitoearn.cn` Relay 依赖

## 现状

```
用户 → AiBrand → Relay(aitoearn.cn) → 平台 OAuth → 返回凭证
                     ↑
              14 个平台全部经过这里
              单点故障 + API Key 可控 + 数据经过第三方
```

## 目标

```
用户 → AiBrand → 平台 OAuth → 返回凭证（直连，不经第三方）
```

---

## 实施策略：分四批，每批 2-3 天

| 批次 | 平台 | 开发者门槛 | 用户覆盖 | 状态 |
|------|------|:--:|:--:|:--:|
| **P0** | YouTube | 零门槛（Google Cloud Console 即可） | 中 | 先验证流程 |
| **P1** | 抖音 + 小红书 | 需企业认证（营业执照） | **85%** | 核心 |
| **P2** | B站 + 公众号 + Meta | B站需认证；Meta零门槛 | 高 | 扩展 |
| **P3** | TikTok + Twitter + Pinterest + Kwai + Google Biz | 零~低门槛 | 中 | 补齐 |

---

## 技术方案：自建 Relay 服务器（最小改动，最大效果）

### 核心思路

**不重写 10 个平台 service。** 复用 aitoearn.cn 的 Relay 架构——自己建一个 Relay 服务器，实现相同的 API 接口。然后**只改一行配置**：

```env
# 改前
RELAY_SERVER_URL=https://aitoearn.cn/api

# 改后
RELAY_SERVER_URL=https://relay.aibrand.cn/api  ← 自己的 Relay
```

现有代码改 0 行。10 个平台 service 继续抛 `RelayAuthException`，`RelayExceptionFilter` 继续转发——只是转发目标变成了自己的服务器。

### Relay 服务器职责

```
AiBrand Relay (自建)
├── OAuth 代理 — 跟平台做 OAuth 握手
├── Token 保管 — 加密存储 access_token/refresh_token  
├── API 代理 — 转发内容发布/数据查询请求
└── 回调通知 — OAuth 完成后回调 AiBrand 主服务
```

**复用 aitoearn.cn 的接口协议**（已验证可用）：
- `POST /api/plat/:platform/auth` — 发起授权
- `POST /api/plat/relay-callback` — 回调接收
- `GET/POST /api/plat/:platform/*` — API 代理
- `POST /api/assets/uploadSign` — 文件上传

### 架构对比

```
之前: AiBrand → aitoearn.cn Relay → 平台 OAuth

之后: AiBrand → aibrand-relay (自建) → 平台 OAuth
         ↑                                ↑
    改 1 行 env                       独立服务
    10 个 service 不动               Python/Node 皆可
```

### 自建 Relay 技术选型

**推荐 Python FastAPI**（已有 openmontage-bridge 的 Python 经验）：

```
project/aibrand-relay/
├── main.py              # FastAPI 入口
├── platforms/
│   ├── base.py          # OAuth2 基类
│   ├── youtube.py       # Google OAuth2
│   ├── douyin.py        # 抖音 OAuth2
│   ├── xiaohongshu.py   # 小红书 OAuth2
│   └── meta.py          # Meta OAuth2
├── storage/
│   ├── token_store.py   # Token 加密存储 (AES-256)
│   └── models.py        # 数据模型
├── Dockerfile
└── requirements.txt     # fastapi, httpx, cryptography
```

### 为什么这样做

| 对比 | 方案 A（改10个service） | 方案 B（自建Relay） |
|------|------------------------|---------------------|
| 代码改动量 | 10 个平台 × 150 行 = 1500 行 | **1 行 env** + 新 Relay 服务 |
| 现有功能影响 | 每个平台可能引入 bug | **零影响** |
| Relay 回退 | 需要每平台加回退逻辑 | **切回 env 即可** |
| 测试范围 | 10 个平台全部重测 | 只测新 Relay 服务 |
| 上线风险 | 高 | **低** |

---

## P0：自建 Relay 服务器 + YouTube 验证（3-4 天）

### Day 1-2：搭建 Relay 服务器骨架
- [ ] 新建 `project/aibrand-relay/` Python FastAPI 项目
- [ ] 实现 OAuth2 基类（get_auth_url / exchange_code / refresh_token）
- [ ] 实现 /api/plat/youtube/* 代理接口
- [ ] 实现 Token AES-256 加密存储
- [ ] Docker 化（独立容器，端口 4011）

### Day 2-3：YouTube 端到端验证
- [ ] 注册 Google Cloud OAuth 凭据
- [ ] 配通 relay → YouTube OAuth → 回调 AiBrand 主服务
- [ ] 验证：添加 YouTube 账号 → Token 存储 → 发布内容

### Day 3-4：切换到自建 Relay
- [ ] 改 `.env` 中 `RELAY_SERVER_URL` → 指向自建 Relay
- [ ] 端到端回归测试（确保 10 个平台至少 YouTube 正常，其余保持 relay 回退）
- [ ] 文档 + 提交

---

## P1：抖音 + 小红书（3-5 天，需企业认证材料）

### 抖音开放平台
- 官网: https://open.douyin.com
- 需要: 营业执照 + 对公账户
- 能力: 内容发布、数据统计、用户管理

### 小红书开放平台  
- 官网: https://open.xiaohongshu.com
- 需要: 企业认证（专业号）
- 能力: 笔记发布、数据统计

### 实施
- [ ] 准备企业认证材料
- [ ] 注册抖音开放平台 + 创建应用
- [ ] 注册小红书开放平台 + 创建应用
- [ ] 实现抖音/小红书 OAuth 配置
- [ ] 修改对应 service.ts —— 启用 self-hosted 模式
- [ ] 端到端测试

---

## P2 + P3：扩展其余平台（每个 1-2 天）

按官方 API 可用性和开发者门槛排序实施。

---

## 切换策略：灰度，不一次性全切

```
Day 1-3:   YouTube self-hosted（验证流程）
Day 4-7:   抖音 self-hosted（核心平台）
Day 8-10:  小红书 self-hosted（核心平台）
Day 11+:   其他平台逐步切换

所有平台保留 relay 模式作为回退：
  OAUTH_DOUYIN_MODE=self-hosted  → 如果失败 → 自动回退到 relay
```

---

## 风险与应对

| 风险 | 应对 |
|------|------|
| 企业认证未通过 | 先做 YouTube + Meta 零门槛平台，认证材料并行准备 |
| 平台 API 权限不足 | 申请最大权限范围；权限不足的功能告知用户 |
| Token 泄露 | AES-256 加密存储；定期轮换密钥 |
| 回调 URL 需要 HTTPS | 生产环境用 Nginx 反向代理 + Let's Encrypt |
| 平台 API 变更 | 每个平台的 client 独立实现，互不影响 |
