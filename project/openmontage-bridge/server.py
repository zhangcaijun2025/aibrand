"""
OpenMontage API Bridge Server

将 OpenMontage 视频制作能力包装为 REST API，
供 AiBrand Web 前端通过 API 调用。

异步任务队列：内存队列 + SQLite 持久化
部署端口：8001
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
import uuid
import sqlite3
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── Path setup ──
OPENMONTAGE_DIR = Path(os.environ.get("OPENMONTAGE_DIR", r"C:\Users\XIAOMI\.openclaw\workspace\openmontage"))
sys.path.insert(0, str(OPENMONTAGE_DIR))

# ── DB setup ──
DB_PATH = Path(__file__).parent / "tasks.db"

def init_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            pipeline TEXT NOT NULL,
            params TEXT NOT NULL DEFAULT '{}',
            status TEXT NOT NULL DEFAULT 'pending',
            progress INTEGER NOT NULL DEFAULT 0,
            result TEXT,
            error TEXT,
            created_at TEXT NOT NULL,
            started_at TEXT,
            completed_at TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ── FastAPI App ──
app = FastAPI(
    title="OpenMontage Bridge",
    description="API bridge between AiBrand and OpenMontage video pipelines",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:6060", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ──

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class CreateTaskRequest(BaseModel):
    pipeline: str = Field(..., description="流水线名称，如 animated-explainer, talking-head")
    title: str = Field("", description="视频标题")
    script: str = Field("", description="视频脚本/文案")
    style: str = Field("cinematic", description="风格提示词")
    duration_seconds: int = Field(60, ge=10, le=600, description="目标时长（秒）")
    platform: str = Field("xiaohongshu", description="目标平台")
    resolution: str = Field("1920x1080", description="输出分辨率")
    dry_run: bool = Field(False, description="仅生成方案，不实际制作")

class TaskResponse(BaseModel):
    id: str
    pipeline: str
    status: str
    progress: int
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None

class PipelineInfo(BaseModel):
    name: str
    description: str
    platforms: list[str]

# ── Task Queue ──

task_queue: asyncio.Queue = asyncio.Queue()
running_tasks: dict[str, asyncio.Task] = {}

def _db_get_task(task_id: str) -> Optional[dict]:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def _db_update(task_id: str, **kwargs):
    conn = sqlite3.connect(str(DB_PATH))
    sets = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [task_id]
    conn.execute(f"UPDATE tasks SET {sets} WHERE id = ?", values)
    conn.commit()
    conn.close()

# ── Pipeline Registry ──

PIPELINE_INFO = {
    "animated-explainer": {
        "description": "动画解说视频 — 教学、科普、产品介绍",
        "platforms": ["xiaohongshu", "bilibili", "douyin"],
    },
    "talking-head": {
        "description": "真人出镜/Vlog — 口播、分享、观点表达",
        "platforms": ["douyin", "xiaohongshu", "weibo"],
    },
    "cinematic": {
        "description": "电影级品牌短片 — 宣传片、预告片",
        "platforms": ["bilibili", "douyin"],
    },
    "documentary-montage": {
        "description": "纪录片风格剪辑 — 用档案素材讲故事",
        "platforms": ["bilibili", "douyin"],
    },
    "clip-factory": {
        "description": "长视频拆短视频 — 批量生成社媒片段",
        "platforms": ["douyin", "xiaohongshu", "bilibili", "weibo"],
    },
    "avatar-spokesperson": {
        "description": "虚拟主播 — AI 角色出镜播报",
        "platforms": ["douyin", "bilibili"],
    },
    "screen-demo": {
        "description": "屏幕录制演示 — 软件教程、产品 Demo",
        "platforms": ["bilibili", "douyin"],
    },
    "localization-dub": {
        "description": "多语言配音字幕 — 内容全球化适配",
        "platforms": ["tiktok", "youtube"],
    },
    "podcast-repurpose": {
        "description": "播客转视频 — 音频内容视觉化",
        "platforms": ["bilibili", "douyin", "xiaohongshu"],
    },
}

# ── Task Worker ──

async def process_video_task(task_id: str, req: CreateTaskRequest):
    """后台异步执行视频制作任务"""
    try:
        _db_update(task_id, status="running", started_at=datetime.now(timezone.utc).isoformat())

        # ── Step 1: 生成制作方案 ──
        _db_update(task_id, progress=10)
        await asyncio.sleep(0.5)  # simulate work

        playbook = {
            "task_id": task_id,
            "pipeline": req.pipeline,
            "title": req.title or f"AI Generated Video - {task_id[:8]}",
            "script": req.script or "(auto-generated script)",
            "style": req.style,
            "target_duration": req.duration_seconds,
            "target_platform": req.platform,
            "resolution": req.resolution,
            "shots": _generate_shot_list(req),
            "estimated_cost_usd": 0.0 if req.dry_run else _estimate_cost(req),
        }

        if req.dry_run:
            _db_update(task_id, status="completed", progress=100,
                       result=json.dumps({"playbook": playbook, "mode": "dry_run"}),
                       completed_at=datetime.now(timezone.utc).isoformat())
            return

        # ── Step 2: 素材准备（模拟）──
        _db_update(task_id, progress=30)
        await asyncio.sleep(1.0)

        # ── Step 3: 视频生成（模拟）──
        _db_update(task_id, progress=50)
        await asyncio.sleep(2.0)

        # ── Step 4: 后期处理（模拟）──
        _db_update(task_id, progress=80)
        await asyncio.sleep(1.0)

        # ── Step 5: 输出完成 ──
        result = {
            "playbook": playbook,
            "mode": "production",
            "output": {
                "url": f"/output/{task_id}/final.mp4",
                "duration": req.duration_seconds,
                "resolution": req.resolution,
                "format": "mp4",
            },
            "stats": {
                "total_time_seconds": 4.5,
                "shots_generated": len(playbook["shots"]),
            },
        }

        _db_update(task_id, status="completed", progress=100,
                   result=json.dumps(result),
                   completed_at=datetime.now(timezone.utc).isoformat())

    except Exception as e:
        _db_update(task_id, status="failed", error=str(e),
                   completed_at=datetime.now(timezone.utc).isoformat())

async def task_worker():
    """后台 worker：从队列取任务并执行"""
    while True:
        task_id, req = await task_queue.get()
        await process_video_task(task_id, req)
        task_queue.task_done()
        running_tasks.pop(task_id, None)

@app.on_event("startup")
async def startup():
    asyncio.create_task(task_worker())

# Also support lifespan (newer FastAPI)
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    worker_task = asyncio.create_task(task_worker())
    yield
    worker_task.cancel()

# Override with lifespan if supported
try:
    app.router.lifespan_context = lifespan
except Exception:
    pass

# ── Helpers ──

def _generate_shot_list(req: CreateTaskRequest) -> list[dict]:
    """根据流水线类型生成镜头列表（简化版）"""
    duration = req.duration_seconds
    shot_duration = 5  # 平均每镜头5秒
    num_shots = max(3, duration // shot_duration)

    pipeline_shots = {
        "animated-explainer": [
            {"type": "intro", "desc": "开场 hook — 提出问题或展示痛点"},
            {"type": "content", "desc": "核心讲解 — 分步说明"},
            {"type": "demo", "desc": "示例展示 — 具体案例"},
            {"type": "outro", "desc": "总结 + CTA 引导关注"},
        ],
        "talking-head": [
            {"type": "intro", "desc": "自我介绍 + 话题引入"},
            {"type": "main", "desc": "核心观点阐述"},
            {"type": "example", "desc": "举例说明"},
            {"type": "closing", "desc": "总结 + 互动引导"},
        ],
        "clip-factory": [
            {"type": "hook", "desc": "高能片段截取"},
            {"type": "highlight", "desc": "精彩瞬间"},
            {"type": "cta", "desc": "引导看完整版"},
        ],
    }

    template = pipeline_shots.get(req.pipeline, pipeline_shots["animated-explainer"])
    shots = []
    for i in range(num_shots):
        t = template[i % len(template)]
        shots.append({
            "index": i + 1,
            "type": t["type"],
            "description": t["desc"],
            "duration": shot_duration,
        })
    return shots

def _estimate_cost(req: CreateTaskRequest) -> float:
    """估算 API 调用成本"""
    base_costs = {
        "animated-explainer": 1.50,
        "talking-head": 0.80,
        "cinematic": 3.00,
        "clip-factory": 0.50,
        "documentary-montage": 0.30,
        "avatar-spokesperson": 2.00,
        "screen-demo": 0.20,
        "localization-dub": 0.40,
        "podcast-repurpose": 0.25,
    }
    per_second = req.duration_seconds * 0.01
    return round(base_costs.get(req.pipeline, 1.0) + per_second, 2)

# ═══════════════════════════════════════
# API Routes
# ═══════════════════════════════════════

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "openmontage-bridge",
        "openmontage_dir": str(OPENMONTAGE_DIR),
        "pending_tasks": task_queue.qsize(),
    }

@app.get("/api/pipelines")
async def list_pipelines(platform: Optional[str] = Query(None, description="按平台筛选")):
    """列出所有可用制作流水线"""
    pipelines = []
    for name, info in PIPELINE_INFO.items():
        if platform and platform not in info["platforms"]:
            continue
        pipelines.append(PipelineInfo(
            name=name,
            description=info["description"],
            platforms=info["platforms"],
        ))
    return {"pipelines": pipelines, "total": len(pipelines)}

@app.post("/api/tasks", response_model=TaskResponse)
async def create_task(req: CreateTaskRequest):
    """创建视频制作任务"""
    if req.pipeline not in PIPELINE_INFO:
        raise HTTPException(status_code=400, detail=f"Unknown pipeline: {req.pipeline}")

    task_id = f"vid-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute(
        "INSERT INTO tasks (id, pipeline, params, status, progress, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (task_id, req.pipeline, req.model_dump_json(), "pending", 0, now),
    )
    conn.commit()
    conn.close()

    await task_queue.put((task_id, req))

    return TaskResponse(
        id=task_id,
        pipeline=req.pipeline,
        status="pending",
        progress=0,
        created_at=now,
    )

@app.get("/api/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    """查询任务状态"""
    task = _db_get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    result = None
    if task.get("result"):
        try:
            result = json.loads(task["result"])
        except json.JSONDecodeError:
            pass

    return TaskResponse(
        id=task["id"],
        pipeline=task["pipeline"],
        status=task["status"],
        progress=task["progress"],
        result=result,
        error=task.get("error"),
        created_at=task["created_at"],
        started_at=task.get("started_at"),
        completed_at=task.get("completed_at"),
    )

@app.get("/api/tasks")
async def list_tasks(
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    """列出所有任务"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row

    if status:
        rows = conn.execute(
            "SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC LIMIT ?",
            (status, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    conn.close()

    tasks = []
    for row in rows:
        r = dict(row)
        if r.get("result"):
            try:
                r["result"] = json.loads(r["result"])
            except json.JSONDecodeError:
                pass
        tasks.append(r)

    return {"tasks": tasks, "total": len(tasks)}

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    """删除任务记录"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted", "id": task_id}

# ═══════════════════════════════════════
# Main
# ═══════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    print(f"[OpenMontage Bridge] starting on http://localhost:8001")
    print(f"[OpenMontage Bridge] OpenMontage dir: {OPENMONTAGE_DIR}")
    print(f"[OpenMontage Bridge] Task DB: {DB_PATH}")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
