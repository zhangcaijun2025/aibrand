---
name: aibrand-dashboard
description: AiBrand 数据看板和运营分析。查看运营数据/Dashboard/报表/统计/KPI/质量指标/监控/告警. Use when user mentions 运营数据/Dashboard/报表/统计/数据看板/KPI/质量/监控/告警/指标/overview/metrics.
version: 0.1.0
author: AiBrand Studio
---

## When to Use

**触发条件**（满足任一即调用）：
- 查看运营数据/今日数据/数据看板/Dashboard
- 报表/统计/指标/KPI/数据概览
- 质量监控/质量指标/质量报告/质量告警
- 系统监控/系统状态/健康检查
- 分析数据/数据分析/analytics
- 进化引擎/metrics/演化指标

## How to Invoke

### 方式1: 通过 unified-chat（推荐，自动路由）

```
exec curl -s -X POST http://127.0.0.1:3099/api/agent/unified-chat \
  -H "Content-Type: application/json" \
  -H "Cookie: aibrand_token=dev_auto_login_token" \
  -d '{"message":"<用户原始消息>","context":{"platform":"feishu","source":"openclaw","skill":"dashboard"}}'
```

### 方式2: 直接调用具体端点（精确查询）

| 功能 | 端点 | 方法 |
|---|---|---|
| Dashboard 总览 | `/api/dashboard` | GET |
| 数据分析 | `/api/analytics/overview` | GET |
| 质量总览 | `/api/quality/overview` | GET |
| 质量指标 | `/api/quality/metrics` | GET |
| 质量告警 | `/api/quality/alerts` | GET |
| 质量报告 | `/api/quality/report` | GET |
| 质量监控 | `/api/quality/monitor` | GET |
| 质量记录 | `/api/quality/records` | GET |
| 质量评估 | `/api/quality/evaluate` | POST |
| 系统监控 | `/api/system/monitor` | GET |
| 系统健康 | `/api/health` | GET |
| 进化指标 | `/api/evolution/metrics` | GET |
| 进化状态 | `/api/evolution/status` | GET |
| Metrics | `/api/metrics` | GET |
| 监控 | `/api/monitor` | GET |
| Ops | `/api/ops` | GET |

调用示例：
```
exec curl -s -H "Cookie: aibrand_token=dev_auto_login_token" http://127.0.0.1:3099/api/dashboard
```

## Response Handling

数据查询类 API 返回 JSON，提取关键字段用表格或列表格式化呈现给用户：
- 总数/同比/环比 → "📊 总数: X (↑Y% vs 上周)"
- 时间序列 → "趋势: 上升/下降/平稳"
- Top 列表 → "Top 5: 1.xxx 2.xxx 3.xxx"

## Examples

**用户**：查看今天的运营数据

**Action**：
```
exec curl -s -H "Cookie: aibrand_token=dev_auto_login_token" http://127.0.0.1:3099/api/dashboard
```

**用户**：质量告警情况

**Action**：
```
exec curl -s -H "Cookie: aibrand_token=dev_auto_login_token" http://127.0.0.1:3099/api/quality/alerts
```

## Related

- aibrand-geo: GEO/SEO 搜索排名数据
- aibrand-publish: 发布任务状态
