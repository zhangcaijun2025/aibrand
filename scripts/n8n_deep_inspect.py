import sqlite3, json, os

DB = os.path.join(os.environ['TEMP'], 'n8n-inspect.sqlite')
os.system(f'docker cp n8n:/home/node/.n8n/database.sqlite "{DB}"')

conn = sqlite3.connect(DB)
c = conn.cursor()

# Inspect: smart stock selection (5 nodes)
print("="*60)
print("SMART STOCK SELECTION (5 nodes)")
print("="*60)
c.execute("SELECT nodes, connections FROM workflow_entity WHERE name LIKE '%选股五层全功能%' AND active=1 LIMIT 1")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    for n in nodes:
        print(f"\n--- {n['type']} - {n['name']} ---")
        print(json.dumps(n.get('parameters', {}), indent=2, ensure_ascii=False)[:800])

# Inspect: xhs auto
print("\n" + "="*60)
print("REDNOTE AUTO")
print("="*60)
c.execute("SELECT nodes, connections FROM workflow_entity WHERE name LIKE '%小红书%' LIMIT 1")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    conns = json.loads(row[1])
    for n in nodes:
        print(f"\n--- {n['type'].split('.')[-1]} - {n['name']} ---")
        p = n.get('parameters', {})
        # Show relevant params
        for k, v in p.items():
            if k not in ('options',):
                val = str(v)[:200]
                print(f"  {k}: {val}")
    print(f"\nConnections: {json.dumps(conns, indent=2, ensure_ascii=False)[:500]}")

# Inspect: risk monitoring
print("\n" + "="*60)
print("RISK MONITORING")
print("="*60)
c.execute("SELECT nodes, connections FROM workflow_entity WHERE name LIKE '%持仓风险%' LIMIT 1")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    conns = json.loads(row[1])
    for n in nodes:
        ntype = n['type'].split('.')[-1]
        print(f"\n--- {ntype} - {n['name']} ---")
        p = {k: str(v)[:150] for k, v in n.get('parameters', {}).items() if k != 'options'}
        print(f"  {json.dumps(p, ensure_ascii=False)}")
    print(f"\nConnections: {json.dumps(conns, ensure_ascii=False)[:600]}")

conn.close()
