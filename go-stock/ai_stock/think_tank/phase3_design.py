# -*- coding: utf-8 -*-
"""
Phase 3 模块设计概要
═══════════════════
接入Tier 3智库 → 交叉验证 → 多语种翻译 → 风险预警
"""

PHASE3_DESIGN = {
    "tier3_keyword_triggers": {
        "description": "Tier 3 智库通过关键词触发搜索接入",
        "sources": [
            {"name": "East-West Center", "region": "亚太", "url": "https://www.eastwestcenter.org", "keywords": ["asia-pacific", "hawaii", "security"]},
            {"name": "Stimson Center", "region": "北美", "url": "https://www.stimson.org", "keywords": ["peace", "security", "governance"]},
            {"name": "Hudson Institute", "region": "北美", "url": "https://www.hudson.org", "keywords": ["strategy", "geopolitics"]},
            {"name": "AEI", "region": "北美", "url": "https://www.aei.org", "keywords": ["economy", "policy"]},
            {"name": "Heritage Foundation", "region": "北美", "url": "https://www.heritage.org", "keywords": ["conservative", "policy"]},
            {"name": "Cato Institute", "region": "北美", "url": "https://www.cato.org", "keywords": ["liberty", "free market"]},
            {"name": "Wilson Center", "region": "北美", "url": "https://www.wilsoncenter.org", "keywords": ["scholar", "dialogue"]},
            {"name": "Atlantic Council", "region": "北美", "url": "https://www.atlanticcouncil.org", "keywords": ["NATO", "transatlantic"]},
            {"name": "ECFR", "region": "欧洲", "url": "https://ecfr.eu", "keywords": ["europe", "foreign policy"]},
            {"name": "Bruegel", "region": "欧洲", "url": "https://www.bruegel.org", "keywords": ["european", "economy"]},
            {"name": "DIIS", "region": "欧洲", "url": "https://www.diis.dk", "keywords": ["denmark", "security"]},
            {"name": "NUPI", "region": "欧洲", "url": "https://www.nupi.no", "keywords": ["norway", "international"]},
            {"name": "FRIDE", "region": "欧洲", "url": "https://fride.org", "keywords": ["spain", "global"]},
            {"name": "CEIP", "region": "欧洲", "url": "https://www.ceip.org", "keywords": ["austria", "europe"]},
            {"name": "RSIS", "region": "亚太", "url": "https://www.rsis.edu.sg", "keywords": ["singapore", "security"]},
            {"name": "JIIA", "region": "亚太", "url": "https://www.jiia.or.jp", "keywords": ["japan", "international"]},
            {"name": "KIIP", "region": "亚太", "url": "https://www.kiip.re.kr", "keywords": ["korea", "policy"]},
            {"name": "ORF", "region": "亚太", "url": "https://www.orfonline.org", "keywords": ["india", "strategy"]},
            {"name": "ANISS", "region": "中东", "url": "https://www.aniss.org", "keywords": ["middle east", "security"]},
            {"name": "MEE", "region": "中东", "url": "https://www.middleeasteye.net", "keywords": ["middle east", "policy"]},
            {"name": "AI", "region": "非洲", "url": "https://www.africainstitute.org", "keywords": ["africa", "development"]},
        ],
        "trigger_topics": [
            "tariff", "trade war", "sanction", "semiconductor", "AI regulation",
            "interest rate", "inflation", "GDP forecast", "military spending",
            "cyber attack", "supply chain", "rare earth", "energy crisis",
            "nuclear program", "territorial dispute", "election",
        ]
    },
    "cross_validation": {
        "description": "多智库同一议题交叉验证，输出共识/分歧矩阵",
        "method": "LLM对比分析 + 置信度加权",
        "output": "consensus_score (0-1) + divergence_points[] + confidence_level"
    },
    "translation": {
        "description": "非中英文报告自动翻译为中文",
        "languages": ["fr", "de", "ja", "ko", "ru", "ar", "es", "pt"],
        "method": "调用Dify LLM翻译或本地模型"
    },
    "risk_alert": {
        "description": "监控高影响/高风险报告，实时飞书推送预警",
        "triggers": [
            {"field": "market_impact", "value": "high", "weight": 3},
            {"field": "sentiment", "value": "< -0.5", "weight": 2},
            {"field": "relevance_score", "value": "> 85", "weight": 2},
        ],
        "channels": ["飞书群聊", "飞书私信"],
    }
}

if __name__ == "__main__":
    import json
    print(json.dumps(PHASE3_DESIGN, ensure_ascii=False, indent=2))
