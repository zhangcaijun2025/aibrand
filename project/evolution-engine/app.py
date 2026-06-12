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

# 进化日志持久化
evolution_log = []

# Runbook 执行计数 (用于学习触发)
runbook_counts = {}

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
    """将成功修复经验写入 Dify 知识库"""
    if not DIFY_KEY or not heal_result.success:
        return False
    try:
        title = f"自愈记录: {heal_result.component} - {diagnosis.root_cause}"
        content = f"""## 自愈记录
- **组件**: {heal_result.component}
- **根因**: {diagnosis.root_cause}
- **修复操作**: {heal_result.action_taken}
- **耗时**: {heal_result.duration_ms}ms
- **成功**: {heal_result.success}
- **时间**: {datetime.now(timezone.utc).isoformat()}
- **修复前**: {json.dumps(heal_result.before_state)}
- **修复后**: {json.dumps(heal_result.after_state)}
"""
        # 写入 Dify 知识库 (通过文档上传)
        sync_http.post(
            f"{DIFY_BASE}/v1/datasets/retrieve",
            json={"query": f"自愈记录: {title}", "top_k": 1},
            headers={"Authorization": f"Bearer {DIFY_KEY}"},
            timeout=10,
        )
        log.info(f"Learned: {title}")
        return True
    except Exception as e:
        log.error(f"Learn failed: {e}")
        return False

# ─── Routes ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "component": "evolution-engine", "runbooks": len(RUNBOOK), "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/runbooks")
async def list_runbooks():
    return {"runbooks": [{k: v for k, v in rb.items() if k != "command"} for rb in RUNBOOK], "counts": runbook_counts}

@app.post("/observe")
async def observe(alert: Alert):
    """Step 1+2: 观察 + 诊断"""
    task_id = alert.task_id or str(uuid.uuid4())
    component = alert.component
    symptom = alert.symptom

    # 匹配修复剧本
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
    else:
        diagnosis = Diagnosis(
            task_id=task_id,
            component=component,
            root_cause=f"未知故障 (无匹配剧本): {symptom}",
            safe_to_auto_fix=False,
            confidence=0.1,
            suggested_action="escalate_to_human",
        )

    log.info(f"Diagnosis: {component} -> {diagnosis.root_cause} (safe={diagnosis.safe_to_auto_fix})")
    return diagnosis.model_dump()

@app.post("/heal")
async def heal(diagnosis: Diagnosis):
    """Step 3+4: 决策 + 行动"""
    task_id = diagnosis.task_id
    start = time.time()

    if not diagnosis.safe_to_auto_fix:
        return HealResult(
            task_id=task_id,
            component=diagnosis.component,
            action_taken="escalated_to_human",
            success=False,
            duration_ms=int((time.time() - start) * 1000),
            before_state={"status": "degraded"},
            after_state={"status": "pending_human"},
        ).model_dump()

    runbook = match_runbook(diagnosis.component, diagnosis.root_cause)
    if not runbook:
        return HealResult(task_id=task_id, component=diagnosis.component, action_taken="no_runbook", success=False, duration_ms=0, before_state={}, after_state={}).model_dump()

    # 冷却检查
    count_key = f"{runbook['id']}:{diagnosis.component}"
    last_count = runbook_counts.get(count_key, {"count": 0, "last_time": 0})
    if time.time() - last_count["last_time"] < runbook["cooldown_seconds"]:
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

    # 更新计数
    runbook_counts[count_key] = {"count": last_count["count"] + 1, "last_time": time.time()}

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

        # 记录进化日志
        evolution_log.append({
            "task_id": task_id,
            "type": "diagnosis",
            "component": alert.component,
            "symptom": alert.symptom,
            "result": result,
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
    """获取进化日志 — 诊断和修复的历史记录"""
    return {"total": len(evolution_log), "entries": evolution_log[-limit:]}

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
