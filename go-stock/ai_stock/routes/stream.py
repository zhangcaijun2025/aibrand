"""SSE 实时数据流 — 替代前端轮询，WebSocket 降级方案"""
import json, time
from flask import Blueprint, Response, stream_with_context
from services.dashboard_data import build_center_dashboard

stream_bp = Blueprint("stream", __name__)


@stream_bp.route("/api/stream")
def stream():
    """SSE 实时推送：每 10s 推送全量仪表盘数据"""

    def generate():
        while True:
            data = build_center_dashboard()
            yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
            time.sleep(10)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@stream_bp.route("/api/stream/price")
def stream_price():
    """SSE 精简推送：仅推送核心数据（低带宽）"""

    def generate():
        from services.stock_engine import compute_scores
        while True:
            s = compute_scores("600519")
            yield f"data: {json.dumps(s, ensure_ascii=False)}\n\n"
            time.sleep(5)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
