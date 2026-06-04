"""AI 选股系统基础测试"""

import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def test_import_app():
    from app import app

    assert app is not None


def test_import_services():
    from services.stock_engine import compute_scores, generate_news

    s = compute_scores()
    assert "quant" in s
    assert "composite" in s
    assert len(generate_news()) == 8


def test_import_routes():
    from routes.dashboard import dashboard_bp
    from routes.analysis import analysis_bp

    assert dashboard_bp.name == "dashboard"
    assert analysis_bp.name == "analysis"


def test_api_dashboard_returns_json():
    from app import app

    with app.test_client() as client:
        resp = client.get("/api/dashboard")
        assert resp.status_code == 200
        assert resp.content_type.startswith("application/json")


def test_api_center_dashboard():
    from app import app

    with app.test_client() as client:
        resp = client.get("/api/center-dashboard")
        assert resp.status_code == 200
        data = resp.get_json()
        # AGENTS.md §2 契约检查
        assert "market_sentiment" in data
        assert "top5_stocks" in data
        assert "risk_control" in data
        assert "ai_decision_weights" in data
        assert "system_status" in data
        assert len(data["top5_stocks"]) == 5
        # top5 有真实评分
        for s in data["top5_stocks"]:
            assert "composite_score" in s
            assert "dimensions" in s


def test_api_analysis():
    from app import app

    with app.test_client() as client:
        resp = client.get("/api/analysis/600519")
        assert resp.status_code == 200
        assert "analysis" in resp.get_json()


def test_scoring_engine():
    from services.scoring_engine import compute_scores

    s = compute_scores("600519")
    assert 0 <= s["quant"] <= 100
    assert 0 <= s["composite"] <= 100
    assert s["confidence"] <= 99


def test_risk_control():
    from services.risk_control import risk

    status = risk.get_status()
    assert "position_usage_pct" in status
    assert "single_stock_cap_pct" in status
    assert status["single_stock_cap_pct"] == 15
