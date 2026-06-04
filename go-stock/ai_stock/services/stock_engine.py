"""AI 选股数据引擎 — 真实评分 + 模拟辅助数据"""

import random
from datetime import datetime, timedelta
from .scoring_engine import compute_scores as real_compute_scores
from .data_source import get_realtime_quote, get_market_sentiment, get_capital_flow


# ── 四维评分（真实数据）──
def compute_scores(code="600519"):
    """使用真实数据的四维评分"""
    return real_compute_scores(code)


# ── 市场情绪（真实 + 补充）──
def compute_market_sentiment():
    base = get_market_sentiment()
    flow = get_capital_flow()
    sectors = random.sample(["半导体 🔥", "新能源 🔥", "白酒 📈", "医药 💊", "AI 🧠", "券商 📊"], 2)
    return {
        **base,
        "hot_sectors": sectors,
        "capital_flow": {
            "north": flow["north"],
            "main": flow["main"],
            "north_direction": "净流入" if flow["north"] > 0 else "净流出",
            "main_direction": "净流入" if flow["main"] > 0 else "净流出",
        },
    }


# ── 快讯 ──
def generate_news():
    templates = [
        ("🔴", "[重磅] 美联储维持利率不变", "negative"),
        ("🟡", "宁德时代发布第三代CTP电池", "positive"),
        ("🟢", "北向资金连续3日净流入", "positive"),
        ("⚪", "半导体行业景气度持续提升", "positive"),
        ("🔴", "国际油价大幅下跌超3%", "negative"),
        ("🟡", "央行开展2000亿元MLF操作", "neutral"),
        ("🟢", "新能源汽车渗透率突破55%", "positive"),
        ("⚪", "光伏组件出口同比增长28%", "positive"),
    ]
    now = datetime.now()
    return [
        {
            "time": (now - timedelta(minutes=i * 7)).strftime("%H:%M:%S"),
            "badge": badge,
            "content": content,
            "sentiment": sentiment,
            "related_stocks": [],
        }
        for i, (badge, content, sentiment) in enumerate(templates)
    ]


# ── 工作流任务 ──
def generate_tasks():
    return {
        "overall_status": "running",
        "elapsed": "00:15:23",
        "phases": [
            ("数据采集 (Tushare)", "✅", "完成", "0.8s"),
            ("因子计算 (15/15)", "✅", "完成", "1.2s"),
            ("AI推理 (Dify)", "🔄", "进行中", "2.5s"),
            ("结果输出", "⏳", "等待中", "-"),
        ],
        "today_signals": {"buy": random.randint(1, 5), "sell": random.randint(0, 2)},
        "alerts": random.randint(1, 3),
    }


# ── TOP5 选股池 ──
def generate_top5_stocks():
    stocks = [
        {
            "code": "600519.SH",
            "name": "贵州茅台",
            "signal_type": "价值洼地",
            "highlight": "安全边际35%",
            "position": "建议仓位12%",
        },
        {
            "code": "300750.SZ",
            "name": "宁德时代",
            "signal_type": "行业景气",
            "highlight": "营收增速45%",
            "position": "建议仓位10%",
        },
        {
            "code": "002594.SZ",
            "name": "比亚迪",
            "signal_type": "技术突破",
            "highlight": "量价健康",
            "position": "建议仓位8%",
        },
        {
            "code": "603259.SH",
            "name": "药明康德",
            "signal_type": "成长潜力",
            "highlight": "PEG：0.65",
            "position": "建议仓位6%",
        },
        {
            "code": "000858.SZ",
            "name": "五粮液",
            "signal_type": "价值洼地",
            "highlight": "股息率4.2%",
            "position": "建议仓位5%",
        },
    ]
    result = []
    for i, s in enumerate(stocks):
        scores = real_compute_scores(s["code"].replace(".SH", "").replace(".SZ", ""))
        result.append(
            {
                "rank": i + 1,
                **s,
                "composite_score": scores["composite"],
                "dimensions": {
                    "quant": scores["quant"],
                    "tech": scores["tech"],
                    "value": scores["value"],
                    "growth": scores["growth"],
                },
            }
        )
    result.sort(key=lambda x: x["composite_score"], reverse=True)
    for i, r in enumerate(result):
        r["rank"] = i + 1
    return result


# ── AI管道 ──
def generate_ai_pipeline():
    return [
        {
            "name": "全域数据采集",
            "status": "completed",
            "icon": "✅",
            "detail": "数据源：Tushare",
            "duration": "0.8s",
        },
        {
            "name": "多维度因子计算",
            "status": "completed",
            "icon": "✅",
            "detail": "完成度12/15",
            "duration": "1.2s",
        },
        {
            "name": "大模型AI逻辑推理",
            "status": "running",
            "icon": "🔄",
            "detail": "推理模型：GPT-4",
            "duration": "2.5s",
        },
        {
            "name": "最终交易决策",
            "status": "waiting",
            "icon": "⏳",
            "detail": "输出类型：选股信号",
            "duration": "0.5s",
        },
    ]
