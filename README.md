# AiBrand MVP 工作区

## 项目简介

基于 AiToEarn 开源项目打造的 **AI 全域运营平台**。目标客户：超级个体、一人公司、中小微企业。

## 目录结构

```
D:\king2046\
├── README.md                  ← 本文件
├── MVP-TASK-BREAKDOWN.md      ← MVP 任务拆解
├── .node-version              ← Node 20.18.3
│
├── project/
│   ├── aitoearn-backend/      ← 后端源码 (参考上游)
│   └── openmontage-bridge/    ← 视频制作桥接服务
│
├── docker-compose.yml         ← Docker 编排
├── nginx/                     ← Nginx 配置
└── scripts/                   ← 工具脚本
```

## 上游参考

- **AiToEarn 源码**: `C:\Users\XIAOMI\AiToEarn`
- **AiBrand 前端**: `C:\Users\XIAOMI\AiToEarn\project\aitoearn-web` (dev 端口 6060)
- **Docker 环境**: 7 个容器运行中 (nginx:8080, server:3002, ai:3010, mongo:27017, redis:6379, rustfs:9001)

## 快速开始

```bash
# 前端开发
cd C:\Users\XIAOMI\AiToEarn\project\aitoearn-web
pnpm dev   # 端口 6060

# 后端开发 (修改后需在项目根目录通过 Docker 构建)
cd C:\Users\XIAOMI\AiToEarn
docker compose up -d --build
```

## 环境变量

见 `.env.development`（不提交 Git）
