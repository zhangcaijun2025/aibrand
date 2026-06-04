# -*- coding: utf-8 -*-
"""
RSS/API 采集器 - 定时抓取智库最新报告
"""

import feedparser
import re
import html
from datetime import datetime
from typing import List, Dict, Optional
from urllib.request import urlopen, Request
from urllib.error import URLError
import ssl
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from collector.models import save_report
from collector.web_scraper import collect_via_scraper
from collector.search_collector import collect_via_search
from config import ALL_SOURCES, TIER_S_SOURCES, TIER_A_SOURCES

# 全局SSL上下文（兼容老旧RSS源）
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE

USER_AGENT = "Mozilla/5.0 (compatible; GlobalThinkTank/1.0; +https://github.com/thinktank)"


def fetch_rss(feed_url: str, timeout: int = 30) -> List[Dict]:
    """拉取RSS Feed并解析为报告列表"""
    reports = []
    try:
        req = Request(feed_url, headers={"User-Agent": USER_AGENT})
        with urlopen(req, timeout=timeout, context=ssl_ctx) as resp:
            raw = resp.read()
        feed = feedparser.parse(raw)
    except Exception as e:
        print(f"  [RSS Error] {feed_url}: {e}")
        return reports

    for entry in feed.entries[:20]:  # 每源最多取20条
        title = html.unescape(entry.get("title", "") or "")
        link = entry.get("link", "") or ""
        guid = entry.get("id", link) or link

        # 发布日期
        pub_date = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            try:
                pub_date = datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d")
            except:
                pass

        # 摘要作为原始内容
        summary = ""
        if hasattr(entry, "summary"):
            summary = html.unescape(entry.summary)
        elif hasattr(entry, "description"):
            summary = html.unescape(entry.description)

        # 清洗HTML标签
        clean_summary = re.sub(r"<[^>]+>", " ", summary)
        clean_summary = re.sub(r"\s+", " ", clean_summary).strip()[:2000]

        # 作者
        authors = ""
        if hasattr(entry, "authors") and entry.authors:
            authors = ", ".join(a.get("name", "") for a in entry.authors)

        reports.append({
            "title": title[:500],
            "url": link[:1000],
            "guid": guid[:200],
            "publish_date": pub_date or datetime.now().strftime("%Y-%m-%d"),
            "authors": authors[:200],
            "raw_content": clean_summary,
            "parsed_content": clean_summary,
        })

    return reports


def collect_source(source_cfg: Dict) -> int:
    """采集单个智库源，返回新增报告数"""
    sid = source_cfg["id"]
    feed_url = source_cfg.get("feed_url", "")
    feed_type = source_cfg.get("feed_type", "rss")

    print(f"  [{source_cfg['name']}] ", end="")

    reports = []
    if feed_type == "rss" and feed_url:
        reports = fetch_rss(feed_url)
    elif feed_type == "api":
        reports = fetch_api(source_cfg)

    # RSS/API 失败或无报告时，尝试网页抓取
    if not reports:
        scraper_result = collect_via_scraper(source_cfg)
        if scraper_result > 0:
            return scraper_result
        # 网页抓取也失败时，尝试搜索引擎
        search_result = collect_via_search(source_cfg)
        return search_result

    new_count = 0
    for r in reports:
        rid = save_report(
            source_id=sid,
            title=r["title"],
            url=r["url"],
            guid=r["guid"],
            publish_date=r["publish_date"],
            authors=r.get("authors", ""),
            raw_content=r.get("raw_content", ""),
            parsed_content=r.get("parsed_content", ""),
            language=source_cfg.get("lang", "en"),
        )
        if rid:
            new_count += 1

    print(f"{len(reports)}条 / 新增{new_count}")
    return new_count


def fetch_api(source_cfg: Dict) -> List[Dict]:
    """API采集（预留扩展）"""
    return []


def collect_tier(tier_cfg: list) -> int:
    """采集指定层级的全部智库"""
    total = 0
    for src in tier_cfg:
        if src.get("feed_url"):
            total += collect_source(src)
    return total


def collect_all() -> Dict[str, int]:
    """采集全部智库"""
    results = {}
    print(f"\n{'='*50}")
    print(f"全球智库采集 · {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*50}")

    print("\n[S级智库]")
    results["s_tier"] = collect_tier(TIER_S_SOURCES)
    print("\n[A级智库]")
    results["a_tier"] = collect_tier(TIER_A_SOURCES)

    total = results.get("s_tier", 0) + results.get("a_tier", 0)
    print(f"\n本次采集总计: {total} 篇")
    return results


if __name__ == "__main__":
    collect_all()
