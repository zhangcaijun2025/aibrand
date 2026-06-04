# -*- coding: utf-8 -*-
"""
知识库核心服务 —— 封装 Dify Knowledge API
==============================================
职责：
  1. 文档/报告入库 → Dify Dataset
  2. 语义搜索      → Dify Retrieval API
  3. RAG问答       → Dify Workflow API
  4. 本地SQLite兜底缓存（当Dify Dataset API不可用时）

配置方式（环境变量）：
  DIFY_API_URL        = http://dify-nginx-1:80
  DIFY_APP_KEY        = app-c6aCH6OxDmDOBURqCJYw5565    (App级别，用于Workflow/Retrieval)
  DIFY_DATASET_KEY    = 可选，Dataset级别API Key，用于文档管理
  DIFY_DATASET_ID     = 可选，目标知识库ID
  KB_DATASET_ID       = 默认知识库ID（自动创建/检测）
"""

import json
import os
import hashlib
import sqlite3
import uuid
import re
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

import requests

# ────────────────────────────── 配置 ──────────────────────────────
DIFY_API_URL = os.getenv("DIFY_API_URL", "http://dify-nginx-1:80").rstrip("/")
DIFY_APP_KEY = os.getenv("DIFY_APP_KEY", "app-c6aCH6OxDmDOBURqCJYw5565")
DIFY_DATASET_KEY = os.getenv("DIFY_DATASET_KEY", "")
DIFY_DATASET_ID = os.getenv("DIFY_DATASET_ID", "d82fe257-1cc7-49f7-8eb9-bb04aa24855a")
WORKFLOW_QA_ID = os.getenv("WORKFLOW_QA_ID", "")  # RAG问答专用工作流ID

# 本地SQLite兜底缓存
CACHE_DIR = Path(__file__).parent / "data"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DB = str(CACHE_DIR / "kb_cache.db")

# ────────────────────────────── 本地缓存 ──────────────────────────────


def _get_cache_conn() -> sqlite3.Connection:
    """获取本地缓存数据库连接（兜底存储）"""
    conn = sqlite3.connect(CACHE_DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _init_cache_db():
    """初始化本地缓存表"""
    conn = _get_cache_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT,
            source TEXT DEFAULT 'manual',
            source_url TEXT,
            doc_type TEXT DEFAULT 'text',
            tags TEXT,
            metadata TEXT,
            dify_doc_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS chunks (
            id TEXT PRIMARY KEY,
            doc_id TEXT REFERENCES documents(id),
            chunk_index INTEGER,
            content TEXT NOT NULL,
            embedding BLOB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(doc_id);
    """)
    conn.commit()
    conn.close()


# ────────────────────────────── Dify API 通信 ──────────────────────────────


def _dify_headers(use_dataset_key: bool = False) -> dict:
    """构建Dify API请求头"""
    if use_dataset_key and DIFY_DATASET_KEY:
        return {
            "Authorization": f"Bearer {DIFY_DATASET_KEY}",
            "Content-Type": "application/json",
        }
    return {
        "Authorization": f"Bearer {DIFY_APP_KEY}",
        "Content-Type": "application/json",
    }


def _dify_get(endpoint: str, params: dict = None, use_dataset_key: bool = False) -> Optional[dict]:
    """GET 请求 Dify API"""
    url = f"{DIFY_API_URL}{endpoint}"
    try:
        resp = requests.get(url, headers=_dify_headers(use_dataset_key),
                            params=params, timeout=15)
        if resp.status_code in (200, 201):
            return resp.json()
        print(f"  [Dify GET Error] {endpoint} → {resp.status_code}: {resp.text[:200]}")
        return None
    except requests.RequestException as e:
        print(f"  [Dify GET Connect Error] {endpoint} → {e}")
        return None


def _dify_post(endpoint: str, payload: dict, use_dataset_key: bool = False) -> Optional[dict]:
    """POST 请求 Dify API"""
    url = f"{DIFY_API_URL}{endpoint}"
    try:
        resp = requests.post(url, json=payload, headers=_dify_headers(use_dataset_key), timeout=60)
        if resp.status_code in (200, 201):
            return resp.json()
        print(f"  [Dify POST Error] {endpoint} → {resp.status_code}: {resp.text[:300]}")
        return None
    except requests.RequestException as e:
        print(f"  [Dify POST Connect Error] {endpoint} → {e}")
        return None


# ────────────────────────────── 文档分块 ──────────────────────────────


def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> List[str]:
    """
    将文本按段落分块，每块不超过 chunk_size 字符，相邻块重叠 overlap 字符。
    优先在段落边界（\\n\\n）切割。
    """
    if not text:
        return []

    # 按段落拆分
    paragraphs = re.split(r'\n\s*\n', text.strip())
    chunks = []
    current = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(current) + len(para) + 2 < chunk_size:
            current = (current + "\n\n" + para) if current else para
        else:
            if current:
                chunks.append(current)
            # 若段落本身就超长，按句切割
            if len(para) > chunk_size:
                sentences = re.split(r'(?<=[。！？.!?])\s*', para)
                buf = ""
                for sent in sentences:
                    if len(buf) + len(sent) + 1 > chunk_size:
                        if buf:
                            chunks.append(buf)
                        buf = sent
                    else:
                        buf = (buf + sent) if buf else sent
                if buf:
                    current = buf
                else:
                    current = ""
            else:
                current = para

    if current:
        chunks.append(current)

    # 后处理：添加重叠
    if len(chunks) > 1 and overlap > 0:
        for i in range(len(chunks) - 1):
            overlap_text = chunks[i][-overlap:] if len(chunks[i]) > overlap else chunks[i]
            chunks[i + 1] = overlap_text + "\n...\n" + chunks[i + 1]

    return chunks


# ────────────────────────────── 文档入库 ──────────────────────────────


def detect_dify_datasets() -> List[Dict]:
    """探测Dify中已有的知识库列表"""
    data = _dify_get("/v1/datasets", use_dataset_key=True)
    if data:
        return data.get("data", [])
    return []


def _import_to_dify_dataset(title: str, content: str,
                            dataset_id: str = None,
                            doc_type: str = "text") -> Optional[str]:
    """
    将文档导入Dify知识库
    返回 Dify 文档ID，失败返回 None
    """
    doc_id = dataset_id or DIFY_DATASET_ID
    if not doc_id:
        print(f"  [Dify] 未配置 DIFY_DATASET_ID，跳过Dify入库")
        return None

    # 文本分块
    chunks = chunk_text(content)

    # Dify Document API: POST /v1/datasets/{dataset_id}/document/create-by-text
    payload = {
        "name": title[:100],
        "text": "\n\n".join(chunks),
        "doc_type": doc_type,
        "doc_metadata": {
            "source": "knowledge_base_service",
            "imported_at": datetime.now().isoformat(),
        },
        "indexing_technique": "high_quality",  # 高质量嵌入
        "process_rule": {
            "mode": "custom",
            "rules": {
                "pre_processing_rules": [
                    {"id": "remove_extra_spaces", "enabled": True},
                    {"id": "remove_urls_emails", "enabled": False},
                ],
                "segmentation": {
                    "separator": "\n",
                    "max_tokens": 2000,
                },
            },
        },
    }

    result = _dify_post(
        f"/v1/datasets/{doc_id}/document/create-by-text",
        payload,
        use_dataset_key=True,
    )
    if result:
        doc_info = result.get("document", result)
        return doc_info.get("id") or doc_info.get("batch")
    return None


def import_document(title: str, content: str,
                    source: str = "manual",
                    source_url: str = "",
                    doc_type: str = "text",
                    tags: List[str] = None,
                    metadata: dict = None) -> dict:
    """
    统一入口：入库文档/报告
    1. 尝试写入 Dify Dataset
    2. 同时写入本地缓存作为兜底

    返回: {"status": "ok"/"partial"/"error", "doc_id": "...", "dify_doc_id": "..."}
    """
    doc_id = str(uuid.uuid4())[:12]
    result = {
        "doc_id": doc_id,
        "dify_doc_id": None,
        "local_saved": False,
        "status": "error",
        "message": "",
    }

    # 1. 本地缓存
    try:
        _init_cache_db()
        conn = _get_cache_conn()
        conn.execute("""
            INSERT INTO documents (id, title, content, source, source_url, doc_type, tags, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            doc_id, title[:500], content[:500000],
            source, source_url[:1000], doc_type,
            json.dumps(tags or [], ensure_ascii=False),
            json.dumps(metadata or {}, ensure_ascii=False),
        ))
        conn.commit()
        conn.close()
        result["local_saved"] = True
    except Exception as e:
        print(f"  [缓存写入失败] {e}")

    # 2. Dify入库
    dify_doc_id = _import_to_dify_dataset(title, content, doc_type=doc_type)
    if dify_doc_id:
        result["dify_doc_id"] = dify_doc_id
        # 更新本地缓存中的Dify文档ID
        try:
            conn = _get_cache_conn()
            conn.execute("UPDATE documents SET dify_doc_id=? WHERE id=?", (dify_doc_id, doc_id))
            conn.commit()
            conn.close()
        except Exception:
            pass

    # 状态判定
    if dify_doc_id and result["local_saved"]:
        result["status"] = "ok"
    elif dify_doc_id or result["local_saved"]:
        result["status"] = "partial"
        result["message"] = "部分写入成功"
    else:
        result["status"] = "error"
        result["message"] = "全部写入失败"

    return result


def import_url(url: str, title: str = None, content: str = None) -> dict:
    """
    入库URL网页内容
    若未提供content，则通过 requests 获取
    """
    if not content:
        try:
            resp = requests.get(url, timeout=30, headers={
                "User-Agent": "Mozilla/5.0 (compatible; KBService/1.0)"
            })
            resp.raise_for_status()
            content = resp.text[:500000]
        except requests.RequestException as e:
            return {"status": "error", "message": f"抓取URL失败: {e}"}

    return import_document(
        title=title or url,
        content=content,
        source="url",
        source_url=url,
        doc_type="web_page",
    )


# ────────────────────────────── 语义搜索 ──────────────────────────────


def search(query: str, top_k: int = 5,
           dataset_id: str = None,
           search_method: str = "hybrid") -> List[Dict]:
    """
    语义搜索知识库
    - 优先使用 Dify Retrieval API
    - 兜底使用本地缓存的简单关键词匹配

    返回 [{"doc_id", "title", "content", "score", "source", ...}]
    """
    doc_id = dataset_id or DIFY_DATASET_ID

    # 1. 尝试 Dify Retrieval API
    if doc_id and DIFY_APP_KEY:
        payload = {
            "query": query,
            "retrieval_model": {
                "search_method": search_method,  # "keyword" / "semantic" / "hybrid"
                "reranking_enable": True,
                "reranking_mode": "weighted_score",
                "reranking_weight": 0.3,
                "top_k": top_k,
            },
        }
        result = _dify_post("/v1/retrieval", payload)
        if result and "records" in result:
            records = result["records"]
            results = []
            for rec in records[:top_k]:
                segment = rec.get("segment", {})
                doc_info = segment.get("document", {})
                results.append({
                    "doc_id": doc_info.get("id", ""),
                    "title": doc_info.get("name", ""),
                    "content": segment.get("content", "")[:2000],
                    "score": segment.get("score", 0),
                    "source": "dify_retrieval",
                    "chunk_id": segment.get("id", ""),
                })
            return results

    # 2. 兜底：本地缓存关键词搜索
    try:
        _init_cache_db()
        conn = _get_cache_conn()
        rows = conn.execute("""
            SELECT id, title, content, source, source_url, doc_type
            FROM documents
            WHERE title LIKE ? OR content LIKE ?
            ORDER BY created_at DESC
            LIMIT ?
        """, (f"%{query}%", f"%{query}%", top_k)).fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception:
        pass

    return []


# ────────────────────────────── RAG 问答 ──────────────────────────────


def ask(question: str, context: str = "",
        workflow_id: str = None,
        mode: str = "workflow") -> dict:
    """
    RAG问答
    - mode="workflow": 调用 Dify Workflow API（默认）
    - mode="simple": 本地搜索 + 简单拼接问答
    """
    wf_id = workflow_id or WORKFLOW_QA_ID

    if mode == "workflow" and (wf_id or DIFY_APP_KEY):
        # 调用 Dify Workflow API
        # 先做语义检索获取上下文
        search_results = search(question, top_k=5)
        search_context = "\n\n".join(
            [f"[{r.get('title','')}]\n{r.get('content','')[:1500]}" for r in search_results]
        )

        payload = {
            "inputs": {
                "query": question,
                "context": search_context or context,
            },
            "response_mode": "blocking",
            "user": "kb-service-user",
        }

        # 若有指定workflow_id，优先使用；否则使用默认workflow
        endpoint = f"/v1/workflows/{wf_id}/run" if wf_id else "/v1/workflows/run"
        result = _dify_post(endpoint, payload)
        if result:
            outputs = result.get("data", {}).get("outputs", {})
            answer = (outputs.get("answer") or outputs.get("text")
                      or outputs.get("result") or "")
            return {
                "status": "ok",
                "answer": answer,
                "references": search_results,
                "mode": "dify_workflow",
            }

    # 简单模式：本地搜索 + 拼接
    local_results = search(question, top_k=3)
    context_parts = [f"来源: {r.get('title','')}\n{r.get('content','')[:1000]}"
                     for r in local_results]
    answer = f"检索到 {len(local_results)} 篇相关文档。\n\n"
    answer += "\n---\n".join(context_parts)
    answer += f"\n\n---\n⚠️ 当前为简单模式，如需深度分析请配置 Dify Workflow (WORKFLOW_QA_ID)"

    return {
        "status": "ok" if local_results else "partial",
        "answer": answer,
        "references": local_results,
        "mode": "simple",
    }


# ────────────────────────────── 初始化 ──────────────────────────────


def init_kb_service():
    """初始化知识库服务：建缓存表 + 探测Dify知识库"""
    global DIFY_DATASET_ID
    print("  [KB] 初始化知识库缓存...")
    _init_cache_db()

    if DIFY_DATASET_KEY:
        print("  [KB] 探测Dify知识库列表...")
        datasets = detect_dify_datasets()
        if datasets:
            print(f"  [KB] 发现 {len(datasets)} 个Dify知识库:")
            for ds in datasets[:10]:
                print(f"       - {ds.get('name', '?')} (id={ds.get('id', '?')})")
            if not DIFY_DATASET_ID and datasets:
                # 自动使用第一个知识库
                first = datasets[0]
                print(f"  [KB] 自动使用知识库: {first.get('name')} (id={first.get('id')})")
                os.environ["DIFY_DATASET_ID"] = first["id"]
                DIFY_DATASET_ID = first["id"]
        else:
            print("  [KB] 未发现Dify知识库，请手动配置 DIFY_DATASET_ID")
    else:
        print("  [KB] 未配置 DIFY_DATASET_KEY，仅使用本地缓存模式")
