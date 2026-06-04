# -*- coding: utf-8 -*-
"""
内容解析器 - 清洗、分类、关键信息提取
"""

import re
import json
from datetime import datetime
from typing import List, Tuple, Optional
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DOMAIN_TO_KEYWORDS, SENTIMENT_POSITIVE, SENTIMENT_NEGATIVE


def clean_html(text: str) -> str:
    """清除HTML标签，保留纯文本"""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:10000]


def classify_domain(title: str, content: str) -> List[str]:
    """基于关键词将文章归入八大领域"""
    combined = (title + " " + content[:3000]).lower()
    matched = []
    for domain, keywords in DOMAIN_TO_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in combined:
                matched.append(domain)
                break
    return matched if matched else ["宏观经济与金融政策"]


def calc_sentiment(title: str, content: str) -> float:
    """计算情绪得分 (-1.0 ~ 1.0)"""
    combined = (title + " " + content[:3000]).lower()
    pos_count = sum(1 for w in SENTIMENT_POSITIVE if w.lower() in combined)
    neg_count = sum(1 for w in SENTIMENT_NEGATIVE if w.lower() in combined)
    total = pos_count + neg_count
    if total == 0:
        return 0.0
    return round((pos_count - neg_count) / total, 2)


def estimate_relevance(categories: List[str], content_len: int) -> float:
    """估算投资相关度 (0-100)"""
    # 领域权重
    domain_weights = {
        "宏观经济与金融政策": 85,
        "科技前沿与产业创新": 80,
        "国际贸易与规则博弈": 75,
        "战略安全与地缘政治": 70,
        "能源、气候与环境": 65,
        "数字经济与人工智能": 75,
        "军事与防务安全": 60,
        "公共卫生与社会治理": 40,
    }
    base = max(domain_weights.get(c, 50) for c in categories) if categories else 50
    if content_len > 500:
        base += 10
    if content_len > 2000:
        base += 5
    return min(base, 100)


def estimate_market_impact(sentiment: float) -> str:
    """估算市场影响等级"""
    abs_s = abs(sentiment)
    if abs_s > 0.6:
        return "high"
    elif abs_s > 0.3:
        return "medium"
    return "low"


def extract_sectors(title: str, content: str) -> List[str]:
    """提取关联行业"""
    sector_map = {
        "semiconductor": "半导体", "semicon": "半导体",
        "chip": "芯片", "ai": "AI", "artificial intelligence": "AI",
        "energy": "能源", "oil": "石油", "gas": "天然气",
        "renewable": "新能源", "solar": "光伏", "battery": "电池",
        "defense": "国防军工", "military": "国防军工",
        "finance": "金融", "bank": "银行",
        "trade": "贸易", "tariff": "贸易",
        "pharma": "医药", "health": "医疗",
        "auto": "汽车", "ev": "新能源汽车",
        "semiconductor": "电子",
        "半导体": "半导体", "芯片": "芯片",
        "AI": "AI", "人工智能": "AI",
        "新能源": "新能源", "光伏": "光伏",
        "国防": "国防军工", "军工": "国防军工",
        "金融": "金融", "银行": "银行",
        "贸易": "贸易", "关税": "贸易",
        "医药": "医药", "医疗": "医疗",
        "汽车": "汽车",
    }
    combined = (title + " " + content[:2000]).lower()
    found = []
    for kw, sector in sector_map.items():
        if kw.lower() in combined and sector not in found:
            found.append(sector)
    return found[:5]  # 最多5个


def analyze_report(title: str, content: str) -> dict:
    """全量分析一篇报告"""
    categories = classify_domain(title, content)
    sentiment = calc_sentiment(title, content)
    relevance = estimate_relevance(categories, len(content or ""))
    impact = estimate_market_impact(sentiment)
    sectors = extract_sectors(title, content)

    return {
        "categories": categories,
        "sentiment": sentiment,
        "relevance": relevance,
        "market_impact": impact,
        "affected_sectors": sectors,
    }
