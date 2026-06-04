# -*- coding: utf-8 -*-
"""
搜索采集器 - 通过搜索引擎/新闻API获取智库报告
用于无公开RSS源的智库
"""

import requests, json, html, re
from datetime import datetime
from typing import List, Dict
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from collector.models import save_report


def search_think_tank_reports(source_cfg: Dict, limit: int = 10) -> List[Dict]:
    """通过搜索引擎获取智库最新报告（使用mx-finance-search API兜底）"""
    ttl = source_cfg.get('full_name', source_cfg['name'])
    query = f'{ttl} research report 2026'
    
    # 尝试用 mx-finance-search 的 ES 搜索
    articles = []
    try:
        api_key = os.environ.get('EM_API_KEY', 'em_15Ptv5aWmIC0BSynjsPacp7tambvswJ1').strip()
        payload = {
            'query': query,
            'toolContext': {'callId': f'search_{datetime.now().timestamp()}'}
        }
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        req = __import__('urllib.request', fromlist=['Request']).Request(
            url='https://ai-saas.eastmoney.com/proxy/b/mcp/tool/searchNews',
            data=body, method='POST',
            headers={'Content-Type': 'application/json', 'em_api_key': api_key}
        )
        with __import__('urllib.request', fromlist=['urlopen']).urlopen(req, timeout=15) as resp:
            raw = resp.read().decode('utf-8', errors='replace')
        data = json.loads(raw)
        
        # 提取搜索结果
        search_data = data.get('data', {}).get('llmSearchResponse', {}).get('data', [])
        for item in search_data[:limit]:
            title = item.get('title', '')
            url = item.get('jumpUrl', '') or item.get('url', '')
            content = item.get('content', '')[:2000]
            date = item.get('date', '')[:10]
            articles.append({
                'title': html.unescape(re.sub(r'<[^>]+>', '', title)).strip()[:300],
                'url': url[:1000],
                'guid': url or title,
                'publish_date': date or datetime.now().strftime('%Y-%m-%d'),
                'raw_content': html.unescape(re.sub(r'<[^>]+>', ' ', content)).strip()[:5000],
            })
    except Exception as e:
        print(f'  [Search Error] {e}')
    
    return articles


def collect_via_search(source_cfg: Dict) -> int:
    """通过搜索采集智库报告"""
    print(f'  [{source_cfg["name"]}] 搜索引擎采集...', end=' ')
    articles = search_think_tank_reports(source_cfg)
    new_count = 0
    for a in articles:
        rid = save_report(
            source_id=source_cfg['id'],
            title=a['title'],
            url=a['url'],
            guid=a['guid'],
            publish_date=a['publish_date'],
            raw_content=a.get('raw_content', ''),
            parsed_content='',
            language=source_cfg.get('lang', 'en'),
        )
        if rid:
            new_count += 1
    print(f'{len(articles)}条 / 新增{new_count}')
    return new_count
