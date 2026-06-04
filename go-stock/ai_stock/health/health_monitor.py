#!/usr/bin/env python3
"""
AI 服务统一健康监控器 — v2.0 (修复版)
═══════════════════════════════════════════════
修复：API 永不阻塞，后台全并发探活 + 全局超时
═══════════════════════════════════════════════
"""

import json
import os
import socket
import subprocess
import sys
import time
import threading
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
from urllib.request import urlopen, Request
from urllib.error import URLError
from flask import Flask, jsonify, render_template_string

# 静默请求日志
logging.getLogger("werkzeug").setLevel(logging.ERROR)

# ── 路径 ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REGISTRY_PATH = os.path.join(BASE_DIR, "service_registry.json")

app = Flask(__name__)

# ── 缓存（原子读写，永不阻塞请求线程） ──
_cache = {"results": None, "timestamp": 0, "lock": threading.Lock()}

# ── 探活线程池（最多 10 个并发） ──
_PROBER_POOL = ThreadPoolExecutor(max_workers=10)


# ── 加载注册表 ──
def load_registry():
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ══════════════════════════════════════════
#   探活原语（带超时保护）
# ══════════════════════════════════════════

def check_port(host, port, timeout=2):
    """TCP 端口探测"""
    if port is None:
        return False
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception:
        return False


def check_http(url, expected_code=200, timeout=3):
    """HTTP GET 探测"""
    if not url:
        return None
    try:
        req = Request(url, method="GET", headers={"User-Agent": "HealthMonitor/1.0"})
        resp = urlopen(req, timeout=timeout)
        ok = resp.status == expected_code
        resp.close()
        return ok
    except URLError:
        return False
    except Exception:
        return False


def check_wmic(wmic_filter, timeout=3):
    """WMIC 进程查询（带严格超时）"""
    if not wmic_filter:
        return None
    try:
        result = subprocess.run(
            ["wmic", "process", "where", wmic_filter, "get", "ProcessId"],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        lines = [l.strip() for l in result.stdout.split("\n") if l.strip()]
        return len(lines) > 1  # 第一行是标题
    except subprocess.TimeoutExpired:
        return None
    except Exception:
        return None


# ══════════════════════════════════════════
#   单服务探活
# ══════════════════════════════════════════

def probe_service(svc):
    """对单个服务执行健康检查——每个 probe 自带内部超时保护"""
    method = svc.get("health_method", "port")
    fallback = svc.get("fallback_method")

    result = {
        "id": svc["id"],
        "name": svc["name"],
        "icon": svc.get("icon", "🔵"),
        "port": svc.get("port"),
        "type": svc.get("type", "unknown"),
        "category": svc.get("category", "未分类"),
        "alive": False,
        "method_used": None,
        "latency_ms": None,
        "detail": svc.get("description", ""),
        "tags": svc.get("tags", []),
    }

    # 桌面应用：直接标 manual，不调用 wmic（wmic 在 Win 上可能卡数秒）
    if method == "desktop":
        result["alive"] = False
        result["method_used"] = "manual"
        result["manual_hint"] = "需在桌面双击 main.py 启动"
        return result

    t0 = time.time()

    alive = False
    if method == "http":
        alive = check_http(svc.get("health_url"), svc.get("expected_status", 200))
        result["method_used"] = "http"
    elif method == "port":
        alive = check_port("127.0.0.1", svc.get("port"))
        result["method_used"] = "port"
    elif method == "process":
        alive = check_wmic(svc.get("wmic_filter"))
        result["method_used"] = "wmic"
    elif method == "desktop":
        alive = False
        result["method_used"] = "manual"
    else:
        alive = False
        result["method_used"] = "unknown"

    # 主通道失败 → 降级通道
    if not alive and fallback:
        if fallback == "port" and method != "port":
            alive = check_port("127.0.0.1", svc.get("port"))
            result["method_used"] = "port(fallback)"
        elif fallback == "wmic" and method != "process":
            alive = check_wmic(svc.get("wmic_filter"))
            result["method_used"] = "wmic(fallback)"
        elif fallback == "http":
            alive = check_http(svc.get("health_url"), svc.get("expected_status", 200))
            result["method_used"] = "http(fallback)"

    result["alive"] = alive
    result["latency_ms"] = round((time.time() - t0) * 1000, 1)
    return result


# ══════════════════════════════════════════
#   全量并发探活（后台专用，不供请求线程调用）
# ══════════════════════════════════════════

def run_background_probe():
    """后台全量并发探活，带 15s 全局超时。
    
    被后台线程唯一调用，请求线程只读缓存。
    即使后台线程卡死，缓存中的旧数据仍然可用。
    """
    try:
        registry = load_registry()
        services = registry["services"]

        results = [None] * len(services)

        def probe_one(idx_svc):
            idx, svc = idx_svc
            return idx, probe_service(svc)

        futures = {}
        for item in enumerate(services):
            futures[_PROBER_POOL.submit(probe_one, item)] = item[0]

        # 全局超时 15 秒
        for future in as_completed(futures, timeout=15):
            try:
                idx, r = future.result()
                results[idx] = r
            except Exception:
                pass  # 单个 probe 失败不影响其他

        # 填补超时/失败的 probe（标记为超时）
        for idx, r in enumerate(results):
            if r is None:
                svc = services[idx]
                results[idx] = {
                    "id": svc["id"],
                    "name": svc["name"],
                    "icon": svc.get("icon", "🔵"),
                    "port": svc.get("port"),
                    "type": svc.get("type", "unknown"),
                    "category": svc.get("category", "未分类"),
                    "alive": False,
                    "method_used": "timeout",
                    "latency_ms": None,
                    "detail": svc.get("description", ""),
                    "tags": svc.get("tags", []),
                }

        # 原子写缓存
        with _cache["lock"]:
            _cache["results"] = results
            _cache["timestamp"] = time.time()

    except TimeoutError:
        # 15s 全局超时——放弃本轮，保留旧缓存
        pass
    except Exception:
        pass


# ══════════════════════════════════════════
#   缓存读取（请求线程专用，永不阻塞）
# ══════════════════════════════════════════

def get_cached_results():
    """请求线程只读缓存。
    
    - 缓存有效期内直接返回
    - 过期了也返回旧数据，绝不触发 probe
    - 缓存为 None 时（启动初期）也返回 None，由调用方 fallback
    """
    results = None
    with _cache["lock"]:
        results = _cache["results"]
    return results


# ══════════════════════════════════════════
#   统计
# ══════════════════════════════════════════

def compute_stats(results):
    if not results or len(results) == 0:
        return {"total": 0, "alive": 0, "dead": 0, "health_pct": 0, "by_category": {}}
    
    total = len(results)
    alive = sum(1 for r in results if r["alive"])
    dead = total - alive
    by_category = {}
    for r in results:
        cat = r.get("category", "未分类")
        if cat not in by_category:
            by_category[cat] = {"total": 0, "alive": 0}
        by_category[cat]["total"] += 1
        if r["alive"]:
            by_category[cat]["alive"] += 1
    return {
        "total": total,
        "alive": alive,
        "dead": dead,
        "health_pct": round(alive / total * 100, 1) if total > 0 else 0,
        "by_category": by_category,
    }


# ══════════════════════════════════════════
#   Flask 路由
# ══════════════════════════════════════════

def _build_api_response():
    """构建 API 响应——只读缓存，永不阻塞"""
    results = get_cached_results()
    if results is None:
        # 启动初期缓存尚未准备好
        return jsonify({
            "status": "booting",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "stats": {"total": 0, "alive": 0, "dead": 0, "health_pct": 0, "by_category": {}},
            "services": [],
            "message": "Initial probe in progress, please retry in a few seconds"
        })
    
    stats = compute_stats(results)
    return jsonify({
        "status": "ok" if stats["alive"] == stats["total"] else "degraded",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "stats": stats,
        "services": results,
    })


@app.route("/api/health")
def api_health():
    """返回所有服务实时状态 JSON（只读缓存，永不阻塞）"""
    return _build_api_response()


@app.route("/api/health/registry")
def api_registry():
    """返回服务注册表"""
    return jsonify(load_registry())


@app.route("/api/health/<service_id>")
def api_health_single(service_id):
    """单服务探活——请求线程直接调用，因为只 probe 一个服务，风险低"""
    registry = load_registry()
    for svc in registry["services"]:
        if svc["id"] == service_id:
            return jsonify(probe_service(svc))
    return jsonify({"error": f"service '{service_id}' not found"}), 404


@app.route("/")
def index():
    """实时监控仪表盘页面（只读缓存，永不阻塞）"""
    results = get_cached_results()
    if results is None:
        results = []
    stats = compute_stats(results)
    return render_template_string(
        TEMPLATE_HTML,
        stats=stats,
        services=results,
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )


@app.route("/dashboard")
def dashboard_json():
    """供 AI 工作台 iframe/JS 调用的简化 JSON（只读缓存，永不阻塞）"""
    results = get_cached_results()
    if results is None:
        results = []
    stats = compute_stats(results)
    return jsonify({
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "stats": stats,
        "services": results,
    })


# ══════════════════════════════════════════
#   内嵌 HTML 模板（零外部依赖）
# ══════════════════════════════════════════

TEMPLATE_HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>AI 服务健康监控 · 实时</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;background:#060a15;color:#e0e8f5;padding:24px}
h1{font-size:22px;background:linear-gradient(135deg,#4f8cff,#00d4aa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}
.sub{color:#4a5a7a;font-size:12px;margin-bottom:16px;display:flex;gap:16px;flex-wrap:wrap}
.stat-bar{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}
.stat-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:8px;padding:8px 14px;display:flex;align-items:center;gap:6px}
.stat-num{font-size:18px;font-weight:700}
.stat-num.green{color:#3fb950}
.stat-num.red{color:#f85149}
.stat-label{font-size:11px;color:#6a7a9a}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.card{background:rgba(255,255,255,.02);border-radius:10px;border:1px solid rgba(255,255,255,.06);padding:14px 16px;display:flex;flex-direction:column;gap:6px;transition:all.3s}
.card:hover{border-color:rgba(79,140,255,.2);transform:translateY(-1px)}
.card.alive{border-left:3px solid #3fb950}
.card.dead{border-left:3px solid #f85149}
.card.external{border-left:3px solid #d29922}
.ch{display:flex;align-items:center;justify-content:space-between}
.cl{display:flex;align-items:center;gap:8px}
.ci{font-size:18px}
.cn{font-size:13px;font-weight:600}
.cs{font-size:10px;padding:1px 8px;border-radius:4px;font-weight:600}
.cs.alive{background:rgba(63,185,80,.15);color:#3fb950}
.cs.dead{background:rgba(248,81,73,.15);color:#f85149}
.cs.external{background:rgba(210,153,34,.15);color:#d29922}
.cd{font-size:11px;color:#5a6a8a}
.cm{font-size:10px;color:#4a5a7a;font-family:monospace}
.ct{font-size:10px;display:flex;gap:4px;flex-wrap:wrap}
.tag{font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(79,140,255,.1);color:#4f8cff}
.refresh-btn{position:fixed;bottom:20px;right:20px;background:linear-gradient(135deg,#4f8cff,#00d4aa);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:600;box-shadow:0 4px 16px rgba(79,140,255,.2)}
.refresh-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,140,255,.35)}
.last-update{position:fixed;bottom:20px;left:20px;font-size:10px;color:#3a5070}
</style>
</head>
<body>
<h1>\u2764\ufe0f AI \u670d\u52a1\u5065\u5eb7\u76d1\u63a7</h1>
<div class="sub">
  <span>\u5b9e\u65f6\u63a2\u6d3b &middot; \u540e\u53f0\u5e76\u53d1\u63a2\u6d3b + \u5168\u5c40 15s \u8d85\u65f6</span>
  <span id="tick">{{ timestamp }}</span>
</div>

<div class="stat-bar">
  <div class="stat-item"><span class="stat-label">\u2705 \u6b63\u5e38</span><span class="stat-num green">{{ stats.alive }}</span></div>
  <div class="stat-item"><span class="stat-label">\u274c \u5f02\u5e38</span><span class="stat-num red">{{ stats.dead }}</span></div>
  <div class="stat-item"><span class="stat-label">\u5065\u5eb7\u7387</span><span class="stat-num {% if stats.health_pct == 100 %}green{% else %}red{% endif %}">{{ stats.health_pct }}%</span></div>
</div>

<div class="grid">
{% for s in services %}
<div class="card {% if s.alive %}alive{% elif s.type == 'external' %}external{% else %}dead{% endif %}">
  <div class="ch">
    <div class="cl">
      <span class="ci">{{ s.icon }}</span>
      <span class="cn">{{ s.name }}</span>
    </div>
    <span class="cs {% if s.alive %}alive{% elif s.type == 'external' %}external{% else %}dead{% endif %}">
      {% if s.alive %}\u2705 \u6b63\u5e38{% elif s.type == 'external' %}\u23f3 \u7b49\u5f85{% else %}\u274c \u5f02\u5e38{% endif %}
    </span>
  </div>
  {% if s.detail %}<div class="cd">{{ s.detail }}</div>{% endif %}
  <div class="cm">
    {% if s.port %}\u7aef\u53e3 {{ s.port }}{% endif %}
    {% if s.method_used %} \u00b7 {{ s.method_used }} ({{ s.latency_ms }}ms){% endif %}
  </div>
  <div class="ct">
    {% for t in s.tags %}<span class="tag">{{ t }}</span>{% endfor %}
    {% if not s.alive and s.method_used == 'manual' %}<span class="tag" style="background:rgba(248,81,73,.15);color:#f85149">\u9700\u624b\u52a8\u542f\u52a8</span>{% endif %}
  </div>
</div>
{% endfor %}
</div>

<button class="refresh-btn" onclick="location.reload()">&#128260; 刷新</button>
<div class="last-update">&#128154; 探活周期 5s &middot; 黄金信仰</div>

<script>
setTimeout(function(){ location.reload(); }, 10000);
</script>
</body>
</html>
"""


# ══════════════════════════════════════════
#   启动
# ══════════════════════════════════════════

if __name__ == "__main__":
    port = 3998
    print("")
    print("AI Service Health Monitor — v2.0 (fixed)")
    print("----------------------------------------")
    print(f"Dashboard: http://localhost:{port}")
    print(f"API:       http://localhost:{port}/api/health")
    print(f"Registry:  {REGISTRY_PATH}")
    print(f"Strategy:  async concurrent probe + 15s global timeout")
    print(f"Interval:  5s (background only)")
    print("")

    # 首次探活——后台异步执行，不阻塞 Flask 启动
    def initial_probe():
        run_background_probe()
        print("Initial probe complete. Cache populated.")
    threading.Thread(target=initial_probe, daemon=True).start()

    # 后台线程每5秒刷缓存
    def background_prober():
        while True:
            time.sleep(5)
            run_background_probe()
    t = threading.Thread(target=background_prober, daemon=True)
    t.start()

    print("Flask server starting immediately (non-blocking)...")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
