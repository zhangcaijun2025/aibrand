---
name: aibrand-geo
description: AiBrand GEO/SEO 搜索引擎优化。品牌搜索/地理搜索/本地搜索排名/关键词优化/搜索权威度/搜索情绪/搜索监控. Use when user mentions GEO/SEO/搜索排名/关键词优化/搜索引擎/品牌搜索/本地搜索/搜索权威度/搜索情绪/搜索监控/Geo probes.
version: 0.1.0
author: AiBrand Studio
---

## When to Use

**触发条件**（满足任一即调用）：
- GEO 优化/GEO 排名/地理搜索/本地搜索
- SEO 优化/搜索引擎优化/搜索排名
- 关键词优化/关键词分析/关键词调研
- 搜索权威度/品牌权威度
- 搜索情绪/舆情监控/品牌情绪
- 搜索监控/搜索报告/搜索分数
- AI Search/AI 搜索/智能搜索健康

## How to Invoke

### 方式1: 通过 unified-chat（推荐）

```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"<用户原始消息>","context":{"platform":"feishu","source":"openclaw","skill":"geo"}}'
```

### 方式2: 直接调用 GEO 端点

| 功能 | 端点 | 方法 |
|---|---|---|
| GEO 健康检查 | `/api/geo/health` | GET |
| AI 搜索健康 | `/api/geo/ai-search/health` | GET |
| 关键词管理 | `/api/geo/keywords` | GET/POST |
| GEO 优化建议 | `/api/geo/optimize` | POST |
| GEO 分数 | `/api/geo/score` | GET |
| 搜索权威度 | `/api/geo/authority` | GET |
| 搜索情绪 | `/api/geo/sentiment` | GET |
| 实时情绪 | `/api/geo/sentiment/realtime` | GET |
| GEO 报告 | `/api/geo/report` | GET |
| GEO 报告列表 | `/api/geo/reports` | GET |
| GEO 监控 | `/api/geo/monitor` | GET |
| GEO 区域 | `/api/geo/region` | GET |
| GEO 可视化 | `/api/geo/visual` | GET |
| GEO 工作流 | `/api/geo/workflows` | GET |
| GEO 演化 | `/api/geo/evolve` | POST |
| GEO 集成 | `/api/geo/integration` | GET |
| GEO 数据库 | `/api/geo/db` | GET |
| GEO Schema | `/api/geo/schema` | GET |
| Probes 列表 | `/api/geo/probes` | GET |
| Probes 健康 | `/api/geo/probes/health` | GET |
| Probes 同步 | `/api/geo/probes/sync` | POST |
| Probes 导入 | `/api/geo/probes/ingest` | POST |
| Probes 调度 | `/api/geo/probes/schedule` | POST |
| Probes 导出 | `/api/geo/probes/export` | GET |
| V3 Benchmark | `/api/geo/v3/benchmark` | GET |
| V3 Monitor | `/api/geo/v3/monitor` | GET |
| V3 Score | `/api/geo/v3/score` | GET |

调用示例：
```
exec curl -s -H "Cookie: aibrand_token=dev_auto_login_token" http://127.0.0.1:3099/api/geo/score
exec curl -s -H "Cookie: aibrand_token=dev_auto_login_token" http://127.0.0.1:3099/api/geo/keywords
```

## Response Handling

- 分数类数据 → "🎯 GEO 分数: 85/100 (优秀)"
- 关键词列表 → 表格呈现 Top 10
- 优化建议 → 编号列表，每条带优先级标签
- 报告 → 提供摘要 + 完整链接

## Examples

**用户**：GEO 优化建议

**Action**：
```
exec curl -s -X POST http://127.0.0.1:3099/api/geo/optimize \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"url":"https://example.com","keywords":["AI助手"]}'
```

**用户**：查看关键词排名

**Action**：
```
exec curl -s -H "Cookie: aibrand_token=dev_auto_login_token" http://127.0.0.1:3099/api/geo/keywords
```

## Related

- aibrand-dashboard: 整体运营数据
- aibrand-content: 基于 SEO 关键词创作内容
