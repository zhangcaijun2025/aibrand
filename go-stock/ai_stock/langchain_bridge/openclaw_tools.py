"""
LangChain Bridge - OpenClaw 工具集成
让小智(OpenClaw Agent)可以直接调用 LangChain 能力
"""

LANGBRIDGE_URL = "http://langchain-bridge:4010"

# ─── 工具清单 ───────────────────────────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "lc_chat",
            "description": "调用 LangChain LLM 进行对话（支持 DeepSeek / Ollama 本地模型）",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "用户消息"},
                    "model": {"type": "string", "description": "模型名: deepseek / ollama/qwen2.5:7b"},
                    "system_prompt": {"type": "string", "description": "系统提示词（可选）"},
                },
                "required": ["message"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lc_dify_chat",
            "description": "通过 LangChain 调用 Dify AI 应用对话",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "问题内容"},
                    "conversation_id": {"type": "string", "description": "对话ID（可选，续接对话）"},
                },
                "required": ["query"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lc_dify_search",
            "description": "搜索 Dify 知识库（RAG 检索）",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "搜索关键词"},
                    "top_k": {"type": "integer", "description": "返回结果数"},
                },
                "required": ["query"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lc_trigger_n8n",
            "description": "触发 N8N 自动化工作流",
            "parameters": {
                "type": "object",
                "properties": {
                    "webhook_path": {"type": "string", "description": "N8N webhook 路径"},
                    "payload": {"type": "object", "description": "传递给工作流的参数"},
                },
                "required": ["webhook_path", "payload"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lc_agent_run",
            "description": "运行 LangChain Agent（带工具调用：知识库搜索 + 自动化触发）",
            "parameters": {
                "type": "object",
                "properties": {
                    "task": {"type": "string", "description": "任务描述"},
                    "context": {"type": "string", "description": "系统上下文（可选）"},
                },
                "required": ["task"],
            },
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lc_list_n8n_workflows",
            "description": "列出 N8N 所有可用工作流",
            "parameters": {"type": "object", "properties": {}},
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lc_health",
            "description": "检查 LangChain Bridge 及下游 Dify/N8N 健康状态",
            "parameters": {"type": "object", "properties": {}},
        }
    },
]

# ─── 工具调用映射 ──────────────────────────────────────────────────────

import httpx
import json

async def call_tool(name: str, args: dict) -> str:
    """执行 LangChain Bridge 工具调用"""
    url = f"{LANGBRIDGE_URL}/health"
    payload = {}

    if name == "lc_chat":
        url = f"{LANGBRIDGE_URL}/chat"
        payload = {
            "message": args["message"],
            "model": args.get("model", "deepseek"),
            "system_prompt": args.get("system_prompt"),
            "temperature": args.get("temperature", 0.7),
        }
    elif name == "lc_dify_chat":
        url = f"{LANGBRIDGE_URL}/dify/chat"
        payload = {
            "query": args["query"],
            "user": "openclaw-bridge",
        }
        if args.get("conversation_id"):
            payload["conversation_id"] = args["conversation_id"]
    elif name == "lc_dify_search":
        url = f"{LANGBRIDGE_URL}/dify/search"
        params = {"query": args["query"], "top_k": args.get("top_k", 5)}
        async with httpx.AsyncClient() as c:
            r = await c.post(url, params=params)
            return r.text
    elif name == "lc_trigger_n8n":
        url = f"{LANGBRIDGE_URL}/n8n/trigger"
        payload = {
            "webhook_path": args["webhook_path"],
            "payload": args.get("payload", {}),
        }
    elif name == "lc_agent_run":
        url = f"{LANGBRIDGE_URL}/agent/run"
        payload = {
            "task": args["task"],
            "context": args.get("context", ""),
        }
    elif name == "lc_list_n8n_workflows":
        url = f"{LANGBRIDGE_URL}/n8n/workflows"
        async with httpx.AsyncClient() as c:
            r = await c.get(url)
            return r.text
    elif name == "lc_health":
        async with httpx.AsyncClient() as c:
            r = await c.get(url)
            return r.text

    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post(url, json=payload)
        r.raise_for_status()
        return r.text
