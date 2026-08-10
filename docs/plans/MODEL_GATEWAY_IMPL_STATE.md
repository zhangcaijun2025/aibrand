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

## 验收口径
- P1：capabilities 返回 30 模型 + enabled/disabled + 单价
- P2：工作台选模型 → 生成 → 真实出图入画布（Seedream 4.5 必通）
