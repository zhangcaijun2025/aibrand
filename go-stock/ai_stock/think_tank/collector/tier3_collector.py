# -*- coding: utf-8 -*-
"""
Tier 3 智库接入 - 关键词触发搜索采集器
针对20+中小智库，当监测到触发关键词时自动搜索最新报告
"""

import json, requests, html, re
from datetime import datetime
from typing import List, Dict, Optional
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from collector.models import save_report, get_db

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

# Tier 3 智库清单
TIER3_SOURCES = [
    {"id": "eastwest", "name": "East-West Center", "region": "亚太", "homepage": "https://www.eastwestcenter.org", "search_site": "eastwestcenter.org"},
    {"id": "stimson", "name": "Stimson Center", "region": "北美", "homepage": "https://www.stimson.org", "search_site": "stimson.org"},
    {"id": "hudson", "name": "Hudson Institute", "region": "北美", "homepage": "https://www.hudson.org", "search_site": "hudson.org"},
    {"id": "aei", "name": "AEI", "region": "北美", "homepage": "https://www.aei.org", "search_site": "aei.org"},
    {"id": "heritage", "name": "Heritage Foundation", "region": "北美", "homepage": "https://www.heritage.org", "search_site": "heritage.org"},
    {"id": "cato", "name": "Cato Institute", "region": "北美", "homepage": "https://www.cato.org", "search_site": "cato.org"},
    {"id": "wilson", "name": "Wilson Center", "region": "北美", "homepage": "https://www.wilsoncenter.org", "search_site": "wilsoncenter.org"},
    {"id": "atlantic", "name": "Atlantic Council", "region": "北美", "homepage": "https://www.atlanticcouncil.org", "search_site": "atlanticcouncil.org"},
    {"id": "ecfr", "name": "ECFR", "region": "欧洲", "homepage": "https://ecfr.eu", "search_site": "ecfr.eu"},
    {"id": "bruegel", "name": "Bruegel", "region": "欧洲", "homepage": "https://www.bruegel.org", "search_site": "bruegel.org"},
    {"id": "diis", "name": "DIIS", "region": "欧洲", "homepage": "https://www.diis.dk", "search_site": "diis.dk"},
    {"id": "nupi", "name": "NUPI", "region": "欧洲", "homepage": "https://www.nupi.no", "search_site": "nupi.no"},
    {"id": "rsis", "name": "RSIS", "region": "亚太", "homepage": "https://www.rsis.edu.sg", "search_site": "rsis.edu.sg"},
    {"id": "jiia", "name": "JIIA", "region": "亚太", "homepage": "https://www.jiia.or.jp", "search_site": "jiia.or.jp"},
    {"id": "orf", "name": "ORF", "region": "亚太", "homepage": "https://www.orfonline.org", "search_site": "orfonline.org"},
    {"id": "diplomat", "name": "The Diplomat", "region": "亚太", "homepage": "https://thediplomat.com", "search_site": "thediplomat.com"},
]

# 高价值触发关键词
TRIGGER_KEYWORDS = [
    "tariff", "trade war", "sanction", "export control", "chip",
    "semiconductor", "AI regulation", "artificial intelligence",
    "interest rate", "inflation", "GDP", "recession",
    "military spending", "defense budget", "cyber attack",
    "supply chain", "rare earth", "energy crisis",
    "nuclear", "territorial dispute", "election",
    "quantum", "space", "drone", "hypersonic",
    "central bank", "monetary policy", "fiscal policy",
    "geopolitical risk", "conflict", "war",
]

# 中文触发词
TRIGGER_KEYWORDS_CN = [
    "关税", "制裁", "出口管制", "芯片", "半导体",
    "人工智能", "利率", "通胀", "GDP", "衰退",
    "军费", "国防预算", "网络攻击", "供应链",
    "稀土", "能源危机", "核", "领土争端", "选举",
    "量子", "太空", "央行", "货币政策",
    "地缘风险", "冲突", "战争",
]


def collect_tier3_by_keyword(keyword: str, limit_per_source: int = 3) -> Dict[str, int]:
    """根据关键词搜索所有Tier 3智库的相关报告"""
    total_new = 0
    results = {}
    
    for src in TIER3_SOURCES:
        sid = src["id"]
        site = src["search_site"]
        query = f"site:{site} {keyword}"
        
        articles = search_news_api(query, limit=limit_per_source)
        new_count = 0
        for a in articles:
            rid = save_report(
                source_id=sid,
                title=a["title"],
                url=a["url"],
                guid=a.get("guid", a["url"]),
                publish_date=a.get("publish_date", datetime.now().strftime("%Y-%m-%d")),
                raw_content=a.get("content", ""),
                language="en",
            )
            if rid:
                new_count += 1
        
        if new_count > 0:
            total_new += new_count
            results[sid] = new_count
    
    return {"total_new": total_new, "per_source": results}


def search_news_api(query: str, limit: int = 3) -> List[Dict]:
    """通过新闻搜索API获取智库文章"""
    articles = []
    try:
        api_key = os.environ.get('EM_API_KEY', 'em_15Ptv5aWmIC0BSynjsPacp7tambvswJ1').strip()
        payload = {
            'query': query,
            'toolContext': {'callId': f't3_{datetime.now().timestamp()}'}
        }
        import urllib.request
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        req = urllib.request.Request(
            url='https://ai-saas.eastmoney.com/proxy/b/mcp/tool/searchNews',
            data=body, method='POST',
            headers={'Content-Type': 'application/json', 'em_api_key': api_key}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode('utf-8', errors='replace')
        data = json.loads(raw)
        
        items = data.get('data', {}).get('llmSearchResponse', {}).get('data', [])
        for item in items[:limit]:
            title = item.get('title', '')
            url = item.get('jumpUrl', '') or item.get('url', '')
            content = item.get('content', '')[:3000]
            date = (item.get('date', '') or '')[:10]
            articles.append({
                'title': html.unescape(re.sub(r'<[^>]+>', '', title)).strip()[:300],
                'url': url[:1000],
                'guid': url or title,
                'publish_date': date,
                'content': html.unescape(re.sub(r'<[^>]+>', ' ', content)).strip()[:3000],
            })
    except Exception as e:
        pass
    return articles


def collect_all_tier3():
    """采集所有Tier 3智库的最新报告（使用综合关键词）"""
    total = 0
    # 使用通用查询
    for src in TIER3_SOURCES:
        sid = src["id"]
        site = src["search_site"]
        query = f"site:{site} research report 2026"
        articles = search_news_api(query, limit=5)
        new_count = 0
        for a in articles:
            rid = save_report(
                source_id=sid,
                title=a["title"],
                url=a["url"],
                guid=a.get("guid", a["url"]),
                publish_date=a.get("publish_date", datetime.now().strftime("%Y-%m-%d")),
                raw_content=a.get("content", ""),
                language="en",
            )
            if rid:
                new_count += 1
        total += new_count
        if new_count > 0:
            print(f'  [{src["name"]}] {new_count}篇')
    return total
