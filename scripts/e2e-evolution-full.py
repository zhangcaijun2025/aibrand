# -*- coding: utf-8 -*-
"""AiBrand 自进化系统 端到端测试 (Phase 1-4 全链路)"""
import json, sys, time, requests

EVO = 'http://localhost:4030'
BRIDGE = 'http://localhost:4020'
OK, FAIL = 0, 0

def report(name, ok, detail=''):
    global OK, FAIL
    if ok: OK += 1
    else: FAIL += 1
    print(f'{"✅" if ok else "❌"} {name} {detail}')

def get(path, t=15):
    try:
        r = requests.get(f'{EVO}{path}', timeout=t)
        return r.status_code, (r.json() if r.status_code == 200 else {'http': r.status_code})
    except Exception as e:
        return 0, {'error': str(e)}

def post(path, body=None, t=120):
    try:
        r = requests.post(f'{EVO}{path}', json=body, timeout=t)
        return r.status_code, (r.json() if r.status_code < 500 else {'http': r.status_code})
    except Exception as e:
        return 0, {'error': str(e)}

print('=' * 60)
print('AiBrand 自进化系统端到端测试')
print('=' * 60)

# ── 0. 基础设施 ──
print('\n[0] 基础设施')
sc, j = get('/health')
report('evolution-engine 在线', sc == 200, f'({sc}) runbooks={j.get("runbooks")}')
try:
    r = requests.get(f'{BRIDGE}/health', timeout=10)
    jb = r.json()
    report('claude-bridge 在线', r.status_code == 200 and jb.get('claude_available'), f'({r.status_code})')
except Exception as e:
    report('claude-bridge 在线', False, str(e))

# ── 1. 健康快照 ──
print('\n[1] 健康快照')
sc, snap = get('/health/snapshot')
svcs = snap.get('services', {})
all_ok = snap.get('all_healthy') or all(s.get('status') == 'healthy' for s in svcs.values())
report('快照采集成功', sc == 200, f'all_healthy={snap.get("all_healthy")}')
report('快照落库(服务端)', sc == 200, f'services={len(svcs)}')

# ── 2. 自愈全链路 (真实执行: 重启 aibrand-web) ──
print('\n[2] 自愈闭环 (诊断→执行→验证→学习)')
alert = {'component': 'frontend', 'symptom': '500 compile error not found', 'severity': 'WARN', 'context': {'test': 'e2e-20260806'}}
sc, heal = post('/auto-heal', alert)
diag = heal.get('diagnosis', {})
res = heal.get('result', {})
# 经验库优先机制: 历史经验沉淀后, 诊断可能命中经验库(conf=0.9)而非剧本 — 均为正确诊断
hit_runbook = diag.get('runbook_id') == 'rb-008'
hit_learned = diag.get('confidence') == 0.9
report('诊断命中(剧本/经验库)', hit_runbook or hit_learned, f'(rb={diag.get("runbook_id")} conf={diag.get("confidence")} act={diag.get("suggested_action")})')
report('claude 执行成功', res.get('after_state', {}).get('claude_result', {}).get('status') == 'completed')
report('验证通过(success=True)', res.get('success') is True, f'({res.get("duration_ms")}ms)')
time.sleep(2)
try:
    r = requests.get('http://localhost:3099/', timeout=10)
    report('3099 恢复', r.status_code == 200, f'(HTTP {r.status_code})')
except Exception:
    report('3099 恢复', False)

# ── 3. 学习沉淀 ──
print('\n[3] 学习沉淀 (evolution_learned)')
sc, stats = get('/evolution/stats')
report('stats 端点', sc == 200)
report('日志已落库', stats.get('heal', {}).get('total', 0) >= 1, f'total={stats.get("heal", {}).get("total")}')

# ── 4. 经验库优先诊断 ──
print('\n[4] 经验库优先诊断')
sc, obs = post('/observe', {'component': 'frontend', 'symptom': '404 not found', 'severity': 'WARN'})
learned_hit = obs.get('confidence') == 0.9 and '经验库' in str(obs.get('root_cause', ''))
report('经验库命中优先', learned_hit, f'(conf={obs.get("confidence")}, src={obs.get("suggested_action")})')

# ── 5. Runbook 候选池 ──
print('\n[5] Runbook 候选池')
sc, cands = get('/runbooks/candidates')
report('候选池端点', sc == 200, f'candidates={len(cands.get("candidates", []))}')

# ── 6. 提案生命周期 ──
print('\n[6] 提案生命周期')
prop = {
    'title': '[e2e] 提案生命周期验证',
    'finding_type': 'params',
    'description': '端到端测试: 验证提案 propose→stage→monitor→decide 全流程。风险低,可回滚。',
    'severity': 'info',
    'expected_impact': '验证提案机制',
    'experiment_design': {'CANDIDATE_PROMOTE_SUCCESS': 2},
}
sc, p = post('/proposals', prop)
pid = p.get('id')
report('propose', sc == 200 and pid, f'id={pid}')
if pid:
    sc, rv = post(f'/proposals/{pid}/review')
    report('review(LLM 评审)', sc == 200, f"verdict={rv.get('review', {}).get('verdict')}")
    sc, st = post(f'/proposals/{pid}/stage')
    report('stage(灰度+快照)', sc == 200 and st.get('status') == 'staged', f"snap={st.get('baseline_snapshot')}")
    sc, mn = post(f'/proposals/{pid}/monitor')
    report('monitor(对比)', sc == 200, f"verdict={mn.get('verdict')}")
    sc, dc = post(f'/proposals/{pid}/decide', {'decision': 'rollback', 'reason': 'e2e 测试回滚'})
    report('decide(回滚)', sc == 200 and dc.get('status') == 'rolled_back', f"({dc.get('status')})")

# ── 7. meta-evolve 元进化 ──
print('\n[7] 元进化 (meta/evolve)')
sc, meta = post('/meta/evolve')
report('meta-evolve 执行', sc == 200, f'findings={len(meta.get("findings", []))}')
sc, ml = get('/meta/logs')
report('元进化日志', sc == 200, f'entries={ml.get("total")}')

# ── 8. 日报脚本 ──
print('\n[8] 日报脚本 (evolution-daily.py)')
import subprocess
r = subprocess.run([sys.executable, r'D:\king2046\scripts\evolution-daily.py'], capture_output=True, text=True, timeout=180)
daily_ok = r.returncode == 0 and 'REPORT_FILE=' in r.stdout
report('日报生成', daily_ok, '')

# ── 9. 联邦记忆桥 ──
print('\n[9] 联邦记忆桥 (双向)')
try:
    r = requests.post('http://localhost:18791/memory', json={
        'note': 'e2e 测试: 联邦记忆桥双向写入验证',
        'tag': 'e2e-test', 'target': 'both',
    }, timeout=15)
    jm = r.json()
    report('双向记忆写入', jm.get('ok') and jm.get('results', {}).get('hermes', {}).get('ok') and jm.get('results', {}).get('openclaw', {}).get('ok'))
except Exception as e:
    report('双向记忆写入', False, str(e))

print('\n' + '=' * 60)
print(f'结果: ✅ {OK} 通过 / ❌ {FAIL} 失败')
print('=' * 60)
sys.exit(0 if FAIL == 0 else 1)
