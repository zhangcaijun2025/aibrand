"""
Import all AiBrand core workflows into n8n via REST API using API key auth.
"""
import json
import requests
import os
import sys

N8N_URL = "http://localhost:5678"
N8N_AUTH_COOKIE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MDRkMTkwLTY5ODUtNDA5Ni1iMjliLTgzMGQ5NTNlNWYxYyIsImhhc2giOiJlSDI0Snl4QlpwIiwidXNlZE1mYSI6ZmFsc2UsImlhdCI6MTc4MDcxODYyMywiZXhwIjoxNzgxMzIzNDIzfQ.HZ5tiOWn5Gg-vHRqDQS3Q_-H6ViJvgohI-01rMetYFc"
WORKFLOWS_DIR = r"D:\king2046\workflows"

HEADERS = {
    "Cookie": f"n8n-auth={N8N_AUTH_COOKIE}",
    "Content-Type": "application/json"
}

CORE_WORKFLOWS = [
    ("competitor-analysis.json", "AiBrand - Competitor Analysis"),
    ("trending-topics.json", "AiBrand - Trending Topics"),
    ("account-health-check.json", "AiBrand - Account Health Check"),
    ("post-publish-tracking.json", "AiBrand - Post-Publish Tracking"),
]

imported = []

for filename, display_name in CORE_WORKFLOWS:
    filepath = os.path.join(WORKFLOWS_DIR, filename)
    if not os.path.exists(filepath):
        print(f"  SKIP {filename}: file not found")
        continue

    with open(filepath, 'r', encoding='utf-8') as f:
        wf_data = json.load(f)

    if isinstance(wf_data, dict):
        workflows_to_import = [wf_data]
    else:
        workflows_to_import = wf_data

    for wf in workflows_to_import:
        # Fix: ensure webhook node has responseMode = "lastNode"
        fixed_count = 0
        for node in wf.get('nodes', []):
            if node['type'] == 'n8n-nodes-base.webhook':
                params = node.get('parameters', {})
                if 'responseMode' not in params or not params['responseMode']:
                    params['responseMode'] = 'lastNode'
                    node['parameters'] = params
                    fixed_count += 1
        if fixed_count:
            print(f"  FIXED: {wf['name']} ({fixed_count} webhooks)")

        # Ensure settings exist
        if 'settings' not in wf or not wf['settings']:
            wf['settings'] = {"saveExecutionProgress": True}

        # Remove IDs so n8n creates new
        wf.pop('id', None)
        wf.pop('versionId', None)
        wf.pop('activeVersionId', None)

        # Fix tags format: convert [{"name": "X"}] to ["X"]
        if 'tags' in wf:
            fixed_tags = []
            for t in wf['tags']:
                if isinstance(t, dict):
                    fixed_tags.append(t.get('name', str(t)))
                else:
                    fixed_tags.append(str(t))
            wf['tags'] = fixed_tags

        # Create workflow
        resp = requests.post(f"{N8N_URL}/rest/workflows", json=wf, headers=HEADERS)
        if resp.status_code in (200, 201):
            new_id = resp.json().get('data', {}).get('id') or resp.json().get('id', 'unknown')
            print(f"  [OK] Created: {wf['name']} (id={new_id[:8]}...)")
            imported.append((new_id, wf['name']))
        else:
            print(f"  [FAIL] {wf['name']}: {resp.status_code} {resp.text[:150]}")

# Activate all imported
print(f"\n[ACTIVATE] Activating {len(imported)} workflows...")
for wf_id, wf_name in imported:
    r1 = requests.post(f"{N8N_URL}/rest/workflows/{wf_id}/publish", headers=HEADERS)
    if r1.status_code in (200, 201):
        print(f"  [OK] Published: {wf_name}")
    else:
        print(f"  [WARN] Publish {wf_name}: {r1.status_code} {r1.text[:80]}")

    r2 = requests.post(f"{N8N_URL}/rest/workflows/{wf_id}/activate", json={}, headers=HEADERS)
    if r2.status_code in (200, 201):
        print(f"  [OK] Activated: {wf_name}")
    else:
        print(f"  [WARN] Activate {wf_name}: {r2.status_code} {r2.text[:80]}")

print(f"\n[DONE] {len(imported)}/{len(CORE_WORKFLOWS)} workflows imported")
