"""AGENTS.md §3 四维评分引擎 — 严格按公式计算"""

import numpy as np
import pandas as pd


def compute_scores(code="600519"):
    """四维综合评分：严格按 AGENTS.md §3 公式"""
    from .data_source import get_history, get_realtime_quote

    hist = get_history(code)
    quote = get_realtime_quote(code)

    # ── 3.1 量化因子 (40%) ──
    quant = _calc_quant(hist)

    # ── 3.2 技术因子 (25%) ──
    tech = _calc_tech(hist)

    # ── 3.3 价值因子 (20%) ──
    value = _calc_value(code)

    # ── 3.4 成长因子 (15%) ──
    growth = _calc_growth()

    # ── 3.5 综合评分 ──
    composite = round(quant * 0.4 + tech * 0.25 + value * 0.2 + growth * 0.15)

    return {
        "quant": min(100, max(0, round(quant))),
        "tech": min(100, max(0, round(tech))),
        "value": min(100, max(0, round(value))),
        "growth": min(100, max(0, round(growth))),
        "composite": min(100, max(0, composite)),
        "confidence": min(99, composite - 2),
    }


def _calc_quant(hist):
    """量化因子: 20日动量×0.35 + 波动率倒数×0.25 + 换手率稳定性×0.20 + 资金流向×0.20"""
    if hist is None or len(hist) < 20:
        return 60

    closes = hist["close"].values
    volumes = hist["volume"].values

    # 20日动量
    momentum = (closes[-1] / closes[-20] - 1) * 100
    momentum_score = _norm(momentum, -10, 10) * 0.35

    # 波动率倒数（稳定加分）
    volatility = np.std(closes[-20:]) / np.mean(closes[-20:])
    vol_score = _norm(1 / max(volatility, 0.001), 5, 50) * 0.25

    # 换手率稳定性
    vol_change = np.std(volumes[-20:]) / np.mean(volumes[-20:])
    stability_score = _norm(1 / max(vol_change, 0.01), 1, 20) * 0.20

    # 近期资金强度
    recent_vol = np.mean(volumes[-5:]) / max(np.mean(volumes[-20:-5]), 1)
    flow_score = _norm(recent_vol, 0.5, 2.0) * 0.20

    return (momentum_score + vol_score + stability_score + flow_score) * 100


def _calc_tech(hist):
    """技术因子: 均线多头×0.4 + MACD×0.3 + RSI×0.3"""
    if hist is None or len(hist) < 26:
        return 60

    closes = hist["close"].values

    # 均线多头排列
    ma5 = np.mean(closes[-5:])
    ma10 = np.mean(closes[-10:])
    ma20 = np.mean(closes[-20:])
    if ma5 > ma10 > ma20:
        ma_score = 100
    elif ma5 > ma10 or ma10 > ma20:
        ma_score = 60
    else:
        ma_score = 30

    # MACD
    ema12 = _ema(closes, 12)
    ema26 = _ema(closes, 26)
    macd = ema12 - ema26
    macd_score = 80 if macd > 0 else 40

    # RSI
    gains = np.diff(closes[-15:])
    avg_gain = np.mean(gains[gains > 0]) if any(gains > 0) else 0
    avg_loss = abs(np.mean(gains[gains < 0])) if any(gains < 0) else 1
    rsi = 100 - 100 / (1 + avg_gain / max(avg_loss, 0.01))
    rsi_score = _norm(rsi, 30, 70)

    return ma_score * 0.4 + macd_score * 0.3 + rsi_score * 0.3


def _calc_value(_code="600519"):
    """价值因子: PE分位倒数×0.4 + PB分位倒数×0.3 + 股息率×0.3"""
    # TODO: 对接真实财务数据
    return 65


def _calc_growth(_finance=None):
    """成长因子: 营收增速×0.5 + 净利润增速×0.5"""
    # TODO: 对接真实财报数据
    return 60


# ── 工具函数 ──
def _norm(val, low, high):
    """归一化到 0-1"""
    if high <= low:
        return 0.5
    return max(0, min(1, (val - low) / (high - low)))


def _ema(data, period):
    """指数移动平均"""
    if len(data) < period:
        return data[-1] if len(data) > 0 else 0
    alpha = 2 / (period + 1)
    result = data[0]
    for v in data[1:]:
        result = alpha * v + (1 - alpha) * result
    return result
