"""中央仪表盘 + 右侧面板数据构建（AGENTS.md 合规）"""

from datetime import datetime, timedelta
import random
from .stock_engine import (
    compute_scores,
    compute_market_sentiment,
    generate_news,
    generate_tasks,
    generate_top5_stocks,
    generate_ai_pipeline,
)
from .risk_control import risk
from .scheduler import get_cached
from .n8n_integration import get_workflow_status


def build_center_dashboard():
    """AGENTS.md §2 数据契约 + 缓存加速 + N8N 集成"""
    sentiment = compute_market_sentiment()
    scores = compute_scores()
    top5 = generate_top5_stocks()
    rc = risk.get_status()
    n8n = get_workflow_status()
    cached_quote = get_cached("last_quote")

    price_info = ""
    if cached_quote:
        price_info = f"最新价 {cached_quote['price']} 元"

    return {
        "market_sentiment": {
            "overall_score": sentiment.get("overall_score", 0),
            "overall_label": sentiment.get("overall_label", "🟡"),
            "hot_sectors": sentiment.get("hot_sectors", []),
            "capital_flow": f"北向{'净流入' if sentiment.get('capital_flow', {}).get('north', 0) > 0 else '净流出'} {abs(sentiment.get('capital_flow', {}).get('north', 0))}亿",
        },
        "top5_stocks": top5,
        "risk_control": rc,
        "ai_decision_weights": {"quant": 40, "tech": 25, "value": 20, "growth": 15},
        "tasks": {
            **n8n,
            "elapsed": "00:15:23",
            "phases": [
                ("数据采集 (Tushare)", "✅", "完成", "0.8s"),
                ("因子计算 (15/15)", "✅", "完成", "1.2s"),
                ("AI推理 (Dify)", "🔄", "进行中", "2.5s"),
                ("结果输出", "⏳", "等待中", "-"),
            ],
            "today_signals": rc["today_signals"],
            "alerts": rc.get("stop_loss_triggered_today", 0),
        },
        "news_stream": generate_news(),
        "system_status": {
            "health": "healthy",
            "data_source": "Tushare",
            "last_update": datetime.now().isoformat(),
            "api_remaining_calls": 120,
            "price_info": price_info,
        },
        "market_overview": {
            "sh_index": round(3100 + random.uniform(-20, 40), 2),
            "sh_change": round(random.uniform(-0.5, 1.2), 2),
            "sz_index": round(9400 + random.uniform(-50, 80), 2),
            "sz_change": round(random.uniform(-0.8, 1.8), 2),
            "north_flow": sentiment.get("capital_flow", {}).get("north", 0),
            "volume": random.randint(7500, 10500),
        },
        "system_status_ext": {"mode": "全自动闭环运行", "data_latency": "0.3s"},
        "ai_pipeline": {
            "phases": generate_ai_pipeline(),
            "current_stock": f"贵州茅台(600519) {price_info}",
            "confidence": scores["confidence"],
            "market_env": "震荡偏多",
            "weight_mode": "价值优先",
        },
        "radar_selected": {
            "name": "贵州茅台",
            "code": "600519",
            "quant": scores["quant"],
            "tech": scores["tech"],
            "value": scores["value"],
            "growth": scores["growth"],
            "composite": scores["composite"],
            "market_env": "震荡偏多",
            "weight_mode": "价值优先",
        },
    }


def build_dashboard(stock_code="600519", stock_name="贵州茅台"):
    scores = compute_scores(stock_code)
    sentiment = compute_market_sentiment()
    now = datetime.now()
    return {
        "stock": {"code": stock_code, "name": stock_name},
        "scores": scores,
        "weight_mode": (
            "价值优先 (市场震荡偏多)"
            if scores["value"] > scores["growth"]
            else "成长优先 (市场进攻偏好)"
        ),
        "sentiment": sentiment,
        "sentiment_history": [
            {
                "date": (now - timedelta(days=4 - i)).strftime("%m/%d"),
                "value": round(random.uniform(-0.8, 0.9), 2),
            }
            for i in range(5)
        ],
        "news": generate_news(),
        "tasks": generate_tasks(),
    }
