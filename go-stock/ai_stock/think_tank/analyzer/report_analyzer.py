# -*- coding: utf-8 -*-
"""
报告分析引擎 - 分析/打分/交叉验证
"""

import json
from datetime import datetime
from typing import List, Dict, Optional
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from collector.models import get_recent_reports, update_report_analysis, get_db
from parser.content_parser import analyze_report


def analyze_pending_reports(hours: int = 48, limit: int = 100):
    """分析未处理的新报告"""
    reports = get_recent_reports(hours=hours, limit=limit)
    analyzed = 0
    for r in reports:
        if r.get("processed"):
            continue
        title = r.get("title", "")
        content = r.get("parsed_content", "") or r.get("raw_content", "")
        analysis = analyze_report(title, content)

        update_report_analysis(
            report_id=r["id"],
            summary=content[:500] if not r.get("summary") else r["summary"],
            categories=analysis["categories"],
            relevance=analysis["relevance"],
            sentiment=analysis["sentiment"],
            market_impact=analysis["market_impact"],
            sectors=analysis["affected_sectors"],
        )
        analyzed += 1

    return analyzed


def get_today_statistics(date_str: str = None) -> Dict:
    """获取当日智库统计概览"""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")

    conn = get_db()
    
    # 报告总数
    total = conn.execute(
        "SELECT COUNT(*) FROM reports WHERE date(created_at)=?", (date_str,)
    ).fetchone()[0]

    # 按来源分布
    sources = conn.execute("""
        SELECT s.name, s.tier, s.region, COUNT(*) as cnt
        FROM reports r
        JOIN sources s ON r.source_id = s.id
        WHERE date(r.created_at)=?
        GROUP BY s.name
        ORDER BY cnt DESC
    """, (date_str,)).fetchall()

    # 按情感分布
    sentiments = conn.execute("""
        SELECT
            SUM(CASE WHEN sentiment > 0.3 THEN 1 ELSE 0 END) as positive,
            SUM(CASE WHEN sentiment BETWEEN -0.3 AND 0.3 THEN 1 ELSE 0 END) as neutral,
            SUM(CASE WHEN sentiment < -0.3 THEN 1 ELSE 0 END) as negative
        FROM reports
        WHERE date(created_at)=? AND processed=1
    """, (date_str,)).fetchone()

    # 按领域分布
    domains_raw = conn.execute("""
        SELECT categories, COUNT(*) as cnt
        FROM reports WHERE date(created_at)=? AND processed=1 AND categories IS NOT NULL
        GROUP BY categories ORDER BY cnt DESC LIMIT 8
    """, (date_str,)).fetchall()

    conn.close()

    return {
        "date": date_str,
        "total_reports": total,
        "source_distribution": [{"name": r[0], "tier": r[1], "region": r[2], "count": r[3]}
                                for r in sources],
        "sentiment": {
            "positive": sentiments[0] if sentiments else 0,
            "neutral": sentiments[1] if sentiments else 0,
            "negative": sentiments[2] if sentiments else 0,
        },
        "domain_distribution": [json.loads(r[0]) if r[0].startswith("[") else [r[0]]
                                for r in domains_raw],
    }


def get_top_reports(date_str: str = None, limit: int = 10) -> List[Dict]:
    """获取当日最有价值的报告（按相关性排序）"""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")

    conn = get_db()
    rows = conn.execute("""
        SELECT r.*, s.name as source_name, s.tier as source_tier, s.region
        FROM reports r
        JOIN sources s ON r.source_id = s.id
        WHERE date(r.created_at)=? AND r.processed=1
        ORDER BY r.relevance_score DESC, ABS(r.sentiment) DESC
        LIMIT ?
    """, (date_str, limit)).fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        # 解析JSON字段
        for field in ("categories", "affected_sectors"):
            val = d.get(field)
            if isinstance(val, str):
                try:
                    d[field] = json.loads(val)
                except:
                    pass
        result.append(d)
    return result
