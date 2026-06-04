"""全局模块路由 — 策略/组合/AI分析/知识库/系统/信号/任务"""
from datetime import datetime, timedelta
import random
from flask import Blueprint, jsonify, request
from services.stock_engine import compute_scores
from services.risk_control import risk
from services.n8n_integration import get_workflow_status

modules_bp = Blueprint("modules", __name__)


@modules_bp.route("/api/modules/strategy")
def api_strategy():
    """策略列表 + N8N 工作流状态"""
    n8n = get_workflow_status()
    strategies = [
        {"id": "s1", "name": "价值洼地策略", "desc": "PE/PB 低分位 + 高股息", "status": "running", "last_run": "10:23",
         "performance": "+12.5%", "signals": 3, "n8n_workflow": "AI 选股核心工作流"},
        {"id": "s2", "name": "行业景气策略", "desc": "营收增速 > 30% + 毛利率提升", "status": "running", "last_run": "10:23",
         "performance": "+8.3%", "signals": 2, "n8n_workflow": "每日定时数据同步工作流"},
        {"id": "s3", "name": "动量突破策略", "desc": "20 日动量 > 15% + 放量突破", "status": "idle", "last_run": "09:55",
         "performance": "+5.1%", "signals": 0, "n8n_workflow": "盘中异动监控"},
        {"id": "s4", "name": "困境反转策略", "desc": "低估值 + 业绩拐点", "status": "paused", "last_run": "04-15",
         "performance": "-2.3%", "signals": 0, "n8n_workflow": ""},
    ]
    return jsonify({"strategies": strategies, "n8n": n8n})


@modules_bp.route("/api/modules/portfolio")
def api_portfolio():
    """投资组合 + 风控"""
    rc = risk.get_status()
    positions = [
        {"code": "600519", "name": "贵州茅台", "shares": 100, "avg_cost": 1250.0,
         "current": 1332.95, "profit_pct": 6.64, "weight": 12, "signal": "持有"},
        {"code": "300750", "name": "宁德时代", "shares": 200, "avg_cost": 180.0,
         "current": 195.5, "profit_pct": 8.61, "weight": 10, "signal": "持有"},
        {"code": "002594", "name": "比亚迪", "shares": 300, "avg_cost": 260.0,
         "current": 245.0, "profit_pct": -5.77, "weight": 8, "signal": "关注"},
    ]
    total_value = sum(p["current"] * p["shares"] for p in positions)
    total_cost = sum(p["avg_cost"] * p["shares"] for p in positions)
    total_profit = total_value - total_cost
    total_profit_pct = round(total_profit / total_cost * 100, 2) if total_cost > 0 else 0
    return jsonify({
        "total_value": round(total_value, 2),
        "total_cost": round(total_cost, 2),
        "total_profit": round(total_profit, 2),
        "total_profit_pct": total_profit_pct,
        "positions": positions,
        "risk_control": rc,
    })


@modules_bp.route("/api/modules/signals")
def api_signals():
    """信号中心"""
    signals = [
        {"time": "09:31", "type": "buy", "stock": "600519", "name": "贵州茅台",
         "reason": "价值因子 > 80, 量化 > 60", "score": 92, "status": "executed"},
        {"time": "09:45", "type": "buy", "stock": "300750", "name": "宁德时代",
         "reason": "成长因子 > 80, 技术 > 60", "score": 88, "status": "executed"},
        {"time": "10:02", "type": "buy", "stock": "002594", "name": "比亚迪",
         "reason": "量化 > 85, 各因子 > 50", "score": 85, "status": "executed"},
        {"time": "10:15", "type": "sell", "stock": "000858", "name": "五粮液",
         "reason": "评分跌破 60", "score": 58, "status": "executed"},
        {"time": "10:30", "type": "alert", "stock": "002594", "name": "比亚迪",
         "reason": "触发 -8% 止损线", "score": 0, "status": "pending"},
    ]
    today_signals = risk.get_status()["today_signals"]
    return jsonify({"signals": signals, "today_signals": today_signals})


@modules_bp.route("/api/modules/tasks")
def api_tasks():
    """N8N 任务日志"""
    import time
    tasks = [
        {"id": "t1", "name": "AI 选股核心工作流", "status": "running", "started": "10:00:00",
         "elapsed": "00:15:23", "node": "AI推理", "progress": 75},
        {"id": "t2", "name": "每日收盘总结报告", "status": "waiting", "started": "-",
         "elapsed": "-", "node": "等待触发", "progress": 0},
        {"id": "t3", "name": "盘中异动监控(每1分钟)", "status": "running", "started": "09:30:00",
         "elapsed": "00:45:23", "node": "监控中", "progress": 100},
        {"id": "t4", "name": "小红书内容自动化", "status": "completed", "started": "09:00:00",
         "elapsed": "00:02:15", "node": "发布完成", "progress": 100},
    ]
    return jsonify({"tasks": tasks, "server_time": time.strftime("%H:%M:%S")})


@modules_bp.route("/api/modules/system")
def api_system():
    """系统设置"""
    return jsonify({
        "data_source": {"current": "Tushare", "available": ["Tushare", "Akshare"], "status": "connected"},
        "services": [
            {"name": "AI 选股引擎", "port": 4000, "status": "running"},
            {"name": "健康监控器", "port": 3998, "status": "running"},
            {"name": "N8N 工作流", "port": 5678, "status": "running"},
            {"name": "Dify AI", "port": 8082, "status": "running"},
            {"name": "灵感笔记", "port": 8088, "status": "running"},
        ],
        "update_freq": "60s",
        "api_calls_today": 152,
        "api_limit": 10000,
        "version": "2.0.0",
    })


@modules_bp.route("/api/modules/knowledge")
def api_knowledge():
    """知识库"""
    return jsonify({
        "categories": [
            {"name": "行业研报", "icon": "📄", "count": 12, "recent": [{"title": "2026年半导体行业展望", "date": "05-15"}]},
            {"name": "财务数据", "icon": "📊", "count": 8, "recent": [{"title": "贵州茅台 Q1 财报解析", "date": "04-28"}]},
            {"name": "投资技能", "icon": "🎓", "count": 5, "recent": [{"title": "价值投资大师策略", "date": "05-10"}]},
        ]
    })
