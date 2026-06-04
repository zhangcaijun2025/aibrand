# -*- coding: utf-8 -*-
"""
Dify Workflow 集成 - 智库报告LLM深度分析
"""

import requests
import json
from datetime import datetime
from typing import Optional, Dict
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from collector.models import get_db

# Dify配置
DIFY_API_URL = "http://dify-nginx-1:80/v1/workflows/run"
DIFY_API_KEY = "app-c6aCH6OxDmDOBURqCJYw5565"  # 全球实时情报中心API Key


def analyze_with_dify(title: str, content: str, source_name: str) -> Optional[Dict]:
    """
    调用Dify工作流进行LLM深度分析
    返回结构化分析结果
    """
    payload = {
        "inputs": {
            "title": title[:500],
            "content": content[:8000],
            "source": source_name,
        },
        "response_mode": "blocking",
        "user": "think-tank-hub",
    }

    try:
        resp = requests.post(
            DIFY_API_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {DIFY_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=60,
        )
        if resp.status_code == 200:
            result = resp.json()
            outputs = result.get("data", {}).get("outputs", {})
            if outputs:
                return {
                    "llm_summary": outputs.get("summary", "") or outputs.get("analysis", ""),
                    "llm_sentiment": outputs.get("sentiment", 0),
                    "llm_relevance": outputs.get("relevance", 50),
                    "llm_key_points": outputs.get("key_points", ""),
                    "llm_market_impact": outputs.get("market_impact", "medium"),
                    "llm_sectors": outputs.get("affected_sectors", ""),
                }
        return None
    except Exception as e:
        print(f"  [Dify Error] {e}")
        return None


def analyze_pending_with_dify(limit: int = 10):
    """分析未处理的报告（调用Dify LLM）"""
    conn = get_db()
    rows = conn.execute("""
        SELECT r.id, r.title, r.parsed_content, r.raw_content, s.name as source_name
        FROM reports r
        JOIN sources s ON r.source_id = s.id
        WHERE r.processed=1 AND (r.summary IS NULL OR r.summary='')
        ORDER BY r.relevance_score DESC
        LIMIT ?
    """, (limit,)).fetchall()
    conn.close()

    if not rows:
        # 取最新已处理但无LLM分析的报告
        conn = get_db()
        rows = conn.execute("""
            SELECT r.id, r.title, 
                   COALESCE(r.parsed_content, r.raw_content, '') as content,
                   s.name as source_name
            FROM reports r
            JOIN sources s ON r.source_id = s.id
            WHERE r.processed=1
            ORDER BY r.created_at DESC
            LIMIT ?
        """, (limit,)).fetchall()
        conn.close()

    analyzed = 0
    for r in rows:
        report_id = r[0]
        title = r[1] or ""
        content = r[3] if r[3] else r[2] if r[2] else ""
        source_name = r[4] if len(r) > 4 else ""

        result = analyze_with_dify(title, content, source_name)
        if result:
            # 更新报告
            conn = get_db()
            conn.execute("""
                UPDATE reports SET
                    summary = CASE WHEN summary IS NULL OR summary='' THEN ? ELSE summary END,
                    categories = CASE WHEN categories IS NULL THEN ? ELSE categories END,
                    relevance_score = CASE WHEN relevance_score=0 THEN ? ELSE relevance_score END,
                    sentiment = CASE WHEN sentiment=0 THEN ? ELSE sentiment END,
                    market_impact = CASE WHEN market_impact='medium' THEN ? ELSE market_impact END,
                    affected_sectors = CASE WHEN affected_sectors IS NULL THEN ? ELSE affected_sectors END
                WHERE id=?
            """, (
                result.get("llm_summary", "")[:5000],
                json.dumps([result.get("llm_key_points", "")], ensure_ascii=False)[:1000],
                result.get("llm_relevance", 50),
                result.get("llm_sentiment", 0.0),
                result.get("llm_market_impact", "medium"),
                json.dumps([s.strip() for s in result.get("llm_sectors", "").split(",") if s.strip()], ensure_ascii=False)[:1000],
                report_id,
            ))
            conn.commit()
            conn.close()
            analyzed += 1
            print(f'  Dify分析完成: {title[:40]}...')

    return analyzed
