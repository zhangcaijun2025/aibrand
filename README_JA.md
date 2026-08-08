# AiBrand Studio

> AI を活用したコンテンツ成長・収益化プラットフォーム — Create · Publish · Engage · Monetize

AiBrand は AI エージェントを活用し、ワンオペ（一人会社）、クリエイター、ブランド向けにコンテンツの制作・配信・エンゲージメント・収益化のクローズドループを提供します。

## 主な機能

- **Create**：AI コンテンツ制作（テキスト/画像/動画、バッチ生成、複数モデル対応）
- **Publish**：複数プラットフォームへの一括配信とスケジュール管理
- **Engage**：自動エンゲージメント、コメント分析、ブランドモニタリング
- **Monetize**：CPS / CPE / CPM のコンテンツ取引・決済モデル

## リポジトリ構成

| ディレクトリ | 説明 |
|--------------|------|
| `project/aibrand-studio` | フロントエンドと業務 API（Next.js 16 + React 19 + Prisma + BullMQ） |
| `project/aibrand-backend` | バックエンド Nx monorepo（aibrand-server + aibrand-ai + 18 共有ライブラリ） |
| `evolution-engine` | Python フェデレーテッド自己進化エンジン（8 フェーズループ） |
| `claude-bridge` | Claude Code ブリッジサービス |
| `deploy/` | デプロイ資産（docker-compose、LiteLLM、n8n、ComfyUI） |
| `docs/` | アーキテクチャ・設計ドキュメント |

## クイックスタート

```bash
# ワンクリックデプロイ（DB + AI サービス）
docker compose up -d

# フロントエンド開発
cd project/aibrand-studio
pnpm install && pnpm dev

# バックエンド開発
cd project/aibrand-backend
pnpm install
pnpm nx serve aibrand-server
```

詳細は [ARCHITECTURE.md](ARCHITECTURE.md) と各サブプロジェクトのドキュメントを参照してください。

## 技術スタック

Next.js 16 · React 19 · NestJS 11 · Prisma · PostgreSQL · MongoDB · Redis · LangChain · LiteLLM · BullMQ · Docker

## License

MIT
