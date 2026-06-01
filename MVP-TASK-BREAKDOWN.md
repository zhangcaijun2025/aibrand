# MVP 技术任务拆解（可执行步骤）

> 最后更新: 2026-06-01 | 目标: 8周内 SaaS MVP 上线

---

## Phase 0: 开发环境与基础设施（第 1 周）

### T0.1 — 统一 Node.js 版本

```bash
# 问题: 当前 Node v24.14.1，AiToEarn 要求 20.18.x
# 方案: 使用 nvm-windows 或 fnm 管理多版本

# Step 1: 安装 fnm (推荐，比 nvm-windows 快)
winget install Schniz.fnm

# Step 2: 安装并使用 Node 20.18.x
fnm install 20.18.3
fnm use 20.18.3

# Step 3: 验证
node --version  # 应输出 v20.18.3

# Step 4: 在项目根目录锁定版本
cd D:\king2046
echo "20.18.3" > .node-version  # fnm 自动切换
```

**验收**: `node --version` → `v20.18.3`

⏱️ **30分钟**

---

### T0.2 — 整理代码仓库结构

```bash
# 上游源码在 C:\Users\XIAOMI\AiToEarn，作为代码继承参考
# 目标: 在 D:\king2046 建立独立仓库

# Step 1: 创建独立仓库（保留 AiToEarn 作为 upstream）
cd D:\king2046
git init

# Step 2: 将上游 AiToEarn 作为 remote 引用
git remote add upstream C:/Users/XIAOMI/AiToEarn/.git

# Step 3: 只保留需要的文件
# 保留: project/aitoearn-backend, project/aitoearn-web, project/openmontage-bridge
#       docker-compose.yml, nginx/, scripts/
# 移除: project/aitoearn-electron, go-stock, skills/ima*
#       MicrosoftEdgeWebview2Setup.exe, gh_installer.msi

# Step 4: 创建 .gitignore 加强版
cat > .gitignore << 'EOF'
node_modules/
.next/
dist/
*.log
.env.local
.env.production
tasks.db
init-data/
EOF

# Step 5: 初始提交
git add -A
git commit -m "chore: initial AiBrand MVP scaffold"
```

**验收**: 独立 Git 仓库，干净的文件结构

⏱️ **1小时**

---

### T0.3 — 配置本地开发域名

```bash
# 目标: 用 aibrand.local 替代 localhost，方便 OAuth 回调等场景

# Step 1: 编辑 hosts
# 以管理员身份运行 Notepad，打开 C:\Windows\System32\drivers\etc\hosts
# 添加一行:
127.0.0.1 aibrand.local api.aibrand.local

# Step 2: 验证
ping aibrand.local  # 应返回 127.0.0.1
```

**验收**: `curl http://aibrand.local:6060` 返回 AiBrand 页面

⏱️ **15分钟**

---

### T0.4 — Docker Compose 环境整理

```bash
# 当前 docker-compose.yml 已有 AiToEarn 全套服务运行
# 目标: 确认所有服务健康，并记录关键端口和凭据

# Step 1: 检查所有容器健康状态
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 期望输出:
# aitoearn-nginx     Up (healthy)   0.0.0.0:8080->80/tcp, 0.0.0.0:9000->9000/tcp
# aitoearn-web       Up (healthy)
# aitoearn-server    Up (healthy)   (内部端口 3002)
# aitoearn-ai        Up (healthy)   (内部端口 3010)
# aitoearn-mongodb   Up (healthy)   0.0.0.0:27017->27017/tcp
# aitoearn-redis     Up (healthy)   0.0.0.0:6379->6379/tcp
# aitoearn-rustfs    Up (healthy)   0.0.0.0:9001->9001/tcp

# Step 2: 测试 API 连通性
curl http://localhost:8080/api/_nhealth
# 期望: 200 OK

# Step 3: 测试 MongoDB 连接
docker exec aitoearn-mongodb mongosh -u admin -p password --eval "db.runCommand({ping:1})"
# 期望: { ok: 1 }

# Step 4: 记录所有凭据到 .env.development (不提交 Git)
cat > .env.development << 'EOF'
MONGODB_URI=mongodb://admin:password@localhost:27017
REDIS_URL=redis://:password@localhost:6379
JWT_SECRET=change-this-jwt-secret
RUSTFS_ENDPOINT=http://localhost:9000
RUSTFS_ACCESS_KEY=rustfsadmin
RUSTFS_SECRET_KEY=rustfsadmin
API_BASE_URL=http://localhost:8080/api
AI_SERVICE_URL=http://localhost:8080/api/ai
EOF
```

**验收**: 所有 7 个容器 healthy，API 可访问，凭据已记录

⏱️ **1小时**

---

## Phase 1: AiBrand 品牌化改造（第 1-2 周）

### T1.1 — 全局品牌替换

```bash
# 文件路径: project/aitoearn-web/

# Step 1: 全局搜索所有 "aitoearn" 文本引用
cd project/aitoearn-web
grep -r "aitoearn" --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.html" --include="*.scss" --include="*.css" src/ | grep -v node_modules

# Step 2: 分类替换策略
# A) 品牌名称: aitoearn → aibrand (SEO title, description, 用户可见文本)
# B) 包名: @yikart/* 保持不变 (后端共享库)
# C) API 路径: 保持不变 (兼容后端)
# D) 图片/Logo: 替换为 AiBrand Logo

# Step 3: 逐文件替换品牌名 (示例关键文件)
# - src/app/[lng]/layout.tsx → metadata.title 改为 "AiBrand"
# - src/app/i18n/locales/zh-CN/common.json → 翻译 key
# - public/favicon.ico → 替换为 AiBrand favicon
# - public/ 下的 Logo 图片

# Step 4: 更新 package.json 项目元信息
# 已在 package.json 中: "name": "aibrand-web" ✅
# 确认 version, description, author 字段
```

**验收**: `grep -r "aitoearn" src/ | grep -v "aitoearn-backend\|aitoearn-ai\|aitoearn-server"` 无匹配（内部API引用除外）

⏱️ **4小时**

---

### T1.2 — 清理不需要的页面和功能

```bash
# 当前 AiBrand 页面: welcome, accounts, admin, agent-assets, ai-social,
#   auth, brand-promotion, bridge-publish, chat, diagnosis, draft-box,
#   pricing, tasks-history, websit

# MVP 保留:
#  ✅ welcome      → 首页/工作台
#  ✅ draft-box    → 内容创作（核心）
#  ✅ accounts     → 账号管理
#  ✅ pricing      → 定价页（改造为真实定价）
#  ✅ auth         → 登录注册
#  ✅ admin        → 后台管理（精简）
#  ✅ chat         → AI 对话式创作

# MVP 暂隐藏（保留代码，路由不暴露）:
#  ⏸️ agent-assets, ai-social, brand-promotion, bridge-publish
#  ⏸️ diagnosis, tasks-history, websit

# Step 1: 在 src/middleware.ts 添加路由白名单控制
# 将暂不开放的路径注释掉或加 feature flag
```

**验收**: 访问隐藏路径返回 404 或重定向到首页

⏱️ **2小时**

---

### T1.3 — UI 主题色和样式统一

```bash
# Step 1: 定义 AiBrand 品牌色
# 编辑 src/app/var.css
cat >> src/app/var.css << 'EOF'
:root {
  /* AiBrand 品牌色 - 科技蓝 */
  --brand-primary: #2563EB;
  --brand-primary-hover: #1D4ED8;
  --brand-primary-light: #DBEAFE;
  --brand-secondary: #7C3AED;
  --brand-success: #10B981;
  --brand-warning: #F59E0B;
  --brand-danger: #EF4444;
  /* 品牌渐变 */
  --brand-gradient: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
}
EOF

# Step 2: 更新 tailwind.config.ts 中的 primary 色映射
# primary.DEFAULT 指向 var(--brand-primary)

# Step 3: 替换全局 loading/empty/error 状态页的 Logo 和文案
# 文件路径: src/components/ (查找 Loading, Empty, ErrorState 组件)
```

**验收**: 页面主色调变为 AiBrand 蓝紫色系，Logo 统一

⏱️ **3小时**

---

### T1.4 — 国际化精简

```bash
# 当前支持: zh-CN, en, ja, de, fr (5种)
# MVP 阶段: zh-CN + en (2种)

# Step 1: 修改 src/app/i18n/settings.ts
# 将 supportedLngs 从 ['zh-CN', 'en', 'ja', 'de', 'fr']
# 改为 ['zh-CN', 'en']

# Step 2: 修改 src/middleware.ts 语言检测逻辑
# 移除 ja/de/fr 的语言前缀处理

# Step 3: 暂保留翻译文件不删除（代码保留，路由不暴露即可）

# Step 4: 检查中文翻译完整性
# 遍历 src/app/i18n/locales/zh-CN/ 下所有 JSON，检查是否有缺失 key
```

**验收**: 浏览器访问 `/ja`, `/de`, `/fr` 自动重定向到 `/zh-CN`

⏱️ **2小时**

---

### T1.5 — MVP 功能入口整合

```bash
# 目标: 确保 MVP 核心流程可无缝走通
# 流程: 注册 → 登录 → 工作台 → 创建内容 → 绑定账号 → 发布

# Step 1: 验证注册/登录流程
# - 访问 /auth → 注册表单正常
# - 注册后自动登录并跳转到 /welcome

# Step 2: 验证内容创作流程
# - /draft-box → AI 生成文案 → 编辑 → 保存草稿
# - /chat → AI 对话式创作

# Step 3: 验证账号绑定流程
# - /accounts → 添加平台账号 → OAuth 授权（使用 Relay）

# Step 4: 记录流程中遇到的报错
# 修复任何阻塞性问题
```

**验收**: 完成一次完整闭环：注册→创作→发布（哪怕是测试发布）

⏱️ **1天**

---

## Phase 2: 订阅制支付系统（第 2-4 周）

### T2.1 — 数据库：订阅模型设计

```typescript
// 文件: project/aitoearn-backend/libs/common/src/subscription/
// subscription.types.ts

// 订阅计划
interface SubscriptionPlan {
  id: string;            // 'free' | 'pro' | 'enterprise'
  name: string;
  price: number;         // 分 (cents)，free = 0
  interval: 'month' | 'year';
  maxAccounts: number;   // 最大社交账号数
  maxContentPerMonth: number;
  maxPlatforms: number;
  features: string[];    // ['ai_auto_reply', 'analytics', 'rag', ...]
}

// 用户订阅
interface UserSubscription {
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'expired' | 'past_due';
  startedAt: Date;
  expiresAt: Date;
  autoRenew: boolean;
  paymentMethod: 'stripe' | 'alipay' | 'wechat';
  stripeSubscriptionId?: string;
}
```

```bash
# Step 1: 创建 MongoDB 集合
# 在 aitoearn-server 的 core/credits 模块旁边新建 core/subscription

# Step 2: 创建迁移脚本
# scripts/migrations/001-subscription.ts
```

**验收**: MongoDB 中 `subscriptions` 集合 schema 定义完成，可通过 API 查询

⏱️ **3小时**

---

### T2.2 — 后端：订阅 API 模块

```bash
# 文件路径: project/aitoearn-backend/apps/aitoearn-server/src/core/subscription/

# 需要创建的文件:
# ├── subscription.module.ts
# ├── subscription.controller.ts   # GET /api/subscription/plans, POST /api/subscription/subscribe
# ├── subscription.service.ts      # 业务逻辑
# ├── subscription.repository.ts   # 数据访问
# ├── subscription.dto.ts          # Zod 验证
# └── subscription.vo.ts           # 响应封装

# Step 1: 创建订阅模块 (参考现有 credits 模块结构)
mkdir -p apps/aitoearn-server/src/core/subscription

# Step 2: 实现 subscription.dto.ts
cat > apps/aitoearn-server/src/core/subscription/subscription.dto.ts << 'TS'
import { createZodDto } from '@yikart/common';
import { z } from 'zod';

export const SubscribeDtoSchema = z.object({
  planId: z.enum(['pro', 'enterprise']).describe('订阅计划ID'),
  interval: z.enum(['month', 'year']).describe('付费周期'),
  paymentMethod: z.enum(['stripe', 'alipay', 'wechat']).describe('支付方式'),
  returnUrl: z.string().url().optional().describe('支付完成后回跳地址'),
});

export class SubscribeDto extends createZodDto(SubscribeDtoSchema, 'SubscribeDto') {}
TS

# Step 3: 实现 subscription.service.ts 核心逻辑
# - createSubscription(userId, planId, interval) → 创建订阅+生成支付链接
# - checkSubscription(userId) → 返回当前订阅状态和用量
# - checkQuota(userId, action) → 检查是否超出配额
# - handleWebhook(event) → 处理支付回调

# Step 4: 在 AppModule 中注册
# 编辑 apps/aitoearn-server/src/app.module.ts
# 添加: SubscriptionModule
```

**验收**:
```bash
# 1. 获取订阅计划
curl http://localhost:8080/api/subscription/plans
# 返回 [{ id: "free", ... }, { id: "pro", ... }, { id: "enterprise", ... }]

# 2. 创建订阅（需登录）
curl -X POST http://localhost:8080/api/subscription/subscribe \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"planId":"pro","interval":"month","paymentMethod":"stripe"}'
# 返回 { paymentUrl: "https://..." }
```

⏱️ **3天**

---

### T2.3 — 支付网关集成：Stripe

```bash
# Step 1: 安装 Stripe SDK
cd project/aitoearn-backend
pnpm add stripe
pnpm add -D @types/stripe

# Step 2: 创建 libs/payment/stripe/ 共享库
mkdir -p libs/payment/src/stripe

cat > libs/payment/src/stripe/stripe.service.ts << 'TS'
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-06-15',
    });
  }

  async createCheckoutSession(params: {
    customerEmail: string;
    planId: string;
    interval: 'month' | 'year';
    successUrl: string;
    cancelUrl: string;
  }) {
    const priceId = this.getPriceId(params.planId, params.interval);
    return this.stripe.checkout.sessions.create({
      customer_email: params.customerEmail,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { planId: params.planId },
    });
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const event = this.stripe.webhooks.constructEvent(
      rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!
    );
    // 处理 checkout.session.completed, customer.subscription.updated 等事件
    return event;
  }

  private getPriceId(planId: string, interval: string): string {
    // Stripe Dashboard 中创建的价格 ID
    const prices: Record<string, Record<string, string>> = {
      pro: {
        month: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
        year: process.env.STRIPE_PRO_YEARLY_PRICE_ID!,
      },
      enterprise: {
        month: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID!,
        year: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID!,
      },
    };
    return prices[planId][interval];
  }
}
TS

# Step 3: 在 Stripe Dashboard 创建产品和价格
# - Pro 月度: ¥299 → price_pro_monthly
# - Pro 年度: ¥2,999 → price_pro_yearly
# - 企业月度: ¥999 → price_enterprise_monthly
# - 企业年度: ¥9,999 → price_enterprise_yearly

# Step 4: 配置环境变量
# 添加到 .env.development 和 docker-compose.yml
# STRIPE_SECRET_KEY=sk_test_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx
# STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
# STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
# STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
# STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_xxx
```

**验收**: 前端点击订阅按钮 → Stripe Checkout 页面 → 支付成功 → 回调更新订阅状态

⏱️ **2天**

---

### T2.4 — 支付网关集成：支付宝

```bash
# Step 1: 安装支付宝 SDK
cd project/aitoearn-backend
pnpm add alipay-sdk

# Step 2: 创建 libs/payment/src/alipay/alipay.service.ts
# 实现:
# - createOrder(planId) → 生成支付宝支付链接
# - verifyNotify(params) → 验证异步通知签名
# - queryOrder(tradeNo) → 查询支付状态

# Step 3: 注册支付宝开放平台应用
# - 访问 https://open.alipay.com/
# - 创建应用 → 获取 APP_ID
# - 生成密钥对 → 配置公钥
# - 签约: 电脑网站支付、手机网站支付

# Step 4: 环境变量
# ALIPAY_APP_ID=xxx
# ALIPAY_PRIVATE_KEY=xxx
# ALIPAY_PUBLIC_KEY=xxx
# ALIPAY_NOTIFY_URL=https://api.aibrand.cn/api/payment/alipay/notify
```

**验收**: 前端选择支付宝支付 → 跳转支付宝 → 扫码支付 → 回调更新订阅

⏱️ **2天**

---

### T2.5 — 用量配额中间件

```typescript
// 文件: project/aitoearn-backend/libs/common/src/subscription/quota.guard.ts

// 实现一个 NestJS Guard:
// @UseGuards(QuotaGuard)
// @QuotaAction('create_content')  // 声明消耗的配额类型
// 自动检查:
//   1. 用户订阅是否有效
//   2. 本月用量是否超限
//   3. 超限返回 403 { code: 10001, message: "本月配额已用完，请升级订阅" }

// Step 1: 在现有内容创作 API 上加 Guard
// apps/aitoearn-server/src/core/content/content.controller.ts
// apps/aitoearn-ai/src/core/draft-generation/draft-generation.controller.ts

// Step 2: 实现用量统计
// 每次调用内容生成 API 时，在 MongoDB 中记录:
// { userId, action: 'create_content', timestamp, count: 1 }
// 查询: db.quota_usage.aggregate([
//   { $match: { userId, month: '2026-06' } },
//   { $group: { _id: null, total: { $sum: '$count' } } }
// ])
```

**验收**: 免费用户超过月限额后调用 API 返回 403 + 升级引导

⏱️ **2天**

---

### T2.6 — 前端：定价页 + 订阅流程

```bash
# 文件路径: project/aitoearn-web/src/app/[lng]/pricing/

# Step 1: 改造现有 pricing 页面
# 当前已有 pricing 路由，需要替换为真实内容

# 页面需要包含:
# - 3 列定价卡（免费/Pro/企业）
# - 年付/月付切换开关
# - 功能对比表
# - CTA 按钮（免费版 → 开始使用，Pro/企业 → 订阅）

# Step 2: 实现订阅按钮组件
# src/components/SubscribeButton/index.tsx
# - 调用 POST /api/subscription/subscribe
# - 获取 paymentUrl
# - window.location.href 跳转

# Step 3: 实现订阅状态页面
# /settings/billing → 显示当前计划、用量、下次续费日期
# - 升级/降级按钮
# - 取消订阅按钮
# - 发票历史

# Step 4: 用量进度条组件
# src/components/QuotaBar/index.tsx
# 显示 "本月已使用 45/100 条内容"
```

**验收**: 用户可从定价页 → 选择计划 → 支付 → 回到系统看到 Pro 标识

⏱️ **3天**

---

## Phase 3: 落地页与转化漏斗（第 4-5 周）

### T3.1 — 独立落地页

```bash
# 创建独立落地页项目
# 路径: project/aitoearn-web/src/app/[lng]/ (根路由即落地页)
# 或: 使用 Next.js 的 page.tsx 做 A/B

# 落地页分区:
# Hero Section:
#   - 标题: "AI 全域运营，一人顶一个团队"
#   - 副标题: "AI 批量创作 + 多平台一键发布 + 客户互动管理"
#   - CTA: "免费开始" / "预约演示"
#   - 背景: 动态渐变动画

# Social Proof:
#   - 已服务 XXX 位创作者
#   - 累计发布 XXX 条内容
#   - 覆盖 XXX 个平台

# Feature Section:
#   🎨 AI 内容工厂
#   📢 一键多平台发布
#   💬 智能客户互动
#   📊 全域数据洞察

# Pricing Section (复用 T2.6)

# FAQ Section:
#   - 支持哪些平台？
#   - 数据安全吗？
#   - 可以私有化部署吗？（埋点，为 V2 预热）
#   - 如何开始使用？

# Footer:
#   - © 2026 AiBrand
#   - 隐私政策 / 服务条款 / 联系我们

# Step 1: 检查当前落地页
# 访问 http://localhost:6060/zh-CN 看现有首页
# 基于现有 welcome 页改造或重建
```

**验收**: `http://localhost:6060` 呈现完整 Landing Page

⏱️ **3天**

---

### T3.2 — SEO 优化

```bash
# Step 1: 为每个页面添加 Metadata
# 文件: src/app/[lng]/page.tsx
export const metadata: Metadata = {
  title: 'AiBrand - AI 全域运营平台，助力超级个体和中小企业',
  description: 'AI 批量创作 + 多平台一键发布 + 智能客户互动。支持 14 个主流社交平台，让一个人运营出团队的效果。',
  keywords: ['AI内容创作', '多平台发布', '社交媒体管理', '一人公司', 'AI运营工具'],
  openGraph: {
    title: 'AiBrand - AI 全域运营平台',
    description: 'AI 批量创作 + 多平台一键发布 + 智能客户互动',
    url: 'https://aibrand.cn',
    siteName: 'AiBrand',
  },
}

# Step 2: 生成 sitemap.xml
# 创建 src/app/sitemap.ts (Next.js 内置)
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://aibrand.cn', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://aibrand.cn/pricing', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ]
}

# Step 3: 注册百度站长 + Google Search Console
# 验证域名所有权
# 提交 sitemap

# Step 4: 结构化数据 (JSON-LD)
# 添加 Organization / SoftwareApplication schema
```

**验收**: Google 搜索 `site:aibrand.cn` 有正确标题和描述

⏱️ **1天**

---

### T3.3 — 用户引导流程

```bash
# 注册后的新手引导（Onboarding）:

# Step 1: 实现引导步骤组件
# src/components/Onboarding/index.tsx

# 引导流程（3-4步）:
# Step 1: 选择角色
#   - 超级个体 / 一人公司 / 小微企业 / 中型企业
#   - 主要平台（抖音/小红书/B站/...）
#
# Step 2: 内容偏好
#   - 内容类型（图文/短视频/长视频）
#   - 行业领域（美妆/科技/教育/...）
#   - 内容风格（专业/轻松/搞笑/...）
#
# Step 3: 绑定第一个账号
#   - 引导用户完成 OAuth 授权
#   - 支持跳过（稍后绑定）
#
# Step 4: 首次创作
#   - 输入一个主题 → AI 生成示范内容
#   - "太棒了！你已经完成了第一条 AI 内容"

# Step 2: 存储用户偏好到 user profile
# PUT /api/user/profile → { role, platforms, industry, style }
```

**验收**: 新用户注册后自动进入引导流程，完成后跳转工作台

⏱️ **2天**

---

### T3.4 — 基础埋点分析

```bash
# Step 1: 集成 Plausible/Umami（隐私友好的自托管分析）
# 或使用 PostHog（功能更全）

# 推荐: Umami (开源、自托管、轻量)
docker run -d --name umami \
  -p 3100:3000 \
  -e DATABASE_URL=postgresql://... \
  ghcr.io/umami-software/umami:postgresql-latest

# Step 2: 在 Next.js 中注入追踪脚本
# src/app/[lng]/layout.tsx
import Script from 'next/script'
<Script src="https://analytics.aibrand.cn/script.js" data-website-id="xxx" />

# Step 3: 定义关键事件
# - signup_completed    注册完成
# - subscription_started  订阅开始
# - content_created      创建内容
# - platform_connected   绑定平台
# - publish_completed    发布成功

# 在关键按钮/页面添加:
window.umami?.track('signup_completed', { plan: 'free' })
```

**验收**: Umami Dashboard 看到实时访客和事件数据

⏱️ **1天**

---

## Phase 4: 测试、部署与上线（第 6-8 周）

### T4.1 — E2E 测试覆盖核心流程

```bash
# 已有 Playwright 测试框架 ✅

# Step 1: 编写 MVP 核心流程 E2E 测试
# tests/e2e/mvp/

# 测试用例 1: 注册 → 登录 → 工作台
cat > tests/e2e/mvp/auth.spec.ts << 'TS'
import { test, expect } from '@playwright/test';

test('新用户注册流程', async ({ page }) => {
  await page.goto('/zh-CN/auth');
  await page.fill('[data-testid="email-input"]', `test-${Date.now()}@aibrand.cn`);
  await page.fill('[data-testid="password-input"]', 'Test123456');
  await page.click('[data-testid="register-button"]');
  await page.waitForURL('**/welcome');
  await expect(page.locator('[data-testid="onboarding-modal"]')).toBeVisible();
});

test('登录 → AI创作 → 保存草稿', async ({ page }) => {
  await page.goto('/zh-CN/auth');
  // 登录
  await page.fill('[data-testid="email-input"]', 'test@aibrand.cn');
  await page.fill('[data-testid="password-input"]', 'Test123456');
  await page.click('[data-testid="login-button"]');
  // 进入创作
  await page.click('[data-testid="nav-create"]');
  await page.fill('[data-testid="content-topic"]', '618大促活动推广');
  await page.click('[data-testid="generate-button"]');
  // 等待 AI 生成
  await expect(page.locator('[data-testid="generated-content"]')).toBeVisible({ timeout: 30000 });
  // 保存草稿
  await page.click('[data-testid="save-draft"]');
  await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
});
TS

# Step 2: 订阅支付流程测试
# tests/e2e/mvp/subscription.spec.ts
# 使用 Stripe 测试模式

# Step 3: 运行测试
pnpm test:mvp
```

**验收**: 核心流程 E2E 测试全部通过，覆盖率 ≥60%

⏱️ **3天**

---

### T4.2 — 安全加固清单

```bash
# Step 1: 环境变量检查
# 确保以下敏感信息不在代码中:
grep -r "sk-\|api_key\|password\|secret" --include="*.ts" --include="*.tsx" \
  src/ | grep -v "process.env\|.env\|config\." | grep -v node_modules

# Step 2: API 安全
# ✅ JWT 鉴权 (已有)
# ✅ Zod 输入验证 (已有)
# ✅ MongoDB 注入防护 (已有)
# 🆕 API Rate Limiting
# 安装: pnpm add @nestjs/throttler
# 对 /api/auth/* 和 /api/subscription/* 加频率限制

# Step 3: 前端安全
# - CSP Header 配置
# - CORS 限制为 aibrand.cn 及其子域名
# - Cookie: httpOnly + secure + sameSite

# Step 4: 依赖安全检查
pnpm audit
# 修复所有 HIGH 和 CRITICAL 漏洞

# Step 5: HTTPS 配置
# 生产环境 Nginx 配置 SSL (Let's Encrypt)
# 本地开发可用 mkcert
```

**验收**: `pnpm audit` 无 HIGH/CRITICAL；Rate Limiting 生效

⏱️ **2天**

---

### T4.3 — CI/CD 流水线

```yaml
# .github/workflows/deploy.yml

name: Deploy MVP
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test:mvp

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker images
        run: docker compose build
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/aibrand
            docker compose pull
            docker compose up -d --force-recreate
            docker system prune -f
```

**验收**: `git push main` → 自动测试 → 自动部署

⏱️ **2天**

---

### T4.4 — 生产环境部署

```bash
# Step 1: 购买云服务器
# 推荐: 阿里云 ECS / 腾讯云 CVM
# 配置: 4核8G / 100G SSD / 5Mbps带宽 / Ubuntu 22.04
# 预估月费: ¥300-500

# Step 2: 域名和 DNS
# aibrand.cn → 服务器 IP
# api.aibrand.cn → 服务器 IP
# *.aibrand.cn → 服务器 IP (白标功能预留)

# Step 3: 服务器初始化
ssh root@<server-ip> << 'EOF'
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Nginx (宿主机，作为 SSL 终端)
apt update && apt install -y nginx certbot python3-certbot-nginx

# 配置防火墙
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable

# 创建部署目录
mkdir -p /opt/aibrand
EOF

# Step 4: 生产环境 docker-compose.prod.yml
# 差异:
# - 不暴露 MongoDB/Redis 端口到公网
# - Nginx 监听 80/443，配置 SSL
# - 环境变量使用强密码（生成随机值）
# - 日志持久化到宿主机

# Step 5: SSL 证书
certbot --nginx -d aibrand.cn -d api.aibrand.cn

# Step 6: 部署
scp -r ./* root@<server-ip>:/opt/aibrand/
ssh root@<server-ip> "cd /opt/aibrand && docker compose -f docker-compose.prod.yml up -d"

# Step 7: 健康检查
curl https://aibrand.cn/api/_nhealth  # 200 OK
curl https://aibrand.cn               # 200 OK + 落地页
```

**验收**: 浏览器访问 `https://aibrand.cn` 正常，SSL 有效

⏱️ **2天**

---

### T4.5 — 上线 Checklist

```
□ 域名 DNS 解析生效
□ SSL 证书有效 (https://)
□ 注册流程可用（测试账号注册）
□ 内容创作功能正常（AI 生成后保存草稿）
□ 支付流程可用（Stripe 测试模式，1元测试订阅）
□ 订阅状态正确（支付后用户自动升级）
□ 用量配额生效（免费版超限后拦截）
□ 错误页面友好（404/500 有自定义页面）
□ 移动端响应式正常
□ 页面加载速度 < 3秒 (Lighthouse ≥ 80)
□ 百度/Google 站长验证
□ 隐私政策 + 服务条款页面上线
□ 备份策略就位（MongoDB 每日自动备份）
□ 监控告警配置（服务器 CPU/内存/磁盘）
```

⏱️ **1天**

---

## 时间汇总

| Phase | 内容 | 预估工时 |
|-------|------|----------|
| **Phase 0** | 环境搭建 | 2.5小时 |
| **Phase 1** | 品牌化改造 | 2.5天 |
| **Phase 2** | 订阅支付系统 | 12天 |
| **Phase 3** | 落地页与转化 | 7天 |
| **Phase 4** | 测试部署上线 | 10天 |
| **合计** | **8 周 (约 32 工作日)** | |

---

## 依赖关系

```
Phase 0 (环境) ─────────────────────────────────────────────┐
    ↓                                                        │
Phase 1 (品牌) ──────────────────────────────────────────┐  │
    ↓                                                    │  │
Phase 2 (支付) ──── T2.1(模型) → T2.2(API) ──┬── T2.3(Stripe) │
                         │                    ├── T2.4(支付宝) │
                         ↓                    │               │
                     T2.5(配额) ←─────────────┘               │
                         ↓                                    │
                     T2.6(前端订阅)                            │
    ↓                                                        │
Phase 3 (落地页) ── T3.1 → T3.2 → T3.3 → T3.4               │
    ↓                                                        │
Phase 4 (上线) ── T4.1 → T4.2 → T4.3 → T4.4 → T4.5 ←───────┘
```

---

## 风险提示

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Node 24→20 降级不兼容 | 中 | 高 | 尽早做 T0.1，遇到不兼容用 Docker 开发 |
| Stripe/支付宝审核慢 | 高 | 中 | 第 2 周就提交审核，同时开发其他模块 |
| OAuth Relay 不稳定 | 低 | 高 | 保留 AiToEarn 官方 Relay 作为备选 |
| MongoDB 副本集单点故障 | 低 | 高 | 生产环境配置自动备份 + 告警 |
