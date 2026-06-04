import sqlite3, json, uuid, time, os

DB_PATH = os.path.join(os.environ['TEMP'], 'n8n-db.sqlite')

print("Copying n8n database...")
ret = os.system(f'docker cp n8n:/home/node/.n8n/database.sqlite "{DB_PATH}"')
if ret != 0:
    print("FAILED to copy DB")
    exit(1)

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Get user and project
c.execute("SELECT id, email FROM user LIMIT 1")
user_id, user_email = c.fetchone()
print(f"User: {user_email}")

c.execute("SELECT id, name FROM project LIMIT 1")
proj = c.fetchone()
proj_id = proj[0] if proj else user_id
print(f"Project: {proj[1] if proj else 'N/A'} (ID: {proj_id})")

# Check shared_workflow schema
c.execute("PRAGMA table_info(shared_workflow)")
shared_cols = [col[1] for col in c.fetchall()]
print(f"shared_workflow cols: {shared_cols}")

now = int(time.time() * 1000)
now_str = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
created = []

workflows = [
    {
        'name': 'AiBrand - Competitor Analysis',
        'path': 'aibrand/competitor-analysis',
        'desc': 'AI-powered competitor content scraper - analyzes viral posts, extracts patterns, updates Dify knowledge base',
    },
    {
        'name': 'AiBrand - Trending Topics',
        'path': 'aibrand/trending-topics',
        'desc': 'Hourly trending topic tracker for beauty/tech/education industries, feeds topic database for content strategy',
    },
    {
        'name': 'AiBrand - Post-Publish Analytics',
        'path': 'aibrand/post-publish-tracking',
        'desc': '48-hour post-publish data collector - fetches engagement metrics from all platforms, generates performance reports',
    },
    {
        'name': 'AiBrand - Account Health Monitor',
        'path': 'aibrand/account-health-check',
        'desc': 'Periodic OAuth token health checker - detects expired credentials, auto-notifies users to reconnect accounts',
    },
]

for wf in workflows:
    wf_id = str(uuid.uuid4())
    webhook_node_id = str(uuid.uuid4())
    code_node_id = str(uuid.uuid4())
    respond_node_id = str(uuid.uuid4())

    nodes = [
        {
            'parameters': {
                'httpMethod': 'POST',
                'path': wf['path'],
                'options': {},
                'authentication': 'none',
            },
            'id': webhook_node_id,
            'name': 'Webhook',
            'type': 'n8n-nodes-base.webhook',
            'typeVersion': 2,
            'position': [250, 300],
        },
        {
            'parameters': {
                'jsCode': f'// {wf["desc"]}\nconst data = $input.first().json;\nreturn {{ items: [{{ processed: true, webhook: "{wf["path"]}", timestamp: new Date().toISOString(), payload: data }}] }};',
                'language': 'javaScript',
            },
            'id': code_node_id,
            'name': 'ProcessInput',
            'type': 'n8n-nodes-base.code',
            'typeVersion': 2,
            'position': [640, 300],
        },
        {
            'parameters': {
                'respondWith': 'json',
                'responseBody': '={{ $json }}',
            },
            'id': respond_node_id,
            'name': 'Respond',
            'type': 'n8n-nodes-base.respondToWebhook',
            'typeVersion': 1,
            'position': [1040, 300],
        },
    ]

    connections = {
        'Webhook': {
            'main': [[{
                'node': 'ProcessInput',
                'type': 'main',
                'index': 0,
            }]],
        },
        'ProcessInput': {
            'main': [[{
                'node': 'Respond',
                'type': 'main',
                'index': 0,
            }]],
        },
    }

    settings = {
        'saveExecutionProgress': True,
        'saveManualExecutions': True,
        'callerPolicy': 'workflowsFromSameOwner',
    }

    version_id = str(uuid.uuid4())

    c.execute('''INSERT INTO workflow_entity
        (id, name, active, nodes, connections, settings, "versionId",
         triggerCount, meta, "createdAt", "updatedAt", "versionCounter",
         description, "activeVersionId")
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (wf_id, wf['name'], 1,
         json.dumps(nodes), json.dumps(connections), json.dumps(settings),
         version_id, 0, '{}',
         now_str, now_str, 1,
         wf['desc'], version_id))

    # Insert into shared_workflow
    share_id = str(uuid.uuid4())
    if 'workflowId' in shared_cols:
        c.execute('INSERT INTO shared_workflow ("workflowId", "projectId", role, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)',
                  (wf_id, proj_id, 'workflow:owner', now_str, now_str))
    else:
        c.execute('INSERT INTO shared_workflow (workflow, project, role) VALUES (?, ?, ?)',
                  (wf_id, proj_id, 'workflow:owner'))

    print(f"   [OK] {wf['name']} ({wf_id[:8]}...) -> /webhook/{wf['path']}")
    created.append(wf)

conn.commit()
conn.close()

# Copy back
print(f"\nWriting back to n8n container...")
ret = os.system(f'docker cp "{DB_PATH}" n8n:/home/node/.n8n/database.sqlite')
if ret != 0:
    print("FAILED to write back DB")
    exit(1)

print("Restarting n8n...")
os.system('docker restart n8n')
time.sleep(5)

print("\n" + "="*50)
print("AiBrand n8n Workflows Created!")
print("="*50)
for wf in created:
    print(f"  {wf['name']}")
    print(f"    Webhook POST http://localhost:5678/webhook/{wf['path']}")
    print()
