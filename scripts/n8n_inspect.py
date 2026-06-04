import sqlite3, json, os, shutil

DB_PATH = os.path.join(os.environ['TEMP'], 'n8n-inspect.sqlite')
os.system(f'docker cp n8n:/home/node/.n8n/database.sqlite "{DB_PATH}"')

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# List ALL workflows with their active status
c.execute("SELECT name, active, id FROM workflow_entity ORDER BY name")
workflows = c.fetchall()
print(f"=== All {len(workflows)} Workflows ===")
for name, active, wid in workflows:
    status = "ACTIVE" if active else "draft"
    print(f"  [{status}] {name} ({wid[:8]}...)")

# Inspect a real functional workflow in detail (pick the Dify integration one)
print("\n=== Inspecting: N8N-Dify Integration Demo ===")
c.execute("SELECT nodes, connections, settings FROM workflow_entity WHERE name LIKE '%Dify%' OR name LIKE '%N8N%' LIMIT 1")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    connections = json.loads(row[1])
    print(f"Nodes ({len(nodes)}):")
    for n in nodes:
        print(f"  [{n['type'].split('.')[-1]}] {n['name']} (v{n['typeVersion']})")
        if 'parameters' in n:
            params = {k: v for k, v in n['parameters'].items() if k not in ('jsCode', 'options', 'respondWith')}
            print(f"    params: {json.dumps(params, ensure_ascii=False)[:200]}")
    print(f"\nConnections: {json.dumps(connections, ensure_ascii=False)[:500]}")

# Inspect the stock selection workflow (most complex)
print("\n=== Inspecting: Smart Stock Selection ===")
c.execute("SELECT nodes, connections, settings FROM workflow_entity WHERE name LIKE '%选股%' LIMIT 1")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    connections = json.loads(row[1])
    print(f"Nodes ({len(nodes)}):")
    for n in nodes:
        ntype = n['type'].split('.')[-1]
        has_params = len(json.dumps(n.get('parameters', {}))) > 4
        marker = " *" if has_params else ""
        print(f"  [{ntype}] {n['name']}{marker}")

# Inspect the AI Assistant workflow
print("\n=== Inspecting: AiToEarn AI Assistant ===")
c.execute("SELECT nodes, connections FROM workflow_entity WHERE name LIKE '%AiToEarn AI%' LIMIT 1")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    print(f"Nodes ({len(nodes)}):")
    for n in nodes:
        ntype = n['type'].split('.')[-1]
        print(f"  [{ntype}] {n['name']}")
        params = n.get('parameters', {})
        key_params = {k: str(v)[:120] for k, v in params.items() if k not in ('options', 'jsCode') and v}
        if key_params:
            print(f"    {json.dumps(key_params, ensure_ascii=False)}")

conn.close()
