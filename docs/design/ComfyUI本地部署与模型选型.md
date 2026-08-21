# ComfyUI 本地+云端部署方案与本地模型选型

> 编制：2026-08-20 ｜ 依据：本机硬件实测 + ComfyUI 环境盘点（节点/模型逐项核对）
> 结论先行：**本机本地 ComfyUI = SD1.5 轻量工作流（免费档/离线/兜底）；SDXL/一致性/IP-Adapter/视频 = 云端（经统一网关）**

---

## 0. 本地 ComfyUI 相关模型全量清单（2026-08-20 文件系统实测）

> 引擎：`D:\king2046\tools\comfyui\models\`（运行中）；Desktop 壳 `D:\king2046\comfyUI\` 无模型；全盘无其他 ComfyUI 模型缓存

### 已有（可用）

| 类别 | 文件 | 大小 | 用途 | 与模板匹配 |
|---|---|---|---|---|
| checkpoints | `v1-5-pruned-emaonly.safetensors` | **4.07GB（全精度版）** | SD1.5 基础（L1 默认） | ✅ L1 全模板 |
| checkpoints | `Realistic_Vision_V6.0_NV_B1_fp16.safetensors` | 2.03GB | 写实/产品向 | ✅ 旧 JSON 引用 |
| controlnet | `control_v11p_sd15_canny_fp16.safetensors` | 689MB | Canny 边缘控制 | ✅ T17 一致性可用 |
| （models 根） | `u2net.onnx` | 168MB | 抠图（AibrandRemoveBg） | ✅ remove_bg 模板 |

### 缺失（目录为空）

| 类别 | 现状 | 影响 |
|---|---|---|
| `loras/` | 空 | LoraLoader 节点在但无模型 → T17 LoRA 不可用 |
| `clip_vision/` | 空 | IP-Adapter 需要 → 一致性参考图无本地方案 |
| `vae/` | ✅ **已下载** `vae-ft-mse-840000-ema-pruned.safetensors`（319MB，hf-mirror） | 色彩/细节提升已就绪 |
| `upscale_models/` | ✅ **已下载** `RealESRGAN_x4.pth`（63.9MB，ModelScope，UA+Referer 解决 403） | 超分模板升级为 AI 超分 |
| `controlnet/` | ✅ **已下载** `control_v11p_sd15_openpose_fp16`（689MB，hf-mirror 镜像仓库，完整性校验 OK） | T17 多视角/姿态控制就绪 |
| `checkpoints/` | ✅ **已下载** `v1-5-pruned-emaonly-fp16`（2034MB，hf-mirror 镜像仓库，完整性校验 OK）；**默认 checkpoint 已切 fp16**（commit 4f2ce5a） | 推理提速 |
| `embeddings/` | 空 | 无负面提示词 embedding（可增强防畸形） |
| `unet/` `text_encoders/` `diffusion_models/` | 空 | SDXL 系未本地（正确——云端） |

> 下载通道（实测）：GitHub/HF 直连不可达且 Windows curl schannel TLS 故障 → 用 **Node(OpenSSL) + hf-mirror.com / modelscope.cn** 国内镜像成功（脚本 `scripts/download-comfyui-models-node.js`）

### 重启验证（2026-08-21，ComfyUI 0.7.0 DirectML :8188）

> 环境侧待办「ComfyUI 重启验证 upscale 生效」已完成。重启后 `/object_info` 实测：

| 类别 | 注册结果 |
|---|---|
| checkpoints | ✅ 3 个：`v1-5-pruned-emaonly-fp16`（默认）/ `Realistic_Vision_V6.0_NV_B1_fp16` / `v1-5-pruned-emaonly` |
| controlnet | ✅ 2 个：`control_v11p_sd15_canny_fp16` + `control_v11p_sd15_openpose_fp16`（openpose 生效）|
| vae | ✅ `vae-ft-mse-840000-ema-pruned` |
| upscale | ✅ `RealESRGAN_x4.pth` 已注册（UpscaleModelLoader options）|

**实测发现**：
1. **后台启动陷阱**：`Start-Process`/`Start-Job` 启动的 ComfyUI 在 "Starting server" 后静默退出（DirectML 初始化需控制台句柄）；**前台持久运行（后台 job 直连 python）稳定**。当前以 DSH 后台任务运行，重启机器需重新拉起。
2. **upscale 执行 OOM**：`RealESRGAN_x4`（4x 超分）在 iGPU 1024MB 上执行报 `GPU 设备实例已经暂停`（显存不足）——**模型有效但本机不可执行**，符合「超分走云端」结论；ComfyUI 在 GPU 重置后自动恢复。
3. `ComfyUI-Inspyrenet-Rembg-main` 仍缺 `transparent_background` 依赖（非本次引入，移除背景有 `AibrandRemoveBg`/u2net 兜底）。

### 部署配置（2026-08-21 落实，脚本 `scripts/start-comfyui.ps1` v3）

**硬件适配启动参数**（本机：Intel Core Ultra 5 125H 14C/18T + Arc iGPU 1024MB 共享 + 32GB RAM，DirectML 无 CUDA）：

```powershell
python main.py --listen 0.0.0.0 --port 8188 \
  --directml --lowvram --use-pytorch-cross-attention \
  --cpu-vae --windows-standalone-build --cache-none
```

| 参数 | 依据 |
|---|---|
| `--directml` | 无 CUDA，Intel Arc iGPU 走 DirectML（torch-directml）|
| `--lowvram` | 1024MB 显存：低显存模式（SD1.5 fp16 够用）|
| `--use-pytorch-cross-attention` | DirectML 下 PyTorch 原生 attention 稳定（实测 "Using pytorch attention"）|
| `--cpu-vae` | VAE 解码放 CPU，防 1GB 显存 OOM |
| `--windows-standalone-build` | 分离进程官方开关（后台运行支持）|
| `--cache-none` | 关闭模型缓存省内存（32GB 下可选）|

**后台稳定性结论（实测多方案）**：
- ✅ **DSH 后台任务（stdio 继承 + Watch 循环）** = 唯一稳定方式（崩溃自动重启）
- ❌ `Start-Process -RedirectStandardOutput`：**崩溃**（stdout 重定向 → torch-directml 初始化即崩，日志为空）
- ❌ `WMI Win32_Process.Create` / `cmd /c start`：**崩溃**（无有效 stdio 环境）

**性能基线（fp16 checkpoint 实测）**：
- SD1.5 fp16 512×512 20 步（iGPU DirectML）：**端到端 ~101s/张**（与设计文档基线 1-2 分钟一致）
- 输出验证：`hw-test_00001_.png` 356KB 生成成功

**注意**：`--cpu-threads` 不是合法参数（0.7.0 无此选项，usage 校验确认），不要使用。

### 自定义节点

| 节点 | 状态 |
|---|---|
| `AibrandNodes`（AibrandRemoveBg/AibrandCanny） | ✅ 正常 |
| `ComfyUI-Inspyrenet-Rembg-main`（InspyrenetRembg） | ⚠️ 导入失败（缺 `transparent_background` 依赖） |

### 其他位置（非 ComfyUI）
- `D:\king2046\.cache\huggingface`：musicgen-small（音频生成，无关）
- `C:\Users\XIAOMI\.cache\huggingface`：all-MiniLM-L6-v2（RAG 嵌入，无关）

### 优化观察
- `v1-5-pruned-emaonly` 是 **4GB 全精度**版；iGPU DirectML + lowvram 下**换成 fp16 版（~2GB）推理更快、显存更低**（可选优化，不影响正确性）

---

## 1. 本机硬件实测

| 项 | 实测 | 对部署的影响 |
|---|---|---|
| CPU | Intel Core Ultra 5 125H（14 核 18 线程，Meteor Lake，含 Intel AI Boost NPU） | CPU 推理可用；NPU 当前 ComfyUI/DirectML 不支持（未来） |
| GPU | **仅 Intel Arc 集成显卡（iGPU）**，DirectML，无 NVIDIA/CUDA；ComfyUI 可见 1024MB 共享显存 | **决定性约束**：显存 1GB 级 → 只适合 SD1.5（512-768px） |
| RAM | ~32GB | 充足；CPU/共享内存推理无压力 |
| 磁盘 | C: 141.9GB / D: 459.7GB 空闲 | 充足，模型可放 D 盘 |
| 当前引擎 | tools/comfyui v0.7.0，`--directml --lowvram --use-pytorch-cross-attention`，torch 2.4.1+cpu + torch-directml | 配置已是最优（见 §3） |

## 2. 本地 vs 云端分工（混合架构）

```
┌─ 本地 ComfyUI（免费/离线/兜底）─────────────────────┐
│  SD1.5 轻量工作流：文生图/图生图/局部重绘/扩图/抠图/  │
│  高清放大/ControlNet(Canny+OpenPose)                 │
│  512-768px · 1-2 分钟/图（iGPU DirectML）             │
└──────────────┬──────────────────────────────────────┘
               │ comfy-sd15（免密钥，已注册统一网关）
┌──────────────▼──────────────────────────────────────┐
│ 统一模型网关（model-gateway）降级链                  │
│  comfy-sd15 → seedream-4-5 → zimage → qwen-image…    │
└──────────────────────────────────────────────────────┘
┌─ 云端（经网关已接）──────────────────────────────────┐
│  图片：Seedream 4.5/5.0、GPT-Image 2、Qwen-Image、    │
│        Nano Banana、Midjourney（代理）                │
│  视频：MiniMax H3（已验证出片）、Seedance、Kling…     │
│  SDXL+/IP-Adapter 一致性/高分辨率：未来上云端 GPU      │
└──────────────────────────────────────────────────────┘
```

**分工原则**：
- **本地**：免费档、离线可用、API 兜底（P0 E2E 已验证真实出图）；模型仅 SD1.5 系
- **云端**：生产质量（高清/一致性/视频）、计费/日志/AiLog 统一（backend unified-gateway 通道）
- **路由**：`comfy-sd15` 已在统一网关注册并作为降级链首位（T00 已对齐），本地失败自动切云端——混合架构已就绪

## 3. 本地部署方式确认（无需改动）

当前 `start-comfyui.ps1` 参数已是最优，核验结论：

| 参数 | 作用 | 核验 |
|---|---|---|
| `--directml` | Intel iGPU 推理（无 CUDA 下唯一加速路径） | ✅ 在用 |
| `--lowvram` | 1GB 显存自适应分块，防 OOM | ✅ 在用 |
| `--use-pytorch-cross-attention` | 降低 cross-attention 显存峰值 | ✅ 在用 |
| 512-768px / 8 倍数 | iGPU 友好（模板已内置 ASPECT_TO_SIZE） | ✅ 在用 |

**结论：本地部署方式维持现状即可**；仅当遇到 OOM 时降默认分辨率到 512px 或临时 `--cpu`。**不建议**为本地下载 SDXL（8GB 显存需求，iGPU 即使 lowvram 也会 5-10 分钟/张且易 OOM）——SDXL 走云端。

## 4. 本地模型下载清单（含优先级）

> 存放目录：`D:\king2046\tools\comfyui\models\{checkpoints,loras,controlnet,vae,upscale_models}`（D 盘空间充足）
> 国内下载建议用 hf-mirror.com 镜像（`HF_ENDPOINT=https://hf-mirror.com`）或 GitHub 直连

### ✅ 已有（无需下载）
| 文件 | 用途 |
|---|---|
| `v1-5-pruned-emaonly.safetensors` | SD1.5 基础（L1 默认 checkpoint） |
| `Realistic_Vision_V6.0_NV_B1_fp16.safetensors` | 写实/产品向 checkpoint |
| `control_v11p_sd15_canny_fp16.safetensors` | Canny ControlNet（T17 一致性已就绪） |
| `u2net.onnx` | 抠图（AibrandRemoveBg） |

### 🔴 强烈建议下载（小而高价值，~450MB）
| 文件 | 大小 | 来源 | 用途 |
|---|---|---|---|
| `RealESRGAN_x4plus.pth` | ~64MB | github.com/xinntao/Real-ESRGAN releases v0.1.0 | upscale 模板真超分（当前 ImageScaleBy 仅 lanczos 放大） |
| `vae-ft-mse-840000-ema-pruned.safetensors` | ~335MB | huggingface.co/stabilityai/sd-vae-ft-mse-original | VAE 修复（色彩/细节提升，配 SD1.5 通用） |

### 🟡 可选（按需，T17 多视角/姿态控制增强）
| 文件 | 大小 | 来源 | 用途 |
|---|---|---|---|
| `control_v11p_sd15_openpose_fp16.safetensors` | ~1.35GB | huggingface.co/lllyasviel/control_v11p_sd15_openpose | OpenPose 姿态控制（T17 multi-view 产品多角度） |
| `control_v11f1p_sd15_depth_fp16.safetensors` | ~1.4GB | huggingface.co/lllyasviel/control_v11f1p_sd15_depth | 深度控制（构图/场景） |

### 🟢 LoRA（用户按风格需求自选，文件小 50-200MB）
- LoraLoader 节点已就绪、目录空——从 CivitAI 选 1-2 个 SD1.5 风格 LoRA 放入 `models/loras/` 即可
- 电商建议：产品摄影/质感类 LoRA；人物/角色类按需

### ⛔ 暂不本地（上云端）
| 项 | 原因 |
|---|---|
| SDXL 系 checkpoint | 8GB 显存需求，iGPU 不可行 |
| IP-Adapter 模型 + CLIP-Vision | 需装 IPAdapter_plus 自定义节点 + ~2.4GB 模型，iGPU 收益低；一致性走云端 Seedream 参考图或云端 GPU |
| 视频模型（Wan 本地等） | 显存/速度不可行，走已接视频 API |

## 5. 落地动作（可执行）

1. **下载脚本**：`scripts/download-comfyui-models.ps1`（见附件，下载 §4 🔴 两项 + 可选 ControlNet，校验后放对应目录）
2. **验证**：下载后重启 ComfyUI，`GET /object_info` 确认 `UpscaleModelLoader` 模型列表出现 RealESRGAN、VAE 可选
3. **云端**：一致性/高清场景在统一网关选云端模型（已接），无需额外部署

---

*本方案基于硬件实测 + 环境盘点，避免为 iGPU 下载跑不动的模型（SDXL/IP-Adapter），把预算集中在本地真能用的 SD1.5 增强件（超分/VAE/ControlNet）。*
