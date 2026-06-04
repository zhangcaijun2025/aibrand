#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
知识库服务 · Flask 主服务 (port 4003)
===================================
服务于：
  1. 智能研报聚合器 —— 对接智库中枢 (4002)，管理研究报告
  2. 个人知识库      —— 用户文档/URL/笔记的 RAG 问答

架构：利用 Dify 已有知识库 API 做存储与检索，本地 SQLite 做兜底缓存。

启动：
  python knowledge_base/app.py

环境变量（可写入 .env 或在 Docker 中传入）：
  DIFY_API_URL          = http://dify-nginx-1:80     (默认)
  DIFY_APP_KEY          = app-c6aCH6OxDmDOBURqCJYw5565 (默认)
  DIFY_DATASET_KEY      = 数据集API Key (可选，用于文档管理)
  DIFY_DATASET_ID       = 目标数据集ID  (可选，自动探测)
  WORKFLOW_QA_ID        = RAG问答工作流ID (可选)
  THINK_TANK_URL        = http://localhost:4002       (默认)
  KB_PORT               = 4003                        (默认)
"""

import json
import os
import sys
import threading
from datetime import datetime
from pathlib import Path

# 添加当前目录到 sys.path
BASE_DIR = Path(__file__).parent
sys.path.insert(0, str(BASE_DIR))

from flask import Flask, jsonify, request, render_template_string

from kb_service import (
    import_document, import_url, search, ask,
    DIFY_DATASET_ID, DIFY_DATASET_KEY, init_kb_service,
)
from report_aggregator import (
    sync_from_thinktank, search_reports,
    check_thinktank_health, get_sync_stats,
)

# ── 配置 ──
PORT = int(os.getenv("KB_PORT", "4003"))
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# ── Flask App ──
app = Flask(__name__)


# ════════════════════════════════════════════════════════════════
# 首页仪表盘
# ════════════════════════════════════════════════════════════════

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>知识库服务</title>
<style>
body{font-family:Arial,sans-serif;max-width:1000px;margin:30px auto;padding:20px;background:#f5f5f5;color:#333}
h1{color:#1a73e8;border-bottom:3px solid #1a73e8;padding-bottom:10px}
.card{background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);margin-top:15px}
h2{color:#1a73e8;font-size:18px}
.code{background:#f8f8f8;padding:10px;border-radius:4px;font-size:13px;overflow-x:auto;font-family:monospace}
a{color:#1a73e8;text-decoration:none;display:inline-block;padding:5px 12px;margin:3px;border:1px solid #1a73e8;
  border-radius:4px;font-size:13px}
a:hover{background:#e8f0fe;text-decoration:none}
.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;color:#fff;margin:3px}
.badge-ok{background:#34a853}
.badge-partial{background:#fbbc04;color:#333}
.badge-error{background:#ea4335}
.badge-off{background:#9aa0a6}
</style></head>
<body>
<h1>📚 知识库服务</h1>
<div class="card">
 <p>智能研报聚合器 · 个人知识库 · RAG问答</p>
 <p>
   Dify: <span class="badge badge-{{ 'ok' if dify_configured else 'off' }}">{{ '已配置' if dify_configured else '未配置' }}</span>
   智库中枢: <span class="badge badge-{{ 'ok' if thinktank_ok else 'error' }}">{{ '已连接' if thinktank_ok else '未连接' }}</span>
 </p>
</div>
<div class="card">
 <h2>🔗 API 端点</h2>
 <div>
 <a href="/api/health">/api/health</a>
 <a href="/api/kb/search?query=示例搜索">/api/kb/search</a>
 <a href="#" onclick="navigator.clipboard.writeText('curl -X POST /api/kb/ingest ...')">/api/kb/ingest</a>
 <a href="#" onclick="navigator.clipboard.writeText('curl -X POST /api/kb/ask ...')">/api/kb/ask</a>
 <a href="/api/kb/reports/search?query=AI&days=7">/api/kb/reports/search</a>
 <a href="/api/kb/sync">/api/kb/sync</a>
 <a href="/api/kb/stats">/api/kb/stats</a>
 </div>
</div>
<div class="card">
 <h2>📊 状态概览</h2>
 <div class="code">
  Dify 知识库 ID: {{ dify_dataset_id or '未配置' }}<br>
  智库中枢: {{ thinktank_url }}<br>
  最后同步: {{ last_sync or '尚未同步' }}<br>
  已同步报告数: {{ synced_count or 0 }}
 </div>
</div>
</body></html>"""


@app.route("/")
def index():
    """服务仪表盘"""
    stats = get_sync_stats()
    return render_template_string(
        DASHBOARD_HTML,
        dify_configured=bool(DIFY_DATASET_ID or DIFY_DATASET_KEY),
        thinktank_ok=stats.get("think_tank_connected", False),
        dify_dataset_id=DIFY_DATASET_ID,
        thinktank_url=stats.get("think_tank_url", ""),
        last_sync=stats.get("last_sync", ""),
        synced_count=stats.get("total_synced", 0),
    )


# ════════════════════════════════════════════════════════════════
# 健康检查
# ════════════════════════════════════════════════════════════════

@app.route("/search")
def search_page():
    """友好的搜索前端"""
    return render_template_string("""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>智能搜索 · 知识库</title>
<style>
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f1923;color:#e0e6ed;min-height:100vh;margin:0}
.header{background:linear-gradient(135deg,#1a2a3a,#0f1923);padding:30px 40px;border-bottom:1px solid #1e3a5f}
.header h1{font-size:24px;color:#4fc3f7;margin:0}
.header .sub{color:#78909c;font-size:13px;margin-top:4px}
.container{max-width:800px;margin:0 auto;padding:20px}
.search-box{background:#1a2a3a;border:1px solid #1e3a5f;border-radius:12px;padding:20px;margin-bottom:16px}
.search-box input{width:100%;padding:12px 16px;background:#0f1923;border:1px solid #1e3a5f;border-radius:6px;color:#e0e6ed;font-size:15px;outline:none}
.search-box input:focus{border-color:#4fc3f7}
.search-box .hint{color:#78909c;font-size:12px;margin-top:8px}
.result{background:#1a2a3a;border:1px solid #1e3a5f;border-radius:8px;padding:16px;margin:8px 0}
.result .title{color:#4fc3f7;font-size:15px;text-decoration:none;font-weight:600}
.result .meta{color:#78909c;font-size:11px;margin-top:4px}
.result .snippet{color:#b0bec5;font-size:13px;margin-top:8px;line-height:1.5}
.result .score{display:inline-block;padding:2px 8px;border-radius:10px;background:#1e3a5f;color:#90caf9;font-size:11px;margin-right:4px}
.tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;margin:2px;background:#1e3a5f;color:#90caf9}
#loading{text-align:center;color:#78909c;padding:40px;display:none}
#noresults{text-align:center;color:#78909c;padding:40px;display:none}
</style>
</head>
<body>
<div class="header"><h1>🔍 智能搜索 · 研报 & 知识库</h1><div class="sub">搜索全球智库报告和个人知识库 · 支持自然语言</div></div>
<div class="container">
<div class="search-box">
<input id="q" type="text" placeholder="输入搜索关键词，如：AI半导体、美联储政策、中国经济..." onkeydown="if(event.key==='Enter')search()"/>
<div class="hint">💡 支持中文/英文搜索 · 覆盖33家全球智库 + 个人知识库</div>
</div>
<div id="loading">🔍 搜索中...</div>
<div id="noresults">😕 未找到相关结果，试试其他关键词</div>
<div id="results"></div>
</div>
<script>
function search(){var q=document.getElementById('q').value.trim();if(!q)return;
document.getElementById('loading').style.display='block';
document.getElementById('noresults').style.display='none';
document.getElementById('results').innerHTML='';
fetch('/api/kb/search?query='+encodeURIComponent(q)+'&limit=20')
.then(r=>r.json()).then(d=>{
document.getElementById('loading').style.display='none';
var r=d.results||[];var h=document.getElementById('results');h.innerHTML='';
if(r.length===0){document.getElementById('noresults').style.display='block';return;}
var stats=d.stats||{total:r.length,source_tier:{}};
h.innerHTML='<div style="color:#78909c;font-size:12px;margin:8px 0">找到 '+r.length+' 条结果</div>';
r.forEach(function(item,i){
var title=item.title||'无标题';var source=item.source_name||item.source||'?';
var snippet=item.snippet||item.parsed_content||item.raw_content||'';
snippet=snippet.substring(0,200);
var score=item.relevance_score||item.score||0;
var tier=item.source_tier||'';
var tierClass=tier==='S'?'tag tag-s':'tag tag-a';
if(!tier) tierClass='tag';
var url=item.url||'#';
h.innerHTML+='<div class="result"><a class="title" href="'+url+'" target="_blank">'+(i+1)+'. '+title+'</a>'
+'<div class="meta">'+source+' · 相关度'+Math.round(score)+' · '+tier+'级</div>'
+'<div class="snippet">'+snippet+'</div></div>';
});
}).catch(function(e){document.getElementById('loading').style.display='none';alert('搜索失败: '+e);});
}
</script>
</body>
</html>""")

# Add a favicon handler to avoid 404
@app.route("/favicon.ico")
def favicon():
    return "", 204

@app.route("/api/health")
def api_health():
    """健康检查"""
    tt_health = check_thinktank_health()
    return jsonify({
        "status": "healthy",
        "service": "knowledge-base",
        "version": "1.0.0",
        "dify_configured": bool(DIFY_DATASET_ID or DIFY_DATASET_KEY),
        "thinktank_connected": tt_health.get("connected", False),
        "timestamp": datetime.now().isoformat(),
    })


# ════════════════════════════════════════════════════════════════
# 入库文档/报告
# ════════════════════════════════════════════════════════════════

@app.route("/api/kb/ingest", methods=["POST"])
def api_ingest():
    """
    入库文档/报告
    ---
    POST JSON:
      {
        "title": "文档标题",
        "content": "文档正文（纯文本）",
        "source": "来源标识（可选，默认 manual）",
        "source_url": "原文URL（可选）",
        "doc_type": "文档类型（text/web_page/report/...）",
        "tags": ["标签1", "标签2"],
        "metadata": {"key": "value"}
      }
    或：
      {
        "url": "https://example.com/article",
        "title": "可选标题（默认用URL）"
      }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "请求体为空或格式错误"}), 400

    # URL模式
    if "url" in data:
        result = import_url(
            url=data["url"],
            title=data.get("title"),
        )
        return jsonify(result), (201 if result["status"] in ("ok", "partial") else 400)

    # 文本模式
    title = data.get("title", data.get("name", "未命名文档"))
    content = data.get("content", data.get("text", ""))
    if not content:
        return jsonify({"status": "error", "message": "缺少 content 或 url"}), 400

    result = import_document(
        title=title,
        content=content,
        source=data.get("source", "manual"),
        source_url=data.get("source_url", ""),
        doc_type=data.get("doc_type", "text"),
        tags=data.get("tags"),
        metadata=data.get("metadata"),
    )
    return jsonify(result), (201 if result["status"] in ("ok", "partial") else 400)


# ════════════════════════════════════════════════════════════════
# 语义搜索
# ════════════════════════════════════════════════════════════════

@app.route("/api/kb/search", methods=["GET", "POST"])
def api_search():
    """
    语义搜索知识库
    ---
    GET  /api/kb/search?query=关键词&top_k=5
    POST /api/kb/search  JSON: {"query": "...", "top_k": 5, "filters": {}}
    """
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        query = data.get("query", "")
        top_k = int(data.get("top_k", 5))
    else:
        query = request.args.get("query", "")
        top_k = int(request.args.get("top_k", 5))

    if not query:
        return jsonify({"status": "error", "message": "缺少 query 参数"}), 400

    results = search(query, top_k=top_k)
    return jsonify({
        "status": "ok",
        "query": query,
        "count": len(results),
        "results": results,
    })


# ════════════════════════════════════════════════════════════════
# RAG 问答
# ════════════════════════════════════════════════════════════════

@app.route("/api/kb/ask", methods=["POST"])
def api_ask():
    """
    RAG问答
    ---
    POST JSON:
      {
        "query": "用户问题",
        "mode": "workflow",   // "workflow" 或 "simple"
        "context": "额外上下文（可选）"
      }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "请求体为空"}), 400

    question = data.get("query", data.get("question", ""))
    if not question:
        return jsonify({"status": "error", "message": "缺少 query 参数"}), 400

    result = ask(
        question=question,
        context=data.get("context", ""),
        mode=data.get("mode", "workflow"),
    )
    return jsonify(result)


# ════════════════════════════════════════════════════════════════
# 研报聚合搜索
# ════════════════════════════════════════════════════════════════

@app.route("/api/kb/reports/search", methods=["GET", "POST"])
def api_reports_search():
    """
    研报聚合搜索（跨知识库 + 智库中枢）
    ---
    GET  /api/kb/reports/search?query=关键词&days=7&source=智库名&tier=S
    POST /api/kb/reports/search  JSON: {"query": "...", "filters": {}}
    """
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        query = data.get("query", "")
        top_k = int(data.get("top_k", 10))
        filters = data.get("filters", {})
    else:
        query = request.args.get("query", "")
        top_k = int(request.args.get("top_k", 10))
        filters = {
            "days": int(request.args.get("days", 7)),
            "source": request.args.get("source", ""),
            "tier": request.args.get("tier", ""),
        }

    if not query:
        return jsonify({"status": "error", "message": "缺少 query 参数"}), 400

    results = search_reports(query, top_k=top_k, filters=filters)
    return jsonify({
        "status": "ok",
        "query": query,
        "total": results["total"],
        "kb_results": results["kb_results"],
        "think_tank_results": results["think_tank_results"],
    })


# ════════════════════════════════════════════════════════════════
# 同步管理与状态
# ════════════════════════════════════════════════════════════════

@app.route("/api/kb/sync", methods=["POST", "GET"])
def api_sync():
    """
    从智库中枢同步报告到知识库
    GET  → 查看同步状态
    POST → 触发同步（可带参数 full=true 全量同步）
    """
    if request.method == "GET":
        stats = get_sync_stats()
        return jsonify({"status": "ok", "stats": stats})

    # POST：触发同步
    data = request.get_json(silent=True) or {}
    full_sync = data.get("full", "false").lower() == "true"
    result = sync_from_thinktank(full_sync=full_sync)
    return jsonify(result)


@app.route("/api/kb/stats")
def api_stats():
    """获取服务统计信息"""
    sync_stats = get_sync_stats()
    return jsonify({
        "dify_dataset_id": DIFY_DATASET_ID,
        "dify_dataset_configured": bool(DIFY_DATASET_KEY),
        "sync": sync_stats,
        "timestamp": datetime.now().isoformat(),
    })


# ════════════════════════════════════════════════════════════════
# 启动入口
# ════════════════════════════════════════════════════════════════

def start_auto_sync():
    """启动后台自动同步线程（每6小时一次）"""
    from report_aggregator import SYNC_INTERVAL_HOURS

    def _sync_worker():
        """后台同步工作线程"""
        import time
        while True:
            try:
                print(f"\n  [自动同步] {datetime.now().strftime('%Y-%m-%d %H:%M')}")
                result = sync_from_thinktank(full_sync=False)
                print(f"  [自动同步] 完成: {result.get('synced', 0)} 篇新报告")
            except Exception as e:
                print(f"  [自动同步错误] {e}")
            time.sleep(SYNC_INTERVAL_HOURS * 3600)

    thread = threading.Thread(target=_sync_worker, daemon=True)
    thread.start()
    print(f"  [自动同步] 已启动 (每 {SYNC_INTERVAL_HOURS} 小时)")


if __name__ == "__main__":
    print(f"\n{'='*50}")
    print(f"📚 知识库服务 · v1.0")
    print(f"{'='*50}")

    # 初始化知识库（缓存 + Dify探测）
    init_kb_service()

    # 同步智库中枢报告到知识库（启动时自动导入历史报告）
    thinktank_health = check_thinktank_health()
    if thinktank_health.get("connected"):
        print(f"\n  [启动] 智库中枢已连接，开始导入历史报告...")
        sync_result = sync_from_thinktank(full_sync=True)
        print(f"  [启动] 首次同步完成: {sync_result.get('synced', 0)} 篇")
    else:
        print(f"\n  [启动] 智库中枢未连接: {thinktank_health.get('message', '')}")
        print(f"  [启动] 可稍后通过 POST /api/kb/sync 手动触发同步")

    # 启动后台自动同步
    start_auto_sync()

    print(f"\n  📚 知识库服务启动于 http://localhost:{PORT}")
    print(f"  {'='*50}\n")

    app.run(host="0.0.0.0", port=PORT, debug=DEBUG, threaded=True)
