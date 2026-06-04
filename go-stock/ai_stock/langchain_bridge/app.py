"""
LangChain 微服务桥接层
打通 OpenClaw + Dify + N8N + LangChain 四层架构
"""
import os
import json
import logging
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="LangChain Bridge", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("langchain-bridge")

# ─── Configuration from environment ───────────────────────────────────────
DIFY_BASE_URL = os.getenv("DIFY_BASE_URL", "http://dify-nginx-1:80")
DIFY_API_KEY = os.getenv("DIFY_API_KEY", "")
N8N_BASE_URL = os.getenv("N8N_BASE_URL", "http://n8n:5678")
N8N_API_KEY = os.getenv("N8N_API_KEY", "")
LC_SERVICE_PORT = int(os.getenv("LC_SERVICE_PORT", "4010"))

# ─── Pydantic Models ──────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    model: str = "deepseek-v4-flash"
    system_prompt: Optional[str] = None
    temperature: float = 0.7

class DifyQuery(BaseModel):
    query: str
    user: str = "langchain-bridge"
    conversation_id: Optional[str] = None

class N8NTrigger(BaseModel):
    webhook_path: str
    payload: dict = Field(default_factory=dict)

class AgentTask(BaseModel):
    task: str
    tools: list[str] = Field(default_factory=list)
    context: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    services: dict
    timestamp: str

# ─── Module 1: LangChain Core ─────────────────────────────────────────────

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

def get_llm(model: str = "deepseek-v4-flash", temperature: float = 0.7):
    """返回 LangChain LLM 实例，可通过环境变量切换到本地 Ollama"""
    ollama_base = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
    if model.startswith("ollama/"):
        model_name = model.replace("ollama/", "")
        return ChatOpenAI(
            base_url=f"{ollama_base}/v1",
            api_key="ollama",
            model=model_name,
            temperature=temperature,
        )
    # 默认走 DeepSeek API
    return ChatOpenAI(
        base_url="https://api.deepseek.com/v1",
        api_key=os.getenv("DEEPSEEK_API_KEY", ""),
        model=model,
        temperature=temperature,
    )

def build_chain(system_prompt: Optional[str] = None):
    """构建 LangChain 调用链"""
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt or "你是一个智能助手，请用中文回答。"),
        ("human", "{input}"),
    ])
    return prompt | get_llm() | StrOutputParser()

# ─── Module 2: Dify Integration ───────────────────────────────────────────

import httpx

async def dify_chat(query: str, user: str = "langchain-bridge", conversation_id: Optional[str] = None):
    """调用 Dify 对话 API"""
    url = f"{DIFY_BASE_URL}/v1/chat-messages"
    payload = {
        "inputs": {},
        "query": query,
        "user": user,
        "response_mode": "blocking",
    }
    if conversation_id:
        payload["conversation_id"] = conversation_id
    headers = {
        "Authorization": f"Bearer {DIFY_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()

async def dify_search(query: str, top_k: int = 5):
    """搜索 Dify 知识库"""
    url = f"{DIFY_BASE_URL}/v1/datasets/{os.getenv('DIFY_DATASET_ID', '')}/documents/search"
    payload = {"query": query, "top_k": top_k}
    headers = {
        "Authorization": f"Bearer {DIFY_API_KEY}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()

# ─── Module 3: N8N Integration ────────────────────────────────────────────

async def n8n_trigger(webhook_path: str, payload: dict):
    """触发 N8N Webhook"""
    url = f"{N8N_BASE_URL}/webhook/{webhook_path.lstrip('/')}"
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        return resp.json()

async def n8n_get_workflows():
    """列出 N8N 工作流（用于发现可用的自动化）"""
    url = f"{N8N_BASE_URL}/rest/workflows"
    headers = {"X-N8N-API-KEY": N8N_API_KEY} if N8N_API_KEY else {}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return [{"id": w["id"], "name": w["name"], "active": w.get("active", False)}
                for w in data.get("data", [])]

# ─── Module 4: Agent 工具集 ───────────────────────────────────────────────

from langchain_core.tools import tool

@tool
def search_knowledge_base(query: str) -> str:
    """从 Dify 知识库搜索信息"""
    import asyncio
    result = asyncio.run(dify_search(query))
    return json.dumps(result, ensure_ascii=False)

@tool
def trigger_automation(webhook: str, data: str) -> str:
    """触发 N8N 自动化工作流"""
    import asyncio
    payload = json.loads(data) if isinstance(data, str) else data
    result = asyncio.run(n8n_trigger(webhook, payload))
    return json.dumps(result, ensure_ascii=False)

tools = [search_knowledge_base, trigger_automation]

# ─── REST API Routes ──────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """健康检查"""
    services = {"langchain": "ok"}
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"{DIFY_BASE_URL}/health")
            services["dify"] = "ok" if r.status_code < 500 else "degraded"
    except Exception:
        services["dify"] = "unreachable"
    try:
        async with httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"{N8N_BASE_URL}/healthz")
            services["n8n"] = "ok" if r.status_code < 500 else "degraded"
    except Exception:
        services["n8n"] = "unreachable"
    return HealthResponse(status="ok", services=services, timestamp=datetime.now().isoformat())

@app.post("/chat")
async def chat(req: ChatRequest):
    """标准 LLM 对话"""
    try:
        chain = build_chain(req.system_prompt)
        result = chain.invoke({"input": req.message})
        return {"response": result, "model": req.model}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@app.post("/dify/chat")
async def dify_chat_endpoint(req: DifyQuery):
    """通过 LangChain 调用 Dify 对话"""
    try:
        result = await dify_chat(req.query, req.user, req.conversation_id)
        return {"response": result.get("answer", ""), "conversation_id": result.get("conversation_id")}
    except Exception as e:
        raise HTTPException(502, detail=f"Dify error: {str(e)}")

@app.post("/dify/search")
async def dify_search_endpoint(query: str, top_k: int = 5):
    """搜索 Dify 知识库"""
    try:
        result = await dify_search(query, top_k)
        return result
    except Exception as e:
        raise HTTPException(502, detail=f"Dify search error: {str(e)}")

@app.post("/n8n/trigger")
async def n8n_trigger_endpoint(req: N8NTrigger):
    """触发 N8N 工作流"""
    try:
        result = await n8n_trigger(req.webhook_path, req.payload)
        return {"triggered": True, "result": result}
    except Exception as e:
        raise HTTPException(502, detail=f"N8N error: {str(e)}")

@app.get("/n8n/workflows")
async def n8n_list_workflows():
    """列出 N8N 可用工作流"""
    try:
        workflows = await n8n_get_workflows()
        return {"workflows": workflows}
    except Exception as e:
        raise HTTPException(502, detail=f"N8N error: {str(e)}")

@app.post("/agent/run")
async def agent_run(req: AgentTask):
    """运行 LangChain Agent（含工具调用）"""
    from langchain.agents import create_tool_calling_agent, AgentExecutor
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

    prompt = ChatPromptTemplate.from_messages([
        ("system", req.context or "你是一个智能助手，可以使用工具查询知识库和触发自动化。"),
        ("human", "{input}"),
        MessagesPlaceholder("agent_scratchpad"),
    ])
    llm = get_llm()
    agent = create_tool_calling_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    try:
        result = await executor.ainvoke({"input": req.task})
        return {"result": result["output"]}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

# ─── Main ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    log.info(f"Starting LangChain Bridge on port {LC_SERVICE_PORT}")
    log.info(f"Dify: {DIFY_BASE_URL} | N8N: {N8N_BASE_URL}")
    uvicorn.run(app, host="0.0.0.0", port=LC_SERVICE_PORT)
