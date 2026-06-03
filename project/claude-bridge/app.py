"""
Claude Code HTTP Bridge v1.0
将 Claude Code CLI 能力封装为 REST API，供 n8n 中枢调度。

端口: 4020
接口:
  POST /claude/execute       — 同步执行 (短任务: lint/type-check)
  POST /claude/execute-async — 异步执行 (长任务: audit/deploy)
  POST /claude/agent         — 调用 Claude Code 智能体
  GET  /health               — 健康检查
"""
import os, json, subprocess, logging, uuid
from typing import Optional
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Claude Code Bridge", version="1.0.0", docs_url="/docs")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("claude-bridge")

# ─── Config ────────────────────────────────────────────────────────────────
PROJECT_ROOT = os.getenv("PROJECT_ROOT", "/project")
CLAUDE_CLI = os.getenv("CLAUDE_CLI", "claude")
NODE_VERSION = os.getenv("NODE_VERSION", "20.18.3")
TIMEOUT_SHORT = int(os.getenv("TIMEOUT_SHORT", "120"))
TIMEOUT_LONG = int(os.getenv("TIMEOUT_LONG", "600"))

# ─── Models ────────────────────────────────────────────────────────────────

class ClaudeExecuteRequest(BaseModel):
    """统一消息 Schema (与 n8n/LangChain 一致)"""
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    intent: str = "code_exec"
    action: str = "lint"  # lint | type_check | code_review | security_audit | deploy | custom
    payload: dict = Field(default_factory=dict)
    context: Optional[dict] = None
    callback_webhook: Optional[str] = None

class ClaudeExecuteResponse(BaseModel):
    task_id: str
    status: str = "completed"
    component: str = "claude_code"
    result: dict = Field(default_factory=dict)
    error: Optional[dict] = None
    duration_ms: int = 0
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class HealthResponse(BaseModel):
    status: str
    claude_available: bool
    project_root: str
    timestamp: str

# ─── CLI Execution ─────────────────────────────────────────────────────────

def run_command(cmd: list[str], cwd: str = None, timeout: int = TIMEOUT_SHORT) -> dict:
    """执行 CLI 命令并返回结构化结果"""
    cwd = cwd or PROJECT_ROOT
    start = datetime.now()
    try:
        result = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True,
            encoding='utf-8', errors='replace',
            timeout=timeout, shell=False, env={**os.environ, "CI": "true"}
        )
        duration = int((datetime.now() - start).total_seconds() * 1000)
        return {
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": result.stdout[-5000:],
            "stderr": result.stderr[-2000:],
            "duration_ms": duration,
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "exit_code": -1, "stdout": "", "stderr": f"Timeout after {timeout}s", "duration_ms": timeout * 1000}
    except Exception as e:
        return {"success": False, "exit_code": -1, "stdout": "", "stderr": str(e), "duration_ms": 0}

def execute_action(action: str, payload: dict, cwd: str = None) -> dict:
    """将 action 映射为 CLI 命令并执行"""
    cwd = cwd or PROJECT_ROOT
    path = payload.get("path", ".")
    target = payload.get("target", "")
    options = payload.get("options", {})

    actions = {
        "lint": {
            "cmd": ["pnpm", "lint"],
            "cwd": os.path.join(cwd, path) if path != "." else cwd,
            "timeout": TIMEOUT_SHORT,
        },
        "type_check": {
            "cmd": ["pnpm", "type-check"],
            "cwd": os.path.join(cwd, path) if path != "." else cwd,
            "timeout": TIMEOUT_SHORT,
        },
        "code_review": {
            "cmd": ["claude", "code-review", "--path", target or path],
            "cwd": cwd,
            "timeout": TIMEOUT_LONG,
        },
        "security_audit": {
            "cmd": ["claude", "security-review"],
            "cwd": cwd,
            "timeout": TIMEOUT_LONG,
        },
        "pnpm_audit": {
            "cmd": ["pnpm", "audit", "--json"] if not options.get("fix") else ["pnpm", "audit", "--fix"],
            "cwd": os.path.join(cwd, path) if path != "." else cwd,
            "timeout": TIMEOUT_SHORT,
        },
        "docker_ps": {
            "cmd": ["docker", "ps", "--format", "json"],
            "cwd": cwd,
            "timeout": 30,
        },
        "git_diff": {
            "cmd": ["git", "diff", "--stat"],
            "cwd": cwd,
            "timeout": 30,
        },
        "git_log": {
            "cmd": ["git", "log", "--oneline", "-10"],
            "cwd": cwd,
            "timeout": 15,
        },
        "docker_restart": {
            "cmd": ["docker", "restart", payload.get("container", "")],
            "cwd": cwd,
            "timeout": 60,
        },
        "docker_build": {
            "cmd": ["docker", "compose", "build", "--no-cache", payload.get("service", "")],
            "cwd": cwd,
            "timeout": 600,
        },
        "health_check": {
            "cmd": ["python", "D:/king2046/scripts/health-dashboard.py"],
            "cwd": cwd,
            "timeout": 30,
        },
    }

    # Custom command
    if action == "custom":
        cmd = payload.get("command", ["echo", "no command"])
        if isinstance(cmd, str):
            cmd = cmd.split()
        return run_command(cmd, cwd, payload.get("timeout", TIMEOUT_SHORT))

    if action not in actions:
        return {"success": False, "exit_code": -1, "stdout": "", "stderr": f"Unknown action: {action}. Available: {list(actions.keys())}"}

    cfg = actions[action]
    return run_command(cfg["cmd"], cfg["cwd"], cfg["timeout"])

# ─── Routes ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """健康检查"""
    claude_ok = False
    try:
        r = run_command(["claude", "--version"], timeout=10)
        claude_ok = r["success"]
    except Exception:
        pass
    return HealthResponse(
        status="ok" if claude_ok else "degraded",
        claude_available=claude_ok,
        project_root=PROJECT_ROOT,
        timestamp=datetime.now().isoformat(),
    ).model_dump()

@app.post("/claude/execute")
async def claude_execute(req: ClaudeExecuteRequest):
    """同步执行 Claude Code 任务 (<30s)"""
    start = datetime.now()
    try:
        cwd = req.payload.get("cwd", PROJECT_ROOT)
        result = execute_action(req.action, req.payload, cwd)
        duration = int((datetime.now() - start).total_seconds() * 1000) or result.get("duration_ms", 0)

        return ClaudeExecuteResponse(
            task_id=req.task_id,
            status="completed" if result["success"] else "failed",
            result={
                "stdout": result["stdout"],
                "exit_code": result["exit_code"],
            },
            error={"type": "execution_error", "message": result["stderr"]} if not result["success"] else None,
            duration_ms=duration,
        ).model_dump()
    except Exception as e:
        duration = int((datetime.now() - start).total_seconds() * 1000)
        return ClaudeExecuteResponse(
            task_id=req.task_id,
            status="failed",
            error={"type": "crash", "message": str(e)},
            duration_ms=duration,
        ).model_dump()

@app.post("/claude/execute-async")
async def claude_execute_async(req: ClaudeExecuteRequest, background_tasks: BackgroundTasks):
    """异步执行 Claude Code 任务 (>30s, 回调 n8n)"""
    def run_and_callback():
        start = datetime.now()
        try:
            cwd = req.payload.get("cwd", PROJECT_ROOT)
            result = execute_action(req.action, req.payload, cwd)
            duration = int((datetime.now() - start).total_seconds() * 1000) or result.get("duration_ms", 0)

            response = ClaudeExecuteResponse(
                task_id=req.task_id,
                status="completed" if result["success"] else "failed",
                result={"stdout": result["stdout"], "exit_code": result["exit_code"]},
                error={"type": "execution_error", "message": result["stderr"]} if not result["success"] else None,
                duration_ms=duration,
            )
        except Exception as e:
            response = ClaudeExecuteResponse(
                task_id=req.task_id,
                status="failed",
                error={"type": "crash", "message": str(e)},
                duration_ms=int((datetime.now() - start).total_seconds() * 1000),
            )

        # 回调 n8n
        if req.callback_webhook:
            try:
                import requests as sync_http
                sync_http.post(req.callback_webhook, json=response.model_dump(), timeout=30)
                log.info(f"Callback to {req.callback_webhook}: OK")
            except Exception as cb_err:
                log.error(f"Callback failed: {cb_err}")

    background_tasks.add_task(run_and_callback)
    return {"task_id": req.task_id, "status": "pending", "message": "Task started. Results will be posted to callback URL."}

@app.post("/claude/agent")
async def claude_agent(req: ClaudeExecuteRequest):
    """调用 Claude Code 智能体 (code-reviewer / security-reviewer 等)"""
    agent_type = req.payload.get("agent_type", "code-reviewer")
    agent_prompt = req.payload.get("prompt", req.payload.get("task", ""))
    path = req.payload.get("path", ".")

    if not agent_prompt:
        raise HTTPException(400, detail="payload.prompt or payload.task is required")

    valid_agents = ["code-reviewer", "security-reviewer", "architect", "build-error-resolver"]
    if agent_type not in valid_agents:
        raise HTTPException(400, detail=f"Unknown agent type. Available: {valid_agents}")

    # 注: Claude Code Agent 调用需要交互式环境
    # 当前通过 /claude 命令传递 prompt
    # 后续可升级为使用 Claude Code 的 --agent 模式
    cmd = ["claude", "-p", f"/{agent_type} {agent_prompt}", "--output-format", "text"]
    result = run_command(cmd, os.path.join(PROJECT_ROOT, path), TIMEOUT_LONG)

    return ClaudeExecuteResponse(
        task_id=req.task_id,
        status="completed" if result["success"] else "failed",
        result={"output": result["stdout"], "agent": agent_type},
        error={"message": result["stderr"]} if not result["success"] else None,
        duration_ms=result.get("duration_ms", 0),
    ).model_dump()

@app.get("/claude/actions")
async def list_actions():
    """列出所有可用的 action"""
    return {
        "actions": {
            "lint": "Run pnpm lint on project",
            "type_check": "Run TypeScript type check",
            "code_review": "Run Claude Code code-reviewer agent",
            "security_audit": "Run Claude Code security-reviewer agent",
            "pnpm_audit": "Run pnpm audit (dependency security)",
            "docker_ps": "List running Docker containers",
            "git_diff": "Show git diff stat",
            "git_log": "Show recent git log",
            "custom": "Execute custom CLI command (payload.command)",
        }
    }

# ─── Main ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("CLAUDE_BRIDGE_PORT", "4020"))
    log.info(f"Claude Code Bridge starting on :{port}")
    log.info(f"Project root: {PROJECT_ROOT}")
    log.info(f"Claude CLI: {CLAUDE_CLI}")
    uvicorn.run(app, host="0.0.0.0", port=port)
