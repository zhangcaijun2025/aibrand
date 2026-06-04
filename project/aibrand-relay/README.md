# AiBrand Relay Server

自建 OAuth 代理服务器，替代 aitoearn.cn Relay 依赖。

## 架构

```
AiBrand (NestJS) → 本 Relay (Python FastAPI) → 平台 OAuth
  ↑                      ↑                        ↑
  改1行env             独立服务               Google/抖音/小红书...
```

## 快速启动

```bash
pip install -r requirements.txt
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# 把生成的 key 写入 .env 的 ENCRYPTION_KEY
python main.py
# → http://localhost:4011
```

## 配置平台

1. 在平台开发者中心注册应用
2. 获取 Client ID + Client Secret
3. 写入 `.env`
4. 重启 Relay 即可（`main.py` 自动检测已配置的平台）

## API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 + 已配置平台列表 |
| `/api/plat/:platform/auth` | POST | 发起 OAuth 授权 |
| `/api/plat/:platform/callback` | GET | OAuth 回调 |
| `/api/plat/:platform/*` | ANY | API 代理（带 token 自动刷新） |

## 安全

- Token 使用 AES-256 (Fernet) 加密存储
- 加密密钥通过 `ENCRYPTION_KEY` 环境变量注入
- 无需数据库 — 文件存储（生产环境可替换为 PostgreSQL）

## Docker

```bash
docker build -t aibrand-relay .
docker run -p 4011:4011 --env-file .env aibrand-relay
```
