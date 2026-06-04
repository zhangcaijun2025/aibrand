# -*- coding: utf-8 -*-
"""
Web采集器 - 针对无RSS的智库进行网页抓取
"""

import re, requests, html
from datetime import datetime
from typing import List, Dict
from urllib.parse import urljoin
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from collector.models import save_report

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}


def scrape_brookings(limit: int = 10) -> List[Dict]:
    """抓取Brookings最新文章（无RSS，抓取首页）"""
    articles = []
    try:
        r = requests.get('https://www.brookings.edu/articles/', headers=HEADERS, timeout=20)
        r.raise_for_status()
        # 查找文章卡片 - 多种模式
        patterns = [
            r'<h3[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>.*?</h3>',
            r'<a[^>]*class="[^"]*article-link[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
            r'<article[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>.*?</article>',
        ]
        found = set()
        for pat in patterns:
            matches = re.findall(pat, r.text, re.DOTALL | re.I)
            for url, title in matches:
                url = urljoin('https://www.brookings.edu', url)
                title = html.unescape(re.sub(r'<[^>]+>', '', title)).strip()
                if url not in found and title and '/articles/' in url:
                    found.add(url)
                    articles.append({
                        'title': title[:300],
                        'url': url,
                        'guid': url,
                        'publish_date': datetime.now().strftime('%Y-%m-%d'),
                        'raw_content': '',
                    })
                    if len(articles) >= limit:
                        break
            if articles:
                break
    except Exception as e:
        print(f'  [Brookings Scraper Error] {e}')
    return articles


def scrape_carnegie(limit: int = 10) -> List[Dict]:
    """抓取Carnegie最新文章"""
    articles = []
    try:
        r = requests.get('https://carnegieendowment.org/research', headers=HEADERS, timeout=20)
        r.raise_for_status()
        pat = r'<a[^>]*href="(/research/[^"]+)"[^>]*>(.*?)</a>'
        matches = re.findall(pat, r.text, re.DOTALL)
        found = set()
        for url, title in matches:
            full_url = urljoin('https://carnegieendowment.org', url)
            title = html.unescape(re.sub(r'<[^>]+>', '', title)).strip()
            if full_url not in found and title:
                found.add(full_url)
                articles.append({
                    'title': title[:300],
                    'url': full_url,
                    'guid': full_url,
                    'publish_date': datetime.now().strftime('%Y-%m-%d'),
                    'raw_content': '',
                })
                if len(articles) >= limit:
                    break
    except Exception as e:
        print(f'  [Carnegie Scraper Error] {e}')
    return articles


def scrape_generic(homepage: str, article_path: str, link_pattern: str, limit: int = 10) -> List[Dict]:
    """通用网页采集器"""
    articles = []
    url = urljoin(homepage, article_path)
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        r.raise_for_status()
        matches = re.findall(link_pattern, r.text, re.DOTALL)
        found = set()
        for m in matches:
            link_url = m[0] if isinstance(m, tuple) else m
            title = m[1] if isinstance(m, tuple) and len(m) > 1 else ''
            full_url = urljoin(homepage, link_url)
            title = html.unescape(re.sub(r'<[^>]+>', '', title)).strip()
            if full_url not in found and title:
                found.add(full_url)
                articles.append({
                    'title': title[:300],
                    'url': full_url,
                    'guid': full_url,
                    'publish_date': datetime.now().strftime('%Y-%m-%d'),
                    'raw_content': '',
                })
                if len(articles) >= limit:
                    break
    except Exception as e:
        print(f'  [Scraper Error {homepage}] {e}')
    return articles


WEB_SCRAPERS = {
    'brookings': scrape_brookings,
    'carnegie': scrape_carnegie,
}


def collect_via_scraper(source_cfg: Dict) -> int:
    """通过网页抓取采集智库报告"""
    sid = source_cfg['id']
    scraper = WEB_SCRAPERS.get(sid)
    if not scraper:
        print(f'  [{source_cfg["name"]}] 无对应网页抓取器')
        return 0
    
    print(f'  [{source_cfg["name"]}] 网页抓取...', end=' ')
    articles = scraper()
    new_count = 0
    for a in articles:
        rid = save_report(
            source_id=sid,
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
