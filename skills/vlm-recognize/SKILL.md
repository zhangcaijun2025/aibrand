---
name: vlm-recognize
description: 智谱 GLM-4V 视觉模型识图。用户发任何截图/图片/贴图时自动触发，精准识别界面布局、文字、按钮、报错、异常状态。Use when 用户发图/发截图/贴图/看图片/识别图片/读取截图/截图内容/图片内容/这是什么图/看图说话/image/screenshot/picture.
version: 1.0.0
author: AiBrand Studio
---

# VLM 识图（GLM-4V）

## 触发条件（自动，无需用户要求）
- 用户在对话中发送图片、截图、贴图（常见路径：`D:\openclaw\cache\temp\codex-clipboard-*.png`）
- 用户要求"看图/识别图片/截图内容/这个图片是什么/描述图片"
- 排查 UI 问题、报错界面、页面渲染异常等需要读图的场景

## 执行方式（首要模型：智谱 GLM-4V）

```powershell
node D:\king2046\scripts\vlm-recognize.mjs <图片路径...> [--prompt "自定义提示词"] [--model glm-4v-plus]
```

- 默认模型 `glm-4v-flash`（免费），一次可传多张图
- 识别不清或需要更高精度 → 加 `--model glm-4v-plus`
- 密钥：`GLM_API_KEY`（脚本自动读取 `D:\king2046\project\aibrand-studio\.env.local`，也支持环境变量）

## 默认提示词
要求模型按区域精确描述：界面布局、可见文字、按钮、图标、图片、颜色、报错信息、异常状态。

## 注意
- 不要退回 Windows OCR / 像素分析兜底，直接走 GLM-4V
- 识别结果用于定位问题根因，再结合代码/日志给出结论
