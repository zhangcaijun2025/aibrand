"""
Evolution Engine v1.0 — AiBrand 自愈系统
端口: 4030
五步闭环: 观察(Observe) → 诊断(Diagnose) → 决策(Decide) → 行动(Act) → 学习(Learn)
"""
import os, json, time, logging, uuid, requests as sync_http
from typing import Optional
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient

app = FastAPI(title="Evolution Engine", version="1.0.0", docs_url="/docs")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("evolution-engine")

# ─── Config ────────────────────────────────────────────────────────────────
CLAUDE_BRIDGE = os.getenv("CLAUDE_BRIDGE", "http://localhost:4020")
LANGCHAIN_BRIDGE = os.getenv("LANGCHAIN_BRIDGE", "http://localhost:4010")
DIFY_BASE = os.getenv("DIFY_BASE", "http://localhost:5001")
N8N_BASE = os.getenv("N8N_BASE", "http://localhost:5678")
DIFY_KEY = os.getenv("DIFY_APP_API_KEY", "")
# Dify 数据集专用 key (具备 datasets 写权限); 为空则跳过 Dify 上传, 只落 MongoDB/JSONL
DIFY_DATASET_KEY = os.getenv("DIFY_DATASET_KEY", "")
DIFY_DATASET_ID = os.getenv("DIFY_DATASET_ID", "")
# Phase 1: 持久化 — MongoDB (replicaSet rs0), 不可用时自动降级本地 JSONL
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://admin:password@localhost:27017/aibrand?authSource=admin&directConnection=true")
MAX_AUTO_RETRIES = int(os.getenv("MAX_AUTO_RETRIES", "3"))
LEARNING_THRESHOLD = int(os.getenv("LEARNING_THRESHOLD", "3"))

# ─── Models ────────────────────────────────────────────────────────────────

class Alert(BaseModel):
    """健康告警"""
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    component: str            # 故障组件
    symptom: str              # 症状描述
    severity: str = "WARN"    # INFO | WARN | CRITICAL
    context: dict = Field(default_factory=dict)

class Diagnosis(BaseModel):
    """诊断结果"""
    task_id: str
    component: str
    root_cause: str           # 根因
    runbook_id: Optional[str] = None  # 匹配的修复剧本ID
    safe_to_auto_fix: bool = False    # 是否可以自动修复
    confidence: float = 0.0           # 诊断置信度 0-1
    suggested_action: str             # 建议操作

class HealResult(BaseModel):
    """修复结果"""
    task_id: str
    component: str
    action_taken: str
    success: bool
    duration_ms: int
    before_state: dict
    after_state: dict
    learned: bool = False

# ─── Runbook (修复剧本库) ──────────────────────────────────────────────────

RUNBOOK = [
    {
        "id": "rb-001",
        "trigger": {"component": "aibrand-server", "symptom_contains": ["502", "crash", "unreachable"]},
        "action": "docker_restart",
        "command": {"action": "custom", "payload": {"command": ["docker", "restart", "aibrand-server"], "timeout": 30}},
        "verify": {"url": "http://localhost:8080/api/health", "expect_status": 200},
        "max_retries": 3,
        "cooldown_seconds": 60,
        "safe": True,
    },
    {
        "id": "rb-002",
        "trigger": {"component": "n8n", "symptom_contains": ["webhook", "404", "not registered"]},
        "action": "n8n_publish_workflows",
        "command": {"action": "custom", "payload": {"command": ["docker", "restart", "n8n"], "timeout": 30}},
        "verify": {"url": "http://localhost:5678/healthz", "expect_status": 200},
        "max_retries": 2,
        "cooldown_seconds": 30,
        "safe": True,
    },
    {
        "id": "rb-003",
        "trigger": {"component": "langchain", "symptom_contains": ["500", "crash", "Python"]},
        "action": "langchain_restart",
        "command": {"action": "custom", "payload": {"command": ["docker", "restart", "langchain-bridge"], "timeout": 30}},
        "verify": {"url": "http://localhost:4010/health", "expect_status": 200},
        "max_retries": 2,
        "cooldown_seconds": 30,
        "safe": True,
    },
    {
        "id": "rb-004",
        "trigger": {"component": "dify", "symptom_contains": ["timeout", "500", "unreachable"]},
        "action": "dify_restart",
        "command": {"action": "custom", "payload": {"command": ["docker", "restart", "dify-api-1", "dify-worker-1"], "timeout": 30}},
        "verify": {"url": "http://localhost:5001/health", "expect_status": 200},
        "max_retries": 2,
        "cooldown_seconds": 30,
        "safe": True,
    },
    {
        "id": "rb-005",
        "trigger": {"component": "backend", "symptom_contains": ["disk", "space", "内存", "cpu"]},
        "action": "docker_prune",
        "command": {"action": "custom", "payload": {"command": ["docker", "system", "prune", "-f"], "timeout": 60}},
        "verify": None,
        "max_retries": 1,
        "cooldown_seconds": 300,
        "safe": False,  # 需要人工审批
    },
    {
        "id": "rb-006",
        "trigger": {"component": "claude-bridge", "symptom_contains": ["500", "crash", "unreachable", "python"]},
        "action": "claude_restart",
        "command": {"action": "custom", "payload": {"command": ["taskkill", "/F", "/IM", "python.exe"], "timeout": 15}},
        "verify": {"url": "http://localhost:4020/health", "expect_status": 200},
        "max_retries": 1,
        "cooldown_seconds": 30,
        "safe": True,
    },
    {
        "id": "rb-007",
        "trigger": {"component": "evolution", "symptom_contains": ["500", "crash", "unreachable"]},
        "action": "evolution_restart",
        "command": {"action": "custom", "payload": {"command": ["taskkill", "/F", "/IM", "python.exe"], "timeout": 15}},
        "verify": {"url": "http://localhost:4030/health", "expect_status": 200},
        "max_retries": 1,
        "cooldown_seconds": 30,
        "safe": True,
    },
    {
        "id": "rb-008",
        "trigger": {"component": "frontend", "symptom_contains": ["404", "500", "not found", "compile"]},
        "action": "frontend_restart",
        "command": {"action": "custom", "payload": {"command": ["docker", "restart", "aibrand-web"], "timeout": 30}},
        "verify": {"url": "http://localhost:3099", "expect_status": 200},
        "max_retries": 1,
        "cooldown_seconds": 60,
        "safe": True,
    },
    {
        "id": "rb-009",
        "trigger": {"component": "nginx", "symptom_contains": ["502", "503", "gateway", "unreachable"]},
        "action": "nginx_restart",
        "command": {"action": "custom", "payload": {"command": ["docker", "restart", "aibrand-nginx"], "timeout": 30}},
        "verify": {"url": "http://localhost:8080/api/health", "expect_status": 200},
        "max_retries": 2,
        "cooldown_seconds": 30,
        "safe": True,
    },
    {
        "id": "rb-010",
        "trigger": {"component": "mongodb", "symptom_contains": ["timeout", "connection", "refused", "replicaset"]},
        "action": "mongodb_restart",
        "command": {"action": "custom", "payload": {"command": ["docker", "restart", "aibrand-mongodb"], "timeout": 45}},
        "verify": None,
        "max_retries": 1,
        "cooldown_seconds": 120,
        "safe": False,  # 数据库操作需人工审批
    },
]

# ─── Phase 2: Runbook 候选池 (剧本自进化) ──────────────────────
CANDIDATE_PROMOTE_SUCCESS = int(os.getenv("CANDIDATE_PROMOTE_SUCCESS", "3"))   # 试用成功次数达标 → 晋升
CANDIDATE_PROMOTE_RATE = float(os.getenv("CANDIDATE_PROMOTE_RATE", "0.8"))      # 成功率达标线
CANDIDATE_MAX_FAIL = int(os.getenv("CANDIDATE_MAX_FAIL", "3"))                  # 失败次数超标 → 淘汰


def find_learned_experience(component: str, symptom: str) -> Optional[dict]:
    """经验库优先: 查 evolution_learned 历史成功修复 (同组件 + 症状关键词重叠)"""
    if _mongo_db is not None:
        try:
            rows = list(_mongo_db["evolution_learned"].find({"component": {"$regex": component, "$options": "i"}}).sort("ts", -1).limit(10))
        except Exception as e:
            log.error(f"learned query failed: {e}")
            rows = []
    else:
        rows = [r for r in persist_query("evolution_learned", limit=50) if component.lower() in str(r.get("component", "")).lower()]
    if not rows:
        return None
    # 症状关键词重叠打分 (symptom 常含 404/timeout/crash 等)
    kws = [w.lower() for w in symptom.replace("_", " ").split() if len(w) > 1]
    best, best_score = None, 0
    for r in rows:
        hay = str(r.get("root_cause", "")) + " " + str(r.get("action_taken", ""))
        score = sum(1 for k in kws if k in hay.lower())
        if score > best_score:
            best, best_score = r, score
    return best if best_score > 0 else None


def list_runbook_candidates() -> list:
    """候选池: trial 模式剧本"""
    return persist_query("runbook_candidates", limit=100, sort_key="created_at")


def find_candidate(component: str, symptom: str) -> Optional[dict]:
    """在候选池中匹配 (与 match_runbook 同规则, 但仅 trial)"""
    for c in list_runbook_candidates():
        if c.get("status") != "trial":
            continue
        trig = c.get("trigger", {})
        if trig.get("component") != component and trig.get("component") not in component:
            continue
        for kw in trig.get("symptom_contains", []):
            if kw.lower() in symptom.lower():
                return c
    return None


def record_candidate_trial(candidate_id: str, success: bool):
    """记录候选剧本的一次试用结果; 达标自动晋升, 超标自动淘汰"""
    if _mongo_db is None:
        return {"ok": False, "reason": "no_mongo"}
    try:
        c = _mongo_db["runbook_candidates"].find_one({"id": candidate_id})
        if not c:
            return {"ok": False, "reason": "not_found"}
        trials = c.get("trials", [])
        trials.append({"success": success, "ts": datetime.now(timezone.utc).isoformat()})
        ok_count = sum(1 for t in trials if t["success"])
        fail_count = len(trials) - ok_count
        status = c.get("status", "trial")
        action = None
        if status == "trial":
            if ok_count >= CANDIDATE_PROMOTE_SUCCESS and ok_count / len(trials) >= CANDIDATE_PROMOTE_RATE:
                status = "promoted"
                action = "promoted"
            elif fail_count >= CANDIDATE_MAX_FAIL:
                status = "rejected"
                action = "rejected"
        _mongo_db["runbook_candidates"].update_one(
            {"id": candidate_id},
            {"$set": {"trials": trials, "status": status, "ok_count": ok_count, "fail_count": fail_count, "last_trial": datetime.now(timezone.utc).isoformat()}},
        )
        if action:
            log.info(f"Candidate {candidate_id} -> {action} (ok={ok_count}/{len(trials)})")
            if action == "promoted":
                _mongo_db["runbook_candidates"].update_one({"id": candidate_id}, {"$set": {"promoted_at": datetime.now(timezone.utc).isoformat()}})
        return {"ok": True, "status": status, "action": action, "ok_count": ok_count, "fail_count": fail_count}
    except Exception as e:
        log.error(f"record_candidate_trial failed: {e}")
        return {"ok": False, "error": str(e)}


def add_candidate_from_heal(heal_result, diagnosis):
    """成功修复后, 提炼候选剧本 (LLM 结构化, 失败不阻塞主流程)"""
    try:
        if _mongo_db is None:
            return None
        # 避免重复: 同组件+同 action 已有候选/正式剧本则跳过
        exists = _mongo_db["runbook_candidates"].find_one({"component": heal_result.component, "action": heal_result.action_taken, "status": {"$ne": "rejected"}})
        if exists:
            return None
        r = sync_http.post(
            f"{LANGCHAIN_BRIDGE}/agent/run-unified",
            json={
                "task_id": str(uuid.uuid4()),
                "intent": "runbook_generation",
                "payload": {"task": f"你是一个SRE专家。根据一次成功的故障修复经验, 生成一个结构化的修复剧本(Runbook)。\n组件: {heal_result.component}\n根因: {diagnosis.root_cause}\n修复动作: {heal_result.action_taken}\n修复耗时: {heal_result.duration_ms}ms\n\n输出JSON格式: {{\"trigger_symptom_contains\": [\"关键词1\", \"关键词2\"], \"safe\": true/false, \"verify_url\": \"健康检查URL或留空\"}}", "tools": []},
                "context": {"system_prompt": "你是资深SRE。只输出JSON, 不要多余文字。trigger_symptom_contains 给 2-4 个能触发该剧本的故障关键词。"},
            },
            timeout=60,
        )
        data = r.json()
        output = data.get("result", {}).get("output", "")
        if not isinstance(output, str):
            output = str(output)
        # LangChain 常返回 markdown 包裹的 JSON (```json ... ```), 提取代码块内容
        cleaned = output.strip()
        if "```" in cleaned:
            import re as _re
            m = _re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
            if m:
                cleaned = m.group(1).strip()
        try:
            spec = json.loads(cleaned)
        except json.JSONDecodeError:
            # 最后尝试: 找到第一个 { 到最后一个 }
            start, end = cleaned.find("{"), cleaned.rfind("}")
            if start >= 0 and end > start:
                try:
                    spec = json.loads(cleaned[start:end + 1])
                except json.JSONDecodeError:
                    spec = {}
            else:
                spec = {}
        candidate = {
            "id": f"cand-{uuid.uuid4().hex[:8]}",
            "component": heal_result.component,
            "action": heal_result.action_taken,
            "trigger": {
                "component": heal_result.component,
                "symptom_contains": spec.get("trigger_symptom_contains", [heal_result.component]),
            },
            "safe": spec.get("safe", False),
            "verify": {"url": spec.get("verify_url", ""), "expect_status": 200} if spec.get("verify_url") else None,
            # 复用正式 RUNBOOK 中同 action 的命令模板 (候选自身不带 command, 防止自动生成恶意命令)
            "command": next((rb["command"] for rb in RUNBOOK if rb["action"] == heal_result.action_taken), None),
            "source": "auto-generated",
            "origin_task": heal_result.task_id,
            "origin_root_cause": diagnosis.root_cause,
            "status": "trial",
            "trials": [],
            "ok_count": 0,
            "fail_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        _mongo_db["runbook_candidates"].insert_one(candidate)
        log.info(f"Candidate generated: {candidate['id']} for {heal_result.component}")
        return candidate
    except Exception as e:
        log.error(f"add_candidate_from_heal failed: {e}")
        return None


# 进化日志持久化 (Phase 1: MongoDB + JSONL 降级)
# 集合: evolution_logs / evolution_learned / evolution_stats
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)

_mongo_client = None
_mongo_db = None
try:
    _mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=4000)
    _mongo_client.admin.command("ping")
    _mongo_db = _mongo_client["aibrand"]
    log.info(f"MongoDB connected: {MONGODB_URI.split('@')[-1]}")
except Exception as e:
    _mongo_db = None
    log.warning(f"MongoDB unavailable, fallback to JSONL: {e}")


def _jsonl_path(name: str) -> str:
    return os.path.join(DATA_DIR, f"{name}.jsonl")


def persist_insert(collection: str, doc: dict) -> bool:
    """写一条记录: MongoDB 优先, 失败降级 JSONL"""
    doc.setdefault("ts", datetime.now(timezone.utc).isoformat())
    if _mongo_db is not None:
        try:
            _mongo_db[collection].insert_one(doc)
            return True
        except Exception as e:
            log.error(f"Mongo insert {collection} failed: {e}")
    try:
        with open(_jsonl_path(collection), "a", encoding="utf-8") as f:
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")
        return True
    except Exception as e:
        log.error(f"JSONL append {collection} failed: {e}")
        return False


def persist_query(collection: str, filter: Optional[dict] = None, limit: int = 50, sort_key: str = "ts", desc: bool = True) -> list:
    """查询最近记录: MongoDB 优先, 降级 JSONL(读全部再截断)"""
    if _mongo_db is not None:
        try:
            cur = _mongo_db[collection].find(filter or {}, sort=[(sort_key, -1 if desc else 1)]).limit(limit)
            return [dict(d, _id=str(d.get("_id", ""))) for d in cur]
        except Exception as e:
            log.error(f"Mongo query {collection} failed: {e}")
    rows = []
    try:
        with open(_jsonl_path(collection), "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
    except FileNotFoundError:
        return []
    except Exception as e:
        log.error(f"JSONL read {collection} failed: {e}")
        return []
    rows.sort(key=lambda r: r.get(sort_key, ""), reverse=desc)
    return rows[:limit]


# 内存镜像 (兼容旧逻辑 + 快速访问)
evolution_log = []
runbook_counts = {}


def log_evolution(entry: dict):
    """统一进化日志入口: 内存 + 持久化"""
    evolution_log.append(entry)
    if len(evolution_log) > 1000:
        evolution_log[:] = evolution_log[-500:]
    persist_insert("evolution_logs", entry)


# Runbook 执行计数持久化 (学习触发依据, 重启不丢)
def _load_runbook_counts():
    rows = persist_query("evolution_runbook_counts", limit=500, sort_key="ts")
    for r in rows:
        key = r.get("key")
        if key:
            runbook_counts[key] = {"count": r.get("count", 0), "last_time": r.get("last_time", 0)}

_load_runbook_counts()

def match_runbook(component: str, symptom: str) -> Optional[dict]:
    """匹配合适的修复剧本"""
    for rb in RUNBOOK:
        t = rb["trigger"]
        if t["component"] == component or t["component"] in component:
            for keyword in t["symptom_contains"]:
                if keyword.lower() in symptom.lower():
                    return rb
    return None

def call_claude_bridge(action: dict) -> dict:
    """调用 Claude Bridge 执行修复"""
    try:
        r = sync_http.post(
            f"{CLAUDE_BRIDGE}/claude/execute",
            json={"task_id": str(uuid.uuid4()), "action": action["action"], "payload": action["payload"]},
            timeout=120,
        )
        return r.json()
    except Exception as e:
        return {"status": "failed", "error": str(e)}

def verify_health(verify_cfg: dict) -> bool:
    """验证组件恢复"""
    if not verify_cfg:
        return True
    try:
        r = sync_http.get(verify_cfg["url"], timeout=10)
        return r.status_code == verify_cfg.get("expect_status", 200)
    except Exception:
        return False

def learn_to_dify(heal_result: HealResult, diagnosis: Diagnosis):
    """将成功修复经验写入知识库 (Phase 1 修复: 真实落库 + MongoDB 优先)

    策略:
      1. 总是写入 MongoDB `evolution_learned` (或 JSONL 降级) — 这是事实来源
      2. 若配置了 DIFY_DATASET_KEY + DIFY_DATASET_ID, 额外上传 Dify 知识库
         (原实现误调 datasets/retrieve 查询接口, 实际从未写入; 现改为 create_by_text)
    """
    if not heal_result.success:
        return False
    record = {
        "component": heal_result.component,
        "root_cause": diagnosis.root_cause,
        "action_taken": heal_result.action_taken,
        "duration_ms": heal_result.duration_ms,
        "success": heal_result.success,
        "runbook_id": diagnosis.runbook_id,
        "confidence": diagnosis.confidence,
        "before_state": heal_result.before_state,
        "after_state": heal_result.after_state,
        "source": "evolution-engine",
    }
    ok = persist_insert("evolution_learned", record)
    log.info(f"Learned (mongo/jsonl): {record['component']} - {record['root_cause']}")

    # Dify 知识库上传 (仅当配置了数据集权限; 失败不阻塞)
    if DIFY_DATASET_KEY and DIFY_DATASET_ID:
        try:
            title = f"自愈记录: {heal_result.component} - {diagnosis.root_cause}"
            content = f"""## 自愈记录
- **组件**: {heal_result.component}
- **根因**: {diagnosis.root_cause}
- **修复操作**: {heal_result.action_taken}
- **耗时**: {heal_result.duration_ms}ms
- **成功**: {heal_result.success}
- **时间**: {datetime.now(timezone.utc).isoformat()}
"""
            r = sync_http.post(
                f"{DIFY_BASE}/v1/datasets/{DIFY_DATASET_ID}/document/create_by_text",
                json={
                    "name": f"heal-{uuid.uuid4().hex[:8]}.md",
                    "text": content,
                    "indexing_technique": "high_quality",
                    "process_rule": {"mode": "automatic"},
                },
                headers={"Authorization": f"Bearer {DIFY_DATASET_KEY}"},
                timeout=30,
            )
            if r.status_code in (200, 201):
                log.info(f"Dify knowledge base updated: {title}")
                return True
            log.warning(f"Dify upload failed status={r.status_code}: {r.text[:200]}")
        except Exception as e:
            log.error(f"Dify upload failed: {e}")
        return False  # 落库成功但 Dify 失败 → 仍返回 False 以标记未同步 Dify
    return ok

# ─── Routes ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "component": "evolution-engine", "runbooks": len(RUNBOOK), "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/runbooks")
async def list_runbooks():
    return {"runbooks": [{k: v for k, v in rb.items() if k != "command"} for rb in RUNBOOK], "counts": runbook_counts}


@app.get("/runbooks/candidates")
async def get_runbook_candidates():
    """Phase 2: 候选剧本池 (trial 模式, 待晋升/淘汰)"""
    cands = list_runbook_candidates()
    return {
        "candidates": [{k: v for k, v in c.items() if k not in ("command", "_id")} for c in cands],
        "config": {
            "promote_success": CANDIDATE_PROMOTE_SUCCESS,
            "promote_rate": CANDIDATE_PROMOTE_RATE,
            "max_fail": CANDIDATE_MAX_FAIL,
        },
    }


class CandidateAction(BaseModel):
    """候选剧本人工操作: approve(批准执行一次) / reject(人工淘汰)"""
    action: str = "approve"


@app.post("/runbooks/candidates/{candidate_id}/trial")
async def trial_candidate(candidate_id: str, body: CandidateAction = None):
    """Phase 2: 人工批准候选剧本执行一次 (approve) 或直接淘汰 (reject)

    approve: 走 claude bridge 执行候选命令并验证, 结果回流候选池 (晋升/淘汰判定)
    reject:  人工否决, 候选标记 rejected
    """
    action = (body.action if body else "approve") or "approve"
    if _mongo_db is None:
        return {"ok": False, "error": "MongoDB unavailable"}
    cand = _mongo_db["runbook_candidates"].find_one({"id": candidate_id})
    if not cand:
        raise HTTPException(404, f"candidate {candidate_id} not found")

    if action == "reject":
        _mongo_db["runbook_candidates"].update_one({"id": candidate_id}, {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}})
        return {"ok": True, "status": "rejected", "candidate_id": candidate_id}

    # approve: 执行一次
    if not cand.get("command"):
        return {"ok": False, "error": "candidate has no executable command (needs manual action)"}
    start = time.time()
    result = call_claude_bridge(cand["command"])
    success = result.get("status") == "completed"
    if cand.get("verify") and cand["verify"].get("url"):
        recovered = verify_health(cand["verify"])
        success = success and recovered
    rec = record_candidate_trial(candidate_id, success)
    log_evolution({
        "task_id": str(uuid.uuid4()),
        "type": "heal",
        "component": cand.get("component", "?"),
        "symptom": cand.get("origin_root_cause", "candidate trial"),
        "runbook_id": candidate_id,
        "action": cand.get("action"),
        "success": success,
        "duration_ms": int((time.time() - start) * 1000),
        "source": "candidate",
    })
    return {"ok": True, "candidate_id": candidate_id, "success": success, "trial_result": rec}

@app.post("/observe")
async def observe(alert: Alert):
    """Step 1+2: 观察 + 诊断 (Phase 2 诊断链: 经验库 → Runbook → 候选池 → 未知)"""
    task_id = alert.task_id or str(uuid.uuid4())
    component = alert.component
    symptom = alert.symptom

    # ① 经验库优先: 历史成功修复命中 → 直接给高置信度方案
    learned = find_learned_experience(component, symptom)
    if learned:
        diagnosis = Diagnosis(
            task_id=task_id,
            component=component,
            root_cause=f"经验库命中: {learned.get('root_cause', symptom)}",
            runbook_id=None,
            safe_to_auto_fix=bool(learned.get("safe_to_auto_fix", True)),
            confidence=0.9,
            suggested_action=learned.get("action_taken", "escalate_to_human"),
        )
        log.info(f"Diagnosis[learned]: {component} -> {diagnosis.suggested_action} (conf=0.9)")
        return diagnosis.model_dump()

    # ② 匹配正式修复剧本
    runbook = match_runbook(component, symptom)
    if runbook:
        diagnosis = Diagnosis(
            task_id=task_id,
            component=component,
            root_cause=f"匹配剧本 {runbook['id']}: {symptom}",
            runbook_id=runbook["id"],
            safe_to_auto_fix=runbook["safe"],
            confidence=0.85,
            suggested_action=runbook["action"],
        )
        log.info(f"Diagnosis[runbook]: {component} -> {diagnosis.suggested_action} (conf=0.85)")
        return diagnosis.model_dump()

    # ③ 候选池命中: 试用剧本 → safe=true 可自动执行(试用), 否则只建议
    candidate = find_candidate(component, symptom)
    if candidate:
        diagnosis = Diagnosis(
            task_id=task_id,
            component=component,
            root_cause=f"候选剧本命中 {candidate['id']} (trial): {symptom}",
            runbook_id=candidate["id"],
            safe_to_auto_fix=bool(candidate.get("safe", False)) and candidate.get("command") is not None,
            confidence=0.6,
            suggested_action=candidate["action"],
        )
        log.info(f"Diagnosis[candidate]: {component} -> {candidate['action']} (trial, safe={diagnosis.safe_to_auto_fix}, conf=0.6)")
        return diagnosis.model_dump()

    # ④ 未知故障
    diagnosis = Diagnosis(
        task_id=task_id,
        component=component,
        root_cause=f"未知故障 (无匹配剧本): {symptom}",
        safe_to_auto_fix=False,
        confidence=0.1,
        suggested_action="escalate_to_human",
    )
    log.info(f"Diagnosis[unknown]: {component} -> escalate (conf=0.1)")
    return diagnosis.model_dump()

@app.post("/heal")
async def heal(diagnosis: Diagnosis):
    """Step 3+4: 决策 + 行动"""
    task_id = diagnosis.task_id
    start = time.time()

    if not diagnosis.safe_to_auto_fix:
        # Phase 1: 升级人工也入日志, 保证 stats 统计完整
        log_evolution({
            "task_id": task_id,
            "type": "heal",
            "component": diagnosis.component,
            "symptom": diagnosis.root_cause,
            "runbook_id": diagnosis.runbook_id,
            "action": "escalated_to_human",
            "success": False,
            "duration_ms": int((time.time() - start) * 1000),
            "reason": "not_safe_to_auto_fix",
            "source": "runbook",
        })
        return HealResult(
            task_id=task_id,
            component=diagnosis.component,
            action_taken="escalated_to_human",
            success=False,
            duration_ms=int((time.time() - start) * 1000),
            before_state={"status": "degraded"},
            after_state={"status": "pending_human"},
        ).model_dump()

    # 加载剧本: 正式 Runbook 或候选池剧本 (cand- 开头, Phase 2)
    runbook = match_runbook(diagnosis.component, diagnosis.root_cause)
    if not runbook and diagnosis.runbook_id and str(diagnosis.runbook_id).startswith("cand-"):
        cand = next((c for c in list_runbook_candidates() if c.get("id") == diagnosis.runbook_id), None)
        if cand and cand.get("command"):
            runbook = {
                "id": cand["id"],
                "action": cand["action"],
                "command": cand["command"],
                "verify": cand.get("verify"),
                "cooldown_seconds": 30,
                "safe": cand.get("safe", False),
            }
    if not runbook:
        log_evolution({
            "task_id": task_id,
            "type": "heal",
            "component": diagnosis.component,
            "symptom": diagnosis.root_cause,
            "runbook_id": None,
            "action": "no_runbook",
            "success": False,
            "duration_ms": 0,
            "reason": "no_matching_runbook",
            "source": "runbook",
        })
        return HealResult(task_id=task_id, component=diagnosis.component, action_taken="no_runbook", success=False, duration_ms=0, before_state={}, after_state={}).model_dump()

    # 冷却检查
    count_key = f"{runbook['id']}:{diagnosis.component}"
    last_count = runbook_counts.get(count_key, {"count": 0, "last_time": 0})
    if time.time() - last_count["last_time"] < runbook["cooldown_seconds"]:
        log_evolution({
            "task_id": task_id,
            "type": "heal",
            "component": diagnosis.component,
            "symptom": diagnosis.root_cause,
            "runbook_id": runbook["id"],
            "action": "cooldown",
            "success": False,
            "duration_ms": 0,
            "reason": "in_cooldown",
            "source": "runbook",
        })
        return HealResult(task_id=task_id, component=diagnosis.component, action_taken="cooldown", success=False, duration_ms=0, before_state={}, after_state={"reason": "in cooldown"}).model_dump()

    # 执行修复
    before_state = {"status": "degraded", "symptom": diagnosis.root_cause}
    result = call_claude_bridge(runbook["command"])
    success = result.get("status") == "completed"
    duration = int((time.time() - start) * 1000)

    # 验证
    if runbook.get("verify"):
        recovered = verify_health(runbook["verify"])
        success = success and recovered

    after_state = {"status": "healthy" if success else "still_degraded", "claude_result": result}

    # 更新计数 (内存 + 持久化)
    runbook_counts[count_key] = {"count": last_count["count"] + 1, "last_time": time.time()}
    persist_insert("evolution_runbook_counts", {"key": count_key, "count": runbook_counts[count_key]["count"], "last_time": time.time()})

    heal_result = HealResult(
        task_id=task_id,
        component=diagnosis.component,
        action_taken=runbook["action"],
        success=success,
        duration_ms=duration,
        before_state=before_state,
        after_state=after_state,
    )

    # Step 5: 学习 (成功修复且累计执行次数超过阈值 → 沉淀)
    if success and runbook_counts[count_key]["count"] >= LEARNING_THRESHOLD:
        heal_result.learned = learn_to_dify(heal_result, diagnosis)
        runbook_counts[count_key]["count"] = 0  # 重置计数

    # Phase 2: 候选剧本执行结果回流 (runbook_id 以 cand- 开头 = 候选被批准执行)
    if runbook.get("id", "").startswith("cand-"):
        record_candidate_trial(runbook["id"], success)
    # Phase 2: 成功修复后自动提炼新候选剧本 (异步, 不阻塞响应)
    elif success and runbook.get("id", "").startswith("rb-"):
        add_candidate_from_heal(heal_result, diagnosis)

    # Phase 1: 修复结果统一入进化日志 (持久化)
    log_evolution({
        "task_id": task_id,
        "type": "heal",
        "component": diagnosis.component,
        "symptom": diagnosis.root_cause,
        "runbook_id": runbook.get("id"),
        "action": runbook["action"],
        "success": success,
        "duration_ms": duration,
        "learned": heal_result.learned,
        "source": "runbook",
    })

    log.info(f"Heal: {diagnosis.component} -> {runbook['action']} (success={success}, {duration}ms)")
    return heal_result.model_dump()

@app.post("/auto-heal")
async def auto_heal(alert: Alert):
    """一键自愈: 观察→诊断→决策→行动→学习 全流程"""
    # Step 1+2: 诊断
    diagnosis = Diagnosis(**(await observe(alert)))

    # Step 3+4: 修复
    result = HealResult(**(await heal(diagnosis)))

    return {
        "alert": alert.model_dump(),
        "diagnosis": diagnosis.model_dump(),
        "result": result.model_dump(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# ─── LangChain-powered Diagnosis ───────────────────────────────────────

@app.post("/diagnose")
async def intelligent_diagnose(alert: Alert):
    """智能诊断: 对未知故障调用 LangChain 分析根因"""
    task_id = alert.task_id or str(uuid.uuid4())

    # 先尝试匹配已知剧本
    runbook = match_runbook(alert.component, alert.symptom)
    if runbook:
        return {
            "task_id": task_id,
            "diagnosis": f"已匹配剧本 {runbook['id']}",
            "safe_to_auto_fix": runbook["safe"],
            "confidence": 0.9,
            "source": "runbook",
        }

    # 未知故障 → 调用 LangChain 分析
    try:
        r = sync_http.post(
            f"{LANGCHAIN_BRIDGE}/agent/run-unified",
            json={
                "task_id": task_id,
                "intent": "diagnosis",
                "payload": {
                    "task": f"你是一个运维诊断专家。请分析以下故障：\n组件: {alert.component}\n症状: {alert.symptom}\n严重度: {alert.severity}\n上下文: {json.dumps(alert.context)}\n\n请判断：1)可能的根因 2)是否可以安全自动修复 3)推荐的修复操作",
                    "tools": [],
                },
                "context": {"system_prompt": "你是资深SRE专家。输出JSON格式：{\"root_cause\":\"...\",\"safe_to_auto_fix\":true/false,\"confidence\":0.0-1.0,\"action\":\"...\"}"},
            },
            timeout=60,
        )
        analysis = r.json()
        output = analysis.get("result", {}).get("output", "{}")
        try:
            result = json.loads(output)
        except json.JSONDecodeError:
            result = {"root_cause": output[:200], "safe_to_auto_fix": False, "confidence": 0.3, "action": "escalate_to_human"}

        # 记录进化日志 (Phase 1: 统一持久化入口)
        log_evolution({
            "task_id": task_id,
            "type": "diagnosis",
            "component": alert.component,
            "symptom": alert.symptom,
            "result": result,
            "source": "langchain",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        return {
            "task_id": task_id,
            "diagnosis": result.get("root_cause", "未知"),
            "safe_to_auto_fix": result.get("safe_to_auto_fix", False),
            "confidence": result.get("confidence", 0.3),
            "suggested_action": result.get("action", "escalate_to_human"),
            "source": "langchain",
        }
    except Exception as e:
        log.error(f"Diagnosis failed: {e}")
        return {
            "task_id": task_id,
            "diagnosis": f"诊断失败: {str(e)[:100]}",
            "safe_to_auto_fix": False,
            "confidence": 0,
            "source": "fallback",
        }

@app.get("/evolution/log")
async def get_evolution_log(limit: int = 20):
    """获取进化日志 — 诊断和修复的历史记录 (持久化: MongoDB/JSONL)"""
    rows = persist_query("evolution_logs", limit=limit)
    return {"total": len(rows), "entries": rows, "source": "mongo" if _mongo_db is not None else "jsonl"}


@app.get("/evolution/stats")
async def evolution_stats():
    """进化引擎统计 (Phase 1): 成功率 / 耗时 / 复发 / 学习沉淀 / Runbook 分布"""
    logs = persist_query("evolution_logs", limit=500)
    learned = persist_query("evolution_learned", limit=500)

    # 仅统计修复类日志 (type in diagnosis/heal 或含 success 字段)
    heal_entries = [e for e in logs if "success" in e]
    total = len(heal_entries)
    success = sum(1 for e in heal_entries if e.get("success"))
    failed = total - success
    durations = [e.get("duration_ms", 0) for e in heal_entries if e.get("duration_ms")]

    # 复发检测: 同 component+symptom 出现 >=2 次
    from collections import Counter
    comp_counter = Counter(e.get("component", "?") for e in heal_entries)
    recurrent_components = {c: n for c, n in comp_counter.items() if n >= 2}

    # Runbook 分布
    rb_counter = Counter(e.get("runbook_id", "none") for e in logs if e.get("runbook_id"))

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "mongo" if _mongo_db is not None else "jsonl",
        "storage": {"mongo": _mongo_db is not None, "jsonl": _mongo_db is None},
        "heal": {
            "total": total,
            "success": success,
            "failed": failed,
            "success_rate": round(success / total, 4) if total else None,
            "avg_duration_ms": round(sum(durations) / len(durations), 1) if durations else None,
        },
        "recurrent_components": recurrent_components,
        "runbook_distribution": dict(rb_counter),
        "learned_records": len(learned),
        "runbook_counts": runbook_counts,
    }

@app.get("/health/snapshot")
async def health_snapshot():
    """全组件健康快照 — 供定时任务采集"""
    endpoints = {
        "langchain": f"{LANGCHAIN_BRIDGE}/health",
        "claude": f"{CLAUDE_BRIDGE}/health",
        "dify": f"{DIFY_BASE}/health",
        "n8n": f"{N8N_BASE}/healthz",
        "backend": "http://localhost:8080/api/health",
        "evolution": "http://localhost:4030/health",
    }
    snapshot = {"timestamp": datetime.now(timezone.utc).isoformat(), "services": {}}
    for name, url in endpoints.items():
        try:
            r = sync_http.get(url, timeout=5)
            snapshot["services"][name] = {"status": "healthy" if r.status_code < 500 else "degraded", "code": r.status_code}
        except Exception as e:
            snapshot["services"][name] = {"status": "down", "error": str(e)[:100]}
    snapshot["all_healthy"] = all(s["status"] == "healthy" for s in snapshot["services"].values())
    return snapshot

# ─── 🆕 Adaptive Layer: 用户感知 + Skill 自动生成 ─────────────────────

# 用户交互记忆
user_memory = {}  # {user_id: {patterns: [], preferences: {}, skills_generated: []}}

class Interaction(BaseModel):
    """用户交互记录"""
    user_id: str
    intent: str
    input_text: str
    output_text: Optional[str] = None
    context: dict = Field(default_factory=dict)
    feedback: Optional[str] = None    # positive | negative | neutral
    completed: bool = True
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PatternResult(BaseModel):
    """模式识别结果"""
    user_id: str
    patterns_found: list = Field(default_factory=list)
    suggestions: list = Field(default_factory=list)
    skills_ready: list = Field(default_factory=list)

class SkillGeneration(BaseModel):
    """自动生成的 Skill"""
    name: str
    description: str
    trigger_phrases: list
    tools: list
    workflow_name: Optional[str] = None
    prompt_template: Optional[str] = None

@app.post("/adapt/interact")
async def record_interaction(interaction: Interaction):
    """记录用户交互，更新认知画像"""
    uid = interaction.user_id
    if uid not in user_memory:
        user_memory[uid] = {"patterns": [], "preferences": {}, "skills_generated": [], "interactions": []}

    mem = user_memory[uid]
    mem["interactions"].append({
        "intent": interaction.intent,
        "input": interaction.input_text[:200],
        "feedback": interaction.feedback,
        "time": interaction.timestamp,
    })

    # 只保留最近 200 条
    if len(mem["interactions"]) > 200:
        mem["interactions"] = mem["interactions"][-200:]

    # 更新偏好
    if interaction.feedback == "positive":
        mem["preferences"][interaction.intent] = mem["preferences"].get(interaction.intent, 0) + 1
    elif interaction.feedback == "negative":
        mem["preferences"][interaction.intent] = mem["preferences"].get(interaction.intent, 0) - 1

    # 计数意图
    mem["patterns"].append(interaction.intent)

    log.info(f"Interaction recorded: user={uid}, intent={interaction.intent}, feedback={interaction.feedback}")
    return {"recorded": True, "user_id": uid, "total_interactions": len(mem["interactions"])}

@app.get("/adapt/profile/{user_id}")
async def get_user_profile(user_id: str):
    """获取用户认知画像"""
    mem = user_memory.get(user_id, {})
    interactions = mem.get("interactions", [])

    # 分析高频意图
    from collections import Counter
    patterns = mem.get("patterns", [])
    top_intents = Counter(patterns[-100:]).most_common(5) if patterns else []

    # 计算满意率
    positive = sum(1 for i in interactions if i.get("feedback") == "positive")
    negative = sum(1 for i in interactions if i.get("feedback") == "negative")
    total_feedback = positive + negative
    satisfaction = round(positive / total_feedback * 100, 1) if total_feedback > 0 else None

    # 技能数量
    skills = mem.get("skills_generated", [])

    return {
        "user_id": user_id,
        "total_interactions": len(interactions),
        "top_intents": [{"intent": i, "count": c} for i, c in top_intents],
        "satisfaction_rate": satisfaction,
        "preferences": mem.get("preferences", {}),
        "skills_generated": len(skills),
        "recent_skills": skills[-5:] if skills else [],
        "evolution_stage": "new" if len(interactions) < 10 else ("familiar" if len(interactions) < 50 else "intimate"),
    }

@app.post("/adapt/analyze/{user_id}")
async def analyze_patterns(user_id: str):
    """分析用户行为模式，发现可自动化的需求"""
    from collections import Counter
    mem = user_memory.get(user_id, {})
    patterns = mem.get("patterns", [])
    interactions = mem.get("interactions", [])

    if len(patterns) < 5:
        return PatternResult(user_id=user_id, patterns_found=[], suggestions=["需要更多交互数据来学习你的习惯"], skills_ready=[])

    top = Counter(patterns).most_common(10)

    # 发现高频可自动化模式
    automatable = {
        "content_generation": {"threshold": 3, "skill": "一键内容生成", "tools": ["generate_content"]},
        "competitor_analysis": {"threshold": 3, "skill": "自动竞品分析", "tools": ["search_knowledge_base", "trigger_workflow"]},
        "trending_topics": {"threshold": 3, "skill": "热搜话题追踪", "tools": ["search_knowledge_base", "generate_content"]},
        "code_review": {"threshold": 3, "skill": "代码审查助手", "tools": ["claude_bridge"]},
        "data_analysis": {"threshold": 4, "skill": "数据分析报告", "tools": ["search_knowledge_base", "generate_content"]},
        "report": {"threshold": 3, "skill": "自动报告生成", "tools": ["generate_content", "trigger_workflow"]},
    }

    suggestions = []
    skills_ready = []
    patterns_found = [{"intent": i, "count": c} for i, c in top[:5]]

    for intent, count in top:
        if intent in automatable and count >= automatable[intent]["threshold"]:
            cfg = automatable[intent]
            skill = SkillGeneration(
                name=f"auto-{intent.replace('_', '-')}",
                description=f"自动生成: 根据用户高频需求「{intent}」创建 (已出现{count}次)",
                trigger_phrases=[f"帮我做{intent}", f"跑{intent}", intent],
                tools=cfg["tools"],
                workflow_name=f"aibrand/auto-{intent.replace('_', '-')}",
                prompt_template=f"你是{intent}专家，根据用户需求高效完成任务。",
            )
            skills_ready.append(skill)
            suggestions.append(f"我注意到你经常需要「{intent}」，已自动生成快捷 Skill，下次只需说「{skill.trigger_phrases[0]}」")

            # 保存
            mem["skills_generated"].append(skill.model_dump())
            # 重置计数防止重复生成
            patterns = [p for p in patterns if p != intent]

    user_memory[user_id] = mem

    if not suggestions:
        suggestions.append(f"已分析你的 {len(patterns)} 次交互，发现了 {len(patterns_found)} 个高频模式。继续使用，我会自动生成更多快捷工具。")

    return PatternResult(
        user_id=user_id,
        patterns_found=patterns_found,
        suggestions=suggestions,
        skills_ready=[s.model_dump() for s in skills_ready],
    ).model_dump()

@app.post("/adapt/evolve")
async def daily_evolution():
    """每日进化: 分析所有用户，生成改进"""
    results = {}
    for uid in list(user_memory.keys()):
        analysis = await analyze_patterns(uid)
        results[uid] = {
            "patterns": len(analysis["patterns_found"]),
            "suggestions": len(analysis["suggestions"]),
            "skills_generated": len(analysis["skills_ready"]),
        }
    return {"evolved_users": len(results), "results": results, "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/adapt/greet/{user_id}")
async def personalized_greet(user_id: str):
    """个性化问候 — 让用户感受到系统懂他"""
    profile = await get_user_profile(user_id)
    stage = profile["evolution_stage"]
    skills = profile["skills_generated"]

    if stage == "new":
        greeting = "你好！我是 AiBrand，会随着使用越来越懂你。有什么可以帮你的？"
    elif stage == "familiar":
        top = profile["top_intents"]
        top_desc = "、".join([f"「{t['intent']}」" for t in top[:3]]) if top else "各种任务"
        greeting = f"欢迎回来！我注意到你经常处理{top_desc}。需要我快速帮你完成吗？"
    else:  # intimate
        skill_list = [s.get("name", "") for s in skills[-3:]] if skills else []
        skill_desc = f"最近学会了{'、'.join(skill_list)}" if skill_list else "持续进化中"
        greeting = f"老朋友来了！{skill_desc}。今天想做什么？我随时准备好。"

    return {"greeting": greeting, "stage": stage, "profile": profile}

# ─── Main ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("EVOLUTION_PORT", "4030"))
    log.info(f"Evolution Engine starting on :{port}")
    log.info(f"Runbooks loaded: {len(RUNBOOK)}")
    log.info(f"Claude Bridge: {CLAUDE_BRIDGE}")
    uvicorn.run(app, host="0.0.0.0", port=port)
