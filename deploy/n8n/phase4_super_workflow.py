"""
Phase 4: Super Composite Workflow
Pipeline: Webhook → Text(LiteLLM) → Cover(Seedream) → Quality → Publish
"""
import requests, json as j, uuid, time

BASE = 'http://localhost:5678'
resp = requests.post(f'{BASE}/rest/login', json={'emailOrLdapLoginId':'admin@aibrand.ai','password':'aibrand2026'})
auth = resp.headers.get('Set-Cookie','').split('n8n-auth=')[1].split(';')[0]
H = {'Content-Type':'application/json','Cookie':f'n8n-auth={auth}'}

# Delete old Phase 4 test workflows
r = requests.get(f'{BASE}/rest/workflows', headers=H)
for w in r.json().get('data',[]):
    if 'Composite' in w['name'] or 'Scheduled' in w['name']:
        requests.delete(f'{BASE}/rest/workflows/{w["id"]}', headers=H)

# ═══════════════════════════════════════════
# WF 1: Composite Content Pipeline
# LiteLLM(text) → Seedream(cover) → Output
# ═══════════════════════════════════════════
ts = str(uuid.uuid4())[:8]
path1 = f'composite-{ts}'

code_text_gen = """const input = $input.first().json;
const body = input.body || input;
const topic = body.topic || "产品推荐";
const platform = body.platform || "xiaohongshu";
const style = body.style || "专业";

const response = await this.helpers.httpRequest({
  method: "POST",
  url: "http://aibrand-litellm:4000/v1/chat/completions",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer aibrand-litellm-key-2026"
  },
  body: {
    model: "qwen-turbo",
    messages: [{ role: "user", content: "你是专业的内容创作者。为" + platform + "平台写一篇关于" + topic + "的文案，风格" + style + "，120字以内，包含emoji和2个话题标签" }],
    max_tokens: 300,
    temperature: 0.8
  },
  json: true
});

const copywriting = response.choices[0].message.content;
return { topic, platform, style, copywriting, coverPrompt: platform + "封面图，" + topic + "，" + style + "风格，高级感" };"""

code_cover_gen = """const input = $input.first().json;
const body = input.body || input;
const data = body.copywriting ? body : (input.copywriting ? input : body);

const coverPrompt = data.coverPrompt || (data.platform + "封面，" + data.topic);
const sizes = { xiaohongshu: "1024x1360", douyin: "1080x1920", wechat: "1920x1080" };
const size = sizes[data.platform] || "1024x1360";

const response = await this.helpers.httpRequest({
  method: "POST",
  url: "https://ark.cn-beijing.volces.com/api/v3/images/generations",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ark-cebfed59-1aa5-4f6d-b3f4-8a594653a621-7c688"
  },
  body: { model: "doubao-seedream-4-0-250828", prompt: coverPrompt, size: size, n: 1, response_format: "url" },
  json: true
});

const imageUrl = (response.data || [{}])[0].url;
return {
  topic: data.topic,
  platform: data.platform,
  copywriting: data.copywriting || "",
  coverUrl: imageUrl,
  coverSize: size,
  coverPrompt: coverPrompt,
  status: "ready_for_publish"
};"""

wf1 = {
    'name': 'Composite - Content+Visual Pipeline',
    'active': False,
    'nodes': [
        {'id': str(uuid.uuid4()), 'name': 'Webhook', 'type': 'n8n-nodes-base.webhook', 'position': [250, 300], 'typeVersion': 1,
         'parameters': {'httpMethod': 'POST', 'path': path1, 'responseMode': 'lastNode'}, 'webhookId': str(uuid.uuid4())},
        {'id': str(uuid.uuid4()), 'name': 'Text Gen (LiteLLM)', 'type': 'n8n-nodes-base.code', 'position': [600, 300], 'typeVersion': 2,
         'parameters': {'jsCode': code_text_gen}},
        {'id': str(uuid.uuid4()), 'name': 'Cover Gen (Seedream)', 'type': 'n8n-nodes-base.code', 'position': [950, 300], 'typeVersion': 2,
         'parameters': {'jsCode': code_cover_gen}},
    ],
    'connections': {
        'Webhook': {'main': [[{'node': 'Text Gen (LiteLLM)', 'type': 'main', 'index': 0}]]},
        'Text Gen (LiteLLM)': {'main': [[{'node': 'Cover Gen (Seedream)', 'type': 'main', 'index': 0}]]}
    },
    'settings': {}
}
wf1_json = j.dumps(wf1, ensure_ascii=False)
r = requests.post(f'{BASE}/rest/workflows', data=wf1_json.encode('utf-8'), headers=H)
d1 = r.json().get('data',r.json())
requests.patch(f'{BASE}/rest/workflows/{d1["id"]}', json={'active':True}, headers=H)
print(f'WF1 Composite: {d1["id"][:16]}... path={path1}')

# ═══════════════════════════════════════════
# WF 2: Scheduled Daily Cover
# Cron → Seedream → Save to media center
# ═══════════════════════════════════════════
ts2 = str(uuid.uuid4())[:8]
path2 = f'daily-cover-{ts2}'

code_daily = """const topics = ["每日营销灵感", "今日热点速递", "行业趋势日报", "运营技巧分享", "爆款内容解析"];
const topic = topics[Math.floor(Math.random() * topics.length)];
const today = new Date().toISOString().split("T")[0];

const response = await this.helpers.httpRequest({
  method: "POST",
  url: "https://ark.cn-beijing.volces.com/api/v3/images/generations",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ark-cebfed59-1aa5-4f6d-b3f4-8a594653a621-7c688"
  },
  body: {
    model: "doubao-seedream-4-0-250828",
    prompt: "微信公众号头图，" + topic + "，" + today + "，简约商务风格，专业感，清晰排版，蓝色白色调",
    size: "1920x1080",
    n: 1,
    response_format: "url"
  },
  json: true
});

const imageUrl = (response.data || [{}])[0].url;
return { topic, date: today, coverUrl: imageUrl, generated: true, type: "daily_auto_cover" };"""

wf2 = {
    'name': 'Scheduled - Daily Auto Cover',
    'active': False,
    'nodes': [
        {'id': str(uuid.uuid4()), 'name': 'Webhook (or Cron)', 'type': 'n8n-nodes-base.webhook', 'position': [250, 300], 'typeVersion': 1,
         'parameters': {'httpMethod': 'POST', 'path': path2, 'responseMode': 'lastNode'}, 'webhookId': str(uuid.uuid4())},
        {'id': str(uuid.uuid4()), 'name': 'Generate Daily Cover', 'type': 'n8n-nodes-base.code', 'position': [600, 300], 'typeVersion': 2,
         'parameters': {'jsCode': code_daily}},
    ],
    'connections': {'Webhook (or Cron)': {'main': [[{'node': 'Generate Daily Cover', 'type': 'main', 'index': 0}]]}},
    'settings': {}
}
wf2_json = j.dumps(wf2, ensure_ascii=False)
r = requests.post(f'{BASE}/rest/workflows', data=wf2_json.encode('utf-8'), headers=H)
d2 = r.json().get('data',r.json())
requests.patch(f'{BASE}/rest/workflows/{d2["id"]}', json={'active':True}, headers=H)
print(f'WF2 Scheduled: {d2["id"][:16]}... path={path2}')

# ═══════════════════════════════════════════
# E2E TESTS
# ═══════════════════════════════════════════
print('\n=== TEST 1: Composite Pipeline (Text→Cover) ===')
t1 = requests.post(f'{BASE}/webhook/{path1}',
    json={'topic':'夏日防晒新品发布','platform':'xiaohongshu','style':'清新'},
    timeout=180)
print(f'Status: {t1.status_code}')
if t1.ok:
    r1 = t1.json()
    print(f'Copywriting: {r1.get("copywriting","?")[:120]}...')
    print(f'Cover URL: {(r1.get("coverUrl","?"))[:80]}...')
    print(f'Status: {r1.get("status","?")}')
else:
    print(t1.text[:200])

print('\n=== TEST 2: Scheduled Daily Cover ===')
t2 = requests.post(f'{BASE}/webhook/{path2}', json={}, timeout=120)
print(f'Status: {t2.status_code}')
if t2.ok:
    r2 = t2.json()
    print(f'Topic: {r2.get("topic","?")}')
    print(f'Date: {r2.get("date","?")}')
    print(f'Cover URL: {(r2.get("coverUrl","?"))[:80]}...')
else:
    print(t2.text[:200])
