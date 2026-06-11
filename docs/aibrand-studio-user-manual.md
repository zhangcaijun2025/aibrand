# AiBrand Studio 前端系统功能与使用说明书

> 版本: 3.0 | 更新: 2026-06-11 | 适用: 全域运营开发测试

---

## 目录
1. [系统概述](#1-系统概述)
2. [首页仪表盘](#2-首页仪表盘)
3. [GEO 内容优化中心](#3-geo-内容优化中心)
4. [Agent 调度中心](#4-agent-调度中心)
5. [全系统协调中心](#5-全系统协调中心)
6. [设置中心](#6-设置中心)
7. [侧边栏 AI 助手](#7-侧边栏-ai-助手)
8. [自进化引擎](#8-自进化引擎)
9. [模型集成](#9-模型集成)
10. [渠道管理](#10-渠道管理)
11. [API 接口参考](#11-api-接口参考)
12. [故障排查](#12-故障排查)

---

## 1. 系统概述

AiBrand Studio 是一个 AI 驱动的全域运营平台，核心能力包括：

| 模块 | 功能 | 技术亮点 |
|------|------|---------|
| 首页仪表盘 | 数据总览、核心指标、进化健康 | EvolutionHealthBar 实时监控 |
| GEO 优化中心 | 六维评分、内容工作流、引用监测、权威信源、舆情管控、健康仪表盘 | DS+小豆 双引擎融合 |
| Agent 调度中心 | 22个 AI Agent 动态调度、场景流水线 | 自进化 Agent Registry |
| 协调中心 | 全系统 13 模块健康监控、AI 三件套状态 | Dify+n8n+LangChain 编排 |
| 设置中心 | 平台绑定、API 密钥、模型集成 | LiteLLM 网关 + 七维路由 |
| 侧边栏 AI | 语音输入、发布管线、进化通知 | SSE 实时推送 |
| 自进化引擎 | 6 阶段 Tick 闭环、自动部署、去重 | 16 探针 + 灰度发布 |

**技术栈:** Next.js 16 + React 19 + TypeScript + Tailwind CSS + Framer Motion
**后端:** NestJS + MongoDB + Redis + Docker + Dify + n8n
**访问地址:** http://localhost:3099

---

## 2. 首页仪表盘

### 2.1 布局结构
```
┌─────────────────────────────────────────────┐
│ QuickStatusBar (平台状态 + 通知)              │
├─────────────────────────────────────────────┤
│ EvolutionHealthBar (进化引擎健康条)           │
│  - HealthScore / Agent数 / 路由准确率         │
│  - 展开: 6项指标 + 快捷链接                   │
├─────────────────────────────────────────────┤
│ QuickActionsRow (快捷操作)                    │
├─────────────────────────────────────────────┤
│ MetricCardsRow (核心指标卡片)                 │
├─────────────────────────────────────────────┤
│ 数据洞察: LineChart + PieChart + BarChart     │
├─────────────────────────────────────────────┤
│ AI 洞察 + 热门内容排行 + GEO 预览             │
├─────────────────────────────────────────────┤
│ DataTableCard (最近记录)                      │
└─────────────────────────────────────────────┘
```

### 2.2 进化健康条 (EvolutionHealthBar)
- 显示当前 HealthScore、活跃 Agent 数、路由准确率
- 点击展开: 6 项详细指标 + 快捷跳转链接
- 30 秒自动刷新
- API 不可用时显示 "暂不可用" 而非红色错误

### 2.3 GEO 预览卡片 (GeoPreviewCard)
- 首页右侧显示平均 GEO 评分
- 点击跳转 GEO 优化中心
- 展示最近 2 条优化记录

---

## 3. GEO 内容优化中心

> 访问: http://localhost:3099/geo | 7 个功能 Tab

### 3.1 GEO 评分 (六维引擎)

**六个评分维度:**

| 维度 | 权重 | 评分标准 |
|------|------|---------|
| 结构化 (structure) | 22% | H2/H3 标题、列表、表格、段落数 |
| 权威性 (authority) | 20% | 引用次数、链接、机构背书 |
| 可读性 (readability) | 16% | 句长、段落数、过渡词 |
| 关键词 (keywords) | 15% | 覆盖度、密度 (2-5%)、标题匹配 |
| 时效性 (freshness) | 12% | 年份、月份、热点信号词 |
| 事实密度 (factDensity) | 15% | 数字、对比、案例、命名实体 |

**使用步骤:**
1. 输入文章标题和正文
2. 选择目标平台 (小红书/抖音/公众号/B站/微博/知乎/头条/快手)
3. 点击 "GEO 评分" → 查看六维雷达图和优化建议
4. 点击 "一键优化" → 自动修复评分缺陷 → 应用优化

**评分等级:**
- ≥85 分: 🟢 优秀 (通过质检)
- 65-84 分: 🟡 良好 (有优化空间)
- <65 分: 🔴 需改进 (建议优化后发布)

### 3.2 内容工作流 (5 阶段流水线)

```
选题 → 写作 → 质检 → 格式 → 输出
```

**阶段详解:**
1. **选题**: 输入主题 + 选择平台, 5 个推荐选题
2. **写作**: 结构化编辑器, 写作提示 (标题/数据/引用)
3. **质检**: 六维评分 + 优化建议 + 通过/需优化判定
4. **格式**: Markdown / JSON-LD Schema / 纯文本 三种输出
5. **输出**: 完成确认, 可开始新任务

### 3.3 引用监测 (CitationMonitor)

**五大 AI 平台监测:** ChatGPT / 豆包 / 元宝 / Kimi / Perplexity
**10 个目标 Prompt** (信息型/商业型/对比型)

**核心 KPI:**
- AI 提及率 (品牌在 AI 答案中出现频率)
- Prompt 覆盖率 (目标 Prompt 中品牌出现比例)
- AI 声量占比 (与竞品对比)
- 正面情感率

**平台/意图分类:** 按 AI 平台和搜索意图 (信息型/商业型/对比型) 分类统计

**使用方法:** 点击 "刷新数据" → 查看最近引用事件 → 监控引用位序 (首发/前段/中段/末尾)

### 3.4 权威信源 (AuthorityPanel)

**五级权威评级:**

| 等级 | 权重 | 代表平台 | GEO 加权 |
|------|------|---------|---------|
| S | 1.0 | 国家标准委、中科院 | 1.5x |
| A | 0.7 | 36氪、虎嗅、财经杂志 | 1.3x |
| B | 0.4 | 知乎、CSDN、掘金、公众号 | 1.1x |
| C | 0.2 | 小红书、抖音、B站、微博 | 0.9x |
| D | 0.05 | 个人号、论坛 | 0.5x |

**功能:**
- 5 个已绑定信源 (含一致性评分)
- 过期账号检测 (>30 天未更新)
- 升级建议 (C→A 预计曝光 +200-320%)
- 信源一致性校验 (品牌名/描述/联系方式/产品信息)

### 3.5 舆情管控 (SentimentPanel)

**功能:**
- 正面/中性/负面 情感比例条
- 趋势判断 (improving/stable/declining)
- 话题分布 TOP5
- 高优先级告警列表
- 一键内容对冲 (自动生成正面内容发布)
- 严重度评估 (low/medium/high/critical)

### 3.6 健康仪表盘 (GeoEvolutionDashboard)

**双引擎融合公式:**
```
GeoHealth = DS引擎 × 0.5 + 小豆引擎 × 0.5

DS引擎   = AI提及率×0.4 + 引用位序×0.3 + 信源权威×0.2 + 意图覆盖×0.1
小豆引擎 = GEO均分×0.35 + 同城互动×0.25 + POI准确率×0.2 + 合规率×0.15 + 模板效果×0.05
```

**仪表盘内容:**
- GeoHealth 总分 + 趋势 (improving/stable/declining)
- DS/小豆 双引擎卡片 (各 4 指标)
- 最近进化记录 (带 scoreDelta)
- 快捷链接 (引用监测/权威信源/舆情管控)
- 探针/Agent 活跃状态

### 3.7 地域数据 (Region API)
- 16 省/直辖市 + 21 城市数据库
- 城市搜索 (名称/别名)
- 平台标签推荐 (每城市×每平台)
- POI 商圈数据
- 7 条平台地域规则
- 6 个城市热点话题 (实时热度)

---

## 4. Agent 调度中心

> 访问: http://localhost:3099/agents

### 4.1 Agent 列表 (22 个)

**通用 Agent (16 个):**
- 总管家 (general) — 任务调度中枢
- 文案创作助手 (content-creator)
- 竞品分析师 (competitor-analyst)
- 数据洞察师 (data-insight)
- 发布管家 (publish-manager)
- 智能客服 (customer-helper)
- GEO 优化师 (geo-optimizer)
- 质量总监 (quality-director)
- 特级剪辑师 (video-editor)
- 内容解析师 (content-parser)
- 迭代优化师 (iteration-optimizer)
- 合规审核员 (compliance-auditor)
- 定时发布员 (schedule-publisher)
- 系统监控 Agent (system-monitor)
- 学习教练 (learning-coach)
- 首页助手 (smart-home)

**GEO Agent (6 个):**
- GeoRuleAgent (平台规则维护)
- GeoHotwordAgent (热词/方言管理)
- GeoTemplateAgent (模板管理)
- GeoScoreAgent (评分模型调优)
- GeoComplianceAgent (合规/违禁词)
- GeoRewriteAgent (AI 改写 Prompt)

### 4.2 场景流水线 (5 个)
- 每日运营报告 (data-insight → content-creator → publish-manager)
- 内容发布全流程 (content-creator → publish-manager → data-insight)
- 竞品异动预警 (competitor-analyst → data-insight → content-creator)
- 客服高峰期分流 (customer-helper → data-insight → learning-coach)
- 新用户入驻引导 (content-creator → publish-manager)

### 4.3 操作说明
1. 点击 "初始化 Agents" → 自动创建 9 个默认 Agent
2. 左侧选择 Agent → 查看详情 (唤醒词/性格/能力/意图)
3. 右侧查看调度日志 (实时流水)
4. 点击场景卡片 "执行" → 模拟流水线运行
5. 在侧边栏说唤醒词即可唤醒对应 Agent

---

## 5. 全系统协调中心

> 访问: http://localhost:3099/orchestrator

### 5.1 模块监控
- 13 个模块实时健康状态 (健康/降级/离线)
- 系统健康度评分 + 进度条
- "刷新" 按钮手动更新

### 5.2 AI 三件套状态
- **Dify** (:5001) — 语义引擎 + RAG (在线/本地回退)
- **n8n** (:5678) — 工作流自动化 (在线/本地回退)
- **LangChain** (本地) — 推理链 + 工具调用

### 5.3 进化引擎状态
- Tick 计数 / Agent 数 / 路由准确率
- 置信度 / 节拍间隔 / 待审提案数
- 紧急停止状态

### 5.4 协调日志
展示 AI 三件套之间的数据流转:
```
用户输入 → AI命令引擎 → Agent调度 → Dify → n8n → LangChain → Agent调度 → 进化引擎
```

---

## 6. 设置中心

> 访问: http://localhost:3099/settings | 9 个配置 Tab

### 6.1 用户画像
- 用户名/邮箱/手机/行业/地区/会员类型/语言
- 可编辑字段 + 保存修改

### 6.2 平台绑定
- 即时通讯 (微信/飞书/Discord/Slack/LINE/Telegram)
- 邮箱 (QQ/Gmail/Outlook/企业微信/网易)
- 知识库 (IMA/Notion/飞书)
- 绑定方式: Webhook URL / 扫码 / OAuth / 手动
- 连通测试 + 解绑

### 6.3 API 密钥
- 创建/查看/复制 API 密钥
- 密钥仅在创建时显示一次

### 6.4 用量配额
- AI 对话/内容生成/图片生成/视频生成/数据导出/存储空间
- 用量进度条 + 升级套餐入口

### 6.5 通知偏好
- 发布完成/互动预警/配额预警/周报推送/系统更新/竞品动态
- 开关切换

### 6.6 工作流配置
- 4 个预置工作流 (内容发布/竞品监控/数据汇总/评论回复)
- 节点数 + 最后运行时间
- n8n 集成提示

### 6.7 外观主题
- 深色/浅色/跟随系统

### 6.8 插件管理
- 54 平台插件 (4 大类)
- 安装指南 (3 步)

### 6.9 模型集成 (新增)
- **LiteLLM 网关状态** (在线/离线)
- **6 模型 × 5 Tier 概览:**
  - T0: Claude Opus (极致推理, $0.015/1k)
  - T1: Claude Sonnet + DeepSeek R1 (旗舰综合)
  - T2: Claude Haiku (均衡主力)
  - T3: DeepSeek V3 (极致性价比, $0.00028/1k)
  - T4: Local Fallback (本地回退, $0)
- **15 个场景路由** (evolution_proposal→Opus, reply→Haiku, content_creation→Sonnet...)
- **实时观测指标** (总调用/总费用/Token消耗/监控模型数)
- **LiteLLM 启动命令** (Docker 一键部署)

---

## 7. 侧边栏 AI 助手

### 7.1 基本交互
- 文本输入 + Enter 发送
- 语音输入 (麦克风按钮)
- 快捷命令按钮 (写文案/看数据/去发布)
- 展开编辑器 (Ctrl+Shift+E / 内容>80字符自动提示)

### 7.2 AI 能力
- 意图识别 → Agent 路由 → 执行动作
- 页面感知 (根据当前页面调整回复)
- 上下文记忆 (跨会话)
- 空闲消息 (检测用户犹豫/困惑)
- 情感共鸣 (基于用户情绪调整回复)

### 7.3 进化面板
- 点击 🧠 按钮展开进化面板
- EvolutionDashboard: 引擎状态 + 4 核心指标 + 最近发现
- SystemMonitorPanel: 模块网格 (13 模块) + SSE 实时告警
- EvolutionNotification: "今日进化" 浮动通知

### 7.4 发布管线
- 内容 → 质检 (PublishConfirmCard) → 发布
- 支持多平台选择
- IMA 同步选项

---

## 8. 自进化引擎

### 8.1 架构 (6 阶段 Tick 闭环)

```
Acquire → Diagnose → Propose → Rank → Validate → Deploy
  (外部扫描 + 内部探针) → (诊断发现) → (生成提案) → (风险排序) → (沙箱验证) → (自动/人工部署)
```

- 默认 6 小时一个 Tick
- 支持手动触发: `POST /api/evolution/status {"action":"run_tick"}`

### 8.2 探针体系 (16 个)

| 类别 | 数量 | 说明 |
|------|------|------|
| 核心探针 | 3 | 路由准确率/置信度漂移/覆盖率缺口 |
| GEO 探针 (DS) | 4 | 评分漂移/引用下降/舆情恶化/覆盖缺口 |
| GEO 探针 (小豆) | 6 | 流量衰减/标签合规/模板效果/合规率/改写质量/热词时效 |
| 模型探针 | 3 | 模型效果/成本异常/延迟漂移 |

### 8.3 自动部署策略

| 风险等级 | 条件 | 部署方式 |
|---------|------|---------|
| 低风险 | score ≥ 65 AND HealthScore > 60 | 全自动 (跳过人工) |
| 中风险 | - | 沙箱验证 → 人工审批 |
| 高风险 | - | 强制人工审批 |

### 8.4 灰度发布
- canary_5pct → canary_25pct → full_rollout
- 健康检查: score+error+alert 三重验证
- 自动回滚: score 下降 >3pt
- 24h 防震荡冷却期

### 8.5 去重机制
- 跨批次去重: 已有提案覆盖的发现不再生成
- 批次内去重: 同批次同类提案自动合并
- 细粒度签名: coverage_gap 按输入聚类, drift 同类型唯一

### 8.6 种子数据注入
```bash
# 注入 200 条遥测数据触发探针
curl -X POST http://localhost:3099/api/evolution/seed \
  -H "Content-Type: application/json" \
  -d '{"count":200}'
```

---

## 9. 模型集成

### 9.1 架构 (四层)

```
应用层 (内容创作/评论/质检/GEO/Agent)
    ↓
LiteLLM 网关 (OpenAI 兼容 API, 100+ 模型)
    ↓
智能路由 (七维决策: 场景×复杂度×成本×延迟×隐私×负载×健康)
    ↓
三级降级 (同Tier→云端→本地→规则引擎)
```

### 9.2 七维路由策略

| 维度 | 权重 | 决策逻辑 |
|------|------|---------|
| 场景 | 25% | 15 个场景 → 专属模型链 |
| 复杂度 | 15% | 简单/中等/复杂 (句长+关键词) |
| 成本 | 20% | free→T3, pro→T2, enterprise→T1 |
| 延迟 | 15% | realtime→高 RPM, batch→低 RPM |
| 隐私 | 10% | requirePrivacy→local-fallback 优先 |
| 负载 | 8% | RPM>80% 自动跳过 |
| 健康 | 7% | 不健康模型自动剔除 |

### 9.3 使用方式

**API 调用:**
```bash
curl -X POST http://localhost:3099/api/models \
  -H "Content-Type: application/json" \
  -d '{
    "messages":[{"role":"user","content":"写一篇小红书文案"}],
    "scenario":"content_creation",
    "options":{"userTier":"pro"}
  }'
```

**MCP 工具调用:**
```bash
# 质检
curl -X POST http://localhost:3099/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"action":"tool_call","tool":"quality_check","args":{"content":"test"}}'

# RAG 检索
curl "http://localhost:3099/api/mcp?rag=GEO优化"
```

### 9.4 场景路由表

| 场景 | 主模型 | Fallback 链 |
|------|--------|------------|
| evolution_proposal | Claude Opus | DeepSeek R1 → Sonnet → Local |
| content_creation | Claude Sonnet | DeepSeek R1 → Haiku |
| quality_check | Claude Sonnet | Haiku → DeepSeek V3 |
| geo_writing | Claude Sonnet | DeepSeek R1 → Haiku |
| reply | Claude Haiku | DeepSeek V3 → Local |
| classification | Claude Haiku | DeepSeek V3 → Local |
| quick_qa | DeepSeek V3 | Haiku → Local |

---

## 10. 渠道管理

> 访问: http://localhost:3099/channels

### 10.1 平台管理
- 8 大平台账号绑定 (小红书/抖音/公众号/B站/微博/知乎/头条/快手)
- 账号状态检测 (在线/离线/异常)
- 评论管理: 32 条增强 Mock 数据 + 真实 API (DOUYIN_ACCESS_TOKEN 配置后)

### 10.2 数据分析
> 访问: http://localhost:3099/analytics

- 渠道对比图表
- 内容趋势分析
- 热门内容排行

---

## 11. API 接口参考

### 11.1 GEO 相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/geo/score | 六维评分 |
| POST | /api/geo/optimize | 内容优化 |
| POST | /api/geo/schema | JSON-LD 生成 |
| POST | /api/geo/keywords | 关键词发现 |
| GET | /api/geo/region | 地域数据查询 |
| GET | /api/geo/health | GeoHealth 指标 |
| GET | /api/geo/monitor | 引用监测 |
| GET | /api/geo/authority | 权威信源 |
| GET | /api/geo/sentiment | 舆情管控 |
| POST | /api/geo/evolve | GEO 进化数据注入 |
| POST | /api/geo/integration | E2E 全链路测试 |

### 11.2 进化引擎

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/evolution/status | 引擎状态 |
| POST | /api/evolution/status | 操作 (start_engine/run_tick/run_all_probes/run_geo_scanners) |
| GET | /api/evolution/metrics | 性能快照 |
| GET | /api/evolution/agents | Agent CRUD |
| GET | /api/evolution/proposals | 提案列表 |
| POST | /api/evolution/proposals | 提案操作 (approve/reject/create) |
| POST | /api/evolution/seed | 种子数据注入 |

### 11.3 模型相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/models | 模型列表 + 健康状态 |
| GET | /api/models?routing=1 | 场景路由表 |
| GET | /api/models?metrics=1 | 模型观测指标 |
| POST | /api/models | 调用模型 (通过 LiteLLM/直接 API) |

### 11.4 MCP & RAG

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/mcp | MCP 能力列表 |
| POST | /api/mcp | 工具调用/资源读取/RAG 检索 |

### 11.5 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 系统健康 (13 模块) |
| GET | /api/ai/coordination | AI 三件套协调状态 |
| POST | /api/agent/command | AI 命令执行 |
| GET | /api/dashboard | 仪表盘数据 |

---

## 12. 故障排查

### 12.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| GEO 评分返回 405 | GET 请求 | 使用 POST + JSON body |
| 进化引擎 Tick 无提案 | 遥测数据不足 | 注入种子数据: POST /api/evolution/seed |
| DeepSeek 调用失败 | API Key 未配置 | 检查 .env.local OPENAI_API_KEY |
| Dify 离线 (unhealthy) | Docker 异常 | `docker restart dify-api-1` |
| 页面水合错误 | SSR/CSR 不一致 | 使用静态初始状态 + useEffect |
| 模型降级到 rule-engine | LiteLLM 离线 | 启动 LiteLLM 或使用直连 API |
| 设置中心模型 Tab 空白 | ModelDashboard 加载失败 | 检查 /api/models 端点 |

### 12.2 启动顺序

```bash
# 1. Docker 服务
docker start dify-api-1 n8n aibrand-server

# 2. LiteLLM (可选, 否则自动直连 API)
docker run -d --name aibrand-litellm --network aibrand-network \
  -p 4000:4000 -v D:/king2046/deploy/litellm/config.yaml:/app/config.yaml \
  ghcr.io/berriai/litellm:main-latest --config=/app/config.yaml --port=4000

# 3. 前端
cd D:\king2046\project\aibrand-studio && npx next dev --port 3099
```

### 12.3 环境变量检查清单
```
✅ OPENAI_API_KEY (DeepSeek)
✅ OPENAI_BASE_URL (https://api.deepseek.com/v1)
✅ N8N_API_KEY (aibrand-dev-api-key-2026)
✅ DIFY_ACCESS_TOKEN (app-yyqOFelScAqYi3v55LrEVKAB)
✅ LITELLM_BASE (http://localhost:4000)
✅ NEXT_PUBLIC_API_BASE (http://localhost:8080/api)
```

---

> **文档维护:** 自进化 Agent 自动更新 | **最后更新:** 2026-06-11
> **联系人:** AiBrand 全域运营开发测试团队
