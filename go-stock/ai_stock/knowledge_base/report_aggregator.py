# -*- coding: utf-8 -*-
"""
研报聚合器 —— 对接智库中枢 (think_tank, port 4002)
=================================================
职责：
  1. 从智库中枢拉取历史/最新报告
  2. 导入知识库 (Dify / 本地缓存)
  3. 提供跨知识库的研报搜索
  4. 定时自动同步（由 app.py 启动时触发）
"""

import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict

import requests

from kb_service import import_document, search

# ────────────────────────────── 配置 ──────────────────────────────
THINK_TANK_URL = os.getenv("THINK_TANK_URL", "http://localhost:4002")
SYNC_BATCH_SIZE = int(os.getenv("KB_SYNC_BATCH_SIZE", "20"))
SYNC_INTERVAL_HOURS = int(os.getenv("KB_SYNC_INTERVAL_HOURS", "6"))

# 状态文件：记录上次同步时间
STATE_DIR = Path(__file__).parent / "data"
STATE_DIR.mkdir(parents=True, exist_ok=True)
SYNC_STATE_FILE = str(STATE_DIR / "sync_state.json")


def _load_sync_state() -> dict:
    """读取上次同步状态"""
    try:
        with open(SYNC_STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"last_sync": None, "synced_count": 0, "last_report_id": None}


def _save_sync_state(state: dict):
    """保存同步状态"""
    with open(SYNC_STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


# ────────────────────────────── 智库中枢通信 ──────────────────────────────


def _think_tank_get(endpoint: str, params: dict = None) -> Optional[dict]:
    """GET 请求智库中枢"""
    url = f"{THINK_TANK_URL}{endpoint}"
    try:
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code == 200:
            return resp.json()
        print(f"  [智库错误] {endpoint} → {resp.status_code}")
        return None
    except requests.RequestException as e:
        print(f"  [智库连接失败] {endpoint} → {e}")
        return None


def fetch_reports_from_thinktank(hours: int = 72, limit: int = 100) -> List[Dict]:
    """
    从智库中枢获取报告列表
    hours: 最近N小时内
    limit: 最大数量
    返回报告字典列表
    """
    result = _think_tank_get("/api/reports", {"hours": hours, "limit": limit})
    if result:
        return result.get("reports", [])
    return []


def fetch_report_detail(report_id: str) -> Optional[Dict]:
    """
    获取单个报告详情（目前智库列表接口已包含完整信息，此函数预留）
    """
    # 智库中枢列表接口已包含大部分字段
    return None


# ────────────────────────────── 报告导入 ──────────────────────────────


def _build_doc_content(report: dict) -> str:
    """将报告字段拼接为文档文本"""
    parts = []

    # 标题
    title = report.get("title", "") or report.get("name", "")
    parts.append(f"# {title}")

    # 智库来源
    source_name = report.get("source_name", "") or ""
    source_tier = report.get("source_tier", "") or ""
    if source_name:
        parts.append(f"来源智库: {source_name} ({source_tier})")

    # 发表日期
    pub_date = report.get("publish_date") or report.get("created_at", "")
    if pub_date:
        parts.append(f"发表日期: {pub_date}")

    # 摘要
    summary = report.get("summary", "") or ""
    if summary:
        parts.append(f"\n## 摘要\n{summary}")

    # 分类 / 领域
    categories = report.get("categories", "")
    if categories:
        if isinstance(categories, str):
            try:
                cat_list = json.loads(categories)
                parts.append(f"分类: {' › '.join(cat_list[:5])}")
            except json.JSONDecodeError:
                parts.append(f"分类: {categories[:200]}")
        elif isinstance(categories, list):
            parts.append(f"分类: {' › '.join(categories[:5])}")

    # 正文（如果有）
    raw = report.get("raw_content", "") or ""
    parsed = report.get("parsed_content", "") or ""
    content = parsed or raw
    if content:
        # 只取前5000字作为文档内容
        parts.append(f"\n## 正文\n{content[:5000]}")

    return "\n\n".join(parts)


def sync_from_thinktank(full_sync: bool = False) -> dict:
    """
    从智库中枢同步报告到知识库
    - full_sync=True: 拉取最近72小时所有报告
    - full_sync=False: 增量同步（拉取上次同步后的新报告）

    返回: {"status": "ok", "synced": int, "total": int, "errors": int}
    """
    state = _load_sync_state()
    synced_count = 0
    error_count = 0
    last_id = state.get("last_report_id")

    # 拉取报告
    if full_sync:
        reports = fetch_reports_from_thinktank(hours=72, limit=200)
    else:
        # 增量：拉取最近6小时
        reports = fetch_reports_from_thinktank(hours=6, limit=50)

    if not reports:
        return {"status": "ok", "synced": 0, "total": 0, "errors": 0,
                "message": "智库中枢暂无新报告"}

    total = len(reports)
    print(f"\n  [同步] 从智库中枢获取 {total} 篇报告")

    for report in reports:
        report_id = report.get("id", "")
        title = (report.get("title", "") or report.get("name", "") or "未命名报告")[:200]

        # 跳过已同步的（根据last_report_id）
        if last_id and report_id <= last_id and not full_sync:
            continue

        # 跳过无实质内容的报告
        content_raw = report.get("raw_content", "") or ""
        content_parsed = report.get("parsed_content", "") or ""
        summary = report.get("summary", "") or ""
        if not (content_raw or content_parsed or summary):
            continue

        # 构建文档内容
        doc_content = _build_doc_content(report)

        # 构建元数据
        source_name = report.get("source_name", "")
        source_tier = report.get("source_tier", "")
        tags = []
        if source_name:
            tags.append(f"智库:{source_name}")
        if source_tier:
            tags.append(f"等级:{source_tier}")

        categories = report.get("categories", "")
        if categories:
            if isinstance(categories, str):
                try:
                    tags.extend(json.loads(categories)[:3])
                except (json.JSONDecodeError, TypeError):
                    pass
            elif isinstance(categories, list):
                tags.extend(categories[:3])

        # 重要性标记
        relevance = report.get("relevance_score", 0) or 0
        if isinstance(relevance, (int, float)) and relevance > 70:
            tags.append("高价值")

        # 入库
        result = import_document(
            title=title,
            content=doc_content,
            source=f"智库:{source_name}" if source_name else "think_tank",
            source_url=report.get("url", "") or "",
            doc_type="think_tank_report",
            tags=tags,
            metadata={
                "report_id": report_id,
                "source_name": source_name,
                "source_tier": source_tier,
                "publish_date": report.get("publish_date", ""),
                "relevance_score": relevance,
                "sentiment": report.get("sentiment", 0),
                "market_impact": report.get("market_impact", ""),
            },
        )

        if result["status"] in ("ok", "partial"):
            synced_count += 1
        else:
            error_count += 1
            print(f"  [同步失败] {title[:40]}... → {result.get('message', '')}")

        # 更新状态
        if report_id:
            state["last_report_id"] = report_id

    # 更新同步状态
    state["last_sync"] = datetime.now().isoformat()
    state["synced_count"] = state.get("synced_count", 0) + synced_count
    _save_sync_state(state)

    print(f"  [同步] 完成: 成功 {synced_count} / 失败 {error_count} / 总计 {total}")
    return {
        "status": "ok",
        "synced": synced_count,
        "total": total,
        "errors": error_count,
    }


# ────────────────────────────── 研报搜索 ──────────────────────────────


def search_reports(query: str, top_k: int = 10,
                   filters: dict = None) -> dict:
    """
    检索研报（跨知识库 + 智库中枢）
    - 先在本地/Dify知识库中搜索
    - 同时从智库中枢获取最新报告列表做补充

    filters 可选: {"source": "智库名称", "tier": "S/A", "days": 7}
    """
    results = {"kb_results": [], "think_tank_results": [], "total": 0}

    # 1. 知识库搜索
    kb_results = search(query, top_k=top_k)
    results["kb_results"] = kb_results

    # 2. 智库中枢补充搜索
    days = (filters or {}).get("days", 7)
    source_filter = (filters or {}).get("source", "")
    tier_filter = (filters or {}).get("tier", "")

    # 从智库中枢获取报告做关键词匹配补充
    reports = fetch_reports_from_thinktank(hours=days * 24, limit=100)
    tt_results = []

    for r in reports:
        title = r.get("title", "") or ""
        summary = r.get("summary", "") or ""
        source_name = r.get("source_name", "") or ""
        source_tier = r.get("source_tier", "") or ""

        # 应用过滤条件
        if source_filter and source_filter.lower() not in source_name.lower():
            continue
        if tier_filter and source_tier != tier_filter:
            continue

        # 关键词匹配
        query_lower = query.lower()
        if (query_lower in title.lower()
                or query_lower in summary.lower()):
            tt_results.append({
                "doc_id": r.get("id", ""),
                "title": title,
                "content": summary[:500],
                "score": r.get("relevance_score", 50),
                "source": f"智库:{source_name}",
                "source_tier": source_tier,
                "publish_date": r.get("publish_date", ""),
                "url": r.get("url", ""),
            })

    results["think_tank_results"] = tt_results[:top_k]
    results["total"] = len(kb_results) + len(tt_results)

    return results


# ────────────────────────────── 智库中枢健康检查 ──────────────────────────────


def check_thinktank_health() -> dict:
    """检查智库中枢连接状态"""
    result = _think_tank_get("/api/health")
    if result:
        return {
            "connected": True,
            "data": result,
        }
    return {
        "connected": False,
        "data": None,
        "message": f"无法连接到智库中枢 ({THINK_TANK_URL}/api/health)",
    }


# ────────────────────────────── 同步统计 ──────────────────────────────


def get_sync_stats() -> dict:
    """获取同步统计信息"""
    state = _load_sync_state()
    health = check_thinktank_health()
    return {
        "think_tank_url": THINK_TANK_URL,
        "think_tank_connected": health["connected"],
        "last_sync": state.get("last_sync"),
        "total_synced": state.get("synced_count", 0),
        "last_report_id": state.get("last_report_id"),
    }
