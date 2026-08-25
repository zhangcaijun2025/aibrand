# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup: camera names and locations, SSH hosts and aliases, preferred TTS voices, speaker/room names, device nicknames, anything environment-specific.

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.


## ModLens (CLI)

插件式视觉工具：给纯文本 LLM 补充视觉，图片 → 结构化 JSON 证据（OCR / 布局 / 语义）。

- 安装位置：`tools/modlens`（npm 包 `@liustack/modlens` v3.16.6）
- 启动器：`tools/modlens.cmd`（或 `node tools/modlens/node_modules/@liustack/modlens/dist/main.js`）
- 常用命令：`modlens analyze -i <图片>`、`modlens doctor`、`modlens config`、`modlens recover-paste`
- **视觉引擎（可用）**：gemini-api → `gemini-3.7-flash`（新格式 key 已配置，实测 OCR/布局/语义正常；偶发 503 过载，重试即可）
- 备选：antigravity-cli（agy v1.1.13 在 `tools/agy/bin`，已登录 ✅ 但账号不符合 Antigravity 资格，视觉不可用）；openai → 智谱 `glm-4.5v`（待充值）；QWEN 网关/GLM/MiniMax 均欠费；claude-cli 被路由到 DeepSeek 纯文本模型看不了图
- 配置：`C:/Users/XIAOMI/.modlens/config.json`（`modlens config set <key> <value>`）

## modlens-look（简洁识图）

modlens 的简洁版封装：图片 → 干净的中文报告（总结 / OCR / 场景 / 实体 / 主色 / 风格 / 耗时 / 链路），比原始 JSON 易读。

- 启动器：`tools/modlens-look.cmd` / `tools/modlens-look.mjs`（已入 PATH）
- 用法：
  ```bat
  modlens-look 图片.png                          :: 单张识别
  modlens-look a.png b.png c.png                :: 批量识别
  modlens-look 图片.png --provider gemini-api   :: 指定引擎（默认 gemini-api）
  modlens-look result.json                       :: 直接解析已有结果文件
  ```
- 工作流：把图片路径发给 Agent（或聊天里直接贴图）→ Agent 跑 `modlens-look` → 简洁结果回对话
- 依赖：modlens（Gemini 视觉）；结果里 `链路: gemini-api✓` 表示成功，`✗` 表示该引擎失败降级
- 报错排查：`链路` 全 ✗ 且落到 claude-cli → Gemini 503 过载，重试即可

---

Add whatever helps you do your job. This is your cheat sheet.

## Related

- [Agent workspace](/concepts/agent-workspace)
