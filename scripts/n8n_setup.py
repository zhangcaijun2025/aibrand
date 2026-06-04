#!/usr/bin/env python3
"""Create AiBrand n8n workflows directly in SQLite database"""

import sqlite3, json, uuid, time, shutil, os

DB = '/home/node/.n8n/database.sqlite'
DB_LOCAL = os.path.join(os.environ.get('TEMP', '/tmp'), 'n8n-workflow-setup.sqlite')

# Copy DB from container
print('[COPY] Copying n8n database...')
os.system(f'docker cp n8n:{DB} "{DB_LOCAL}"')
print(f'   Local copy: {DB_LOCAL} ({os.path.getsize(DB_LOCAL)} bytes)')

conn = sqlite3.connect(DB_LOCAL)
c = conn.cursor()

# Get current user ID
c.execute('SELECT id, email FROM user LIMIT 1')
user = c.fetchone()
if not user:
    print('[FAIL] No user found in n8n DB')
    exit(1)
user_id, user_email = user
print(f'[USER] {user_email} (ID: {user_id})')

# ── Workflow definitions ──
now = int(time.time() * 1000)
workflows = [
    {
        'name': 'AiBrand - 竞品内容抓取',
        'webhook_path': 'aibrand/competitor-analysis',
        'active': True,
        'description': '定时抓取竞品账号的爆款内容，分析标题/标签/互动数据，更新到Dify知识库',
    },
    {
        'name': 'AiBrand - 热搜话题抓取',
        'webhook_path': 'aibrand/trending-topics',
        'active': True,
        'description': '每小时抓取美妆/科技/教育行业热搜话题，更新选题数据库',
    },
    {
        'name': 'AiBrand - 发布后数据回收',
        'webhook_path': 'aibrand/post-publish-tracking',
        'active': True,
        'description': '内容发布后48小时自动拉取平台数据（阅读/互动/转化），生成效果报告',
    },
    {
        'name': 'AiBrand - 账号健康检查',
        'webhook_path': 'aibrand/account-health-check',
        'active': True,
        'description': '定时检测所有已连接社交账号的OAuth状态，失效自动通知用户重连',
    },
]

created = []
for wf in workflows:
    wf_id = str(uuid.uuid4())
    wf_data = {
        'name': wf['name'],
        'active': wf['active'],
        'nodes': [
            {
                'parameters': {
                    'httpMethod': 'POST',
                    'path': wf['webhook_path'],
                    'responseMode': 'responseNode',
                    'options': {}
                },
                'id': str(uuid.uuid4()),
                'name': 'Webhook',
                'type': 'n8n-nodes-base.webhook',
                'typeVersion': 2,
                'position': [250, 300]
            },
            {
                'parameters': {
                    'jsCode': f'// {wf["description"]}\nconst data = $input.first().json;\nreturn {{processed: true, webhook: "{wf["webhook_path"]}", receivedAt: new Date().toISOString(), payload: data}};'
                },
                'id': str(uuid.uuid4()),
                'name': 'ProcessInput',
                'type': 'n8n-nodes-base.code',
                'typeVersion': 2,
                'position': [640, 300]
            },
            {
                'parameters': {
                    'respondWith': 'json',
                    'responseBody': '={{ $json }}'
                },
                'id': str(uuid.uuid4()),
                'name': 'Respond',
                'type': 'n8n-nodes-base.respondToWebhook',
                'typeVersion': 1,
                'position': [1040, 300]
            }
        ],
        'connections': {
            'Webhook': {
                'main': [[
                    {'node': 'ProcessInput', 'type': 'main', 'index': 0}
                ]]
            },
            'ProcessInput': {
                'main': [[
                    {'node': 'Respond', 'type': 'main', 'index': 0}
                ]]
            }
        },
        'settings': {'saveExecutionProgress': True, 'saveManualExecutions': True, 'callerPolicy': 'workflowsFromSameOwner'},
        'versionId': str(uuid.uuid4()),
    }

    # Insert workflow
    c.execute('''INSERT INTO workflow_entity
        (id, name, active, nodes, connections, settings, "versionId", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (wf_id, wf['name'], 1 if wf['active'] else 0,
         json.dumps(wf_data['nodes']), json.dumps(wf_data['connections']),
         json.dumps(wf_data['settings']), wf_data['versionId'],
         str(now), str(now)))

    # Create shared record
    share_id = str(uuid.uuid4())
    c.execute('INSERT INTO shared_workflow (workflowId, projectId, role, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)',
              (wf_id, user_id, 'workflow:owner', str(now), str(now)))

    created.append({'name': wf['name'], 'id': wf_id, 'path': wf['webhook_path']})
    print(f'   [OK] {wf["name"]} (ID: {wf_id[:8]}...)')

conn.commit()
conn.close()

# Copy back to container
print(f'\n[SAVE] Writing back to n8n container...')
os.system(f'docker cp "{DB_LOCAL}" n8n:{DB}')
print('[DONE] Restarting n8n...')
os.system('docker restart n8n')

time.sleep(3)
print('\n=== AiBrand n8n Workflows Created ===')
for wf in created:
    print(f'  {wf["name"]}')
    print(f'    Webhook: POST http://localhost:5678/webhook/{wf["path"]}')
    print()
