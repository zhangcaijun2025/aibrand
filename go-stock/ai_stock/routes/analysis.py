"""分析路由 — 分析报告 + 数据血缘追溯"""

from datetime import datetime, timedelta
from flask import Blueprint, jsonify
from services.stock_engine import compute_scores

analysis_bp = Blueprint("analysis", __name__)


@analysis_bp.route("/api/analysis/<code>")
def api_analysis(code):
    scores = compute_scores()
    return jsonify(
        {
            "code": code,
            "analysis": {
                "summary": f"{code} 当前四维评分 {scores['composite']} 分，"
                f"处于全市场前 {100 - scores['composite']}% 分位。",
                "details": scores,
                "dimension_analysis": {
                    "quant": "动量因子表现优异，资金持续流入",
                    "tech": "均线多头排列，MACD金叉确认",
                    "value": "PE处于历史低分位，安全边际高",
                    "growth": "营收增速放缓，关注Q2拐点",
                },
            },
        }
    )


@analysis_bp.route("/api/trace/<code>")
def api_trace(code):
    now = datetime.now()
    return jsonify(
        {
            "code": code,
            "trace": [
                {"source": "Akshare", "field": "日行情", "updated": now.strftime("%H:%M:%S")},
                {
                    "source": "Akshare",
                    "field": "财务数据",
                    "updated": (now - timedelta(hours=2)).strftime("%H:%M:%S"),
                },
                {"source": "东方财富", "field": "资金流向", "updated": now.strftime("%H:%M:%S")},
                {"source": "Dify AI", "field": "推理结果", "updated": now.strftime("%H:%M:%S")},
            ],
        }
    )
