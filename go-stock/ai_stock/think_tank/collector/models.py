# -*- coding: utf-8 -*-
"""
数据模型 - 智库报告与来源
"""

from datetime import datetime
import json
import os
import sqlite3
import uuid
from pathlib import Path

DB_DIR = Path(__file__).parent / "data"
DB_PATH = DB_DIR / "think_tank.db"


def get_db() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """初始化数据库表结构"""
    conn = get_db()
    conn.executescript("""
        -- 智库来源注册表
        CREATE TABLE IF NOT EXISTS sources (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            full_name TEXT,
            country TEXT,
            region TEXT,
            tier TEXT CHECK(tier IN ('S','A','B')),
            feed_url TEXT,
            feed_type TEXT CHECK(feed_type IN ('rss','api','web')),
            homepage TEXT,
            lang TEXT DEFAULT 'en',
            domains TEXT,
            polling_minutes INTEGER DEFAULT 240,
            last_polled TIMESTAMP,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 智库报告
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            source_id TEXT REFERENCES sources(id),
            title TEXT NOT NULL,
            authors TEXT DEFAULT '',
            publish_date DATE,
            url TEXT,
            guid TEXT UNIQUE,
            raw_content TEXT,
            parsed_content TEXT,
            summary TEXT,
            language TEXT DEFAULT 'en',
            categories TEXT,
            relevance_score REAL DEFAULT 0,
            sentiment REAL DEFAULT 0,
            market_impact TEXT DEFAULT 'medium',
            affected_sectors TEXT,
            processed INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 跨智库聚合结果
        CREATE TABLE IF NOT EXISTS consensus (
            id TEXT PRIMARY KEY,
            topic TEXT NOT NULL,
            report_ids TEXT,
            consensus_score REAL DEFAULT 0,
            conclusion TEXT,
            confidence REAL DEFAULT 0,
            divergence_points TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- 日报缓存
        CREATE TABLE IF NOT EXISTS digests (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            content TEXT,
            report_count INTEGER DEFAULT 0,
            source_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_reports_source ON reports(source_id);
        CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(publish_date);
        CREATE INDEX IF NOT EXISTS idx_reports_sentiment ON reports(sentiment);
        CREATE INDEX IF NOT EXISTS idx_reports_relevance ON reports(relevance_score);
    """)
    conn.commit()
    conn.close()


def seed_sources(sources_cfg: list):
    """初始化智库来源（仅首次）"""
    conn = get_db()
    existing = conn.execute("SELECT COUNT(*) FROM sources").fetchone()[0]
    if existing > 0:
        conn.close()
        return
    for s in sources_cfg:
        conn.execute("""
            INSERT OR IGNORE INTO sources
            (id, name, full_name, country, region, tier, feed_url, feed_type, homepage, lang, domains, polling_minutes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            s["id"], s["name"], s.get("full_name", ""),
            s.get("country", ""), s.get("region", ""), s["tier"],
            s.get("feed_url", ""), s.get("feed_type", "rss"),
            s.get("homepage", ""), s.get("lang", "en"),
            ",".join(s.get("domains", [])),
            s.get("polling_minutes", 240)
        ))
    conn.commit()
    conn.close()


def save_report(source_id: str, title: str, url: str, guid: str,
                publish_date: str = None, authors: str = "",
                raw_content: str = "", parsed_content: str = "",
                language: str = "en") -> str:
    """保存报告，返回ID；若guid重复则忽略"""
    conn = get_db()
    report_id = str(uuid.uuid4())[:12]
    try:
        conn.execute("""
            INSERT OR IGNORE INTO reports
            (id, source_id, title, authors, publish_date, url, guid, raw_content, parsed_content, language)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (report_id, source_id, title[:500], authors[:200],
              publish_date, url[:1000], guid[:200],
              raw_content[:100000], parsed_content[:100000], language))
        conn.commit()
    except Exception:
        report_id = None
    conn.close()
    return report_id


def get_recent_reports(hours: int = 24, limit: int = 50) -> list:
    """获取最近N小时的报告"""
    conn = get_db()
    rows = conn.execute(
        "SELECT r.*, s.name as source_name, s.tier as source_tier, s.region as source_region "
        "FROM reports r JOIN sources s ON r.source_id = s.id "
        "WHERE r.created_at >= datetime('now', '-' || ? || ' hours') "
        "ORDER BY r.created_at DESC LIMIT ?",
        (hours, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_reports_by_date(date_str: str) -> list:
    """获取指定日期的报告"""
    conn = get_db()
    rows = conn.execute("""
        SELECT r.*, s.name as source_name, s.tier as source_tier, s.region as source_region
        FROM reports r
        JOIN sources s ON r.source_id = s.id
        WHERE date(r.created_at) = ?
        ORDER BY r.relevance_score DESC, r.created_at DESC
    """, (date_str,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_report_analysis(report_id: str, summary: str, categories: list,
                           relevance: float, sentiment: float,
                           market_impact: str, sectors: list):
    """更新报告分析结果"""
    conn = get_db()
    conn.execute("""
        UPDATE reports SET
            summary=?, categories=?, relevance_score=?,
            sentiment=?, market_impact=?, affected_sectors=?,
            processed=1
        WHERE id=?
    """, (summary, json.dumps(categories, ensure_ascii=False),
          relevance, sentiment, market_impact,
          json.dumps(sectors, ensure_ascii=False), report_id))
    conn.commit()
    conn.close()
