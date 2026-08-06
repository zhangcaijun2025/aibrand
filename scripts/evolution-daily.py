#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Evolution Daily Report — Phase 4
1. 采集健康快照 (evolution-engine /health/snapshot, 服务端自动落库 MongoDB)
2. 触发 meta/evolve 每日自进化
3. 汇总: evolution stats / proposals / candidates / meta logs
4. 读取 Hermes skills 使用统计 (.usage.json) — 联邦统计打通
5. 生成飞书日报 markdown → D:\\king2046\\logs\\evolution-daily-report-YYYYMMDD.md
用法: python evolution-daily.py [--no-meta]
"""
import json, os, sys, argparse, datetime
import requests

EVO = 'http://localhost:4030'
HERMES_HOME = os.getenv('HERMES_HOME', os.path.join(os.getenv('LOCALAPPDATA', ''), 'hermes'))
LOG_DIR = r'D:\king2046\logs'

def get(path, timeout=15):
    try:
        r = requests.get(f'{EVO}{path}', timeout=timeout)
        return r.json() if r.status_code == 200 else {'error': f'HTTP {r.status_code}'}
    except Exception as e:
        return {'error': str(e)}

def post(path, timeout=120):
    try:
        r = requests.post(f'{EVO}{path}', timeout=timeout)
        return r.json() if r.status_code == 200 else {'error': f'HTTP {r.status_code}'}
    except Exception as e:
        return {'error': str(e)}

def hermes_skills_stats():
    """读 Hermes skills 使用统计 — 联邦统计打通"""
    usage_file = os.path.join(HERMES_HOME, 'skills', '.usage.json')
    if not os.path.exists(usage_file):
        return {'error': 'usage.json not found', 'skills': []}
    try:
        with open(usage_file, 'r', encoding='utf-8') as f:
            usage = json.load(f)
        skills = []
        for name, info in usage.items():
            if info.get('state') == 'archived':
                continue
            skills.append({
                'name': name,
                'use_count': info.get('use_count', 0),
                'view_count': info.get('view_count', 0),
                'patch_count': info.get('patch_count', 0),
                'last_used_at': info.get('last_used_at'),
                'created_by': info.get('created_by'),
            })
        skills.sort(key=lambda s: s['use_count'], reverse=True)
        return {'total': len(skills), 'skills': skills[:15]}
    except Exception as e:
        return {'error': str(e), 'skills': []}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-meta', action='store_true', help='skip meta/evolve trigger')
    args = parser.parse_args()

    today = datetime.date.today().isoformat()
    report = {'date': today, 'generated_at': datetime.datetime.now().isoformat()}

    # 1. 健康快照 (服务端自动落库 evolution_health_snapshots)
    snap = get('/health/snapshot')
    report['health_snapshot'] = snap
    report['snapshot_saved'] = not isinstance(snap, dict) or 'error' not in snap

    # 2. meta/evolve (每日自进化) — 可跳过
    if not args.no_meta:
        report['meta_evolve'] = post('/meta/evolve')
    else:
        report['meta_evolve'] = {'skipped': True}

    # 3. 进化引擎数据
    report['stats'] = get('/evolution/stats')
    report['proposals'] = get('/proposals?limit=10')
    report['candidates'] = get('/runbooks/candidates')
    report['meta_params'] = get('/meta/params')
    report['meta_logs'] = get('/meta/logs?limit=5')

    # 4. Hermes skills 统计 (联邦打通)
    report['hermes_skills'] = hermes_skills_stats()

    # ── 生成日报 markdown ──
    lines = []
    lines.append(f'# 🤖 AiBrand 进化日报 — {today}')
    lines.append('')

    # 健康快照
    lines.append('## 🩺 系统健康')
    svcs = (snap or {}).get('services', {})
    if svcs:
        for name, s in svcs.items():
            icon = '🟢' if s.get('status') == 'healthy' else ('🟡' if s.get('status') == 'degraded' else '🔴')
            lines.append(f'- {icon} **{name}**: {s.get("status", "?")} (HTTP {s.get("code", "-")})')
        lines.append(f'- 总健康: {"✅ 全部正常" if (snap or {}).get("all_healthy") else "⚠️ 部分异常"}')
    else:
        lines.append(f'- 快照获取失败: {snap.get("error", "?") if isinstance(snap, dict) else snap}')

    # 自愈统计
    lines.append('')
    lines.append('## 🔧 自愈引擎')
    heal = (report.get('stats') or {}).get('heal', {})
    if heal:
        lines.append(f'- 自愈尝试: **{heal.get("total", 0)}** 次 (成功 {heal.get("success", 0)} / 失败 {heal.get("failed", 0)})')
        lines.append(f'- 成功率: **{heal.get("success_rate", "-")}**')
        lines.append(f'- 平均修复耗时: {heal.get("avg_duration_ms", "-")} ms')
    lines.append(f'- 学习沉淀记录: {(report.get("stats") or {}).get("learned_records", 0)} 条')
    rb_dist = (report.get('stats') or {}).get('runbook_distribution', {})
    if rb_dist:
        lines.append(f'- Runbook 使用分布: {", ".join(f"{k}:{v}" for k, v in rb_dist.items())}')

    # 提案
    lines.append('')
    lines.append('## 📋 进化提案')
    props = (report.get('proposals') or {}).get('proposals', [])
    if props:
        for p in props[:8]:
            sev = {'info': 'ℹ️', 'warning': '⚠️', 'critical': '🔴'}.get(p.get('severity'), 'ℹ️')
            lines.append(f'- {sev} **[{p.get("status")}]** {p.get("title")} (来源: {p.get("source")})')
    else:
        lines.append('- 暂无提案')

    # 候选剧本
    lines.append('')
    lines.append('## 🎭 Runbook 候选池')
    cands = (report.get('candidates') or {}).get('candidates', [])
    if cands:
        for c in cands[:8]:
            lines.append(f'- **{c.get("id")}** [{c.get("status")}] {c.get("component")} → {c.get("action")} (试用 {c.get("ok_count", 0)}✓/{c.get("fail_count", 0)}✗)')
    else:
        lines.append('- 暂无候选剧本')

    # 元进化
    lines.append('')
    lines.append('🧬 元进化 (meta/evolve)')
    meta = report.get('meta_evolve') or {}
    if meta.get('findings'):
        for f in meta['findings']:
            sev = {'info': 'ℹ️', 'warning': '⚠️', 'critical': '🔴'}.get(f.get('severity'), 'ℹ️')
            lines.append(f'- {sev} **{f.get("findingType")}**: {f.get("description")}')
        if meta.get('auto_proposals'):
            lines.append(f'- 自动生成提案: {", ".join(meta["auto_proposals"])}')
    elif meta.get('error'):
        lines.append(f'- ⚠️ meta/evolve 执行失败: {meta["error"]}')
    else:
        lines.append('- 本次无退化发现 ✅')

    # Hermes skills (联邦)
    lines.append('')
    lines.append('## 🔗 Hermes Skills 统计 (联邦)')
    hs = report.get('hermes_skills') or {}
    if hs.get('skills'):
        lines.append(f'- 活跃 Skill 总数: **{hs.get("total", 0)}**')
        top = hs['skills'][:5]
        lines.append('- Top 使用: ' + '; '.join(f"{s['name']}({s['use_count']}次)" for s in top))
    else:
        lines.append(f'- 读取失败: {hs.get("error", "?")}')

    # 参数
    lines.append('')
    lines.append('## ⚙️ 当前进化参数')
    params = (report.get('meta_params') or {}).get('params', {})
    if params:
        lines.append('- ' + ', '.join(f"{k}={v}" for k, v in params.items()))

    report_md = '\n'.join(lines)
    os.makedirs(LOG_DIR, exist_ok=True)
    out_file = os.path.join(LOG_DIR, f'evolution-daily-report-{today}.md')
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(report_md)

    # 汇总 JSON (供 agent 转发)
    summary = {
        'date': today,
        'report_file': out_file,
        'health_all_ok': bool((snap or {}).get('all_healthy')),
        'heal_total': heal.get('total', 0) if heal else 0,
        'heal_success_rate': heal.get('success_rate') if heal else None,
        'proposals_open': len([p for p in props if p.get('status') in ('proposed', 'reviewed', 'staged', 'monitoring')]) if props else 0,
        'candidates_trial': len([c for c in cands if c.get('status') == 'trial']) if cands else 0,
        'meta_findings': len(meta.get('findings', [])) if meta else 0,
        'hermes_skills_total': hs.get('total', 0) if hs else 0,
        'snapshot_saved': report.get('snapshot_saved', False),
    }
    with open(os.path.join(LOG_DIR, f'evolution-daily-summary-{today}.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(json.dumps(summary, ensure_ascii=False))
    print(f'REPORT_FILE={out_file}')
    return summary

if __name__ == '__main__':
    main()
