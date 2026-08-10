# 统一模型网关 — 实现状态快照（供上下文压缩后续接）

> 更新：2026-08-10。设计见 `UNIFIED_MODEL_GATEWAY_DESIGN.md` 第九节（六阶段 + ADR）。

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

## 验收口径
- P1：capabilities 返回 30 模型 + enabled/disabled + 单价
- P2：工作台选模型 → 生成 → 真实出图入画布（Seedream 4.5 必通）
