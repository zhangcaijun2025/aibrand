# -*- coding: utf-8 -*-
"""
飞书推送 - 发送智库日报到飞书群
"""

import json
import requests
from datetime import datetime
from typing import Optional
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# 飞书机器人Webhook（复用已有）
FEISHU_WEBHOOK = "https://open.feishu.cn/open-apis/bot/v2/hook/d781730f-aa04-4597-ac5d-7ae104d8b1c3"


def push_digest(content: str, webhook_url: str = None) -> bool:
    """推送日报到飞书群"""
    url = webhook_url or FEISHU_WEBHOOK
    
    # 飞书卡片消息格式
    payload = {
        "msg_type": "post",
        "content": {
            "post": {
                "zh_cn": {
                    "title": f"🌐 全球智库日报 · {datetime.now().strftime('%Y-%m-%d')}",
                    "content": []
                }
            }
        }
    }

    # 解析markdown格式的日报内容为飞书post格式
    post_content = content.split("\n")
    lines = []
    for line in post_content:
        line = line.strip()
        if not line:
            lines.append([{"tag": "text", "text": ""}])
            continue
        
        # 标题行（以**开头的加粗行）
        if line.startswith("**") and line.endswith("**"):
            text = line.strip("*")
            lines.append([{"tag": "text", "text": text, "style": ["bold"]}])
            continue
        
        # 分割线
        if line.startswith("━"):
            lines.append([{"tag": "text", "text": "────────────────────"}])
            continue
        
        # 普通文本
        # 处理内联加粗 **text**
        parts = []
        import re
        bold_parts = re.split(r"\*\*(.*?)\*\*", line)
        for i, part in enumerate(bold_parts):
            if not part:
                continue
            if i % 2 == 1:  # 加粗部分
                parts.append({"tag": "text", "text": part, "style": ["bold"]})
            else:
                parts.append({"tag": "text", "text": part})
        
        if parts:
            lines.append(parts)

    payload["content"]["post"]["zh_cn"]["content"] = lines

    try:
        resp = requests.post(url, json=payload, timeout=15)
        result = resp.json()
        if result.get("code") == 0:
            print(f"飞书推送成功: {resp.status_code}")
            return True
        else:
            print(f"飞书推送失败: {result}")
            return False
    except Exception as e:
        print(f"飞书推送异常: {e}")
        return False


def push_simple_text(content: str, webhook_url: str = None) -> bool:
    """纯文本推送（更稳定）"""
    url = webhook_url or FEISHU_WEBHOOK
    payload = {
        "msg_type": "text",
        "content": {
            "text": content
        }
    }
    try:
        resp = requests.post(url, json=payload, timeout=15)
        result = resp.json()
        if result.get("code") == 0:
            print(f"飞书文本推送成功")
            return True
        else:
            print(f"飞书文本推送失败: {result}")
            return False
    except Exception as e:
        print(f"飞书推送异常: {e}")
        return False


if __name__ == "__main__":
    # 测试推送
    from digest_builder import build_digest
    digest = build_digest()
    push_digest(digest)
