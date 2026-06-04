# -*- coding: utf-8 -*-
"""
风险预警自动推送系统 - 监测高影响报告，实时飞书推送
"""

import json, requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import sys, os
import hashlib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from collector.models import get_db, get_recent_reports
from publisher.feishu_push import push_digest, push_simple_text

# 已推送的预警去重（简单内存+数据库缓存）
ALERT_CACHE = set()

# 飞书Webhook
FEISHU_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/d781730f-aa04-4597-ac5d-7ae104d8b1c3"


def check_risk_alerts(hours: int = 6, min_relevance: int = 70) -> List[Dict]:
    """
    扫描最近N小时的报告，识别需要预警的高风险项
    预警条件：
    1. market_impact = high AND sentiment < -0.3
    2. market_impact = high AND relevance > 85
    3. sentiment < -0.5 AND relevance > 80
    """
    reports = get_recent_reports(hours=hours, limit=200)
    alerts = []
    
    for r in reports:
        impact = r.get("market_impact", "low")
        sentiment = r.get("sentiment", 0) or 0
        relevance = r.get("relevance_score", 0) or 0
        
        # 预警规则
        is_alert = False
        alert_reason = ""
        
        if impact == "high" and sentiment < -0.3:
            is_alert = True
            alert_reason = "高影响+负面情绪"
        elif impact == "high" and relevance > 85:
            is_alert = True
            alert_reason = "高影响+高相关度"
        elif sentiment < -0.5 and relevance > 80:
            is_alert = True
            alert_reason = "强烈负面+高相关度"
        
        if is_alert:
            source = r.get("source_name", "?")
            title = (r.get("title") or "")[:80]
            sectors = r.get("affected_sectors", "")
            if isinstance(sectors, str):
                try:
                    sectors = json.loads(sectors)
                except:
                    sectors = [sectors] if sectors else []
            
            # 去重key
            dedup_key = f"{source}|{title[:40]}"
            dedup_hash = hashlib.md5(dedup_key.encode()).hexdigest()
            
            if dedup_hash not in ALERT_CACHE:
                ALERT_CACHE.add(dedup_hash)
                alerts.append({
                    "source": source,
                    "title": title,
                    "sentiment": sentiment,
                    "relevance": relevance,
                    "impact": impact,
                    "reason": alert_reason,
                    "sectors": sectors if isinstance(sectors, list) else [str(sectors)],
                    "report_id": r.get("id", ""),
                })
    
    return alerts


def build_alert_message(alerts: List[Dict]) -> str:
    """构建预警推送消息"""
    if not alerts:
        return ""
    
    lines = []
    lines.append(f"🚨 **全球智库风险预警** · {datetime.now().strftime('%H:%M')}")
    lines.append(f"━━━━━━━━━━━━━━━━━━━━━━━━")
    lines.append(f"检测到 {len(alerts)} 条高风险情报\n")
    
    for i, a in enumerate(alerts[:10], 1):
        sentiment_icon = "🔴" if a["sentiment"] < -0.5 else "🟠"
        lines.append(f"**{i}.** {sentiment_icon} **{a['title']}**")
        lines.append(f"    {a['source']} · 情绪{a['sentiment']:.1f} · 相关度{a['relevance']:.0f}")
        lines.append(f"    ⚠️ {a['reason']}")
        if a.get("sectors"):
            sectors_str = " · ".join(a["sectors"][:3])
            lines.append(f"    📎 {sectors_str}")
        lines.append("")
    
    lines.append(f"━━━━━━━━━━━━━━━━━━━━━━━━")
    lines.append(f"🤖 智库中枢自动预警 | 点击查看详情")
    
    return "\n".join(lines)


def push_risk_alerts(hours: int = 6, min_relevance: int = 70) -> Dict:
    """扫描 → 构建 → 推送预警"""
    alerts = check_risk_alerts(hours=hours, min_relevance=min_relevance)
    
    if not alerts:
        return {"alerts_found": 0, "pushed": False, "message": "无风险预警"}
    
    message = build_alert_message(alerts)
    ok = push_simple_text(message)
    
    return {
        "alerts_found": len(alerts),
        "pushed": ok,
        "pushed_count": min(len(alerts), 10),
    }
