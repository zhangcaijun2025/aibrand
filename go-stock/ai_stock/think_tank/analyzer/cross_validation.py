# -*- coding: utf-8 -*-
"""
跨智库交叉验证引擎 - 多智库同一议题对比分析
输出共识度/分歧点矩阵
"""

import json, requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from collector.models import get_db, get_recent_reports


def find_same_topic_reports(hours: int = 72, min_sources: int = 2) -> List[Dict]:
    """
    查找跨智库的同一议题报告
    通过关键词聚类找到多个智库同时报道的主题
    """
    reports = get_recent_reports(hours=hours, limit=200)
    
    # 关键词提取和聚类
    topic_clusters = {}
    for r in reports:
        title = (r.get("title") or "").lower()
        content = (r.get("parsed_content") or r.get("raw_content") or "").lower()[:500]
        combined = title + " " + content
        
        source = r.get("source_name", "")
        report_id = r.get("id", "")
        
        # 提取关键实体词
        key_terms = []
        # 地理/国家
        for term in ["china", "us", "russia", "europe", "japan", "korea", "india",
                     "taiwan", "ukraine", "middle east", "iran", "africa",
                     "indonesia", "vietnam", "australia"]:
            if term in combined:
                key_terms.append(term)
        
        # 产业/议题
        for term in ["semiconductor", "chip", "AI", "tariff", "trade",
                     "energy", "climate", "defense", "military",
                     "nuclear", "cyber", "space", "supply chain"]:
            if term in combined:
                key_terms.append(term)
        
        # 用前3个关键词作为主题签名
        signature = "|".join(sorted(set(key_terms))[:3]) if key_terms else "other"
        
        if signature not in topic_clusters:
            topic_clusters[signature] = {"sources": set(), "reports": []}
        topic_clusters[signature]["sources"].add(source)
        topic_clusters[signature]["reports"].append(r)
    
    # 筛选出跨智库的主题（>=2个不同来源）
    cross_topics = []
    for sig, cluster in topic_clusters.items():
        if len(cluster["sources"]) >= min_sources and sig and sig != "other":
            cross_topics.append({
                "topic_signature": sig,
                "source_count": len(cluster["sources"]),
                "sources": list(cluster["sources"]),
                "report_count": len(cluster["reports"]),
                "reports": cluster["reports"][:5],
            })
    
    cross_topics.sort(key=lambda x: x["source_count"], reverse=True)
    return cross_topics


def analyze_consensus(cross_topics: List[Dict]) -> List[Dict]:
    """
    对跨智库主题进行共识分析（基于规则评分）
    """
    results = []
    
    for topic in cross_topics:
        reports = topic["reports"]
        if len(reports) < 2:
            continue
        
        # 分析情绪一致性
        sentiments = [r.get("sentiment", 0) for r in reports if r.get("sentiment")]
        relevance_scores = [r.get("relevance_score", 50) for r in reports if r.get("relevance_score")]
        
        if not sentiments:
            continue
        
        avg_sentiment = sum(sentiments) / len(sentiments)
        sentiment_variance = sum((s - avg_sentiment) ** 2 for s in sentiments) / len(sentiments) if len(sentiments) > 1 else 0
        
        # 共识度 = 1 - 方差(归一化)
        consensus_score = max(0, min(1, 1 - sentiment_variance))
        
        avg_relevance = sum(relevance_scores) / len(relevance_scores) if relevance_scores else 50
        
        # 置信度 = 来源数 * 共识度（归一化）
        confidence = min(1, (topic["source_count"] / 5) * consensus_score)
        
        # 判断市场影响
        impacts = [r.get("market_impact", "medium") for r in reports if r.get("market_impact")]
        high_count = impacts.count("high")
        overall_impact = "high" if high_count > len(impacts) / 2 else (
            "low" if impacts.count("low") > len(impacts) / 2 else "medium")
        
        results.append({
            "topic_signature": topic["topic_signature"],
            "sources": topic["sources"],
            "source_count": topic["source_count"],
            "report_count": topic["report_count"],
            "consensus_score": round(consensus_score, 2),
            "avg_sentiment": round(avg_sentiment, 2),
            "avg_relevance": round(avg_relevance, 1),
            "confidence": round(confidence, 2),
            "overall_impact": overall_impact,
            "sentiment_consensus": "一致" if consensus_score > 0.7 else ("分歧" if consensus_score < 0.3 else "中性"),
        })
    
    results.sort(key=lambda x: x["source_count"] * x["confidence"], reverse=True)
    return results


def save_consensus(topic: str, reports: list, consensus_score: float,
                   conclusion: str, confidence: float):
    """保存共识分析结果"""
    conn = get_db()
    import uuid
    cid = str(uuid.uuid4())[:12]
    report_ids = json.dumps([r.get("id", "") for r in reports], ensure_ascii=False)
    conn.execute("""
        INSERT OR REPLACE INTO consensus
        (id, topic, report_ids, consensus_score, conclusion, confidence)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (cid, topic, report_ids, consensus_score, conclusion, confidence))
    conn.commit()
    conn.close()


def run_cross_validation() -> Dict:
    """运行完整交叉验证流程"""
    # 1. 找跨智库主题
    topics = find_same_topic_reports(hours=72, min_sources=2)
    # 2. 共识分析
    results = analyze_consensus(topics)
    # 3. 保存结果
    for r in results:
        save_consensus(r["topic_signature"], [], r["consensus_score"],
                       json.dumps(r, ensure_ascii=False), r["confidence"])
    
    return {
        "total_cross_topics": len(results),
        "high_consensus": len([r for r in results if r["consensus_score"] > 0.7]),
        "divergent": len([r for r in results if r["consensus_score"] < 0.3]),
        "results": results[:10],
    }
