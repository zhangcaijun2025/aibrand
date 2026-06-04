# AiBrand 项目全周期沟通纪要

> 从 AiToEarn fork 到自进化 AI 平台的完整历程

---

## 一、项目时间线

| 阶段 | 时间 | 核心事项 | 关键产出 |
|------|------|------|------|
| **Phase 0** | 6月1日 | 环境搭建、代码迁移 | Docker 7容器运行、Node版本锁定、本地域名 |
| **Phase 1** | 6月1-2日 | 品牌化改造 | AiToEarn→AiBrand 全局替换、MVP路由控制 |
| **Phase 2** | 6月2日 | 订阅系统 + 落地页 | Subscription API、Pricing页、SEO、Stripe预留 |
| **Phase 3** | 6月2-3日 | AI平台搭建 | Dify部署、n8n 4工作流、NestJS AiServicesModule |
| **Phase 4** | 6月3日 | 端到端联调 + 五层架构 | 全链路打通、架构定版、自我进化系统 |

---

## 二、已完成的 Git 提交

| 提交 | 类型 | 说明 |
|------|------|------|
| `c17c4a7b` | feat | 后端订阅模块 (plan/quotas API) |
| `837758d2` | feat | AiBrand 品牌化 + MVP 路由控制 + i18n |
| `8a4eca6a` | feat | 落地页 + SEO + 订阅 UI |
| `3adf4819` | fix | 密钥从 docker-compose 迁移到 .env |
| `4bfda7b5` | feat | 品牌设计系统 (紫色/青色) |
| `c4fe1894` | refactor | i18n 字符串品牌化 |
| `3ccba7a8` | feat | Welcome 页重构 |
| `56ab258a` | feat | AI 平台服务 (Dify + n8n + credits) |
| `baf65564` | feat | 前端功能扩展 (AI助手+新页面+支付) |
| `ae05fc38` | feat | AiServicesModule 集成 |
| `ee053621` | docs | 开发日志更新 |
| `2d7c57e6` | fix | 代码审查修复 (双Token+超时+类型) |

---

## 三、架构演进

### 初始状态
```
AiToEarn fork → 单体 NestJS + Next.js
Docker Compose → 7 个基础容器
```

### 第一次升级 (6月2日)
```
+ Dify AI 平台 (9容器，知识库+Agent)
+ n8n 工作流引擎 (4个webhook)
+ NestJS ai-services 库 (DifyService + N8nService)
+ 前端 AI 助手组件
```

### 第二次升级 (6月3日 — 今日)
```
+ LangChain Bridge v3 (Agent编排 + 评测)
+ Claude Code Bridge (代码审计 + 部署)
+ Evolution Engine (自愈 + 自适应)
+ 10个标准化 n8n 工作流
+ 五层协同架构 v3.1
```

### 最终架构
```
L5 OpenClaw  :19001  通信网关 + RPA
L4 Dify      :5001   AI应用 + 知识库
L3 LangChain :4010   智能编排 + 评测
L2 n8n       :5678   中枢调度 (唯一)
L1 Claude    :4020   代码研发 + 审计
L0 Evolution :4030   自愈 + 自适应 + 自进化
```

---

## 四、关键决策记录

| # | 决策 | 来源 | 影响 |
|---|------|------|------|
| 1 | n8n 为唯一中枢调度者 | DeepSeek建议 | 消除多中心调度混乱 |
| 2 | 统一消息 Schema | DeepSeek建议 | 全组件互通标准化 |
| 3 | 异步优先 (>30s走回调) | DeepSeek建议 | 避免HTTP阻塞 |
| 4 | 五层刚性红线 | 用户架构设计 | 每层禁止越界 |
| 5 | LangChain→Dify 工具豁免 | v3.1修正 | 明确调用边界 |
| 6 | Claude Code HTTP Bridge | v3.1修正 | CLI→API标准化 |
| 7 | Docker命名卷替代bind mount | 实践发现 | 解决SQLite权限 |
| 8 | 模型分层 (Haiku/Sonnet/Opus) | 成本管控 | 月预算可控 |
| 9 | 自进化四级模型 | 用户愿景 | L1→L4渐进式 |
| 10 | 用户自适应层 | 用户需求 | Skill自动生成 |

---

## 五、技术债务 & 待解决

| 优先级 | 问题 | 影响 | 解决方案 |
|:--:|------|------|------|
| 🔴 | n8n Web UI 手动激活工作流 | webhook全部404 | 打开 :5678 激活开关 (2分钟) |
| 🔴 | Git未提交今日变更 | 代码丢失风险 | `git add -A && git commit` |
| 🔴 | Docker重建阻塞 (网络超时) | CreditsModule无法加载 | 等待网络恢复/离线镜像 |
| 🟡 | Pricing页Docker 8080 404 | 生产环境不可用 | 重建 aitoearn-web 镜像 |
| 🟡 | 生产服务器未部署 | 仅本地可访问 | 需云服务器+域名 |
| 🟢 | 测试环境隔离 | Dev/Test/Prod混用 | 独立端口+数据库+密钥 |

---

## 六、文件清单

### 代码 (6个服务)
| 服务 | 端口 | 位置 |
|------|:--:|------|
| Backend API | :8080 | `project/aitoearn-backend/` |
| Frontend | :6060 | `project/aitoearn-web/` |
| LangChain Bridge v3 | :4010 | `project/aitoearn-backend/tmp/` |
| Claude Bridge | :4020 | `project/claude-bridge/` |
| Evolution Engine v2 | :4030 | `project/evolution-engine/` |
| Health Dashboard | - | `scripts/health-dashboard.py` |

### n8n 工作流 (10个)
| 类别 | 工作流 |
|------|------|
| AI业务 | competitor-analysis, trending-topics, post-publish-tracking, account-health-check |
| 中枢 | task-callback |
| 风控 | quota-check, credits-deduct |
| 调度 | claude-execute, openclaw-notify |
| 自愈 | self-heal |

### 文档 (6份)
| 文档 | 位置 |
|------|------|
| 协同规范 v3.1 | `D:/king2046/AI-COLLABORATION-RULES.md` |
| 自进化框架 | `D:/king2046/AI-SELF-EVOLUTION-FRAMEWORK.md` |
| 用户自适应层 | `D:/king2046/AI-ADAPTIVE-USER-LAYER.md` |
| 操作手册 | `Desktop/AiBrand-五层AI系统操作手册.md` |
| 全量归档 | `Desktop/AiBrand-2026-06-03-全量归档.md` |
| 沟通纪要(今日) | `Desktop/AiBrand-2026-06-03-完整沟通纪要.md` |

---

## 七、下阶段计划

| 阶段 | 内容 | 预计 |
|:--:|------|:--:|
| **L2 自优化** | Prompt自动调优 + 评测闭环 | 明天 |
| **L3 自进化** | 日终分析 + 自动重构提案 | 本周 |
| **L4 自创造** | 工具自动生成 + 沙箱竞赛 | 本月 |
| **生产部署** | 云服务器 + 域名 + SSL | 待定 |

---

> **项目定位**: 从 AiToEarn fork 成长为拥有 6 个自研服务、10 个自动化工作流、自愈/自适应/自进化能力的 AI 原生运营平台。
>
> **核心原则**: n8n 是唯一中枢。简单走捷径，复杂走中枢。异步优先。严守红线。每天比昨天好 1%。
