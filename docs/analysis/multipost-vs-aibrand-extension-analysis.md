# MultiPost vs AiBrand Extension — 深度对比与整合战略

> 分析日期: 2026-06-05 | 分析师: Claude Code | 状态: 战略建议

---

## 一、两插件全维度对比

### 1.1 基础信息

| 维度 | MultiPost-Extension | AiBrand Extension |
|------|--------------------|--------------------|
| **GitHub** | [leaperone/MultiPost-Extension](https://github.com/leaperone/MultiPost-Extension) | 闭源 (CRX 分发) |
| **Stars** | ⭐ 1,900+ | N/A |
| **许可证** | Apache 2.0 ✅ | 闭源 |
| **框架** | Plasmo (Manifest V3) | 未知 (二进制分发) |
| **语言** | React 18 + TypeScript 5 | 未知 |
| **安装渠道** | Chrome Web Store / Edge Add-ons / GitHub Releases | Chrome Web Store / 阿里云 OSS CRX |
| **最新版本** | v1.4.1 (2026-05) | 未知 |
| **社区** | 腾讯频道 + Discord + 多语言文档 | 无公开社区 |

### 1.2 平台覆盖对比

| 类别 | MultiPost | AiBrand 自有扩展 | AiBrand 后端 API |
|------|:---------:|:---------------:|:---------------:|
| **中文内容平台** ||||
| 知乎 | ✅ article | ❌ | ❌ |
| 微信公众号 | ✅ article | ❌ | ✅ |
| CSDN | ✅ article | ❌ | ❌ |
| 掘金 | ✅ article | ❌ | ❌ |
| 简书 | ✅ article | ❌ | ❌ |
| 百家号 | ✅ article | ❌ | ❌ |
| 今日头条 | ✅ article | ❌ | ❌ |
| 雪球 | ✅ article | ❌ | ❌ |
| 小红书 | ✅ dynamic | ✅ **直接API+签名** | ❌ |
| 微博 | ✅ dynamic | ❌ | ❌ |
| 豆瓣 | ✅ dynamic | ❌ | ❌ |
| 抖音/TikTok CN | ✅ video | ✅ **浏览器自动化** | ✅ OAuth |
| Bilibili | ✅ video | ❌ | ✅ OAuth |
| 快手 | ✅ video | ❌ | ✅ OAuth |
| 微信视频号 | ✅ video | ❌ | ❌ |
| 得物 | ✅ | ❌ | ❌ |
| 企鹅号 | ✅ | ❌ | ❌ |
| **国际平台** ||||
| X/Twitter | ✅ dynamic | ❌ | ✅ OAuth |
| YouTube | ✅ video | ❌ | ✅ OAuth |
| Instagram | ✅ | ❌ | ✅ OAuth |
| LinkedIn | ✅ dynamic | ❌ | ✅ OAuth |
| Facebook | ✅ dynamic | ❌ | ✅ OAuth |
| TikTok | ✅ video | ❌ | ✅ OAuth |
| Reddit | ✅ dynamic | ❌ | ❌ |
| Threads | ✅ dynamic | ❌ | ✅ OAuth |
| Bluesky | ✅ dynamic | ❌ | ❌ |
| Pinterest | ❌ | ❌ | ✅ OAuth |
| WordPress | ✅ article | ❌ | ❌ |
| Substack | ✅ article | ❌ | ❌ |
| Medium | ✅ article | ❌ | ❌ |
| Dev.to | ✅ article | ❌ | ❌ |
| Hashnode | ✅ article | ❌ | ❌ |
| GitHub | ✅ | ❌ | ❌ |
| StackOverflow | ✅ | ❌ | ❌ |
| **Google Business** | ❌ | ❌ | ✅ OAuth |
| **汇总** | **~30 平台** | **2 平台** | **14 平台** |

### 1.3 核心能力对比

| 能力维度 | MultiPost | AiBrand 扩展 | 差距评估 |
|---------|-----------|-------------|---------|
| **发布** ||||
| 图文发布 | ✅ 全部30+平台 | ✅ 小红书+抖音 | MultiPost 碾压 |
| 视频发布 | ✅ 多平台 | ⚠️ 有限 | MultiPost 碾压 |
| 长文章发布 | ✅ 10+平台 | ❌ | MultiPost 独有 |
| 播客发布 | ✅ | ❌ | MultiPost 独有 |
| 自动格式化 | ✅ 平台自适应 | ❌ | MultiPost 独有 |
| 定时发布 | ✅ | ❌ | MultiPost 独有 |
| **互动** ||||
| 点赞/收藏 | ❌ | ✅ 小红书+抖音 | AiBrand 独有 |
| 评论/回复 | ❌ | ✅ 小红书+抖音 | AiBrand 独有 |
| 私信 | ❌ | ✅ 抖音 | AiBrand 独有 |
| Feed 获取 | ❌ | ✅ 小红书+抖音 | AiBrand 独有 |
| 作品详情 | ❌ | ✅ 小红书+抖音 | AiBrand 独有 |
| **AI 能力** ||||
| AI 绘图 | ✅ | ❌ | MultiPost 独有 |
| AI 海报 | ✅ | ❌ | MultiPost 独有 |
| AI 内容生成 | ❌ | ✅ (AiBrand后台) | 互补 |
| **API/集成** ||||
| Web App 集成 API | ✅ postMessage (9 actions) | ✅ window.AiBrandPlugin | 相当 |
| RESTful API | ✅ | ❌ | MultiPost 独有 |
| Trusted Domain | ✅ 白名单+通配符 | ❌ | MultiPost 更安全 |
| **数据** ||||
| 发布追踪 | ✅ 阅读/点赞/评论 | ⚠️ 任务状态 | MultiPost 更强 |
| 数据看板 | ✅ | ❌ | MultiPost 独有 |
| **用户体验** ||||
| 扩展弹窗 | ✅ 完整 UI | ❌ (侧边栏集成到Web) | 互补 |
| 多语言 | ✅ 中/英/日/法/韩 | ❌ | MultiPost 更强 |
| 自动关闭标签 | ✅ | ❌ | MultiPost 独有 |

---

## 二、技术架构深度对比

### 2.1 MultiPost 架构

```
┌─────────────────────────────────────────────────────────┐
│                  Background Service Worker               │
│          (Message Router + Tab Orchestrator)             │
│          chrome.runtime.onMessageExternal()  ← REST API  │
│          window.addEventListener("message") ← Web 集成   │
└────┬──────┬──────┬──────────┬──────────┬────────────────┘
     │      │      │          │          │
┌────▼──┐ ┌▼────┐ ┌▼───────┐ ┌▼────────┐ ┌▼────────────┐
│Popup  │ │Side │ │Content │ │Platform │ │Account       │
│UI     │ │Panel│ │Input   │ │Registry │ │Management    │
│       │ │     │ │Tabs    │ │(infoMap)│ │(16 platforms)│
└───────┘ └─────┘ └────────┘ └─────────┘ └──────────────┘
```

**核心机制 — DOM 注入自动化**：
```
1. 用户在 Web App 中触发发布
2. Web App 通过 postMessage 发送 MUTLIPOST_EXTENSION_PUBLISH
3. Background SW 接收消息，验证 Trusted Domain
4. 为每个目标平台打开 injectUrl 标签页
5. Content Script 注入 injectFunction 到目标页面
6. injectFunction 操作 DOM：填充标题、正文、上传图片/视频、点击发布按钮
7. 监控发布结果，自动关闭标签页
```

**优势**：
- 不需要平台 API Key，利用浏览器已登录 Session
- 30+ 平台共用一套消息协议
- 注册制平台插件，新平台只需添加 PlatformInfo 对象

**劣势**：
- 浏览器必须保持打开（不能服务器端运行）
- DOM 操作依赖页面结构，平台改版会导致失效
- 上传大文件时性能瓶颈
- 无法深度互动（只能发布，不能回复评论等）

### 2.2 AiBrand 扩展架构

```
┌────────────────────────────────────────────────────────┐
│              AiBrand 扩展 (二进制闭源)                    │
│              window.AiBrandPlugin                      │
├────────────────────────────────────────────────────────┤
│  小红书模块                    │  抖音模块               │
│  ┌──────────────────────┐    │  ┌──────────────────┐  │
│  │ API 代理 (请求签名)    │    │  │ 浏览器自动化      │  │
│  │ - 原生 API 调用       │    │  │ - 页面打开        │  │
│  │ - 请求头伪造          │    │  │ - DOM 操作        │  │
│  │ - 反爬对抗            │    │  │ - 模拟点击        │  │
│  │ - 高速大批量          │    │  │ - 反检测慢速      │  │
│  └──────────────────────┘    │  └──────────────────┘  │
└────────────────────────────────────────────────────────┘
```

**优势**：
- 小红书 API 代理是独有的核心壁垒（请求签名）
- 抖音浏览器自动化可深度互动（点赞、收藏、评论、私信）
- 与 AiBrand 平台深度耦合，账户+数据互通

**劣势**：
- 仅支持 2 个平台
- 闭源不可控
- 无社区维护，更新依赖原团队

### 2.3 AiBrand 后端 OAuth API

```
┌─────────────────────────────────────────────────────────┐
│                    AiBrand 后端 (NestJS)                  │
│                   Publishing Service                     │
├─────────────────────────────────────────────────────────┤
│  Queue System (Bull/BullMQ)                             │
│  ├── Immediate Publish Consumer                         │
│  ├── Finalize Consumer                                  │
│  └── Post-Publish Update Consumer                       │
├─────────────────────────────────────────────────────────┤
│  Provider Services (14 platforms)                       │
│  ├── douyin.service.ts    ├── tiktok.service.ts         │
│  ├── youtube.service.ts   ├── facebook.service.ts        │
│  ├── instgram.service.ts  ├── twitter.service.ts         │
│  ├── linkedin.service.ts  ├── pinterest.service.ts       │
│  ├── threads.service.ts   ├── bilibili.service.ts        │
│  ├── kwai.service.ts      ├── wx-gzh.service.ts          │
│  └── google-business.service.ts                          │
├─────────────────────────────────────────────────────────┤
│  OAuth Token 管理 (ChannelAccountService)                 │
│  - AES-256 加密存储                                       │
│  - 自动 Token 刷新                                        │
│  - OAuth Relay 自建服务器 (localhost:4011)                │
└─────────────────────────────────────────────────────────┘
```

**优势**：
- 服务器端运行，不依赖浏览器
- 适合定时发布、批量发布
- OAuth 官方 API，稳定可靠
- 14 个平台，覆盖面广

**劣势**：
- 依赖平台 OAuth 审核（每个平台审批 1-4 周）
- 平台 API 限制（频率、内容类型、功能受限）
- 需要用户完成 OAuth 授权流程

---

## 三、现有 AiBrand → MultiPost 桥接的不足

当前 `extensionBridge.ts` 的实现存在以下问题：

### 3.1 通信协议不对
```typescript
// 当前代码使用 chrome.runtime.sendMessage 直接发送
chrome.runtime.sendMessage({ type: 'MUTLIPOST_PUBLISH', data: publishData })
```
MultiPost 实际使用的是 **`window.postMessage`** 协议，而不是 `chrome.runtime.sendMessage`。当前实现其实无法与 MultiPost 通信。

### 3.2 未使用 MultiPost 的完整 API
MultiPost 提供了 9 个 action，当前只尝试用了一个（还用法不对）：

| MultiPost API Action | 用途 | 当前状态 |
|---------------------|------|---------|
| `MUTLIPOST_EXTENSION_CHECK_SERVICE_STATUS` | 检测扩展是否安装 | ❌ 未使用 |
| `MUTLIPOST_EXTENSION_PUBLISH` | 打开发布弹窗 | ❌ 用法错误 |
| `MUTLIPOST_EXTENSION_PLATFORMS` | 获取可用平台列表 | ❌ 未使用 |
| `MUTLIPOST_EXTENSION_GET_ACCOUNT_INFOS` | 获取已登录账号 | ❌ 未使用 |
| `MUTLIPOST_EXTENSION_OPEN_OPTIONS` | 打开设置页 | ❌ 未使用 |
| `MUTLIPOST_EXTENSION_REFRESH_ACCOUNT_INFOS` | 刷新账号状态 | ❌ 未使用 |
| `MUTLIPOST_EXTENSION_PUBLISH_REQUEST_SYNC_DATA` | 获取当前同步数据 | ❌ 未使用 |
| `MUTLIPOST_EXTENSION_PUBLISH_NOW` | 执行多平台发布 | ❌ 未使用 |
| `MUTLIPOST_EXTENSION_REQUEST_TRUST_DOMAIN` | 请求信任域名 | ❌ 未使用 |

### 3.3 Trusted Domain 未配置
MultiPost 需要将 AiBrand 的域名加入 Trusted Domain 白名单，否则所有请求都会被返回 403。当前没有任何请求信任域名的流程。

### 3.4 平台 ID 映射是硬编码的
当前 `multipostId` 如 `article-zhihu` 是猜测的，可能跟 MultiPost 实际内部的平台 ID 不匹配。

### 3.5 无账号状态同步
MultiPost 可以返回各平台的登录状态，但 AiBrand 没有利用这个能力同步用户的平台账号信息。

---

## 四、整合战略方案

### 4.1 三层发布架构

```
                        ┌─────────────────────────┐
                        │   AiBrand 统一发布层      │
                        │   一站式选择平台+内容     │
                        │   + AI 内容生成          │
                        │   + 发布策略推荐         │
                        └───────────┬─────────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
        ┌─────────▼──────┐  ┌──────▼──────┐  ┌──────▼──────────┐
        │ Tier 1: 深度集成 │  │Tier 2: 广度 │  │Tier 3: 后台稳定 │
        │ AiBrand 自有扩展│  │MultiPost扩展│  │ 后端 OAuth API  │
        ├────────────────┤  ├────────────┤  ├────────────────┤
        │ 平台: 小红书+抖音│  │ 平台: 30+  │  │ 平台: 14       │
        │ 发布: ✅        │  │ 发布: ✅   │  │ 发布: ✅       │
        │ 互动: ✅        │  │ 互动: ❌   │  │ 互动: ⚠️有限   │
        │ 数据: ✅        │  │ 数据: ✅   │  │ 数据: ✅       │
        │ 场景:           │  │ 场景:      │  │ 场景:          │
        │ - 深度运营      │  │ - 广撒网   │  │ - 定时发布     │
        │ - 互动管理      │  │ - 长尾平台 │  │ - 批量发布     │
        │ - 数据采集      │  │ - 快速覆盖 │  │ - 无需浏览器   │
        └────────────────┘  └────────────┘  └────────────────┘
```

### 4.2 各层路由策略

内容发布时按以下决策树选择发布通道：

```
输入: (目标平台, 内容类型, 发布方式)
│
├─ 平台 = 小红书 OR 抖音?
│  ├─ 需要互动功能 (点赞/评论/私信)?
│  │  └─ → Tier 1: AiBrand 自有扩展 (唯一支持深度互动)
│  └─ 仅发布?
│     ├─ 已连接 OAuth → Tier 3: 后端 API (最稳定)
│     └─ 未连接 OAuth → Tier 1: AiBrand 自有扩展
│
├─ 平台 有后端 OAuth Provider (YouTube/Facebook/Instagram/TikTok/LinkedIn/Twitter...)?
│  ├─ 用户已 OAuth 授权?
│  │  ├─ 定时发布 → Tier 3: 后端 API (唯一支持无浏览器定时)
│  │  └─ 即时发布 → Tier 3: 后端 API (更稳定) 或 Tier 2: MultiPost (更快)
│  └─ 未授权 → Tier 2: MultiPost (利用浏览器Session)
│
└─ 平台 仅 MultiPost 支持 (知乎/CSDN/掘金/简书/微博/豆瓣/Reddit/Bluesky...)?
   └─ → Tier 2: MultiPost (唯一选择)
```

### 4.3 具体整合方案

#### Phase 1: 修复 MultiPost 桥接 (1-2天)

```typescript
// 修复后的通信协议 — 使用正确的 postMessage 协议

// 1. 检测扩展
async function detectMultiPostExtension(): Promise<boolean> {
  return new Promise((resolve) => {
    const traceId = crypto.randomUUID();
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'response' && event.data?.traceId === traceId) {
        window.removeEventListener('message', handler);
        resolve(event.data?.code === 0);
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({
      type: 'request',
      traceId,
      action: 'MULTIPOST_EXTENSION_CHECK_SERVICE_STATUS',
      data: {},
    }, '*');
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(false);
    }, 2000);
  });
}

// 2. 获取平台列表（动态，不再硬编码）
async function getMultiPostPlatforms(): Promise<PlatformInfo[]> {
  const traceId = crypto.randomUUID();
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'response' && event.data?.traceId === traceId) {
        window.removeEventListener('message', handler);
        resolve(event.data?.data?.platforms || []);
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({
      type: 'request',
      traceId,
      action: 'MULTIPOST_EXTENSION_PLATFORMS',
      data: {},
    }, '*');
    setTimeout(() => { window.removeEventListener('message', handler); resolve([]); }, 5000);
  });
}

// 3. 请求信任域名
async function requestTrustDomain(): Promise<boolean> {
  const traceId = crypto.randomUUID();
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'response' && event.data?.traceId === traceId) {
        window.removeEventListener('message', handler);
        resolve(event.data?.code === 0);
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({
      type: 'request',
      traceId,
      action: 'MULTIPOST_EXTENSION_REQUEST_TRUST_DOMAIN',
      data: { domain: window.location.hostname },
    }, '*');
    setTimeout(() => { window.removeEventListener('message', handler); resolve(false); }, 10000);
  });
}

// 4. 同步账号信息
async function getMultiPostAccounts(): Promise<AccountInfo[]> {
  const traceId = crypto.randomUUID();
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'response' && event.data?.traceId === traceId) {
        window.removeEventListener('message', handler);
        resolve(event.data?.data?.accountInfo || []);
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({
      type: 'request',
      traceId,
      action: 'MULTIPOST_EXTENSION_GET_ACCOUNT_INFOS',
      data: {},
    }, '*');
    setTimeout(() => { window.removeEventListener('message', handler); resolve([]); }, 5000);
  });
}

// 5. 执行发布
async function publishViaMultiPost(syncData: SyncData): Promise<PublishResult> {
  const traceId = crypto.randomUUID();
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'response' && event.data?.traceId === traceId) {
        window.removeEventListener('message', handler);
        resolve({
          success: event.data?.code === 0,
          data: event.data?.data,
          message: event.data?.message,
        });
      }
    };
    window.addEventListener('message', handler);
    window.postMessage({
      type: 'request',
      traceId,
      action: 'MULTIPOST_EXTENSION_PUBLISH_NOW',
      data: syncData,
    }, '*');
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve({ success: false, message: '发布超时' });
    }, 120000); // 2分钟超时，发布可能需要更长时间
  });
}
```

#### Phase 2: 统一发布中心 (3-5天)

将三个发布通道整合到一个统一界面：

```typescript
// Unified Publishing Router
interface UnifiedPublishRouter {
  // 为给定平台列表选择最优发布通道
  route(platforms: PlatformTarget[]): Map<PublishChannel, PlatformTarget[]>;
  
  // 执行发布
  publish(targets: PlatformTarget[], content: PublishContent): Promise<UnifiedPublishResult>;
}

enum PublishChannel {
  AIBRAND_EXTENSION = 'aibrand_extension',   // Tier 1: 深度互动
  MULTIPOST_EXTENSION = 'multipost_extension', // Tier 2: 广度覆盖
  BACKEND_OAUTH = 'backend_oauth',            // Tier 3: 稳定后台
}
```

**统一发布 UI 设计**：

```
┌─────────────────────────────────────────────────────────┐
│  📤 内容发布                                    [定时] [发布] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📝 内容                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 标题: _________________________________         │   │
│  │                                                 │   │
│  │ 正文: _________________________________         │   │
│  │ _________________________________               │   │
│  │                                                 │   │
│  │ 📷 图片: [拖拽上传]  📹 视频: [拖拽上传]         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🎯 选择平台 (28个平台可用)                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🟢 深度通道 (2)             推荐用于日常运营       │   │
│  │ [✓ 小红书] [✓ 抖音]          ← 互动+数据全支持    │   │
│  │                                                 │   │
│  │ 🔵 稳定通道 (10)            已OAuth授权，服务器直连│   │
│  │ [✓ B站] [✓ YouTube] [✓ TikTok] [✓ Facebook]    │   │
│  │ [✓ Instagram] [✓ X/Twitter] [✓ LinkedIn] ...   │   │
│  │                                                 │   │
│  │ 🟡 扩展通道 (18)            通过浏览器扩展发布     │   │
│  │ [✓ 知乎] [✓ 微博] [✓ CSDN] [✓ 掘金] [✓ 简书]   │   │
│  │ [✓ 百家号] [✓ 头条] [✓ Reddit] [✓ Bluesky] ... │   │
│  │                          [安装 MultiPost 扩展 ↗] │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🤖 AI 优化                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 💡 建议：知乎标题应≤30字、微博需#话题标签         │   │
│  │ 💡 小红书图片建议 3:4 比例，当前图片将自动裁剪     │   │
│  │ [应用所有优化]  [逐条确认]                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  📊 发布预览                                           │
│  ┌──────────┬──────────┬──────────┬────────────────┐   │
│  │ 小红书    │ 知乎     │ YouTube  │ X/Twitter     │   │
│  │ (深度通道) │ (扩展通道) │ (稳定通道) │ (稳定通道)    │   │
│  │ ✅ 已就绪  │ ⚠️ 需安装 │ ✅ 已就绪  │ ⚠️ Token过期  │   │
│  └──────────┴──────────┴──────────┴────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Phase 3: 平台账号统一管理 (2-3天)

将三个通道的账号状态统一到一个视图：

```
┌─────────────────────────────────────────────────────────┐
│  🔗 平台账号管理                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  连接方式: [全部] [OAuth授权] [浏览器Session] [扩展]     │
│                                                         │
│  ┌──────────┬──────────┬──────────┬────────────────┐   │
│  │ 小红书    │ 抖音     │ 知乎     │ 微博           │   │
│  │ 🟢 在线   │ 🟢 在线   │ 🟡 待登录  │ 🔴 未连接     │   │
│  │ AiBrand扩展│ AiBrand扩展│ MultiPost │ -             │   │
│  │ 深度互动✅ │ 深度互动✅ │ 仅发布⚠️  │               │   │
│  └──────────┴──────────┴──────────┴────────────────┘   │
│  ┌──────────┬──────────┬──────────┬────────────────┐   │
│  │ YouTube  │ Facebook │ Bilibili │ LinkedIn       │   │
│  │ 🟢 已授权 │ 🟢 已授权  │ 🟢 已授权 │ ⚠️ Token将过期│   │
│  │ OAuth    │ OAuth    │ OAuth    │ OAuth          │   │
│  │ API发布✅ │ API发布✅ │ API发布✅ │ 需重新授权     │   │
│  └──────────┴──────────┴──────────┴────────────────┘   │
│                                                         │
│  [一键登录所有Session平台 ↗]  [批量OAuth授权 ↗]         │
└─────────────────────────────────────────────────────────┘
```

#### Phase 4: 内容自动适配引擎 (3-5天)

不同平台有不同内容格式要求，利用 AI 自动适配：

```
输入: 一篇通用内容
│
├─ 知乎适配:
│  ├─ 标题压缩至 ≤30 字
│  ├─ 添加知乎话题标签
│  └─ Markdown → 知乎富文本
│
├─ 小红书适配:
│  ├─ 拆分为标题 + 正文 (≤1000字)
│  ├─ 图片裁剪为 3:4
│  ├─ 生成 #话题标签
│  └─ 添加表情符号
│
├─ YouTube 适配:
│  ├─ 生成视频标题 (≤100字符)
│  ├─ 生成视频描述 (含链接)
│  ├─ 生成 Tags (≤500字符)
│  └─ 生成缩略图文案
│
├─ Twitter/X 适配:
│  ├─ 压缩至 ≤280 字符
│  ├─ 生成 Thread (多条推文)
│  └─ 添加 Hashtag
│
└─ LinkedIn 适配:
   ├─ 专业语气转换
   ├─ 添加行业标签
   └─ 生成多语言版本
```

---

## 五、功能完整性提升路线图

### 当前 AiBrand 发布能力评分

| 维度 | 当前 | 目标 | 提升 |
|------|:---:|:---:|:---:|
| 平台覆盖 | 16 (2+14) | 30+ | +87% |
| 内容形式 | 图文、视频 | +长文章、播客 | +100% |
| 互动管理 | 2平台深度 | 全部平台基础互动 | 质的提升 |
| 数据追踪 | 基础任务状态 | 全平台数据分析 | 质的提升 |
| AI 辅助 | 内容生成 | +格式适配+策略推荐 | 质的提升 |
| 用户门槛 | 需OAuth注册 | 浏览器Session即用 | -90% |

### 实施优先级

```
Phase 1 (1-2天) ─── 修复 MultiPost 桥接
│  ├─ 使用正确的 postMessage 协议
│  ├─ Trusted Domain 配置
│  ├─ 动态获取平台列表
│  └─ 账号状态同步
│
Phase 2 (3-5天) ─── 统一发布中心
│  ├─ 三通道路由引擎
│  ├─ 统一发布 UI
│  ├─ 平台状态实时检测
│  └─ 发布进度聚合
│
Phase 3 (2-3天) ─── 平台账号统一管理
│  ├─ 三通道账号聚合视图
│  ├─ 一键登录浏览器Session平台
│  ├─ Token 状态监控 & 自动续期
│  └─ 平台健康评分
│
Phase 4 (3-5天) ─── AI 内容自动适配
│  ├─ 平台格式规则库
│  ├─ AI 适配引擎 (Dify RAG + LLM)
│  ├─ 预览对比 (原版 vs 适配版)
│  └─ 批量适配 & 人工微调
│
Phase 5 (3-5天) ─── 数据分析与策略
│  ├─ 跨平台数据聚合
│  ├─ 最佳发布时间推荐
│  ├─ 内容表现对比
│  └─ 竞品分析
│
Phase 6 (2-3天) ─── 扩展自建 (可选长期)
│  ├─ Fork MultiPost (Apache 2.0)
│  ├─ 深度定制为 AiBrand Extension
│  ├─ 合并 AiBrand 独有互动能力
│  └─ 统一为一个扩展
```

---

## 六、关键决策建议

### 决策 1: 是否 Fork MultiPost？

**推荐**: **短期不 Fork，长期可以**

理由：
- MultiPost 更新活跃（2026-05 v1.4.1），Fork 会产生维护负担
- 通过 Extension API 集成已经满足需求
- 当 MultiPost 无法满足定制需求时再 Fork

**触发 Fork 的条件**：
- 需要深度定制发布流程（如 AiBrand 品牌 UI 嵌入）
- 需要添加互动功能到 MultiPost 平台支持
- MultiPost 停止维护

### 决策 2: AiBrand 自有扩展的去留？

**推荐**: **保留并聚焦差异化**

AiBrand 扩展的核心价值在于：
- **小红书 API 代理**（请求签名）— 这是技术壁垒
- **抖音深度互动**（批量点赞/评论/私信）— MultiPost 做不到

这两个能力是 MultiPost 无法替代的。应将 AiBrand 扩展定位为「深度运营工具」，而非「通用发布工具」。

### 决策 3: 用户体验的北极星指标

```
用户从"想发布内容"到"发布完成"的步骤数：
- 当前: ~15 步 (打开各平台 → 登录 → 复制粘贴 → 手动适配格式 → 逐个发布)
- Phase 2 后: ~5 步 (AiBrand 选择平台 → AI 适配 → 一键发布)
- 最终目标: ~3 步 (AI 建议平台 → 确认 → 发布)
```

---

## 七、对 AiBrand MVP 的具体影响

### 立即可做 (本周)

1. **修复 extensionBridge.ts** — 使用正确的 `window.postMessage` 协议对接 MultiPost（10 行代码改动）
2. **在 AiBrand Web 中引导用户安装 MultiPost** — 作为「扩展通道」的补充发布方式
3. **动态获取 MultiPost 平台列表** — 不再硬编码 20 个平台 ID

### 本月可交付

1. **统一发布中心** — 三个通道整合到一个界面
2. **账号统一视图** — OAuth + Session + Extension 三态显示
3. **AI 内容适配 v1** — 至少支持标题/格式自动转换

### 对产品竞争力的提升

| 维度 | 当前 AiBrand | 整合后 AiBrand |
|------|-------------|---------------|
| 平台数量 | 16 | 30+ |
| 内容类型 | 2 (图文、视频) | 4 (+长文章、播客) |
| 互动能力 | 2 平台深度 | 2 深度 + 30 发布 |
| 用户接入门槛 | OAuth 注册 (周级) | 浏览器 Session (秒级) |
| AI 辅助深度 | 内容生成 | 生成+适配+策略 |
| vs 竞品 (Eagle/新榜/蚁小二) | 差异化不足 | 全面超越 |

---

## 八、参考链接

- [MultiPost-Extension GitHub](https://github.com/leaperone/MultiPost-Extension)
- [MultiPost 官网](https://multipost.app)
- [MultiPost 开发者文档](https://docs.multipost.app)
- [AiToEarn (AiBrand 上游)](https://github.com/yikart/AiToEarn)

---

> 下一步：确认整合优先级 → 开始 Phase 1 代码实施
