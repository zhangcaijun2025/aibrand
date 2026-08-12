# 统一模型网关 — 实现状态快照（供上下文压缩后续接）

> 更新：2026-08-10（Checkpoint 3）。设计见 `UNIFIED_MODEL_GATEWAY_DESIGN.md` 第九节（六阶段 + ADR）。

## 已批准执行（按推荐）
- 落点：**Studio 先行**（Next.js + Prisma/Postgres）；统一入口 `/api/models/unified/*`
- 单价：图 6-30 / 视频 40-100 积分每次；无密钥 20 模型入库置灰
- 节奏：P0→P1→P2 连续执行，每阶段验收汇报

## 已创建文件（草稿待接线）
- `project/aibrand-studio/scripts/seed-models.ts` — 30 模型种子（enabled 按密钥矩阵；Seedream×3 + Qwen×4 + Wan2.7Pro 已启用，其余置灰）
- `project/aibrand-studio/src/lib/model-gateway/{types,registry,billing,index}.ts` + `adapters/openai-compatible.ts` — 统一网关骨架
- `docs/plans/model-keys-matrix.md` — P0 密钥矩阵（已就绪 10 / 待提供 20）
- `docs/plans/UNIFIED_MODEL_GATEWAY_DESIGN.md` — 设计文档（第九节六阶段版）

## 环境事实
- dev 容器 3099（nginx→aibrand-web）；Docker postgres（`docker exec aibrand-postgres printenv POSTGRES_*` 取凭据拼 DATABASE_URL）
- 可用密钥：`SEEDREAM_API_KEY`(ARK, base=SEEDREAM_BASE_URL)、`QWEN_API_KEY`(DashScope)、GLM/DEEPSEEK/LITELLM
- 生成管线：`task-runner.ts` 图片走 `visual-gateway.generateImage`（Seedream 4.5 真实）；视频未接入
- 前端模型下拉读 `/api/workbench/models`（ModelCatalog）
- git：studio 已推 be39ef4；父仓库已推 f58ede2（后续改动需提交+推送）

## 下一步（P1→P2）
1. **P1 统一 API（已创建，待编译验证）**：`src/app/api/models/unified/{capabilities,generate,query/[taskId]}/route.ts`；gateway `index.ts` 已加 `unifiedGenerate`（对齐 UnifiedGenerateRequest/Response）；types.ts 已加统一接口
2. **P1 种子执行**：`DATABASE_URL=... pnpm tsx scripts/seed-models.ts` → 验证 `GET /api/models/unified/capabilities` 返回 30 模型+可用性+单价
3. **P2 接线**：`task-runner.ts` 图片任务改走统一网关；**实测 Seedream 4.5 真实出图**（上游 ID 校准：seedream-5-* / qwen-* 待实测）
4. 重建容器 → 验证 3099 → tsc/测试 → 提交推送

## 检查点（最近一次压缩前）
- 已建文件：seed-models.ts（30 模型，enabled 按矩阵）、model-gateway/{types,registry,billing,index} + adapters/openai-compatible、unified API 三端点、keys-matrix、IMPL_STATE
- 待做：tsc 编译验证 → 跑种子 → capabilities 接口验证 → task-runner 接线 → Seedream 真实出图

## 检查点 2（strategic-compact，2026-08-10）
- ✅ 已提交 studio `d2ec210`（11 文件 +706：seed-models.ts、model-gateway 全套、unified API 三端点、task-runner 接网关、gateway 测试 8/8）
- ✅ 种子已执行：34 模型入库、8 遗留模型禁用；tsc ✓、workbench 85/85 ✓、gateway 8/8 ✓
- ⏳ **未完成**：容器未重建（统一 API 尚未上 3099）；父仓库文档未提交；未推送
- ▶ **续接步骤（精确）**：
  1. 父仓库提交：`git -C D:\king2046 add docs/plans; commit`（设计文档+密钥矩阵+状态快照）
  2. 重建容器：`docker build -t aibrand/web:latest -f Dockerfile.local .`（workdir=aibrand-studio）→ `docker compose -f D:\king2046\docker-compose.yml up -d aibrand-web`
  3. 验证：`GET /api/models/unified/capabilities`（34 模型+可用性+单价）；`POST /api/models/unified/generate`（image/seedream-4-5 → 真实出图）
  4. 工作台下拉检查 enabled 模型；E2E workbench 套件回归
  5. 提交+推送 studio → 父仓库指针 → GitHub

## 检查点 3（容器重建 + 线上验收，2026-08-10）

### 容器与环境修复
- ✅ 根因确认：3099 容器为旧镜像（统一 API 404）；且 aibrand-web 缺 `JWT_SECRET`（登录 API 直接抛错）、缺模型密钥
- ✅ `docker-compose.yml` aibrand-web 补环境：`JWT_SECRET` + `SEEDREAM_API_KEY/BASE_URL/MODEL` + `QWEN_API_KEY` + `GLM_API_KEY`（值从 studio `.env.local` 同步进根 `.env`，均 gitignore）
- ✅ 重建 `aibrand/web:latest`（两次：代码 + GLM key 注入）→ `docker compose up -d --force-recreate aibrand-web`
- ✅ 登录恢复：test@aibrand.ai 走真实 JWT 登录成功

### P1 线上验收 ✅
- `GET /api/models/unified/capabilities` → 200：42 模型（34 种子 + 8 遗留禁用）、11 启用、9 ready、单价/能力/可用性齐全

### P2 线上验收 ✅（真实出图）
- ✅ **ZImage Turbo（智谱 cogview-4）真实出图**：`POST /api/models/unified/generate` → success=true、6 积分、8.5s、真实图片 URL（已下载 zimage-cat.png 138KB）
- ⚠️ Seedream 4.5 / Qwen / Wan：网关链路已通（真实请求到 ARK/DashScope），但**账户欠费**（Arrearage / overdue balance）→ 需充值后重测，代码无需再改
- ✅ 适配器修复（实测校准）：
  - `zimage-turbo` 上游模型 = `cogview-4`（`zimage-turbo` ID 不存在，智谱报 1211）
  - DashScope 图片必须走原生端点（OpenAI 兼容 `/images/generations` 返回 404）：新增 `adapters/dashscope-image.ts`（text2image/image-synthesis + multimodal-generation/generation）
  - openai-compatible 错误透出原始 body（不再只显示 HTTP 404）
- ✅ 种子更新：zimage-turbo enabled=true（GLM 密钥可用）；`pnpm tsx scripts/seed-models.ts` 重跑 34+8
- ✅ gateway 单测 13/13（新增 dashscope-image 成功/欠费/multimodal 三用例）；tsc --noEmit ✓

### 验收口径对照
- P1：capabilities 返回 30+ 模型 + enabled/disabled + 单价 → ✅
- P2：工作台选模型 → 生成 → 真实出图 → ✅（ZImage 打通；Seedream/Qwen 待账户充值）

### 待办
- Seedream/Qwen 账户充值后重测 4 模型真实出图（不改代码）
- workbench E2E 回归（容器重建后）
- 提交 studio + 父仓库（compose 变更）并推送

## 检查点 4（P3 视频异步管线，2026-08-10）

### 交付
- ✅ `ModelGatewayTask` 表（Prisma 迁移 `20260810190000_add_model_gateway_task`，手工迁移 + `migrate resolve` 记录，避开本地库 drift reset）
- ✅ 任务管线 `video-pipeline.ts`：create → submit(provider) → 轮询 → 结果入库（fire-and-forget，30min 超时，10s 轮询）
- ✅ ARK 视频适配器（Seedance 2/2.5/Pro）：**实测校准端点为 `/contents/generations/tasks`**（原 `/video/generations` 404）
- ✅ DashScope 视频适配器（Wan 2.7）：`X-DashScope-Async: enable` + `/tasks/{id}` 轮询；**模型 ID 实测校准 `wan2.2-t2v-plus`**（`wan2.7-video` 不存在）
- ✅ query 路由真实读库：GET /api/models/unified/query/{taskId} 返回 status/progress/resultUrls/error
- ✅ 种子启用 Seedance×3 + Wan 2.7 视频（密钥在位）
- ✅ 测试 18/18（新增 ARK/DashScope 视频适配器 4 例 + 管线 2 例）；tsc ✓

### 线上验收（3099）
- ✅ capabilities：42 模型、14 启用、13 ready（视频 4 个 ready）
- ✅ `POST /generate`(video) → success=true、queued + pollUrl；`GET /query/{taskId}` → 任务真实入库
- ✅ seedance-2-5 → failed（ARK：模型/权限未开通，错误正确透出）
- ✅ wan-2-7 → failed（DashScope：余额欠费，模型 ID 已通过校验）

### 剩余阻塞（外部）
- ARK 视频：账户需充值 + 开通视频权限（模型 ID 可能需在开通后再校准一次）
- DashScope：账户充值
- 真实视频生成验收待上述条件满足

### 下一步（优先级）
- P4 统一计费（BillingService：预扣/结算/流水表，替换 credits.ts 写死权重）
- P5 跨模态工作流 + 管理后台

## 检查点 5（P4 统一计费，2026-08-10）

### 交付
- ✅ `User.credits` 余额 + `CreditLedger` 流水表（迁移 `20260810200000_add_billing_credits`，手工应用 + resolve）
- ✅ `billing-service.ts`：getBalance / chargeCredits（原子预扣）/ creditCredits / refundTaskCredits（按 taskId 找 video-pre 流水退回）/ listLedger
- ✅ generate 路由接入：图片生成前预扣 → 成功保留/失败退款；视频先建任务再预扣（流水带 taskId）→ 管线失败自动退款
- ✅ `GET /api/models/unified/ledger`：余额 + 最近流水（账单可查）
- ✅ workbench credits/estimate 改用真实余额（替换写死 balance=100）
- ✅ prisma/seed：测试用户 1000 积分；live DB 已充值
- ✅ 测试 24/24（新增 billing-service 6 例）；tsc ✓

### 线上验收（3099，真实 JWT + Bearer）
- ✅ 初始余额 1000；ZImage 出图扣 6 → 994，流水 -6(generate)
- ✅ 视频 wan-2-7：预扣 -60（带 taskId）→ 失败 → 自动退款 +60（带 taskId）→ 余额回到 994
- ✅ ledger/estimate 返回真实余额

### 已知边界
- 工作台 credits.ts 的权重常量仍用于前端成本预估（模型级单价已在注册表 costCreditsPerCall 为准）；BillingPreview 联动属 P4 后续打磨
- dev-bypass（dev_auto_login_token cookie）不带 userId → 计费自动跳过（仅开发环境）

### 下一步（优先级）
- P5 跨模态工作流（文案→封面→视频）+ 管理后台（模型上下线/健康检查/降级）

## 检查点 6（P5 跨模态工作流 + 管理，2026-08-10）

### 交付
- ✅ 工作流引擎 `workflow-engine.ts`：3 个预设模板（爆款封面→短视频 / 一图多尺寸 / 双风格 A/B 封面），步骤间 URL 传递（img2video startImageUrl）
- ✅ 视频适配器支持图生视频：ARK content 数组 + DashScope input.img_url，管线透传 startImageUrl
- ✅ 图像降级链：registry `fallback[]`，首选失败自动切备选（如 seedream-4-5 → zimage-turbo → qwen-image-2），响应带 routingDecision.fallbackChain
- ✅ 管理 API：`GET /api/models/unified/workflows`（模板）、`POST /workflow/run`（执行）、`GET /health`（供应商/就绪总览）、`PATCH /config`（模型上下线，仅 admin）
- ✅ **实测修复：智谱 cogview-4 要求宽高为 16 的整数倍**（1080x1920 报 1214）→ zhipu 专用尺寸映射（9:16→720x1280、16:9→1280x720、3:4→1024x1360）
- ✅ 测试 28/28（新增降级链 1 例 + 工作流 3 例）；tsc ✓

### 线上验收（3099）
- ✅ workflows=3 模板；health=12 provider/34 模型/13 ready
- ✅ 降级链真实出图：seedream-4-5（欠费）→ zimage-turbo 出图成功，chain 记录
- ✅ cover-to-video 工作流：封面 completed（真实图 URL）→ 视频 queued（带封面起始帧，DashScope 充值后完成）
- ✅ admin PATCH config 上下线 gpt-image-2 生效

### 剩余
- 前端 CrossModalFlowPanel 工作台 UI（API 已就绪）
- 视频真实生成验收（等 ARK/DashScope 充值）
- P6 其余 20 供应商（等密钥）

## 检查点 7（工作台前端面板，2026-08-10）

### 交付
- ✅ `UnifiedModelSelector`：统一模型下拉（/api/models/unified/capabilities），搜索 + 启用优先 + 未接入置灰 + 单次积分成本
- ✅ `UnifiedWorkflowPanel`：工作流模板选择 + 主题输入 + 运行 + 步骤结果（图片预览 / 视频进度轮询 2s / 失败原因），顶部显示真实余额
- ✅ GenerationWorkshop 接入：新增「智能工作流」Tab；模型网格替换为统一下拉；默认选中第一个启用模型；过滤无注册遗留模型
- ✅ i18n 中英 15 个新键；组件测试 3/3（选择器 + 工作流面板）；tsc ✓
- ✅ 修复默认选中 bug：旧逻辑把列表第一个（禁用的 seedream-4）当当前值 → 改为第一个启用模型

### 线上验收（3099 浏览器实测）
- ✅ 生成器打开 → 模型下拉默认 Seedream 5.0 Lite（14 积分），下拉内 14 个未接入模型置灰
- ✅ 智能工作流面板：3 模板 + 余额 978（真实账本）
- ✅ UI 运行 cover-to-video：封面 completed（真实出图）→ 视频 queued
- ✅ workbench E2E 6/6（补充运行 seed-workbench 补齐缺失的「示例：电商主图工作流」种子数据）

### 截图
- test-results/unified-workshop.png / unified-model-dropdown.png / unified-workflow-panel.png / unified-workflow-run.png

### 剩余
- 视频真实生成验收（等 ARK/DashScope 充值）
- P6 其余 20 供应商（等密钥）

## 检查点 8（P6 供应商适配器骨架 + ARK 恢复，2026-08-10）

### 交付（P6 适配器全量接线）
- ✅ 新增 6 个视频适配器：kling / google-vertex(Veo+Gemini) / minimax(H3) / vidu(Q2) / zhipu(Hailuo) / midjourney-proxy（图片）
- ✅ 19 个待接入模型全部注册 adapter + 密钥环境变量（有密钥自动 ready，无需改码）
- ✅ openai-compatible 尺寸映射按供应商细分：ARK(Seedream 最小 3,686,400 像素)、OpenAI、智谱（16 倍数）
- ✅ 测试 37/37（新增 P6 注册表 + 6 适配器请求形态 8 例）；tsc ✓

### 实测校准（真实 API 探测）
- ✅ **ARK 账户已恢复余额**：seedream-4-5 真实出图（1920x1920，ARK 官方 URL，934KB）
- ✅ 智谱视频真实模型 ID = `cogvideox-flash`（cogvideox/cogvideo-3 不存在；当前限流"访问量过大"，链路已通、退款正确）
- ✅ Seedream 5.0 Pro 存在但需火山控制台开通；Nano Banana ID 需控制台建模型
- ✅ 修复：移除 .env 里错误的 SEEDREAM_MODEL 覆盖（原指向未开通的 5-0-pro 导致 seedream-4-5 降级）

### 剩余
- 智谱视频限流过后重试（可真实出片）
- 待用户提供密钥后逐个实测校准：OpenAI(GPT Image 2)、Google(Veo/Gemini)、Kling×4、MiniMax、Vidu、Midjourney 代理、Nano Banana×4（ARK 控制台开通）
- DashScope（阿里）账户充值后补 Qwen/Wan 验收

## 检查点 9（MiniMax H3 落地 + 本地 ComfyUI 融合 P0-P3，2026-08-12）

> 独立路线图见 `docs/plans/AIBRAND_FUSION_ROADMAP.md`。目标：本机完成图片/视频/漫剧开发打样。

### 交付
- ✅ **P0 本地引擎接入**：`comfy-local` 适配器（SD1.5 工作流，复用 comfyui-gateway），注册 `comfy-sd15`（免密钥），失败降级 seedream-4-5；`generateVideo` 空壳改为走统一异步管线
- ✅ **P1 本地 ComfyUI 部署**：`D:\king2046\tools\comfyui`（Python 3.12 + torch 2.4.1 + DirectML 0.2.5，ComfyUI v0.7.0 tag），启动脚本 `scripts/start-comfyui.ps1`（--directml --lowvram），SD1.5 模型 3.97GB，冒烟真实出图；自启 + nginx `/comfy/` 代理
- ✅ **P2 MiniMax H3 v2 适配器**（真实 API 校准）：
  - Key 属国内平台 → `MINIMAX_BASE_URL=https://api.minimaxi.com`（国际站 401）
  - v2 纯 Bearer、`content` 多模态数组、`resolution` 必填（默认 768P）、`task.content.url` 取结果
  - 真实链路验证：submit → queued → running → succeeded（OSS mp4）
  - Key 已写入根 `.env` + 项目 `.env.local`（gitignore）；`aibrand-web` 容器已重建生效
- ✅ **P3 漫剧分镜管线**：
  - `workflow-engine.ts` 动态模板 `manhua-episode`：`splitScriptIntoScenes`（按行→句→兜底）拆 1-8 镜 → 本地 ComfyUI 逐镜出图 → MiniMax H3 以第 i 镜为首帧、第 i+1 镜为尾帧生成转场视频
  - `minimax-video.ts` 本地图桥：localhost 图自动转 Base64 Data URI（容器内回退 host.docker.internal），参考图 ≤9 上限
  - `workflow/run` 路由支持 sceneCount/style/aspectRatio/imageModel/videoModel
  - 测试 31/31（网关相关）；全套 65 文件 / 968 用例 ✓；tsc --noEmit ✓；改动文件 eslint ✓
  - 顺手修复：`.next/dev/types/validator.ts` 生成缓存损坏（截断模板块）→ 删除该单文件，`next dev` 会重建

### 环境
- 容器 `aibrand-web` 已重建：`MINIMAX_API_KEY`（126 字符）/ `MINIMAX_BASE_URL=https://api.minimaxi.com` 生效
- capabilities 401 属正常（需登录态）；就绪判定由密钥存在性决定

### 下一步（优先级）
- P4：aibrand-ai / aibrand-backend MiniMax 渠道（收敛双入口，建议后端代理 `/api/models/unified/*`）
- P5：工作台「漫剧工坊」UI（剧本输入 + 逐镜图片预览 + 2s 视频进度轮询）
- 漫剧端到端打样：`POST /api/models/unified/workflow/run`（workflowId=manhua-episode）跑 1-2 镜真实验收

## 检查点 10（智创中心工作台接入 + 视频 Tab 统一网关，2026-08-12）

### 交付
- ✅ **ComfyUI 接入智创中心工作台**：`comfy-sd15` 入 modelCatalog（enabled，sortOrder 9），图片 Tab 默认选中；提交链路 workbench/generate → canvas → task-runner → 统一网关 comfy-local 真实本地出图；`minimax-h3` 启用
- ✅ **本地引擎健康徽标**：新增 `GET /api/models/unified/comfyui/health`（实时探测 :8188），工作台图片 Tab 显示 在线/离线（30s 轮询，悬停显示队列深度）
- ✅ **视频 Tab 接入统一网关**：
  - `task-runner.ts` 视频分支：调 `unifiedGenerate`（minimax-h3 等），`gatewayTaskId`/`pollUrl` 写入任务 params（updateTask 支持 params）
  - `GET /api/workbench/tasks/:id`：视频任务按 gatewayTaskId 映射网关状态 → workbench loading/success/error + resultUrl
  - `task-client.ts` 轮询超时放宽 300s → 600s
  - `types.ts` videoParams 补 `generateAudio`
- ✅ 测试 66 文件 / 970 用例（新增 task-runner 视频分支 2 例）；tsc ✓；eslint ✓

### 线上验收（3099）
- ✅ capabilities：comfy-sd15 / minimax-h3 均 enabled+ready；`/api/models/unified/comfyui/health` available=true（容器→宿主机 :8188 连通）
- ✅ **视频 Tab 真实出片**：workbench/generate(video, minimax-h3) → tasks/:id/run → loading（provider=minimax）→ 轮询 success（OSS mp4 URL）

### 下一步
- P4：aibrand-ai / aibrand-backend MiniMax 渠道收敛
- P5 ✅：漫剧工坊 UI 已完成（本批）

## 检查点 11（P5 漫剧工坊 UI + 真实端到端打样，2026-08-12）

### 交付
- ✅ UnifiedWorkflowPanel 增加漫剧参数表单（镜数/画幅/风格/图模型/视频模型），仅 manhua-episode 模板显示
- ✅ 剧本输入多行提示「每行一镜」；步骤标签「第 N 镜 · 图片/视频」；图片预览/视频播放/2s 轮询
- ✅ `workflow/run` 长超时（20min）+ 等待提示；i18n 中英 11 键
- ✅ 测试 66 文件 / 971 用例（面板 4/4，含漫剧参数断言）；tsc ✓；eslint ✓

### 线上验收（3099，真实漫剧打样）
- ✅ `workflow/run`（manhua-episode，2 镜，comfy-sd15 + minimax-h3）：
  - scene-0/1-image → completed（localhost:8188 真实本地图）
  - scene-0/1-video → queued → submitted → completed（OSS mp4 ×2，约 3 分钟出片）
- ✅ 全链路：剧本 → 本地出图 → H3 首尾帧动态漫，本机完成

### 下一步
- P4：aibrand-ai / aibrand-backend MiniMax 渠道收敛（仍待做）

## 检查点 12（P4 后端渠道收敛，2026-08-12）

### 交付
- ✅ **aibrand-ai unified-gateway 视频渠道**：`src/core/ai/video/unified-gateway/`（createVideo 转发 `/api/models/unified/generate`、getTask 轮询 query、callback 写 AiLog）；video.service / scheduler / module 接线；config.js 注册 minimax-h3（65 积分/次）
- ✅ **网关 internal 鉴权**：geo-auth 支持 `x-internal-token`（source=internal），generate 路由 internal 来源跳过网关计费
- ✅ **环境**：compose 为 aibrand-web 注入 INTERNAL_TOKEN、aibrand-ai 注入 UNIFIED_GATEWAY_URL + 统一 JWT_SECRET
- ✅ **构建修复**：aibrand-ai 补 cosmiconfig 依赖（否则 fileLoader 崩溃 crash-loop）；aibrand-auth guard 归一化 JWT payload（sub/userId → id）
- ✅ 后端 nx build ✓；lint 无新增 error（存量 fix-deps.js console 除外）；镜像已部署

### 线上验收
- ✅ 网关 internal 鉴权：POST /api/models/unified/generate（x-internal-token）→ 200
- ✅ aibrand-ai 模型目录含 minimax-h3（channel=unified-gateway）
- ✅ **真实出片**：internal 通道（渠道同款调用）→ MiniMax H3 → queued → completed（OSS mp4）

### 遗留（既有架构，非本次引入）
- aibrand-ai 用户积分/任务走 Mongo 用户体系（ObjectId），Studio 用户走 Postgres；用户级调用需 Mongo 有对应用户（本机验证时已临时建/删）

## 检查点 13（积分体系停用，模型直接调用，2026-08-12）

### 交付
- ✅ **计费总开关**：`BILLING_ENABLED=true` 才启用扣费/退款；默认关闭（`billing-service.ts` 惰性判断，charge/credit/refund 全部短路），生成不再因余额不足失败
- ✅ 前端不再拦截：`use-workbench-submit.ts` 删除积分预检阻断（余额展示保留）
- ✅ aibrand-ai unified-gateway 渠道去掉 `calculatePrice`/`getBalance`/`deductCredits`（points=0），不再依赖 Mongo 用户/积分
- ✅ 测试 66 文件 / 971 用例（billing 测试显式开启开关）；tsc ✓；eslint 无新 error；双镜像已部署

### 线上验收
- ✅ Studio 网关：带用户 JWT → video/minimax-h3 → success=True（直接提交，不再扣费）
- ✅ **aibrand-ai 无 Mongo 用户、无积分** → `/ai/video/generations` 直接提交（SUBMITTED，无 points）→ 轮询 → SUCCESS（OSS mp4）

### 恢复方式
- 需要恢复积分时：容器/进程设 `BILLING_ENABLED=true` 即可（前端拦截已删，恢复时需同步还原 use-workbench-submit 预检）

## 检查点 14（端到端全量验收，2026-08-12）

### 验收结果
- ✅ 系统健康：web/ai/nginx/server/postgres/mongodb/redis/rustfs 全 healthy，ComfyUI :8188 在线
- ✅ 自动化测试：66 文件 / 971 用例通过；tsc ✓
- ✅ 登录 + capabilities：46 模型 / 16 enabled / 25 ready；comfy-sd15、minimax-h3、seedream-4-5、wan-2-7 等就绪
- ✅ 前端页面：/login、/create、/workspace、/model-center 均 200
- ✅ 工作台图片链路：workbench/generate → task-runner → 统一网关 → **ComfyUI 本地出图**（provider=comfyui）
- ✅ 统一网关视频链路：generate(minimax-h3) → queued → completed（OSS mp4）
- ✅ 漫剧工作流：manhua-episode 2 镜 → 本地出图 ×2（completed）+ H3 首尾帧视频 ×2（completed，OSS mp4 ×2）
- ✅ aibrand-ai 渠道：无积分无 Mongo 用户直接提交（SUBMITTED）；出片受 MiniMax 账户余额限制（本次 insufficient balance 1008 系上游额度，错误正确透出）

### E2E 发现并修复的 bug
- ❌→✅ **工作台图片/视频模型读取错误**：task-runner 从 `params.modelId` 读模型，但 modelId 存在任务顶层字段 → 图片任务实际走了 seedream-4-5 而非 comfy-sd15。修复：`task.modelId` 优先；新增图片分支回归测试

## 检查点 15（测试素材保留到工作台 + 进度回看，2026-08-12）

### 交付
- ✅ **漫剧/工作流结果落库**：`workflow/run` 成功后创建 GenerationWorkflow + 每步一个 GenerationTask（含 resultUrl/status/error/gatewayTaskId），返回 workflowId；面板显示「素材已保存到工作台」+ 查看画布入口
- ✅ **视频节点正确渲染**：CanvasStage 按任务 taskType 映射节点类型（video → Video 节点，画布 <video> 播放）
- ✅ **视频结果回写持久化**：GET /api/workbench/tasks/:id 映射网关状态时回写 generation_tasks（status/resultUrl），刷新后仍可回看
- ✅ **进度展示**：节点 loading 显示百分比（网关 progress 透传 task → 节点）
- ✅ **视频链接回看自动刷新**：OSS 签名有效期短，回看时通过 MiniMax 查询接口（providerTaskId）重新获取有效链接并回写（不耗额度）；实测 GET 206 video/mp4
- ✅ 测试 19/19（面板/工作台）+ tsc ✓ + eslint ✓；镜像已部署

### 线上验收
- ✅ 漫剧 1 镜：workflow/run → workflowId；image 任务 success（localhost:8188 本地图 URL 落库）；video 任务 loading 状态落库
- ✅ GET /api/workbench/workflows/{id} 返回素材与状态；画布页 /create?view=canvas&id=... 200
- ✅ 历史工作台视频任务：GET tasks/:id → success + 自动刷新有效链接（GET 206 video/mp4）

## 验收口径
- P1：capabilities 返回 30 模型 + enabled/disabled + 单价
- P2：工作台选模型 → 生成 → 真实出图入画布（Seedream 4.5 必通）
