# -*- coding: utf-8 -*-
"""
日报生成器 - 格式化智库日报
"""

import json
from datetime import datetime
from typing import List, Dict
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from analyzer.report_analyzer import get_today_statistics, get_top_reports


SENTIMENT_EMOJI = {"positive": "🟢", "neutral": "🟡", "negative": "🔴"}


def build_digest(date_str: str = None) -> str:
    """生成智库日报文本（飞书Markdown格式）"""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")

    stats = get_today_statistics(date_str)
    top = get_top_reports(date_str, limit=15)

    lines = []
    
    # ── 标题 ──
    lines.append(f"🌐 **全球智库日报 · {date_str}**")
    lines.append(f"━━━━━━━━━━━━━━━━━━━━━━━━")
    lines.append("")

    # ── 概览 ──
    lines.append(f"📊 **今日概览**")
    lines.append(f"采集报告 **{stats['total_reports']}** 篇 | {len(stats['source_distribution'])} 家智库")
    s = stats["sentiment"]
    total_s = s["positive"] + s["neutral"] + s["negative"]
    if total_s > 0:
        lines.append(f"情绪分布：{SENTIMENT_EMOJI['positive']}偏多 {s['positive']}  {SENTIMENT_EMOJI['neutral']}中性 {s['neutral']}  {SENTIMENT_EMOJI['negative']}偏空 {s['negative']}")
    lines.append("")

    # ── 来源分布 ──
    lines.append(f"**📡 来源分布**")
    for src in stats["source_distribution"][:8]:
        tier_tag = {"S": "⭐", "A": "📌"}.get(src["tier"], "•")
        lines.append(f"  {tier_tag} {src['name']} ({src['region']}) — {src['count']}篇")
    lines.append("")

    # ── 高价值报告 TOP 10 ──
    if top:
        lines.append(f"**🏆 高价值报告 TOP {min(len(top), 10)}**")
        for i, r in enumerate(top[:10], 1):
            name = r.get("source_name", "?")
            tier = r.get("source_tier", "")
            title = (r.get("title", "") or "")[:80]
            relevance = r.get("relevance_score", 0)
            sentiment_raw = r.get("sentiment", 0)
            emoji = SENTIMENT_EMOJI["positive"] if sentiment_raw > 0.3 else (
                SENTIMENT_EMOJI["negative"] if sentiment_raw < -0.3 else SENTIMENT_EMOJI["neutral"])
            impact = r.get("market_impact", "medium")
            impact_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(impact, "⚪")

            lines.append(f"  **{i}.** {emoji} **{title}**")
            lines.append(f"     {name} · 相关度{relevance:.0f} · 影响{impact_icon}")
            
            # 关联行业
            sectors = r.get("affected_sectors")
            if sectors:
                if isinstance(sectors, str):
                    try:
                        sectors = json.loads(sectors)
                    except:
                        sectors = []
                if sectors:
                    lines.append(f"     📎 {' · '.join(sectors[:4])}")
            lines.append("")
    else:
        lines.append("暂无已处理报告\n")

    # ── 情绪矩阵 ──
    lines.append("**📊 情绪矩阵**")
    lines.append(f"  {SENTIMENT_EMOJI['positive']} 偏多 {s['positive']}   {SENTIMENT_EMOJI['neutral']} 中性 {s['neutral']}   {SENTIMENT_EMOJI['negative']} 偏空 {s['negative']}")
    lines.append("")

    # ── 风险提示 ──
    high_impact = [r for r in top if r.get("market_impact") == "high"]
    if high_impact:
        lines.append("**⚠️ 高风险关注**")
        for r in high_impact[:5]:
            title = (r.get("title", "") or "")[:60]
            name = r.get("source_name", "?")
            lines.append(f"  • {title} — {name}")
        lines.append("")

    # ── 脚注 ──
    lines.append("━━━━━━━━━━━━━━━━━━━━━━━━")
    lines.append(f"🤖 全球智库中枢 · 自动生成于 {datetime.now().strftime('%H:%M')}")
    lines.append(f"📡 数据来源：{len(stats['source_distribution'])} 家 S/A 级智库")
    lines.append(f"🔄 每小时更新 | 点击原文链接查看完整报告")

    return "\n".join(lines)


def save_digest(date_str: str = None, content: str = None) -> str:
    """保存日报到数据库"""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    
    import uuid
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from collector.models import get_db

    if not content:
        content = build_digest(date_str)

    from collector.models import get_recent_reports
    reports = get_recent_reports(hours=24, limit=1)  # just for counting

    conn = get_db()
    digest_id = str(uuid.uuid4())[:12]
    conn.execute("""
        INSERT OR REPLACE INTO digests (id, date, content, report_count, source_count)
        VALUES (?, ?, ?, ?, ?)
    """, (digest_id, date_str, content, len(reports), 0))
    conn.commit()
    conn.close()
    return content


if __name__ == "__main__":
    digest = build_digest()
    print(digest)
