#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全球智库中枢 · Flask 主服务
连接全球智库 → 智能分析 → 日报推送

启动: python think_tank/app.py
"""

import json
import os
import sys
import threading
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, render_template_string, request

# ── 添加父目录到sys.path ──
BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))

from config import PORT, ALL_SOURCES
from collector.models import init_db, seed_sources, get_recent_reports, get_db
from collector.rss_collector import collect_all
from analyzer.report_analyzer import analyze_pending_reports, get_today_statistics, get_top_reports
from publisher.digest_builder import build_digest, save_digest
from publisher.feishu_push import push_digest, push_simple_text
from analyzer.dify_analyzer import analyze_pending_with_dify
from analyzer.expert_db import init_expert_db, seed_experts, get_experts, search_experts
from collector.tier3_collector import collect_all_tier3, collect_tier3_by_keyword, TIER3_SOURCES
from analyzer.cross_validation import run_cross_validation, find_same_topic_reports, analyze_consensus
from parser.translator import detect_language, batch_translate_unprocessed, translate_text
from publisher.risk_alert import push_risk_alerts, check_risk_alerts
from analyzer.expert_db import init_expert_db, seed_experts, get_experts, search_experts
from collector.tier3_collector import collect_all_tier3, collect_tier3_by_keyword, TIER3_SOURCES
from analyzer.cross_validation import run_cross_validation, find_same_topic_reports, analyze_consensus
from parser.translator import detect_language, batch_translate_unprocessed, translate_text
from publisher.risk_alert import push_risk_alerts, check_risk_alerts

# ── App ──
app = Flask(__name__)

# ── 首页HTML仪表盘 ──
DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>全球智库中枢</title>
<style>
body{font-family:Arial,sans-serif;max-width:1000px;margin:30px auto;padding:20px;background:#f5f5f5;color:#333}
h1{color:#1a73e8;border-bottom:3px solid #1a73e8;padding-bottom:10px}
.card{background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);margin-top:15px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.stat{font-size:24px;font-weight:bold;color:#1a73e8}
.label{font-size:12px;color:#666;margin-top:5px}
pre{background:#f8f8f8;padding:10px;border-radius:4px;font-size:12px;overflow-x:auto;max-height:300px}
a{color:#1a73e8;text-decoration:none;display:block;padding:3px 0;font-size:13px}
a:hover{text-decoration:underline}
.badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;color:#fff;margin:2px}
.badge-S{background:#d32f2f}
.badge-A{background:#f57c00}
.badge-B{background:#388e3c}
</style></head>
<body>
<h1>🌐 全球智库中枢</h1>
<div class="card">
 <p>连接全球顶级智库 | 每日07:00自动日报 | {{ source_count }}家智库源</p>
 <p>S级 ⭐ {{s_count}} · A级 📌 {{a_count}}</p>
</div>
<div class="grid">
<div class="card"><div class="stat">{{ today_reports }}</div><div class="label">今日采集报告</div></div>
<div class="card"><div class="stat">{{ today_sources }}</div><div class="label">今日来源智库</div></div>
</div>
<div class="card">
<h2>🌍 智库矩阵</h2>
{% for s in sources %}
<a href="{{ s.homepage }}" target="_blank"><span class="badge badge-{{ s.tier }}">{{ s.tier }}</span> {{ s.name }} — {{ s.full_name }}</a>
{% endfor %}
</div>
<div class="card">
<h2>🔗 API 端点</h2>
<a href="/api/collect">手动采集 /api/collect</a>
<a href="/api/analyze">手动分析 /api/analyze</a>
<a href="/api/digest">今日日报 /api/digest</a>
<a href="/api/push">推送日报 /api/push</a>
<a href="/api/reports">报告列表 /api/reports</a>
<a href="/api/stats">统计数据 /api/stats</a>
</div>
<div class="card">
<h2>📋 最新日报预览</h2>
<pre>{{ digest_preview }}</pre>
</div>
</body></html>"""


@app.route("/")
def index():
    """智库中枢仪表盘"""
    stats = get_today_statistics()
    sources = get_active_sources()
    digest = build_digest()
    preview = digest[:500] if digest else "等待采集..."
    
    s_count = sum(1 for s in ALL_SOURCES if s["tier"] == "S")
    a_count = sum(1 for s in ALL_SOURCES if s["tier"] == "A")
    
    return render_template_string(
        DASHBOARD_HTML,
        source_count=len(ALL_SOURCES),
        s_count=s_count,
        a_count=a_count,
        today_reports=stats.get("total_reports", 0),
        today_sources=len(stats.get("source_distribution", [])),
        sources=ALL_SOURCES,
        digest_preview=preview,
    )


def get_active_sources():
    """获取活跃智库列表"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM sources WHERE active=1 ORDER BY tier, name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.route("/api/collect")
def api_collect():
    """手动触发采集"""
    try:
        results = collect_all()
        return jsonify({"status": "ok", "results": results})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/analyze")
def api_analyze():
    """手动触发分析"""
    try:
        count = analyze_pending_reports()
        return jsonify({"status": "ok", "analyzed": count})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/analyze/dify")
def api_analyze_dify():
    """手动触发Dify LLM深度分析"""
    try:
        limit = int(request.args.get("limit", 10))
        count = analyze_pending_with_dify(limit=limit)
        return jsonify({"status": "ok", "dify_analyzed": count})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/digest")
def api_digest():
    """获取今日日报"""
    date_str = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    digest = build_digest(date_str)
    return jsonify({"date": date_str, "digest": digest})


@app.route("/api/push")
def api_push():
    """手动推送日报到飞书"""
    date_str = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    digest = build_digest(date_str)
    ok = push_digest(digest)
    return jsonify({"status": "ok" if ok else "failed"})


@app.route("/api/reports")
def api_reports():
    """获取报告列表"""
    hours = int(request.args.get("hours", 24))
    limit = int(request.args.get("limit", 50))
    reports = get_recent_reports(hours=hours, limit=limit)
    return jsonify({"count": len(reports), "reports": reports})


@app.route("/api/stats")
def api_stats():
    """获取统计数据"""
    date_str = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    stats = get_today_statistics(date_str)
    return jsonify(stats)


@app.route("/api/sources")
def api_sources():
    """获取智库源列表"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM sources ORDER BY tier, name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/run-pipeline")
def api_run_pipeline():
    """全流程：采集 → 分析 → 日报 → 推送"""
    try:
        import warnings
        warnings.filterwarnings("ignore")
        # 1. 采集
        collect_results = collect_all()
        # 2. 分析
        analyzed = analyze_pending_reports()
        # 3. 日报
        digest = build_digest()
        save_digest(content=digest)
        # 4. 推送
        push_ok = push_digest(digest)
        return jsonify({
            "status": "ok",
            "collected": collect_results,
            "analyzed": analyzed,
            "pushed": push_ok,
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        
@app.route("/api/experts")
def api_experts():
    """获取/搜索专家库"""
    tier = request.args.get("tier")
    domain = request.args.get("domain")
    region = request.args.get("region")
    keyword = request.args.get("keyword")
    if keyword:
        experts = search_experts(keyword)
    else:
        experts = get_experts(tier=tier, domain=domain, region=region)
    return jsonify({"count": len(experts), "experts": experts})


@app.route("/api/experts/stats")
def api_experts_stats():
    """专家统计"""
    conn = get_db()
    s_count = conn.execute("SELECT COUNT(*) FROM experts WHERE tier='S'").fetchone()[0]
    a_count = conn.execute("SELECT COUNT(*) FROM experts WHERE tier='A'").fetchone()[0]
    regions = conn.execute("SELECT region, COUNT(*) as cnt FROM experts GROUP BY region ORDER BY cnt DESC").fetchall()
    conn.close()
    return jsonify({
        "total": s_count + a_count,
        "s_tier": s_count,
        "a_tier": a_count,
        "regions": [{"region": r[0], "count": r[1]} for r in regions],
    })

@app.route("/api/tier3/collect")
def api_tier3_collect():
    keyword = request.args.get("keyword", "")
    if keyword:
        results = collect_tier3_by_keyword(keyword)
    else:
        count = collect_all_tier3()
        results = {"total": count}
    return jsonify({"status": "ok", "results": results})

@app.route("/api/tier3/sources")
def api_tier3_sources():
    return jsonify({"count": len(TIER3_SOURCES), "sources": TIER3_SOURCES})

@app.route("/api/cross-validate")
def api_cross_validate():
    results = run_cross_validation()
    return jsonify(results)

@app.route("/api/translate/batch")
def api_translate_batch():
    limit = int(request.args.get("limit", 20))
    count = batch_translate_unprocessed(limit=limit)
    return jsonify({"status": "ok", "translated": count})

@app.route("/api/translate/detect")
def api_translate_detect():
    text = request.args.get("text", "")
    if not text:
        return jsonify({"error": "text parameter required"}), 400
    lang = detect_language(text)
    return jsonify({"language": lang})

@app.route("/api/risk/check")
def api_risk_check():
    hours = int(request.args.get("hours", 6))
    alerts = check_risk_alerts(hours=hours)
    return jsonify({"alerts": len(alerts), "details": alerts[:10]})

@app.route("/api/risk/push")
def api_risk_push():
    hours = int(request.args.get("hours", 6))
    result = push_risk_alerts(hours=hours)
    return jsonify(result)

@app.route("/api/health")
def api_health():
    """健康检查"""
    stats = get_today_statistics()
    return jsonify({
        "status": "healthy",
        "service": "think-tank-hub",
        "version": "1.0.0",
        "today_reports": stats.get("total_reports", 0),
        "active_sources": len(get_active_sources()),
    })


# ── 后台定时任务 ──
def scheduled_collect():
    """后台采集线程"""
    while True:
        try:
            import time
            time.sleep(3600)  # 每小时采集一次
            print(f"\n[定时采集] {datetime.now().strftime('%H:%M')}")
            collect_all()
            count = analyze_pending_reports()
            print(f"分析完成: {count}篇")
        except Exception as e:
            print(f"[定时采集错误] {e}")


def start_background_thread():
    """启动后台采集线程"""
    thread = threading.Thread(target=scheduled_collect, daemon=True)
    thread.start()


# ── 启动 ──
if __name__ == "__main__":
    print(f"\n{'='*50}")
    print(f"🌐 全球智库中枢 · v1.0")
    print(f"{'='*50}")
    
    # 初始化数据库
    init_db()
    seed_sources(ALL_SOURCES)
    init_expert_db()
    seed_experts()
    print(f"✓ 数据库初始化完成 ({len(ALL_SOURCES)}家智库)")
    
    # 启动后台采集
    start_background_thread()
    print(f"✓ 后台采集线程已启动 (每小时)")
    
    print(f"\n服务启动于 http://localhost:{PORT}")
    print(f"{'='*50}\n")
    
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
