"""AGENTS.md §5 & §7 — 买卖信号 + 风控管理"""

import time


class RiskControl:
    """风控引擎（单例）"""

    def __init__(self):
        self.portfolio = {}  # {code: {"shares": N, "avg_cost": P, "buy_time": T}}
        self.max_position_pct = 15  # 单票上限 15%
        self.max_total_pct = 80  # 总仓位上限 80%
        self.stop_loss_pct = -8  # 止损线 -8%
        self.daily_buy_limit = 10  # 每日最多 10 条买入
        self.daily_sell_count = 0
        self.daily_buy_count = 0
        self.last_reset_day = time.strftime("%Y-%m-%d")

    def _reset_daily(self):
        today = time.strftime("%Y-%m-%d")
        if today != self.last_reset_day:
            self.daily_buy_count = 0
            self.daily_sell_count = 0
            self.last_reset_day = today

    def can_buy(self, code, score, prev_score):
        """AGENTS.md §5: 买入条件判断"""
        self._reset_daily()
        if self.daily_buy_count >= self.daily_buy_limit:
            return False, "当日买入已达上限"
        if code in self.portfolio:
            return False, "已在持仓中"
        if score <= 80:
            return False, f"评分 {score} 未达买入阈值 80"
        if score - prev_score <= 5:
            return False, f"评分提升 {score-prev_score} 分，未达 5 分要求"
        # 系统健康度检查（由外部传入）
        return True, ""

    def can_sell(self, code, current_price):
        """AGENTS.md §5: 卖出条件判断"""
        self._reset_daily()
        if code not in self.portfolio:
            return False, "不在持仓中"
        pos = self.portfolio[code]
        loss_pct = (current_price - pos["avg_cost"]) / pos["avg_cost"] * 100
        # 止损 -8%
        if loss_pct <= self.stop_loss_pct:
            return True, f"止损触发: {loss_pct:.1f}%"
        return False, ""

    def get_status(self):
        """AGENTS.md §7: 风控状态"""
        total_value = sum(p["avg_cost"] * p["shares"] for p in self.portfolio.values()) or 1
        total_pct = (
            sum(p["avg_cost"] * p["shares"] for p in self.portfolio.values()) / total_value * 100
        )
        return {
            "position_usage_pct": round(min(total_pct, 100), 1),
            "single_stock_cap_pct": self.max_position_pct,
            "stop_loss_triggered_today": 0,
            "today_signals": {"buy": self.daily_buy_count, "sell": self.daily_sell_count},
        }


# 全局单例
risk = RiskControl()
