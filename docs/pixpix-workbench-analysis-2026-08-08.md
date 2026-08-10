# PixPix Workbench（/zh-CN/workbench）结构与模块拆解报告

> 分析日期：2026-08-08
> 分析方式：公开页面 HTML + 静态资源（JS/CSS bundle）抓取与静态分析
> 结论边界：PixPix 为外部 SaaS，无私有源码。以下内容均基于可观测的构建产物、路由、API 调用与 UI 字符串推断；后端内部实现（服务划分、模型供应商合同、数据库结构）不在范围内。

---

## 0. 一句话定位

PixPix 是一个面向**电商场景**的 AI 图/视频创作工作台 SaaS：以 `/workbench` 为核心工作台，覆盖 AI 生图、AI 视频、智能图片编辑、9 类电商专业工具与无限画布（节点化工作流），并配套会员/积分计费体系。整体采用 **Next.js 营销站点外壳 + 内嵌 React SPA 工作台** 的双层架构。

---

## 1. 整体技术架构（双层）

### 1.1 外层：Next.js 站点（www.pixpix.com）

- **Next.js App Router**，带 `[locale]` 国际化动态段（zh-CN / en 等）。
- 负责 SEO 营销页：首页（含模型对比）、工具落地页（`/tools/*`）、定价、FAQ、下载等。
- `workbench/[[...slug]]` 是全捕获路由：页面本身只是一个 **SPA 壳**（`[SPAShell]`），读取 locale 得到 basename，把内嵌 SPA 挂载到 `<div id="root">`。

### 1.2 内层：React SPA 工作台（核心业务）

- **React + React Router**（`createBrowserRouter` 风格，`basename = /zh-CN/workbench`），同一 webpack 构建内编译（非独立部署的 iframe/微前端）。
- SPA 路由：`/`（重定向到 workbench）、`workbench`、`editor`、`workspace`、`projects`、`payment`、`403`、`*`（404）。
- 全局壳组件：主题（system/dark/light，localStorage `theme-mode`）、全局错误边界、登录/会员/积分模态框宿主、布局 Header、Clarity 页面跟踪与用户识别、路由变更埋点。

### 1.3 构建与部署

| 项 | 观察结果 |
|---|---|
| 构建 | 单 webpack 构建（Next.js 产物 + SPA 同包），路由级懒加载 chunk |
| 静态托管 | 阿里云 OSS：`storage.pixpix.cc/releases/_next/...`，Cloudflare 前置（robots.txt 含 Cloudflare Managed 内容信号） |
| API | 同源 `/api/*` 反向代理至 `api.pixpix.cc`；AI Agent 服务端点 `api.pixpix.cc/molili-agent` |
| 上传 | `fileApi/v1/sts` 取阿里云 OSS STS 凭证 + `ali-oss` SDK 浏览器直传 |
| 监控 | Google Analytics（gtag）、Microsoft Clarity |
| 登录 | 邮箱验证码 + Google Identity Services（GSI） |
| 动效 | Lottie（含 jitter.video 制作的动画） |
| 画布封面 | `html-to-image` 截图 `#canvas-root` 后上传 |

---

## 2. 路由结构

### 2.1 外站（Next.js 层）

- `/[locale]` 营销首页、`/tools/*` 工具落地页（detail-page、hot-seller-replicate、product-retouch、apparel-set 等）、定价/FAQ/下载页。
- `/[locale]/workbench/[[...slug]]` → SPA 壳。

### 2.2 内层 SPA 路由与页面

| 路由 | 页面组件 | 功能 |
|---|---|---|
| `/` | index | SEO 占位，进入即重定向到 workbench |
| `workbench` | module 69055 | **主工作台**：统一生成器 + 电商工具 + 灵感流 + 无限画布入口 |
| `workspace` | module 3012 | **画布工作区**：workbench 提交生成后的落点，节点化工作流编辑 |
| `editor` | module 59536 | **画布编辑器**：独立编辑视图（文本/描边绘制等） |
| `projects` | module 40598 | 项目列表（分页、搜索） |
| `payment` | module 91149 | 支付结果页（带鉴权中间件） |
| `403` / `*` | — | 403 / 404 错误页 |

---

## 3. Workbench 页面模块拆解（核心）

页面状态机核心数据（URL 深链 + 草稿恢复）：

```ts
activeTab: "image" | "aiVideo" | "videoEdit" | "agent"
mode: "image" | "video"          // 频道
frameMode: "multi" | "omni"      // 多帧 / 全参考
selectedModelId                  // 默认 gpt-image-2，从 imageModels/videoModels 选
aspectRatio / resolution / num / videoDuration / generateAudio / modelMode
prompt / promptContent           // 附带 prompt 增强（commonApi/prompt-enhance）
attachments                      // 图片/视频，含类型/大小/尺寸/时长/比例校验
```

URL 参数：`?prompt=...&model=...&nextAction=image|aiVideo|videoEdit|agent&autostart=1`（深链一键生成）。

### 3.1 页面区块

1. **Hero 区**：渐变背景 + 光点网格 + 主标题（i18n `hero.prefix` / `hero.highlight`）+ 快捷操作（Quick Actions）。
2. **统一生成输入（chatInput）**：多行 prompt、图片/视频附件上传（登录门禁 + 服务端模型能力约束）、模型下拉（含图标与描述）、比例/分辨率/数量/时长/音频开关、视频帧模式切换。
3. **Tab 栏（服务端驱动）**：灵感分类 `inspirationApi/typeList` 由后端下发，react-query 缓存（key `["inspiration","type-list"]`），吸顶 Tab + 锚点滚动。
4. **灵感流（DiscoverInspiration）**：分类 Tab → 分页内容流（`inspirationApi/pageQuery` / `cursorPageQuery` / `tagPageQuery` / `detail`），支持标签筛选。
5. **电商工具区（sameStyle.groups）**：9 种专业工具卡片，模板数据服务端下发：

| 工具 ID（事件） | dialogType | 中文能力 |
|---|---|---|
| product-suite | 商品套图 | 商品图一键出多场景套图 |
| hot-seller-replicate | 爆款复制 | 上传爆款参考图复刻同款 |
| product-retouch | 商品精修 | 增强光泽/修复划痕/提升清晰度/色彩校正/透视修正 |
| detail-page | A+ 详情页 | 生成 Amazon A+ 详情页素材 |
| apparel-set / apparel-group | 服饰套装/同款 | 白底图/3D展示/模特图/组合搭配 |
| model-try-on | 模特试穿 | 服饰上身效果 |
| video-replicate | 视频复刻 | 视频结构/运镜复刻 |
| seller-video | 带货视频 | 电商爆款带货视频 |

   模板接口：`toolStudioTemplateApi/list` + `/detail`（返回 `formConfig`、`referenceImage`、`effectImages`，前端通用渲染表单弹窗）。
6. **无限画布入口**：`canEnterCanvas` 权限门禁 → 创建 workflow（`workflowApi/v1/workflows`）→ 新标签页打开 `/workspace?id=...`；workbench 侧也有“最近工作流”入口（`workflows/list`）。

### 3.2 关键交互机制

- **模型自动匹配**：视频模式 + 附件 → 按帧模式（text-to-video / image-to-video / reference-to-video / video-to-video / omni-reference）自动匹配模型并 toast 提示。
- **额度预估前置**：按 `模型类型 × 比例 × 分辨率 × 时长 × 数量 × 模式 × 是否配音` 实时计算积分成本（`generationApi/generationCredits`），不足时引导充值/升级。
- **草稿持久化**：prompt/模型/参数/附件写入草稿，刷新可恢复（`persistDraft`/`restoreDraft`）。
- **提交即编排**：点击生成 → 登录门禁 → 创建 workflow → `router.push('/workspace?id=...', state=生成参数)` → workspace 自动把参数转为画布任务执行。这是全站最核心的交互闭环。

---

## 4. Workspace / Editor（无限画布）模块拆解

### 4.1 数据模型

```ts
Workflow = { id, title, nodes, groups, viewport, createdAt, updatedAt }
Node = { id, type, taskId, resultUrl, assetId, parentIds, title,
         resultAspectRatio, mediaWidth/Height, videoDuration, cover, status }
status: idle | loading | success | error
```

### 4.2 节点类型（module 22412）

- `TEXT` / `IMAGE` / `VIDEO` / `AUDIO`（基础媒体节点）
- `IMAGE_EDITOR` / `VIDEO_EDITOR`（编辑节点）
- `STORYBOARD`（分镜管理器：`storyboardApi` 提供 brainstorm / generateScripts / generateComposite / optimizeStory）
- `CAMERA_ANGLE`（镜头节点）
- `LOCAL_IMAGE_MODEL` / `LOCAL_VIDEO_MODEL`（本地模型节点）
- `VIDEO_COMPOSITE`（视频合成节点）

### 4.3 页面组件

- **画布区**：无限缩放/平移、节点连线（parentIds 依赖）、节点选中/成组、画布标题编辑。
- **工作流面板**：保存（含封面：`html-to-image` 截图 `#canvas-root` → 上传 → `workflowApi/workflows/cover`）、加载、删除、复制、刷新列表。
- **添加节点菜单**：按媒体类型（图片/视频）分组（image 10 项 / video 5 项，来自画布工具配置）。
- **AI 助手侧栏**：会话式生成（`chatApi/conversation/*` + `messages/list` + `agentApi/run`），支持引用画布节点、参考图/视频，把 AI 回复直接落成画布节点。
- **workbench 自动发送**：`pendingWorkbenchAutoSend` 机制——带生成参数进入 → 创建会话 → 发送 → 生成节点入画布 → 打开侧栏并清理 URL state。
- **批量操作**：多选节点批量下载（图片/视频）、删除、连接。

### 4.4 Editor 页面

独立编辑视图（module 59536）：Canvas 渲染工具（含 CJK 文本自动换行、stroke 描边、图片/视频尺寸探测）、节点元数据推导（aspect ratio、封面、时长）、生成任务入画布逻辑。

---

## 5. 领域服务层（API 面，来自模块 4092）

| 域 | 端点 | 说明 |
|---|---|---|
| generation | `/generationApi/v1/{generateImage, generateVideo, generationStatus, generationTasks, generationCredits, modelList, splitLayers, tools}` | 生成任务、额度、模型目录、图层拆分 |
| workflow | `/workflowApi/v1/workflows{,/title,/modelUseScene,/list,/detail,/delete,/cover,/copy}` + `publicWorkflows/detail` | 工作流 CRUD 与公开模板 |
| inspiration | `/inspirationApi/v1/{typeList, pageQuery, cursorPageQuery, tagPageQuery, detail}` | 灵感流（Tab/内容/标签） |
| asset | `/assetApi/v1/{save, pageQuery, cursorPageQuery, detail, del, favorite}` | 素材资产管理 |
| toolStudioTemplate | `/toolStudioTemplateApi/v1/{list, detail}` | 电商工具模板（服务端表单配置） |
| chat/agent | `/chatApi/v1/conversation/{create,update,delete}`、`conversations/list`、`messages/list`、`/agentApi/v1/run`、`/commonApi/v1/{ai/text, prompt/enhance}` | AI 助手会话与文本增强 |
| storyboard | `/storyboardApi/v1/{brainstormStory, generateScripts, generateComposite, optimizeStory}` | 分镜/脚本 |
| user | `/userApi/v1/{userInfo, membershipBenefit, creditsStatistics, creditsLedger, updateUserInfo}` | 用户、会员权益、积分 |
| billing | `/payApi/v1/{paymentLink, cancelSubscription, goodsDetailList}`、`/orderApi/v1/detail`、`/billing/v1/{invoice, invoice/detail, orderRecorde}` | 支付/订阅/发票 |
| file | `/fileApi/v1/sts` | OSS 上传凭证 |
| config | `/configApi/v1/config` | 全局配置 |
| feedback/activity | `/userFeedbackApi/v1/submit`、`/userActivityApi/v1/report` | 反馈与埋点上报 |
| login | `/loginApi/v1/{sendEmailCode, loginByEmail, googleRedirectAuthUrl, exchangeGoogleLoginTicket, loginByGoogle, logout}` | 邮箱/Google 登录 |

API 客户端为 **OpenAPI 生成式客户端**（openapi-typescript-fetch 风格：`$body_/$path_/$query_` 序列化器、类型化 fetch 封装），请求拦截器统一注入：`appType=6`、`appVersion`、`Accept-Language`、`Time-Zone`、`Invite-Code`、`source`、`referrer`；响应统一 `{code, data, message}` 风格，按 `errCode` 触发登录态失效/订阅校验等全局动作。

---

## 6. 第三方依赖与服务

| 类别 | 内容 |
|---|---|
| UI | Tailwind CSS（大量工具类 + CSS 变量 tokens）、Lucide 图标、Radix 风格组件、sonner toast |
| 状态 | zustand（user/assistant/canvas store）、@tanstack/react-query（灵感 Tab 等服务端缓存） |
| 上传 | aliyun-oss（STS 直传） |
| 画布 | 自研节点图引擎 + html-to-image（封面） |
| 登录 | Google Identity Services、邮箱验证码 |
| 分析 | GA4（gtag）、Microsoft Clarity |
| 动效 | Lottie（jitter.video） |
| 媒体 | 模型厂商 logo 素材（kling/jimeng/seedream 等）与预览图（商品精修/套图/服饰/A+/爆款） |

---

## 7. 对 AiBrand Studio 升级的参考要点

1. **“提交即编排”闭环**：workbench 生成器提交 → 创建 workflow → 跳转画布自动执行。AiBrand 可将“工具/对话框 → 任务 → 工作流”链路打通，避免每个工具独立状态机。
2. **模型目录服务端下发 + 自动匹配**：前端只渲染 `modelList`，按模式/附件自动匹配模型。模型接入可做成纯配置化（与 AiBrand model-gateway 方向一致）。
3. **工具表单服务端配置化**：`toolStudioTemplateApi` 把 9 类电商工具的 `formConfig` 放在后端，前端通用表单渲染，新增工具无需发版。
4. **额度/成本前置预估**：生成前实时计算积分成本，付费墙前置，减少无效生成。
5. **服务端驱动 Tab/灵感流**：营销位与内容流 CMS 化，前端只做渲染。
6. **无限画布节点化 + AI 助手协同**：生成结果作为节点入画布，支持多选、连线、批量下载；AI 助手可引用画布节点继续创作。
7. **双层架构取舍**：Next.js 营销站 + 内嵌 SPA 工作台（同构建）兼顾 SEO 与复杂交互；对 AiBrand 可作为“工具页 SEO + 工作台 SPA”的参考形态。

---

## 8. 已知推断边界

- 未获取私有源码，组件命名/中文名称为 bundle 静态分析的合理还原，非官方命名。
- 服务端逻辑（模型路由、计费结算、权限策略）只能通过端点与 UI 行为推断。
- 部分懒加载 chunk 因部署版本哈希变动可能无法完整抓取，但核心页面（workbench/workspace/editor/projects）与 API 面均已覆盖。
