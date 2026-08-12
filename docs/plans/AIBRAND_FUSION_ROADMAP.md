# AiBrand 生成力融合路线图（MiniMax H3 + 本地 ComfyUI + 多模型）

> 更新：2026-08-12。目标：把 AiBrand 打造成真正有生成力的工作台 —— 图片、视频、漫剧在本机完成基础开发/测试/打样。

## 总体架构

```text
统一模型网关 (aibrand-studio/src/lib/model-gateway)
├── 图像：comfy-sd15（本地 ComfyUI / DirectML，免密钥） → seedream-4-5（线上，降级链）
├── 视频：minimax-h3（MiniMax H3 v2，国内 api.minimaxi.com）→ seedance-2-5
└── 工作流引擎：跨模态模板（封面→视频 / 多尺寸 / A/B / 漫剧分镜→动态漫）
```

## 阶段状态

| 阶段 | 内容 | 状态 |
|------|------|------|
| P0 | 统一网关接入（comfy-local 适配器 + 注册 + 降级链） | ✅ 完成（12+ 网关测试） |
| P1 | 本地 ComfyUI 部署（v0.7.0 + DirectML + SD1.5，自启 + nginx `/comfy/`） | ✅ 完成（真实出图） |
| P2 | MiniMax H3 v2 适配器（submit/poll、首尾帧、多参考图、resolution 必填） | ✅ 完成（真实出片验证） |
| P3 | 漫剧分镜管线（剧本切镜 → ComfyUI 出图 → H3 首尾帧转场） | ✅ 完成（本轮） |
| P3.5 | 智创中心工作台接入（ComfyUI 模型入目录+健康徽标；视频 Tab 走统一网关） | ✅ 完成（真实验收） |
| P4 | 后端 aibrand-backend MiniMax 渠道（统一网关收敛） | ✅ 完成（真实验收） |
| P5 | 工作台漫剧 UI（分镜输入/参数/逐镜预览/进度） | ✅ 完成（真实端到端验收） |

## P2 关键校准（真实 API 实测）

- Key 属国内平台：`MINIMAX_BASE_URL=https://api.minimaxi.com`（国际站返回 401 invalid api key）
- H3 v2 `resolution` 必填（768P / 2K），适配器默认 `768P`
- v2 鉴权纯 Bearer；`content` 为多模态数组；`task.content.url` 取结果
- 提交/轮询真实链路已通：`queued → running → succeeded`，返回 OSS mp4

## P3 漫剧管线设计

入口：`POST /api/models/unified/workflow/run`

```json
{
  "workflowId": "manhua-episode",
  "prompt": "第一镜：主角醒来\n第二镜：窗外城市\n第三镜：出门",
  "sceneCount": 3,
  "style": "国漫风格，电影感构图，高细节",
  "aspectRatio": "16:9",
  "imageModel": "comfy-sd15",
  "videoModel": "minimax-h3"
}
```

执行顺序（先全出图、再逐镜视频）：

1. `splitScriptIntoScenes`：按行 → 按句 → 均匀切分，拆成 1-8 镜
2. 每镜出图：`comfy-sd15`（本地 SD1.5，512-768 短边，iGPU 友好）
3. 每镜视频：`minimax-h3`，第 i 镜图为**首帧**、第 i+1 镜图为**尾帧**（转场），最后一镜仅首帧
4. 本地图桥：ComfyUI 的 `localhost` 图片 URL 自动转 Base64 Data URI 再提交 H3（官方 image_url 支持 data URI；容器内自动回退 `host.docker.internal`）

实现文件：

- `src/lib/model-gateway/workflow-engine.ts`：动态模板 `expand()` + `splitScriptIntoScenes` + 尾帧接线
- `src/app/api/models/unified/workflow/run/route.ts`：接受 sceneCount/style/aspectRatio/imageModel/videoModel
- `src/lib/model-gateway/adapters/minimax-video.ts`：`toDataUriIfLocal` 本地图桥 + 参考图 ≤9 上限
- 测试：workflow-engine 4 例（含切镜/展开/首尾帧）、p6 minimax 新增 Data URI 用例；tsc ✓

## P4 后端渠道收敛（2026-08-12）

- ✅ aibrand-ai 新增 `unified-gateway` 视频渠道（`AiLogChannel.UnifiedGateway`）：`createVideo` 转发到 aibrand-web `/api/models/unified/generate`，任务状态经 `/api/models/unified/query/{taskId}` 轮询，回调写入 AiLog
- ✅ 网关 internal 服务间鉴权：`x-internal-token` 共享密钥（geo-auth 新增 internal 来源），internal 调用跳过网关计费（由 aibrand-ai 积分体系计费）
- ✅ config.js 注册 `minimax-h3`（channel=unified-gateway，65 积分/次）；compose 注入 `UNIFIED_GATEWAY_URL` + 统一 `JWT_SECRET`
- ✅ 修复镜像构建：aibrand-ai 依赖补 `cosmiconfig`（nest-typed-config fileLoader 必需，否则容器 crash-loop）
- ✅ 修复跨系统 JWT：aibrand-auth guard 归一化 payload（sub/userId → id）
- ✅ **真实出片验收**：网关 internal 通道（aibrand-ai 渠道同款调用）→ MiniMax H3 → queued → completed（OSS mp4）
- ⚠️ 遗留（既有架构）：aibrand-ai 用户积分走 Mongo 用户体系，与 Studio Postgres 用户不同源；用户级调用需先在 Mongo 有对应用户

## P5 漫剧工坊 UI（2026-08-12）

- ✅ 智能工作流面板（UnifiedWorkflowPanel）选中「漫剧分镜 → 动态漫」时显示漫剧参数：镜数 1-8、画幅、画面风格、图片模型（comfy-sd15/seedream-4-5）、视频模型（minimax-h3/seedance-2-5）
- ✅ 剧本输入区多行提示「每行一镜」；步骤结果以「第 N 镜 · 图片/视频」友好标签展示，图片预览 + 视频播放器 + 2s 进度轮询
- ✅ `workflow/run` 调用加 20 分钟超时 + 等待提示（本地出图 1-2 分钟/镜）
- ✅ i18n 中英新增 11 键；面板测试 4/4（含漫剧参数传递与标签断言）
- ✅ **真实端到端验收**：2 镜剧本 → ComfyUI 本地出图 ×2（completed）→ MiniMax H3 视频 ×2（completed，OSS mp4）

## P3.5 智创中心工作台接入（2026-08-12）

- ✅ `comfy-sd15` 入模型目录并启用（图片 Tab 默认选中），提交链路 工作台 → 画布 → task-runner → comfy-local 真实本地出图
- ✅ `minimax-h3` 启用（视频 Tab 可选）
- ✅ 新增 `/api/models/unified/comfyui/health`（实时探测 :8188）+ 工作台「本地引擎 在线/离线」徽标（30s 轮询）
- ✅ 视频 Tab 接入统一网关：task-runner 视频分支调 `unifiedGenerate`，`gatewayTaskId` 写入任务 params；`GET /api/workbench/tasks/:id` 把网关状态映射为 loading/success/error；前端轮询放宽到 10 分钟
- ✅ 线上真实验收：workbench generate(video/minimax-h3) → run=loading → 轮询 success（OSS mp4）

## 验收口径

- P2：工作台选 minimax-h3 → 提交 → 真实出片（✅ 已用真实 Key 验证）
- P3：workflow/run 跑 manhua-episode → 每镜图 completed + 视频 queued，query 轮询真实出片
- P4/P5：后端渠道 + UI 面板

## 环境事实（2026-08-12）

- 本机无 CUDA，Intel Arc iGPU + DirectML；ComfyUI v0.7.0 @ `D:\king2046\tools\comfyui`，启动脚本 `scripts/start-comfyui.ps1`
- MiniMax Key 已写入 `D:\king2046\.env` 与 `project/aibrand-studio/.env.local`（gitignore，勿提交）
- 注意：.env 变更后需重启容器/进程才生效
