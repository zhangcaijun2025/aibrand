# AiBrand Extension v3.0

**AI-Native Multi-Platform Publishing Terminal**

一站式的 AI 驱动多平台内容发布 Chrome 插件。与 AiBrand 内容工厂深度集成，
支持质检把关、智能排期、一键多平台发布。

## 功能

- 🚀 **一键多发** — 同时发布到微博、抖音、小红书、B站、知乎等
- 🛡️ **质检把关** — 质量总监 Agent 4 维度自动审核（内容·GEO·合规·原创）
- 🔗 **实时连接** — WebSocket 实时通信，任务秒级推送
- 📊 **结果反馈** — 逐平台成功/失败状态 + 错误归类 + 改善建议
- 🎨 **品牌设计** — AiBrand 统一设计语言，Dark Theme
- ⚙️ **灵活配置** — 自动发布、质检开关、重试次数可配

## 架构

```
Extension (WXT + React + TypeScript)
    ↕ WebSocket (实时双向)
Backend (NestJS + Next.js BFF)
    ↕
AI Agents (Dify/n8n 工作流)
```

## 开发

```bash
pnpm install
pnpm dev          # 开发模式 (WXT HMR)
pnpm build        # 生产构建
pnpm test         # 单元测试
pnpm test:run     # 单次运行测试
```

## 项目结构

```
src/
├── entrypoints/      # 入口: background, content, sidepanel, popup, options
├── core/             # 核心: websocket, auth, task-executor, offline-queue, quality-gate, telemetry
├── platforms/        # 平台: registry, injector, uploader, configs/
├── ui/               # UI: design system components, hooks, tokens
└── shared/           # 共享: types, constants, utils
```

## 平台接入

在 `src/platforms/configs/` 中定义平台配置：

```typescript
{
  id: 'weibo', name: '微博', type: 'dynamic',
  pipeline: [
    { id: 'fill_content', type: 'input', target: { selector: 'textarea', aiHint: '内容输入框' }, value: { template: '{{content}}' } },
    { id: 'click_publish', type: 'click', target: { selector: '.publish-btn', aiHint: '发布按钮' } },
  ],
  aiInjection: { enabled: true, prompt: '...', fallbackSelectors: {...} },
  contentConstraints: { titleMaxLength: 100, contentMaxLength: 2000 },
}
```

## 测试

```bash
# 单元测试 (27+ tests)
pnpm test:run

# E2E 测试 (需要 Chrome + Extension 构建)
pnpm exec playwright test
```

## 技术栈

- **Extension Framework**: WXT (Vite-native)
- **UI**: React 18 + Tailwind CSS + Zustand
- **Communication**: WebSocket (ws)
- **Storage**: chrome.storage.session + IndexedDB (idb-keyval)
- **Testing**: Vitest + Playwright
- **Backend**: NestJS + Next.js (in aibrand-server / aibrand-studio)

## License

Proprietary — AiBrand © 2026
