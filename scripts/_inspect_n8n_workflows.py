"""Extract n8n workflow names, webhooks, and test them"""
import sqlite3
import os

DB_PATH = os.path.join(os.environ.get('TEMP', '/tmp'), 'n8n_inspect.sqlite')
conn = sqlite3.connect(DB_PATH)

# Get deduplicated workflows (latest active version per name)
workflows = conn.execute(
    "SELECT DISTINCT name, active FROM workflow_entity WHERE isArchived=0 ORDER BY name"
).fetchall()

print("=== N8N Workflows ===\n")
wf_actives = {}
for wf in workflows:
    tag = "ACTIVE" if wf[1] else "INACTIVE"
    wf_actives[wf[0]] = wf[1]
    print(f"  [{tag}] {wf[0]}")

# Get unique webhook paths
print("\n=== Webhook Endpoints ===\n")
webhooks = conn.execute(
    """SELECT DISTINCT wd.dependencyKey, we.name
       FROM workflow_dependency wd
       JOIN workflow_entity we ON wd.workflowId = we.id
       WHERE wd.dependencyType='webhookPath'
       AND wd.publishedVersionId IS NOT NULL
       ORDER BY wd.dependencyKey"""
).fetchall()

for wh in webhooks:
    print(f"  POST /webhook/{wh[0]}  →  {wh[1]}")

print(f"\n  Total: {len(webhooks)} webhook endpoints, {len(workflows)} workflows")

# Also try to trigger a webhook - check if n8n allows unauthenticated webhook calls
conn.close()

# Write a test payload file
print("\n=== Suggested Test ===")
if webhooks:
    print(f"  curl -X POST http://localhost:5678/webhook/{webhooks[0][0]} \\")
    print(f"    -H 'Content-Type: application/json' \\")
    print(f"    -d '{{\"keyword\": \"AI Agent\", \"platforms\": [\"xiaohongshu\", \"douyin\"]}}'")
