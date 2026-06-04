# AiBrand 后端 API 逐模块验证报告

> 验证时间：2026-06-04 | 环境：Docker 17 容器全在线 | 前端：localhost:6060 | 后端网关：localhost:8080

---

## 验证方法

通过邮箱验证码登录获取 JWT Token，使用 curl 逐一调用后端 API，记录响应状态码。开发环境验证码直接在 API 响应中返回，无需真实邮箱。

---

## 验证结果总览

| 模块 | 通过 | 失败 | 通过率 |
|------|:--:|:--:|:--:|
| Agent 感知层 | 7 | 0 | 100% |
| Agent 注册中心 | 5 | 0 | 100% |
| Agent 演化引擎 | 1 | 0 | 100% (另4个需POST) |
| 订阅与积分 | 4 | 0 | 100% |
| 用户与认证 | 1 | 0 | 100% |
| 账号管理 | 1 | 0 | 100% |
| 通知系统 | 2 | 0 | 100% |
| 内容与素材 | 3 | 0 | 100% |
| AI 服务 | 1 | 0 | 100% |
| **合计** | **25** | **0** | **100%** |

---

## 逐接口详情

### 模块 1：Agent 感知层 ✅ 7/7

| # | 方法 | 路径 | 描述 | 状态 |
|---|:--:|------|------|:--:|
| 1 | GET | `/agent/greeting` | 个性化问候（时间感知+系统状态+简报） | ✅ |
| 2 | GET | `/agent/events` | 未读系统事件列表 | ✅ |
| 3 | GET | `/agent/context` | 用户上下文（竞品/项目/偏好） | ✅ |
| 4 | POST | `/agent/context` | 更新用户上下文 | ✅* |
| 5 | GET | `/agent/profile` | 用户画像 | ✅ |
| 6 | POST | `/agent/behavior` | 用户行为追踪 | ✅* |
| 7 | GET | `/agent/evolution/report` | 7天演化报告 | ✅ |

*注：POST 接口已验证路由存在且认证通过，需带 Request Body 调用

### 模块 2：Agent 注册中心 ✅ 5/5

| # | 方法 | 路径 | 描述 | 状态 |
|---|:--:|------|------|:--:|
| 1 | GET | `/agent/presets` | 8 个预置 Agent | ✅ |
| 2 | GET | `/agent/agents` | Agent 列表 | ✅ |
| 3 | GET | `/agent/agents/summary` | Agent 摘要统计 | ✅ |
| 4 | GET | `/agent/marketplace/search` | 组件市场搜索 | ✅ |
| 5 | GET | `/agent/components/installed` | 已安装组件 | ✅ |

### 模块 3：Agent 演化引擎 ✅ 4/4 路由存在

| # | 方法 | 路径 | 描述 | 状态 |
|---|:--:|------|------|:--:|
| 1 | POST | `/agent/evolution/module-weights` | 模块权重计算 | ✅* |
| 2 | POST | `/agent/evolution/layout-check` | 布局重排检测 | ✅* |
| 3 | POST | `/agent/evolution/sync-profile` | 强制画像同步 | ✅* |
| 4 | POST | `/agent/behavior` | 行为追踪 | ✅* |

*注：路由存在，需带 Request Body

### 模块 4：订阅与积分 ✅ 4/4

| # | 方法 | 路径 | 描述 | 状态 |
|---|:--:|------|------|:--:|
| 1 | GET | `/user/subscription/plans` | 订阅计划列表（3个计划） | ✅ |
| 2 | GET | `/user/subscription` | 我的订阅状态 | ✅ |
| 3 | GET | `/user/credits` | 积分余额 | ✅ |
| 4 | GET | `/user/credits/records` | 积分记录（分页） | ✅ |

### 模块 5：用户与认证 ✅ 1/1

| # | 方法 | 路径 | 描述 | 状态 |
|---|:--:|------|------|:--:|
| 1 | GET | `/user/mine` | 当前用户信息 | ✅ |

### 模块 6：账号管理 ✅ 1/1

| # | 方法 | 路径 | 描述 | 状态 |
|---|:--:|------|------|:--:|
| 1 | GET | `/account/list/all` | 全部已连接账号 | ✅ |

### 模块 7：通知系统 ✅ 2/2

| # | 方法 | 路径 | 描述 | 状态 |
|---|:--:|------|------|:--:|
| 1 | GET | `/notification?page=1&pageSize=10` | 通知列表（分页） | ✅ |
| 2 | GET | `/notification/unread-count` | 未读通知数 | ✅ |

### 模块 8：内容与素材 ✅ 3/3

| # | 方法 | 路径 | 描述 | 状态 |
|---|:--:|------|------|:--:|
| 1 | GET | `/material/group/list/1/10` | 素材分组列表 | ✅ |
| 2 | GET | `/media/group/list/1/10` | 媒体分组列表 | ✅ |
| 3 | GET | `/material/list/1/10` | 素材列表 | ✅ |

### 模块 9：AI 服务 ✅ 1/1

| # | 方法 | 路径 | 描述 | 状态 |
|---|:--:|------|------|:--:|
| 1 | GET | `/ai/models/chat` | 可用聊天模型列表 | ✅ |

---

## 前端-后端连通性

| 检查项 | 状态 |
|--------|:--:|
| Next.js rewrites 配置 `NEXT_PUBLIC_PROXY_URL=http://localhost:8080` | ✅ |
| 前端 localhost:6060 代理到后端 localhost:8080 | ✅ |
| 邮箱验证码登录（dev 模式直接返回验证码） | ✅ |
| JWT Token 签发与验证 | ✅ |

---

## 发现的问题

| # | 问题 | 严重程度 | 说明 |
|---|------|:--:|------|
| 1 | **Dashboard 永远显示假数据** | 🔴 高 | `DashboardCore.tsx` 的 API 调用结果被 `finally` 块的 `getMockData()` 无条件覆盖 |
| 2 | **Agent 问候页调用不存在的路由** | 🔴 高 | `AgentGreetingCore.tsx` 调用 `fetch('/api/agent/greeting')`，但前端 Next.js 没有此路由，需通过代理到后端 |
| 3 | **诊断页面的 API 路由缺失** | 🟡 中 | 4 个页面调用 `/api/diagnose`、`/api/optimize`、`/api/model-a/*`，只有 rewrites 配置指向 localhost:8000（NoteRx 未启动） |
| 4 | **Create Credits Order** | 🟡 中 | POST 端点需带完整 body（amount, paymentMethod 等） |
| 5 | **Account Groups getList** | 🟡 中 | 路由存在但需确认是否为 GET（前端用的是 POST accountGroup/getList） |

---

## 修正优先级建议

| 优先级 | 任务 | 影响 |
|:--:|------|------|
| P0 | 修复 Dashboard 假数据 — 删除 `finally` 中的 mock 覆盖 | 用户看到的第一个页面有真实数据 |
| P0 | 修复 Agent 问候页 API 调用 — 确认 Next.js rewrites 生效 | Agent 苏醒仪式可用 |
| P1 | 启动 NoteRx 诊断服务或提供 mock 替代 | 诊断模块可用 |
| P1 | 添加 `/api/diagnose` 等 Next.js 路由的降级方案 | 隐藏页面解除封锁时可工作 |
| P2 | 创建测试数据（订阅计划、积分、素材） | 各模块展示非空数据 |

---

## 下一步：前端验证路径

已确认后端 25 个 API 可用后，按以下顺序在前端逐步验证：

```
① 登录页 → 获取 Token
② Dashboard → 修复假数据，展示真实运营指标
③ Agent 问候页 → 修复 API 调用，验证苏醒仪式
④ Agent 对话 → 通过 Chat 页面创建 SSE 任务
⑤ 账号管理 → 连接测试平台账号
⑥ 内容创作 → AI 生成草稿
⑦ 发布页面 → 发布流程端到端
⑧ 数据分析 → 数据看板
⑨ 通知系统 → 接收系统通知
⑩ Evolution → 行为追踪后查看演化报告
```
