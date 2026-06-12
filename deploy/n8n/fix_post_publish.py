import requests, json as j, uuid

BASE = 'http://localhost:5678'
resp = requests.post(f'{BASE}/rest/login', json={'emailOrLdapLoginId':'admin@aibrand.ai','password':'aibrand2026'})
auth = resp.headers.get('Set-Cookie','').split('n8n-auth=')[1].split(';')[0]
H = {'Content-Type':'application/json','Cookie':f'n8n-auth={auth}'}

# Delete old Post-Publish
r = requests.get(f'{BASE}/rest/workflows', headers=H)
for w in r.json().get('data', []):
    if 'Post-Publish' in w['name']:
        requests.delete(f'{BASE}/rest/workflows/{w["id"]}', headers=H)
        print(f'Deleted: {w["name"]}')

ts = str(uuid.uuid4())[:8]
path = f'dify-pp-{ts}'

# Build JSON body with proper $ escaping for n8n expressions
# In Python, \$ becomes $ (backslash-dollar is not a recognized escape, so Python keeps both)
# json.dumps will escape the backslash: \$ -> \\$
# n8n receives \\$ and interprets it as \$, which then becomes $ in the template
# Actually simpler: just use json.dumps and let it handle the escaping

wf_dict = {
    'name': 'AiBrand - Post-Publish Tracking v3',
    'active': False,
    'nodes': [
        {
            'id': str(uuid.uuid4()),
            'name': 'Webhook',
            'type': 'n8n-nodes-base.webhook',
            'position': [250, 300],
            'typeVersion': 1,
            'parameters': {
                'httpMethod': 'POST',
                'path': 'aibrand/post-publish-tracking',
                'responseMode': 'lastNode'
            },
            'webhookId': str(uuid.uuid4())
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Format Query',
            'type': 'n8n-nodes-base.code',
            'position': [600, 300],
            'typeVersion': 2,
            'parameters': {
                'jsCode': (
                    'const input = $input.first().json;\n'
                    'const body = input.body || input;\n'
                    'const contentId = body.content_id || "未知";\n'
                    'const platform = body.platform || "未知平台";\n'
                    '\n'
                    'return {\n'
                    '  content_id: contentId,\n'
                    '  platform: platform,\n'
                    '  query: "请对发布内容进行效果追踪分析：\\n- 内容ID：" + contentId + "\\n- 平台：" + platform + "\\n\\n请分析：1)预估传播效果 2)建议优化方向 3)后续互动策略"\n'
                    '};'
                )
            }
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Dify AI Analysis',
            'type': 'n8n-nodes-base.httpRequest',
            'position': [950, 300],
            'typeVersion': 3,
            'parameters': {
                'method': 'POST',
                'url': 'http://host.docker.internal:5001/v1/chat-messages',
                'authentication': 'none',
                'sendHeaders': True,
                'headerParameters': {
                    'parameters': [
                        {'name': 'Content-Type', 'value': 'application/json'},
                        {'name': 'Authorization', 'value': 'Bearer app-yyqOFelScAqYi3v55LrEVKAB'}
                    ]
                },
                'sendBody': True,
                'specifyBody': 'json',
                'jsonBody': (
                    '{'
                    '"inputs":{},'
                    '"query":"={{ $json.query }}",'
                    '"response_mode":"blocking",'
                    '"user":"={{ $json.body.user || \\"n8n-auto\\" }}",'
                    '"conversation_id":""'
                    '}'
                ),
                'options': {'timeout': 60000}
            }
        }
    ],
    'connections': {
        'Webhook': {'main': [[{'node': 'Format Query', 'type': 'main', 'index': 0}]]},
        'Format Query': {'main': [[{'node': 'Dify AI Analysis', 'type': 'main', 'index': 0}]]}
    },
    'settings': {}
}

wf_json = j.dumps(wf_dict, ensure_ascii=False)

# Verify key content
print(f'Has $input in code: {"$input" in wf_json}')
print(f'Has $json in body: {"$json" in wf_json}')
# Show the jsonBody in JSON
import re
m = re.search(r'"jsonBody":"[^"]+"', wf_json)
if m:
    print(f'jsonBody in JSON: {m.group()[:250]}')

r = requests.post(f'{BASE}/rest/workflows', data=wf_json.encode('utf-8'), headers=H)
if r.ok:
    d = r.json().get('data', r.json())
    wf_id = d['id']
    requests.patch(f'{BASE}/rest/workflows/{wf_id}', json={'active': True}, headers=H)
    print(f'\nCreated: {wf_id}')

    # Verify what n8n saved
    r2 = requests.get(f'{BASE}/rest/workflows/{wf_id}', headers=H)
    saved = r2.json().get('data', r2.json())
    for n in saved['nodes']:
        if n['type'] == 'n8n-nodes-base.httpRequest':
            saved_body = n['parameters'].get('jsonBody', '?')
            print(f'Saved jsonBody: {saved_body[:250]}')
            print(f'Has $json in saved: {"$json" in saved_body}')
        if n['type'] == 'n8n-nodes-base.code':
            saved_code = n['parameters'].get('jsCode', '?')
            print(f'Saved code start: {saved_code[:100]}')
            print(f'Has input in saved: {"input" in saved_code}')

    # TEST
    print('\n=== E2E TEST ===')
    t = requests.post(f'{BASE}/webhook/aibrand/post-publish-tracking',
        json={'content_id': 'final-abc-123', 'platform': 'xiaohongshu'},
        timeout=90)
    print(f'Status: {t.status_code}')
    if t.ok:
        result = t.json()
        if 'answer' in result:
            print(f'Dify AI Analysis:')
            print(result['answer'][:500])
        else:
            print(j.dumps(result, ensure_ascii=False)[:500])
    else:
        print(t.text[:300])
else:
    print(f'Create FAILED: {r.text[:300]}')
