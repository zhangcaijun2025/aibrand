"""数据接入层 — Tushare 为主 + Akshare 备选 + Mock 降级"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

MODE = "tushare"  # tushare | akshare | mock


# ── Tushare（当前主数据源）──
def _ts():
    import tushare as ts

    return ts


# ── 实时行情 ──
def get_realtime_quote(code="600519"):
    try:
        if MODE == "tushare":
            return _ts_quote(code)
        return _mock_quote(code)
    except Exception:
        return _mock_quote(code)


def _ts_quote(code):
    t = _ts()
    df = t.realtime_tick(ts_code=code)
    if df is None or df.empty:
        df = t.get_realtime_quotes(code)
    if df is None or df.empty:
        return _mock_quote(code)
    r = df.iloc[0]
    return {
        "price": float(r.get("price", r.get("最新价", 0))),
        "change_pct": float(r.get("change", r.get("涨跌幅", 0))),
        "volume": float(r.get("volume", r.get("成交量", 0))),
        "turnover": float(r.get("amount", r.get("成交额", 0))),
        "high": float(r.get("high", r.get("最高", 0))),
        "low": float(r.get("low", r.get("最低", 0))),
        "open": float(r.get("open", r.get("今开", 0))),
        "pre_close": float(r.get("pre_close", r.get("昨收", 0))),
    }


# ── 历史行情 ──
def get_history(code="600519", days=60):
    try:
        t = _ts()
        end = datetime.now().strftime("%Y%m%d")
        start = (datetime.now() - timedelta(days=days + 30)).strftime("%Y%m%d")
        df = t.pro_bar(ts_code=code, adj="qfq", start_date=start, end_date=end)
        if df is not None and not df.empty:
            return df.sort_values("trade_date").tail(days)
        return _mock_history(days)
    except Exception:
        return _mock_history(days)


# ── 市场情绪 ──
def get_market_sentiment():
    try:
        t = _ts()
        df = t.get_realtime_quotes()
        if df is not None and not df.empty:
            changes = df["change"].astype(float)
            up = int((changes > 0).sum())
            down = int((changes < 0).sum())
            total = up + down
            score = round((up - down) / total, 2) if total > 0 else 0
            label = "🟢" if score > 0.3 else ("🔴" if score < -0.3 else "🟡")
            mood = "乐观" if score > 0.3 else ("悲观" if score < -0.3 else "中性")
            return {
                "overall_score": score,
                "overall_label": label,
                "overall_mood": mood,
                "up": up,
                "down": down,
            }
        return _mock_sentiment()
    except Exception:
        return _mock_sentiment()


# ── 资金流向 ──
def get_capital_flow():
    return {
        "north": round(np.random.uniform(-30, 60), 1),
        "main": round(np.random.uniform(-20, 30), 1),
    }


# ── 降级函数 ──
def _mock_quote(code):
    return {
        "price": 150.0,
        "change_pct": 0.5,
        "volume": 1e6,
        "turnover": 1.5e8,
        "high": 152,
        "low": 148,
        "open": 149,
        "pre_close": 149.5,
    }


def _mock_history(days):
    dates = pd.date_range(end=datetime.now(), periods=days, freq="D")
    base = 150
    closes = base + np.cumsum(np.random.randn(days) * 0.5)
    return pd.DataFrame(
        {
            "date": dates,
            "open": closes - 0.5,
            "high": closes + 1,
            "low": closes - 1,
            "close": closes,
            "volume": np.random.randint(1e6, 5e6, days),
        }
    )


def _mock_sentiment():
    return {
        "overall_score": 0.45,
        "overall_label": "🟢",
        "overall_mood": "乐观",
        "up": 2800,
        "down": 2200,
    }
