# AiBrand 全域渠道运营中心 — 最终整合方案

> 2026-06-08 | 整合自：产品PRD（小豆）+ 技术方案（DS）+ 现有架构分析

---

## 一、产品定位

面向内容创作者、品牌运营、电商商家的一站式全域社交账号运营中枢。
打通多平台，实现**账号聚合 → 一键分发 → 数据监控 → AI 互动 → 客户跟进**全链路。

**MVP 切入点**：一个 B站 UP主，用 AiBrand 把视频一键发到抖音和 YouTube，在统一后台看三个平台的播放量和评论，用预设话术回复所有评论。

---

## 二、现有基础（不需要从零开发）

| 能力 | 现有实现 | 状态 |
|------|---------|------|
| Extension 账号检测 | v2 `getAllAccountInfo()` — 15+ 平台 Cookie 检测 | ✅ |
| Extension → 前端通信 | `window.AiBrandPlugin` (借鉴 AiToEarn) | ✅ |
| 质检把关 | QualityGate — 内容/GEO/合规/原创度 4维度 | ✅ |
| 一键发布 | TaskExecutor — 并行多平台 + 重试 | ✅ |
| 发布反馈 | PreSendConfirm + PostSendFeedback | ✅ |
| WebSocket 通信 | WebSocketManager — 实时推送 | ✅ |
| 后端数据模型 | `ChannelAccountDataCube` (粉丝/播放/评论/点赞/分享/收藏) | ✅ |
| AI 评论回复 | `EngagementService` + AI 生成 | ✅ |
| 评论互动 | `InteractController` (回复/删除) | ✅ |
| 看板数据 | `DashboardService` | ✅ |

---

## 三、技术路径选择

### 账号授权：Extension Cookie 检测为主，OAuth 为辅

| 平台类型 | 授权方式 | 原因 |
|----------|---------|------|
| 微博/小红书/B站/知乎 | **Extension Cookie** | OAuth 不向第三方开放 |
| 抖音/快手 | 平台 OAuth（已有） | 开放平台支持 |
| YouTube/TikTok | Google/Facebook OAuth | 国际标准 |

> DS 方案说"主流平台均提供 OAuth"——**这个判断错误**。国内多数平台 OAuth 审核严格，Cookie 检测是唯一现实路径。我们在当前项目中已验证通过。

### AI 互动：渐进式引入

| 阶段 | 能力 | 风险 |
|------|------|------|
| V1.0 | 关键词匹配 + 预设模板回复 | 零风险 |
| V2.0 | NLP 语义理解 + 差异化回复 | 需人工审核开关 |
| V3.0 | LLM 开放式生成回复 | 必须保留审核 |

### 发布安全：队列 + 限流

- 发布频率控制：每个平台独立 QPS 限制
- 队列机制：任务排队执行，避免被封
- AI 前置风控：内容合规检测（违规词/敏感词）

---

## 四、版本规划

### V1.0 — MVP（当前冲刺）

**目标**：跑通账号绑定 → 内容分发 → 基础数据 核心闭环

```
┌─ 账号绑定 ───────────────────────────────────────┐
│  • 支持平台: 抖音/B站/微博/小红书/知乎            │
│  • Extension Cookie 检测为主                     │
│  • 账号卡片: 头像/昵称/在线状态/粉丝数/作品数      │
│  • 授权失效预警（异常标红）                       │
│  • 账号分组（个人号/企业号）                      │
└──────────────────────────────────────────────────┘
         │
         ▼
┌─ 内容分发 ───────────────────────────────────────┐
│  • 统一编辑器（图文+已有视频）                    │
│  • 质检 Gate（内容/GEO/合规/原创度）              │
│  • 勾选目标平台 → 立即/定时发布                   │
│  • 发布日志（成功/失败+原因+重发）                │
│  • 逐平台结果反馈                                │
└──────────────────────────────────────────────────┘
         │
         ▼
┌─ 基础数据 ───────────────────────────────────────┐
│  • 全平台总粉丝/当日新增/总曝光/总互动            │
│  • 各平台对比表（粉丝量/互动量排序）              │
│  • 单内容跨平台效果对比                           │
└──────────────────────────────────────────────────┘
         │
         ▼
┌─ 关键词回复 ─────────────────────────────────────┐
│  • 预设关键词触发回复模板                          │
│  • 评论聚合列表（按平台/时间）                    │
│  • 批量回复/置顶/屏蔽                            │
└──────────────────────────────────────────────────┘
```

### V2.0 — AI 增强

- 内容 AI 适配（图片裁剪/文案改写/格式转换）
- 数据趋势图表（涨粉/曝光走势）+ Excel 导出
- AI 语义评论回复（区分咨询/广告/负面）
- 私信聚合 + 基础 AI 应答
- 账号分组管理
- 违规监控告警

### V3.0 — 商业化

- 私信多轮 AI 聊天 + CRM 客户跟进（标签/阶段/台账）
- 团队多角色权限
- 热门内容预测 + 竞品分析
- 矩阵号批量运维

---

## 五、V1.0 技术实现

### 前端页面

```
/channels                    — 渠道中心主页
  ├── 账号绑定面板（平台卡片 + 账号数据）
  ├── 数据看板 Tab
  ├── 一键分发入口
  └── 评论互动入口
```

### 关键文件

| 文件 | 说明 |
|------|------|
| `app/channels/page.tsx` | 主页面：账号卡片网格 + 数据总览 |
| `app/channels/layout.tsx` | Tab 导航 |
| `app/channels/publish/page.tsx` | 内容创作 + 分发 |
| `app/api/channels/bind/route.ts` | 账号绑定 API |
| `app/api/channels/stats/route.ts` | 数据聚合 API |
| `app/api/channels/publish/route.ts` | 发布编排 API |
| `ui/accounts/AccountCard.tsx` | 平台账号卡片组件 |
| `ui/accounts/AccountDetail.tsx` | 账号详情面板 |
| `ui/stats/StatsOverview.tsx` | 数据总览组件 |

### 数据结构

```typescript
// 账号卡片
interface AccountCard {
  platform: string        // douyin/weibo/bilibili/rednote/zhihu
  username: string
  avatar: string
  status: 'online' | 'offline' | 'expired'  // 在线/离线/授权失效
  fensNum: number         // 粉丝数
  arcNum: number          // 作品数
  recentGrowth: number    // 近7日涨粉
  group?: string          // 个人号/企业号
}

// 统一指标映射（DS 方案关键建议）
// 抖音"点赞" = 小红书"赞" = B站"点赞+投币" → 统一为 likeNum
interface UnifiedMetrics {
  platform: string
  fensNum: number        // 粉丝
  playNum: number        // 曝光/播放
  likeNum: number        // 点赞（统一映射）
  collectNum: number     // 收藏
  commentNum: number     // 评论
  shareNum: number       // 分享/转发
}
```

### Token 维护机制（DS 方案关键建议）

```
OAuth Token 维护:
  access_token → 短期有效 → 前端发起操作时实时使用
  refresh_token → 长期有效 → 后端定时任务自动刷新
  失效预警 → token 过期前 24h 弹窗提醒用户重新授权
```

### 发布队列限流（DS 方案关键建议）

```
发布请求 → 入队 → 平台 QPS 检查 → 执行 → 结果回调
                    ↓ 超限
                  延迟重试（指数退避）
```

---

## 六、现有代码复用清单

| 模块 | 现有代码 | 复用方式 |
|------|---------|---------|
| Extension 账号检测 | v2 `sync/account/*` 15+ 平台 | 直接调用 `getAllAccountInfo()` |
| 前端 ↔ Extension 通信 | v2 `window.AiBrandPlugin` | 注入到 MAIN world |
| 质检 Gate | v3 `quality-gate.ts` + `QualityGateCheck.tsx` | 组件直接复用 |
| 发送确认 | v3 `PreSendConfirm.tsx` | 组件直接复用 |
| 发布反馈 | v3 `PostSendFeedback.tsx` | 组件直接复用 |
| 任务执行 | v3 `task-executor.ts` | 逻辑直接复用 |
| 设计系统 | v3 `ui/components/*` | Button/Card/Badge/Toast 直接复用 |
| 数据模型 | 后端 `ChannelAccountDataCube` | 类型直接复用 |
| AI 回复 | 后端 `EngagementService` | 逻辑直接复用 |
| 评论操作 | 后端 `InteractController` | 端点直接复用 |

---

## 七、V1.0 验收标准

1. 打开 `/channels` → 3+ 平台显示已绑定，卡片展示头像/昵称/粉丝数
2. 点击[创建内容] → 写图文 → 质检通过 → 勾选微博+抖音 → 发布 → 查看逐平台结果
3. 数据面板显示各平台粉丝/作品/互动总数
4. 评论列表显示各平台评论 → 设置关键词"价格"→ 新评论自动回复"私信你了"
5. 授权失效的平台卡片标注红色异常，提示重新授权
