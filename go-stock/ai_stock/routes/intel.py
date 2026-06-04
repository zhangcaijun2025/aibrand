"""
全球情报中心 · 智库看板 v3 — 数据接口
提供全球指数/外汇/商品/债券/板块/新闻等 mock 数据
"""

import random
import math
from datetime import datetime, timedelta
from flask import Blueprint, jsonify

intel_bp = Blueprint("intel", __name__)

# ── 辅助：生成带噪声的模拟价格 ──
_PRICE_SEED = {}

def _price(base, volatility=0.01):
    """基于基值生成带随机波动的价格"""
    return round(base * (1 + random.gauss(0, volatility) * 0.5), 2)

# ── 1. A 股行情 ──
@intel_bp.route("/api/data/market")
def api_market():
    up = random.randint(1800, 2800)
    down = random.randint(1200, 2200)
    total = up + down
    sentiment = random.randint(40, 80)
    northbound = random.uniform(-30, 80)
    return jsonify({
        "index": {
            "shanghai": _price(3150, 0.005),
            "shenzhen": _price(10500, 0.008),
        },
        "sentiment": sentiment,
        "northbound": round(northbound, 1),
        "up_stocks": up,
        "down_stocks": down,
        "timestamp": datetime.now().isoformat(),
    })

# ── 2. 全球指数 ──
@intel_bp.route("/api/data/global-indices")
def api_global_indices():
    return jsonify({
        "us": {
            "sp500": _price(5480, 0.003),
            "nasdaq": _price(17200, 0.005),
            "dji": _price(39600, 0.003),
        },
        "cn": {
            "shanghai": _price(3150, 0.005),
            "shenzhen": _price(10500, 0.008),
        },
        "hk": {
            "hsi": _price(23300, 0.006),
        },
        "jp": {"nikkei": _price(38900, 0.007)},
        "kr": {"kospi": _price(2710, 0.004)},
        "uk": {"ftse": _price(8480, 0.003)},
        "de": {"dax": _price(18600, 0.003)},
        "fr": {"cac": _price(8100, 0.004)},
        "updated": datetime.now().isoformat(),
    })

# ── 3. 外汇 ──
@intel_bp.route("/api/data/forex")
def api_forex():
    return jsonify({
        "dxy": round(104.2 + random.uniform(-0.3, 0.3), 2),
        "eurusd": round(1.085 + random.uniform(-0.005, 0.005), 4),
        "usdjpy": round(151.5 + random.uniform(-0.5, 0.5), 2),
        "gbpusd": round(1.272 + random.uniform(-0.004, 0.004), 4),
        "usdcny": round(7.24 + random.uniform(-0.01, 0.01), 4),
        "usdcad": round(1.368 + random.uniform(-0.003, 0.003), 4),
        "audusd": round(0.663 + random.uniform(-0.003, 0.003), 4),
        "usdchf": round(0.892 + random.uniform(-0.002, 0.002), 4),
        "updated": datetime.now().isoformat(),
    })

# ── 4. 商品 ──
@intel_bp.route("/api/data/commodities")
def api_commodities():
    return jsonify({
        "gold": _price(2370, 0.004),
        "silver": _price(31.5, 0.008),
        "wti_crude": _price(79.5, 0.01),
        "brent": _price(83.8, 0.009),
        "copper": _price(4.65, 0.006),
        "lithium": _price(12.8, 0.015),
        "aluminum": _price(2580, 0.005),
        "corn": _price(445, 0.005),
        "updated": datetime.now().isoformat(),
    })

# ── 5. 全球债券收益率 ──
@intel_bp.route("/api/data/bond-yields")
def api_bond_yields():
    return jsonify({
        "us10y": round(4.32 + random.uniform(-0.05, 0.05), 2),
        "us2y": round(4.68 + random.uniform(-0.04, 0.04), 2),
        "us30y": round(4.55 + random.uniform(-0.05, 0.05), 2),
        "cn10y": round(2.28 + random.uniform(-0.02, 0.02), 2),
        "cn2y": round(1.85 + random.uniform(-0.02, 0.02), 2),
        "jp10y": round(1.02 + random.uniform(-0.01, 0.01), 2),
        "de10y": round(2.55 + random.uniform(-0.03, 0.03), 2),
        "gb10y": round(4.18 + random.uniform(-0.03, 0.03), 2),
        "updated": datetime.now().isoformat(),
    })

# ── 6. 经济日历 ──
@intel_bp.route("/api/data/economic-calendar")
def api_economic_calendar():
    now = datetime.now()
    events = [
        {"time": now.replace(hour=9, minute=30).strftime("%H:%M"), "country": "CN", "event": "5月官方制造业PMI", "previous": "50.4", "forecast": "50.2", "importance": "high"},
        {"time": now.replace(hour=9, minute=30).strftime("%H:%M"), "country": "CN", "event": "5月非制造业PMI", "previous": "51.8", "forecast": "51.5", "importance": "high"},
        {"time": now.replace(hour=20, minute=30).strftime("%H:%M"), "country": "US", "event": "4月核心PCE物价指数月率", "previous": "0.3%", "forecast": "0.2%", "importance": "high"},
        {"time": now.replace(hour=21, minute=45).strftime("%H:%M"), "country": "US", "event": "5月芝加哥PMI", "previous": "42.8", "forecast": "44.5", "importance": "mid"},
        {"time": now.replace(hour=22, minute=0).strftime("%H:%M"), "country": "US", "event": "密歇根大学5月消费者信心指数终值", "previous": "67.4", "forecast": "67.8", "importance": "mid"},
    ]
    return jsonify({
        "events": events,
        "today": now.strftime("%Y-%m-%d"),
        "updated": now.isoformat(),
    })

# ── 7. 热点新闻 ──
@intel_bp.route("/api/intel/news")
def api_intel_news():
    now = datetime.now()
    news_list = [
        {"title": "中国5月制造业PMI今日公布，市场预期小幅回落", "category": "宏观", "sentiment": "neutral", "time": (now - timedelta(minutes=5)).strftime("%H:%M"), "url": "#"},
        {"title": "美联储官员：通胀粘性仍需观察更多数据", "category": "美联储", "sentiment": "neutral", "time": (now - timedelta(minutes=15)).strftime("%H:%M"), "url": "#"},
        {"title": "英伟达市值突破3.5万亿美元，AI芯片需求持续井喷", "category": "科技", "sentiment": "positive", "time": (now - timedelta(minutes=22)).strftime("%H:%M"), "url": "#"},
        {"title": "欧佩克+会议在即，市场预期维持减产协议", "category": "能源", "sentiment": "positive", "time": (now - timedelta(minutes=30)).strftime("%H:%M"), "url": "#"},
        {"title": "北向资金半日净买入超50亿元，茅台获加仓", "category": "资金", "sentiment": "positive", "time": (now - timedelta(minutes=38)).strftime("%H:%M"), "url": "#"},
        {"title": "黄金价格高位震荡，地缘风险溢价有所回落", "category": "商品", "sentiment": "neutral", "time": (now - timedelta(minutes=45)).strftime("%H:%M"), "url": "#"},
        {"title": "日元对美元汇率跌破152关口，日央行或再度干预", "category": "外汇", "sentiment": "negative", "time": (now - timedelta(hours=1)).strftime("%H:%M"), "url": "#"},
        {"title": "宁德时代发布新一代钠离子电池，能量密度提升20%", "category": "新能源", "sentiment": "positive", "time": (now - timedelta(hours=1)).strftime("  %H:%M"), "url": "#"},
    ]
    return jsonify({"news": news_list, "updated": now.isoformat()})

# ── 8. 板块资金流向 ──
@intel_bp.route("/api/data/sector-flow")
def api_sector_flow():
    sectors = [
        {"name": "半导体", "flow": round(random.uniform(-10, 35), 1), "change": round(random.uniform(-2, 3), 1)},
        {"name": "白酒", "flow": round(random.uniform(-5, 30), 1), "change": round(random.uniform(-1, 2.5), 1)},
        {"name": "新能源", "flow": round(random.uniform(-15, 25), 1), "change": round(random.uniform(-2, 2), 1)},
        {"name": "医药", "flow": round(random.uniform(-8, 20), 1), "change": round(random.uniform(-1.5, 2), 1)},
        {"name": "金融", "flow": round(random.uniform(-12, 22), 1), "change": round(random.uniform(-1, 1.8), 1)},
        {"name": "人工智能", "flow": round(random.uniform(-5, 28), 1), "change": round(random.uniform(-2, 3.5), 1)},
        {"name": "消费电子", "flow": round(random.uniform(-10, 15), 1), "change": round(random.uniform(-2, 2), 1)},
        {"name": "有色金属", "flow": round(random.uniform(-8, 18), 1), "change": round(random.uniform(-1.5, 2.5), 1)},
    ]
    return jsonify({"sectors": sectors, "updated": datetime.now().isoformat()})

# ── 9. 市场热点 ──
@intel_bp.route("/api/market/hotspots")
def api_market_hotspots():
    hotspots = [
        {"name": "AI算力", "heat": random.randint(85, 100), "stocks": "中科曙光、浪潮信息"},
        {"name": "低空经济", "heat": random.randint(75, 95), "stocks": "亿航智能、中信海直"},
        {"name": "半导体设备", "heat": random.randint(70, 90), "stocks": "北方华创、中微公司"},
        {"name": "新能源汽车", "heat": random.randint(65, 85), "stocks": "比亚迪、赛力斯"},
        {"name": "生物医药", "heat": random.randint(50, 75), "stocks": "恒瑞医药、百济神州"},
    ]
    return jsonify({"hotspots": hotspots, "updated": datetime.now().isoformat()})
