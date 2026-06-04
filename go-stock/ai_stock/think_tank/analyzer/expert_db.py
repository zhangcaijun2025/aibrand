# -*- coding: utf-8 -*-
"""
全球智库专家库 - 专家资源管理与检索
"""

import json, re, requests, html
from datetime import datetime
from typing import List, Dict, Optional
from urllib.parse import urljoin
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from collector.models import get_db

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

SAMPLE_EXPERTS = [
    {
        "id": "expert_001",
        "name": "John J. Hamre",
        "title": "President and CEO",
        "institution": "CSIS",
        "region": "北美",
        "country": "US",
        "domains": ["战略安全", "国防政策"],
        "bio": "Former US Deputy Secretary of Defense. Leading CSIS since 2000.",
        "expertise": "战略安全/国防",
        "tier": "S",
        "source_url": "https://www.csis.org/people/john-j-hamre",
        "last_active": "2026-05",
        "homepage": "https://www.csis.org",
    },
    {
        "id": "expert_002",
        "name": "Cecilia Rouse",
        "title": "President",
        "institution": "Brookings",
        "region": "北美",
        "country": "US",
        "domains": ["宏观经济", "劳动经济"],
        "bio": "Former Chair of the Council of Economic Advisers. Leading Brookings.",
        "expertise": "宏观经济/劳动",
        "tier": "S",
        "source_url": "https://www.brookings.edu/people/cecilia-rouse/",
        "last_active": "2026-05",
        "homepage": "https://www.brookings.edu",
    },
    {
        "id": "expert_003",
        "name": "Michael Froman",
        "title": "President",
        "institution": "Council on Foreign Relations",
        "region": "北美",
        "country": "US",
        "domains": ["国际贸易", "外交政策"],
        "bio": "Former US Trade Representative. Leading CFR.",
        "expertise": "国际贸易/外交",
        "tier": "S",
        "source_url": "https://www.cfr.org/experts",
        "last_active": "2026-05",
        "homepage": "https://www.cfr.org",
    },
    {
        "id": "expert_004",
        "name": "Bronwen Maddox",
        "title": "Director and Chief Executive",
        "institution": "Chatham House",
        "region": "欧洲",
        "country": "UK",
        "domains": ["国际事务", "全球经济"],
        "bio": "Leading Chatham House since 2022. Former journalist and policy advisor.",
        "expertise": "国际事务/政策",
        "tier": "S",
        "source_url": "https://www.chathamhouse.org/about-us/director",
        "last_active": "2026-05",
        "homepage": "https://www.chathamhouse.org",
    },
    {
        "id": "expert_005",
        "name": "Dan Smith",
        "title": "Director",
        "institution": "SIPRI",
        "region": "欧洲",
        "country": "SE",
        "domains": ["军控", "安全研究"],
        "bio": "Leading SIPRI. Expert in peace and security research.",
        "expertise": "军控/安全",
        "tier": "S",
        "source_url": "https://www.sipri.org/about/bio/dan-smith",
        "last_active": "2026-05",
        "homepage": "https://www.sipri.org",
    },
    {
        "id": "expert_006",
        "name": "Mariano-Florentino Cuéllar",
        "title": "President",
        "institution": "Carnegie Endowment",
        "region": "全球",
        "country": "US",
        "domains": ["全球治理", "科技政策"],
        "bio": "Former California Supreme Court justice. Leading Carnegie.",
        "expertise": "全球治理/科技",
        "tier": "S",
        "source_url": "https://carnegieendowment.org/people",
        "last_active": "2026-05",
        "homepage": "https://carnegieendowment.org",
    },
    {
        "id": "expert_007",
        "name": "Adam S. Posen",
        "title": "President",
        "institution": "Peterson Institute for International Economics",
        "region": "北美",
        "country": "US",
        "domains": ["宏观经济", "货币政策"],
        "bio": "Leading PIIE. Former MPC member at Bank of England.",
        "expertise": "宏观经济/货币",
        "tier": "S",
        "source_url": "https://www.piie.com/experts/adam-posen",
        "last_active": "2026-05",
        "homepage": "https://www.piie.com",
    },
    {
        "id": "expert_008",
        "name": "Jason Matheny",
        "title": "CEO",
        "institution": "RAND Corporation",
        "region": "北美",
        "country": "US",
        "domains": ["科技政策", "国家安全"],
        "bio": "Leading RAND. Former director of IARPA.",
        "expertise": "科技/安全",
        "tier": "S",
        "source_url": "https://www.rand.org/about/leadership.html",
        "last_active": "2026-05",
        "homepage": "https://www.rand.org",
    },
    {
        "id": "expert_009",
        "name": "高培勇",
        "title": "院长",
        "institution": "中国社会科学院",
        "region": "亚太",
        "country": "CN",
        "domains": ["宏观经济", "财政政策"],
        "bio": "著名经济学家，中国社科院院长。",
        "expertise": "宏观经济/财政",
        "tier": "S",
        "source_url": "https://www.cass.cn",
        "last_active": "2026-05",
        "homepage": "https://www.cass.cn",
    },
    {
        "id": "expert_010",
        "name": "陆铭",
        "title": "教授",
        "institution": "上海交通大学 / CF40",
        "region": "亚太",
        "country": "CN",
        "domains": ["宏观经济", "区域经济"],
        "bio": "著名经济学家，CF40成员。",
        "expertise": "宏观经济/区域",
        "tier": "A",
        "source_url": "https://www.cf40.com",
        "last_active": "2026-05",
        "homepage": "https://www.cf40.com",
    },
    {
        "id": "expert_011",
        "name": "陈东晓",
        "title": "院长",
        "institution": "上海国际问题研究院",
        "region": "亚太",
        "country": "CN",
        "domains": ["亚太安全", "大国关系"],
        "bio": "SIIS院长，国际关系专家。",
        "expertise": "国际关系/安全",
        "tier": "A",
        "source_url": "https://www.siis.org.cn",
        "last_active": "2026-05",
        "homepage": "https://www.siis.org.cn",
    },
    {
        "id": "expert_012",
        "name": "刘元春",
        "title": "院长",
        "institution": "国务院发展研究中心",
        "region": "亚太",
        "country": "CN",
        "domains": ["宏观经济", "产业政策"],
        "bio": "DRC院长，著名经济学家。",
        "expertise": "宏观经济/产业",
        "tier": "S",
        "source_url": "https://www.drc.gov.cn",
        "last_active": "2026-05",
        "homepage": "https://www.drc.gov.cn",
    },
]


def init_expert_db():
    """初始化专家表"""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS experts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            title TEXT,
            institution TEXT,
            region TEXT,
            country TEXT,
            domains TEXT,
            bio TEXT,
            expertise TEXT,
            tier TEXT,
            source_url TEXT,
            last_active TEXT,
            homepage TEXT,
            report_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def seed_experts():
    """初始化专家数据"""
    conn = get_db()
    existing = conn.execute("SELECT COUNT(*) FROM experts").fetchone()[0]
    if existing > 0:
        conn.close()
        return
    for e in SAMPLE_EXPERTS:
        conn.execute("""
            INSERT OR IGNORE INTO experts 
            (id, name, title, institution, region, country, domains, bio, expertise, tier, source_url, last_active, homepage)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            e["id"], e["name"], e.get("title", ""), e["institution"],
            e.get("region", ""), e.get("country", ""),
            json.dumps(e.get("domains", []), ensure_ascii=False),
            e.get("bio", ""), e.get("expertise", ""), e.get("tier", "A"),
            e.get("source_url", ""), e.get("last_active", ""), e.get("homepage", ""),
        ))
    conn.commit()
    conn.close()
    print(f"  已初始化 {len(SAMPLE_EXPERTS)} 位专家")


def get_experts(tier: str = None, domain: str = None, region: str = None) -> List[Dict]:
    """查询专家"""
    conn = get_db()
    sql = "SELECT * FROM experts WHERE 1=1"
    params = []
    if tier:
        sql += " AND tier=?"
        params.append(tier)
    if domain:
        sql += " AND domains LIKE ?"
        params.append(f'%{domain}%')
    if region:
        sql += " AND region=?"
        params.append(region)
    sql += " ORDER BY tier, name"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def search_experts(keyword: str) -> List[Dict]:
    """搜索专家"""
    conn = get_db()
    rows = conn.execute("""
        SELECT * FROM experts 
        WHERE name LIKE ? OR institution LIKE ? OR bio LIKE ? OR expertise LIKE ?
        ORDER BY tier, name
        LIMIT 20
    """, (f'%{keyword}%', f'%{keyword}%', f'%{keyword}%', f'%{keyword}%')).fetchall()
    conn.close()
    return [dict(r) for r in rows]


if __name__ == "__main__":
    init_expert_db()
    seed_experts()
    experts = get_experts(tier="S")
    print(f"\nS级专家: {len(experts)}位")
    for e in experts:
        print(f"  ⭐ {e['name']} — {e['title']} @ {e['institution']}")
