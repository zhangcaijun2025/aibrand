"""
Fix 3 broken n8n workflows by ensuring webhook node has responseMode=responseNode
and Respond to Webhook node is properly connected.
"""
import sqlite3
import json
import os

DB_PATH = os.path.join(os.environ.get('TEMP', '/tmp'), 'n8n_inspect.sqlite')

# Re-copy fresh DB
print("[COPY] Fetching n8n database...")
os.system('docker cp n8n:/home/node/.n8n/database.sqlite "' + DB_PATH + '" 2>&1')

conn = sqlite3.connect(DB_PATH)

BROKEN_NAMES = ['Account Health Check', 'Trending Topics', 'Post-Publish Tracking']

# Get all active workflows
workflows = conn.execute(
    "SELECT id, name, nodes, connections, active FROM workflow_entity WHERE isArchived=0"
).fetchall()

fixes_applied = []

for wf in workflows:
    wf_id, wf_name, nodes_json, conns_json, active = wf
    name_matched = any(bn in wf_name for bn in BROKEN_NAMES)

    if not name_matched:
        continue

    nodes = json.loads(nodes_json)
    conns = json.loads(conns_json)
    modified = False

    # Find webhook and respond nodes
    webhook_node = None
    respond_node = None

    for n in nodes:
        ntype = n['type'].split('.')[-1]
        if ntype == 'webhook':
            webhook_node = n
        elif ntype == 'respondToWebhook':
            respond_node = n

    if not webhook_node or not respond_node:
        print(f"  SKIP {wf_name}: missing webhook or respond node")
        continue

    print(f"\n  === {wf_name} ===")
    print(f"  Webhook: {webhook_node['id']} responseMode={webhook_node.get('parameters', {}).get('responseMode', 'MISSING')}")
    print(f"  Respond: {respond_node['id']} position={respond_node.get('position', [])}")

    # Fix 1: Ensure webhook has responseMode = "responseNode"
    params = webhook_node.get('parameters', {})
    if params.get('responseMode') != 'responseNode':
        params['responseMode'] = 'responseNode'
        webhook_node['parameters'] = params
        modified = True
        print(f"    FIXED: webhook responseMode → 'responseNode'")

    # Fix 2: Ensure the respond node exists in connections (even with empty output)
    if respond_node['name'] not in conns:
        conns[respond_node['name']] = {'main': [[]]}
        modified = True
        print(f"    FIXED: Added respond node to connections")

    # Fix 3: Verify the chain from webhook to respond is complete
    # Get the last node before respond
    expected_chain = []
    for conn_src, conn_data in conns.items():
        for output_name, target_lists in conn_data.items():
            for target_list in target_lists:
                for target in target_list:
                    if target['node'] == respond_node['name']:
                        expected_chain.append(conn_src)
                        print(f"    OK: '{conn_src}' → '{respond_node['name']}'")

    if not expected_chain:
        # Need to connect some node to respond
        # Find the http or code node that's the last in chain
        for n in reversed(nodes):
            if n['name'] in conns and n['id'] != respond_node['id'] and n['id'] != webhook_node['id']:
                # This node has outgoing connections, add respond as next
                for output_key in conns[n['name']]:
                    conns[n['name']][output_key] = [
                        [{"node": respond_node['name'], "type": "main", "index": 0}]
                    ]
                    modified = True
                    print(f"    FIXED: Connected '{n['name']}' → '{respond_node['name']}'")
                    break
                break

    if modified:
        new_nodes_json = json.dumps(nodes)
        new_conns_json = json.dumps(conns)
        conn.execute(
            "UPDATE workflow_entity SET nodes = ?, connections = ?, updatedAt = datetime('now') WHERE id = ?",
            (new_nodes_json, new_conns_json, wf_id)
        )
        fixes_applied.append(wf_name)

if fixes_applied:
    conn.commit()
    print(f"\n[SAVE] {len(fixes_applied)} fixes applied")
    conn.close()
    os.system('docker cp "' + DB_PATH + '" n8n:/home/node/.n8n/database.sqlite 2>&1')
    print("[RESTART] Restarting n8n...")
    os.system('docker restart n8n 2>&1')
    print("[DONE] Waiting for n8n to restart...")
else:
    print("\n[SKIP] No fixes needed")
    conn.close()
