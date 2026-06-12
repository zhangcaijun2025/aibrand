"""Fix n8n Dify workflows — add required Dify API body parameters to HTTP Request nodes

Dify /v1/chat-messages requires: query, user, response_mode
"""
import sqlite3
import json

DB_PATH = r"D:\openclaw\cache\temp\n8n-db.sqlite"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

dify_names = ['Competitor Analysis', 'Trending Topics', 'Account Health Check', 'Post-Publish Tracking']

for name_pattern in dify_names:
    cur.execute("SELECT id, name FROM workflow_entity WHERE name LIKE ?", (f'%{name_pattern}%',))
    row = cur.fetchone()
    if not row:
        print(f"NOT FOUND: {name_pattern}")
        continue
    wf_id, wf_name = row
    print(f"\n{'='*60}")
    print(f"Workflow: {wf_name}  ({wf_id})")

    cur.execute("SELECT nodes FROM workflow_entity WHERE id = ?", (wf_id,))
    nodes = json.loads(cur.fetchone()[0])

    modified = False
    for node in nodes:
        ntype = node.get('type', '')
        if 'http' not in ntype.lower() and 'Http' not in ntype.lower():
            continue

        name = node.get('name', '?')
        params = node.get('parameters', {})
        url = params.get('url', '')
        print(f"  HTTP Node: {name}")
        print(f"  URL: {url[:100]}")

        body_params = params.get('bodyParameters', {})
        if not body_params or 'parameters' not in body_params:
            print(f"  No bodyParameters — may use string body — inspecting...")
            # Check for specifyBody
            specify = params.get('specifyBody', '')
            body_str = params.get('body', '')
            if body_str:
                print(f"  Body string: {body_str[:300]}")
            continue

        existing = {p['name'] for p in body_params['parameters']}
        print(f"  Existing body params: {existing}")

        # Required Dify API fields and their values
        required = [
            ("query", "={{ $json.body.query || $json.query || '' }}"),
            ("user", "={{ $json.body.user || 'n8n-auto' }}"),
            ("response_mode", "blocking"),
            ("inputs", "={{ $json.body.inputs || {} }}"),
        ]

        added = []
        for pname, pval in required:
            if pname not in existing:
                body_params['parameters'].append({"name": pname, "value": pval})
                added.append(pname)
                modified = True

        if added:
            print(f"  >>> Added: {added}")
        else:
            print(f"  -> All required params present")

    if modified:
        updated_nodes = json.dumps(nodes)
        cur.execute(
            "UPDATE workflow_entity SET nodes = ?, updatedAt = datetime('now') WHERE id = ?",
            (updated_nodes, wf_id)
        )
        cur.execute(
            "UPDATE workflow_history SET nodes = ? WHERE workflowId = ?",
            (updated_nodes, wf_id)
        )
        print(f"  -> Saved")

conn.commit()
conn.close()
print(f"\n{'='*60}")
print("Done. Copy DB back to container and restart workflows.")
