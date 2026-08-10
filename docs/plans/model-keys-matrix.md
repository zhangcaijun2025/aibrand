# AiBrand 统一模型网关 — 密钥矩阵

> P0 交付物：模型 × 供应商 × 密钥可用性。已就绪模型可立即接入；待提供密钥模型先入库置灰。

## 已就绪（10 模型，4 把密钥）

| 模型 | 供应商 | 密钥 env | 状态 |
|---|---|---|---|
| Seedream 4.5 | 火山 ARK | `SEEDREAM_API_KEY` | ✅ |
| Seedream 5.0 Lite | 火山 ARK | 同上 | ✅（上游 ID 待校准） |
| Seedream 5.0 Pro | 火山 ARK | 同上 | ✅（上游 ID 待校准） |
| Qwen Image 2.0 | 阿里 DashScope | `QWEN_API_KEY` | ✅ |
| Qwen Image Plus | 阿里 DashScope | 同上 | ✅ |
| Qwen Image 2.0 Pro | 阿里 DashScope | 同上 | ✅（上游 ID 待校准） |
| Qwen Image 3.0 Pro | 阿里 DashScope | 同上 | ✅（上游 ID 待校准） |
| Wan 2.7 Pro（图像） | 阿里 DashScope | 同上 | ✅（上游 ID 待校准） |
| DeepSeek（文本） | DeepSeek | `DEEPSEEK_API_KEY` | ✅（走 LiteLLM） |
| GLM（文本） | 智谱 | `GLM_API_KEY` | ✅（走 LiteLLM） |

## 待用户提供密钥（20 模型）

| 供应商 | 模型 | 需求 |
|---|---|---|
| OpenAI | GPT Image 2 | OpenAI API Key |
| 即梦/火山 ARK | Nano Banana Pro / 2 / 2 Lite / 基础 | ARK 多模态权限 |
| 智谱 BigModel | ZImage Turbo、Hailuo 2.3 | BigModel Key |
| 火山 ARK | Seedance 2 / 2.5 / Pro（视频） | ARK 视频权限确认 |
| Google | Veo 3.1 / 3.1 Fast / Gemini Omni Flash | Vertex/Gemini Key |
| 可灵 | Kling 0.1 / 2.6 / 3.0 / 3.0 Omni | Kling API Key |
| MiniMax | MiniMax H3 | MiniMax Key |
| 生数科技 | Vidu Q2 | Vidu Key |
| Happy Horse | 1.1 / 1.0 | 供应商 Key |
| Midjourney | Niji 7 / V8.2 | 第三方代理 Key |

## 供应商可用性矩阵

| 供应商 | 图像 | 视频 | 密钥 | 适配器状态 |
|---|---|---|---|---|
| 火山 ARK | ✅ Seedream ×3 | ⏳ Seedance ×3（待权限） | ✅ | P2 图像 / P3 视频 |
| 阿里 DashScope | ✅ Qwen ×4 + Wan2.7Pro | ⏳ Wan2.7 视频（P3） | ✅ | P2 |
| 智谱 BigModel | ⏳ ZImage | ⏳ Hailuo | ❌ | P6 |
| OpenAI | ⏳ GPT Image 2 | — | ❌ | P6 |
| 即梦/ARK | ⏳ Nano Banana ×4 | ⏳ Happy Horse ×2 | ❌ | P6 |
| Google | — | ⏳ Veo ×2 + Gemini | ❌ | P6 |
| 可灵 | — | ⏳ Kling ×4 | ❌ | P6 |
| MiniMax | — | ⏳ H3 | ❌ | P6 |
| Vidu | — | ⏳ Q2 | ❌ | P6 |
| Midjourney | ⏳ Niji7 + V8.2 | — | ❌ | P6（代理） |

> 更新规则：每接入一家供应商 → 更新本矩阵 + 目录 enabled + 注册表 adapter。
