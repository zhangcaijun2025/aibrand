#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Evolution Weekly Report — Phase 4 收官
汇总近 7 天: 自愈 stats / 提案 / 候选池 / 元进化 / 健康快照 / Hermes skills
生成周报 markdown → D:\\king2046\\logs\\evolution-weekly-report-YYYYMMDD.md
用法: python evolution-weekly.py
"""
import json, os, sys, argparse, datetime
import requests

EVO = 'http://localhost:4030'
HERMES_HOME = os.getenv('HERMES_HOME', os.path.join(os.getenv('LOCALAPPDATA', ''), 'hermes'))
LOG_DIR = r'D:\king2046\logs'

def get(path, timeout=20):
    try:
        r = requests.get(f'{EVO}{path}', timeout=timeout)
        return r.json() if r.status_code == 200 else {'error': f'HTTP {r.status_code}'}
    except Exception as e:
        return {'error': str(e)}

def post(path, timeout=180):
    try:
        r = requests.post(f'{EVO}{path}', timeout=timeout)
        return r.json() if r.status_code == 200 else {'error': f'HTTP {r.status_code}'}
    except Exception as e:
        return {'error': str(e)}

def hermes_skills_stats():
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
                'last_used_at': info.get('last_used_at'),
                'created_by': info.get('created_by'),
            })
        skills.sort(key=lambda s: s['use_count'], reverse=True)
        return {'total': len(skills), 'skills': skills[:10]}
    except Exception as e:
        return {'error': str(e), 'skills': []}

def main():
    today = datetime.date.today().isoformat()
    week_ago = (datetime.date.today() - datetime.timedelta(days=7)).isoformat()
    report = {'date': today, 'week_from': week_ago, 'generated_at': datetime.datetime.now().isoformat()}

    # 1. stats (近 500 条, 覆盖一周)
    report['stats'] = get('/evolution/stats')

    # 2. 提案 (全部, 统计状态分布)
    report['proposals'] = get('/proposals?limit=100')

    # 3. 候选池
    report['candidates'] = get('/runbooks/candidates')

    # 4. 元进化日志 (近 20 条)
    report['meta_logs'] = get('/meta/logs?limit=20')

    # 5. 健康快照 (服务端自动落库, 读最近 7 天)
    report['snapshots'] = get('/evolution/log?limit=1')  # 端点占位, 实际快照从 meta 读

    # 6. Hermes skills
    report['hermes_skills'] = hermes_skills_stats()

    # 7. 触发一次 meta-evolve (周度自进化)
    report['meta_evolve'] = post('/meta/evolve')

    # ── 生成周报 ──
    lines = []
    lines.append(f'# 📊 AiBrand 进化周报 — {today} (过去 7 天)')
    lines.append('')

    # 自愈引擎
    lines.append('## 🔧 自愈引擎 (周汇总)')
    heal = (report.get('stats') or {}).get('heal', {})
    if heal:
        lines.append(f'- 自愈尝试: **{heal.get("total", 0)}** 次 (成功 {heal.get("success", 0)} / 失败 {heal.get("failed", 0)})')
        rate = heal.get('success_rate')
        lines.append(f'- 成功率: **{f"{rate:.0%}" if isinstance(rate, (int, float)) else rate}**')
        dur = heal.get('avg_duration_ms')
        lines.append(f'- 平均修复耗时: {dur if dur is not None else "-"} ms')
    lines.append(f'- 学习沉淀: **{(report.get("stats") or {}).get("learned_records", 0)}** 条')
    rb_dist = (report.get('stats') or {}).get('runbook_distribution', {})
    if rb_dist:
        lines.append(f'- Runbook 使用: {", ".join(f"{k}:{v}" for k, v in rb_dist.items())}')
    rec = (report.get('stats') or {}).get('recurrent_components', {})
    if rec:
        lines.append(f'- ⚠️ 复发组件: {", ".join(f"{k}({v}次)" for k, v in rec.items())}')

    # 提案漏斗
    lines.append('')
    lines.append('## 📋 提案漏斗 (周汇总)')
    props = (report.get('proposals') or {}).get('proposals', [])
    if props:
        from collections import Counter
        by_status = Counter(p.get('status', '?') for p in props)
        by_sev = Counter(p.get('severity', '?') for p in props)
        lines.append(f'- 总提案: **{len(props)}**')
        lines.append(f'- 状态: {", ".join(f"{k}:{v}" for k, v in by_status.items())}')
        lines.append(f'- 严重度: {", ".join(f"{k}:{v}" for k, v in by_sev.items())}')
        open_props = [p for p in props if p.get('status') in ('proposed', 'reviewed', 'staged', 'monitoring')]
        if open_props:
            lines.append('- 待处理:')
            for p in open_props[:5]:
                lines.append(f'  - [{p.get("severity")}] {p.get("title")} ({p.get("status")})')
    else:
        lines.append('- 暂无提案')

    # 候选池
    lines.append('')
    lines.append('## 🎭 Runbook 候选池 (周汇总)')
    cands = (report.get('candidates') or {}).get('candidates', [])
    if cands:
        promoted = [c for c in cands if c.get('status') == 'promoted']
        trial = [c for c in cands if c.get('status') == 'trial']
        rejected = [c for c in cands if c.get('status') == 'rejected']
        lines.append(f'- 候选总数: {len(cands)} (晋升 {len(promoted)} / 试用 {len(trial)} / 淘汰 {len(rejected)})')
        for c in trial[:5]:
            lines.append(f'  - {c.get("id")} {c.get("component")} → {c.get("action")} ({c.get("ok_count", 0)}✓/{c.get("fail_count", 0)}✗)')
    else:
        lines.append('- 暂无候选剧本')

    # 元进化
    lines.append('')
    lines.append('🧬 元进化 (本周执行)')
    meta = report.get('meta_evolve') or {}
    if meta.get('findings'):
        for f in meta['findings']:
            lines.append(f'- ⚠️ **{f.get("findingType")}**: {f.get("description")}')
        if meta.get('auto_proposals'):
            lines.append(f'- 自动生成提案: {", ".join(meta["auto_proposals"])}')
    elif meta.get('error'):
        lines.append(f'- ⚠️ 执行失败: {meta["error"]}')
    else:
        lines.append('- 无退化发现 ✅')
    meta_logs = (report.get('meta_logs') or {}).get('entries', [])
    lines.append(f'- 元进化日志: {len(meta_logs)} 条')

    # Hermes skills
    lines.append('')
    lines.append('## 🔗 Hermes Skills (联邦, 周汇总)')
    hs = report.get('hermes_skills') or {}
    if hs.get('skills'):
        lines.append(f'- 活跃 Skill: **{hs.get("total", 0)}**')
        lines.append('- Top: ' + '; '.join(f"{s['name']}({s['use_count']}次)" for s in hs['skills'][:5]))
    else:
        lines.append(f'- 读取失败: {hs.get("error", "?")}')

    report_md = '\n'.join(lines)
    os.makedirs(LOG_DIR, exist_ok=True)
    out_file = os.path.join(LOG_DIR, f'evolution-weekly-report-{today}.md')
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(report_md)

    summary = {
        'date': today,
        'report_file': out_file,
        'heal_total': heal.get('total', 0) if heal else 0,
        'success_rate': heal.get('success_rate') if heal else None,
        'proposals_total': len(props) if props else 0,
        'proposals_open': len([p for p in props if p.get('status') in ('proposed', 'reviewed', 'staged', 'monitoring')]) if props else 0,
        'candidates_trial': len([c for c in cands if c.get('status') == 'trial']) if cands else 0,
        'meta_findings': len(meta.get('findings', [])) if meta else 0,
        'hermes_skills_total': hs.get('total', 0) if hs else 0,
    }
    with open(os.path.join(LOG_DIR, f'evolution-weekly-summary-{today}.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(json.dumps(summary, ensure_ascii=False))
    print(f'REPORT_FILE={out_file}')
    return summary

if __name__ == '__main__':
    main()
