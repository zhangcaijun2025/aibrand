"""仪表盘路由 — 主页 + 右侧面板 + 中央面板 + 快讯"""

from flask import Blueprint, render_template, jsonify, request
from services.dashboard_data import build_dashboard, build_center_dashboard
from services.stock_engine import generate_news

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/")
def index():
    return render_template("index.html")


@dashboard_bp.route("/api/dashboard")
def api_dashboard():
    code = request.args.get("code", "600519")
    name = request.args.get("name", "贵州茅台")
    return jsonify(build_dashboard(code, name))


@dashboard_bp.route("/api/center-dashboard")
def api_center_dashboard():
    return jsonify(build_center_dashboard())


@dashboard_bp.route("/api/news")
def api_news():
    return jsonify(generate_news())
