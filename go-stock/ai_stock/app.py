# -*- coding: utf-8 -*-
"""AI 智能选股系统主入口"""

import os
import sys

# 确保项目根目录在 sys.path 中
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from flask_cors import CORS
from config.settings import AI_STOCK_PORT

app = Flask(__name__)
CORS(app)

# ── 注册蓝图 ──
from routes.dashboard import dashboard_bp
from routes.analysis import analysis_bp
from routes.modules import modules_bp
from routes.stream import stream_bp
from routes.aux import aux_bp
from routes.intel import intel_bp

app.register_blueprint(dashboard_bp)
app.register_blueprint(aux_bp)
app.register_blueprint(intel_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(modules_bp)
app.register_blueprint(stream_bp)

# ── Think Tank 蓝图（如果有） ──
try:
    from think_tank.app import think_tank_bp
    app.register_blueprint(think_tank_bp, url_prefix="/think-tank")
except ImportError:
    pass

# ── 全局错误处理 ──
@app.errorhandler(404)
def not_found(e):
    return {"error": "not found"}, 404

@app.errorhandler(500)
def server_error(e):
    return {"error": "internal server error"}, 500

# ── Chart.js 本地路由（CDN fallback） ──
@app.route('/chart.js')
def chartjs_local():
    return "", 302, {"Location": "https://cdn.bootcdn.net/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"}

if __name__ == "__main__":
    port = int(os.environ.get("AI_STOCK_PORT", AI_STOCK_PORT))
    debug = os.environ.get("DEBUG", "false").lower() == "true"
    print(f"[AI-Stock] 启动 -> http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
