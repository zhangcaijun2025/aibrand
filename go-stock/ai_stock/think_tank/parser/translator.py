# -*- coding: utf-8 -*-
"""
多语种自动翻译模块 - 非中英文报告自动翻译
支持法语/德语/日语等 → 中文
"""

import json, re
from typing import Optional, Dict
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from collector.models import get_db

# 简单的语种识别
LANG_MAP = {
    "fr": "法语", "French": "法语",
    "de": "德语", "German": "德语", 
    "ja": "日语", "Japanese": "日语",
    "ko": "韩语", "Korean": "韩语",
    "ru": "俄语", "Russian": "俄语",
    "ar": "阿拉伯语", "Arabic": "阿拉伯语",
    "es": "西班牙语", "Spanish": "西班牙语",
    "pt": "葡萄牙语", "Portuguese": "葡萄牙语",
    "it": "意大利语", "Italian": "意大利语",
}


def detect_language(text: str) -> str:
    """简单语种检测（基于字符集和常见词）"""
    if not text or len(text) < 3:
        return "en"
    
    # 中文字符检测
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    if chinese_chars >= 3:
        return "zh"
    
    # 日文检测
    japanese_chars = len(re.findall(r'[\u3040-\u309f\u30a0-\u30ff]', text))
    if japanese_chars >= 2:
        return "ja"
    
    # 韩文检测
    korean_chars = len(re.findall(r'[\uac00-\ud7af]', text))
    if korean_chars >= 2:
        return "ko"
    
    # 俄文检测
    russian_chars = len(re.findall(r'[\u0400-\u04ff]', text))
    if russian_chars >= 2:
        return "ru"
    
    # 阿拉伯文检测
    arabic_chars = len(re.findall(r'[\u0600-\u06ff]', text))
    if arabic_chars >= 2:
        return "ar"
    
    # 特殊字符检测 (法语/德语等西欧语言)
    accent_chars = len(re.findall(r'[éèêëàâîïôùûçœæ]', text.lower()))
    
    # 默认基于语言短词检测
    fr_words = len(re.findall(r'\b(le|la|les|des|dans|avec|pour|sur|est|sont|une|vous)\b', text.lower()))
    de_words = len(re.findall(r'\b(der|die|das|und|mit|auf|für|nicht|sich|auch|nach)\b', text.lower()))
    
    if fr_words >= 1 or accent_chars >= 1:
        return "fr"
    if de_words >= 1:
        return "de"
    
    return "en"


def translate_text(text: str, source_lang: str, target: str = "zh") -> Optional[str]:
    """
    调用Dify翻译工作流
    如果Dify不可用，返回标注 + 原文
    """
    if not text or len(text) < 20:
        return text
    
    # Dify API调用
    try:
        import requests
        payload = {
            "inputs": {
                "text": text[:5000],
                "source_lang": source_lang,
                "target_lang": target,
            },
            "response_mode": "blocking",
            "user": "think-tank-translator",
        }
        resp = requests.post(
            "http://dify-nginx-1:80/v1/workflows/run",
            json=payload,
            headers={
                "Authorization": "Bearer app-c6aCH6OxDmDOBURqCJYw5565",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        if resp.status_code == 200:
            outputs = resp.json().get("data", {}).get("outputs", {})
            translated = outputs.get("translation", "") or outputs.get("text", "")
            if translated:
                return translated
    except Exception:
        pass
    
    # Dify不可用，返回标注
    lang_name = LANG_MAP.get(source_lang, source_lang.upper())
    return f"[{lang_name}原文] {text[:500]}..."


def batch_translate_unprocessed(limit: int = 20) -> int:
    """批量翻译未处理的非英文报告"""
    conn = get_db()
    rows = conn.execute("""
        SELECT id, title, parsed_content, raw_content, language
        FROM reports 
        WHERE language NOT IN ('en', 'zh') 
          AND (parsed_content IS NULL OR parsed_content = '')
        LIMIT ?
    """, (limit,)).fetchall()
    conn.close()
    
    if not rows:
        return 0
    
    translated = 0
    for r in rows:
        report_id = r[0]
        title = r[1] or ""
        content = r[3] or r[2] or ""
        
        lang = detect_language(content)
        if lang in ("en", "zh"):
            # 更新语言标签
            conn = get_db()
            conn.execute("UPDATE reports SET language=? WHERE id=?", (lang, report_id))
            conn.commit()
            conn.close()
            continue
        
        translated_title = translate_text(title[:500], lang)
        translated_content = translate_text(content[:5000], lang)
        
        if translated_content:
            conn = get_db()
            conn.execute("""
                UPDATE reports SET 
                    parsed_content = ?,
                    language = ?
                WHERE id = ?
            """, (translated_content, "zh", report_id))
            conn.commit()
            conn.close()
            translated += 1
            print(f'  已翻译: {title[:40]}... ({lang}→zh)')
    
    return translated


if __name__ == "__main__":
    # 测试语种检测
    tests = [
        ("This is a test in English", "en"),
        ("这是一个中文测试", "zh"),
        ("Ceci est un test en français", "fr"),
        ("Dies ist ein Test auf Deutsch", "de"),
        ("これは日本語のテストです", "ja"),
        ("Это тест на русском языке", "ru"),
    ]
    for text, expected in tests:
        detected = detect_language(text)
        status = "OK" if detected == expected else f"FAIL (got {detected})"
        print(f'{status}: "{text[:30]}..." → {detected} (expected {expected})')
