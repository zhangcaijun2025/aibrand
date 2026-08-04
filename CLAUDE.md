# D:\king2046 工作区 Vibe

> 顶层轻量指针。详细项目规范见各子项目 CLAUDE.md。

## 主要项目

| 项目 | 路径 | 技术栈 |
|------|------|--------|
| AiBrand Studio | `project/aibrand-studio/` | Next.js 16 + React 19 + Prisma + LangChain |
| AiBrand Backend | `project/aibrand-backend/` | NestJS + MongoDB |
| 开发工具 | `skills/` `scripts/` `workflows/` | n8n + Dify + Claude Code |

## Vibe Coding 约定

1. 修改任何项目前，先读该项目的 CLAUDE.md
2. 涉及 3+ 文件改动 → 先进 /plan
3. 写完代码 → 自动 Lint + 审查
4. 安全敏感代码 → 追加 security-reviewer
5. 重要业务规则 → 保存为 Memory

## 环境速查

- n8n: http://localhost:5678
- Dify: http://localhost:5001
- AiBrand dev: http://localhost:3001
- Prisma Studio: `pnpm db:studio`
