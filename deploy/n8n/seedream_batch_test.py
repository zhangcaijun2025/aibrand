import requests, json as j, uuid

BASE = 'http://localhost:5678'
resp = requests.post(f'{BASE}/rest/login', json={'emailOrLdapLoginId':'admin@aibrand.ai','password':'aibrand2026'})
auth = resp.headers.get('Set-Cookie','').split('n8n-auth=')[1].split(';')[0]
H = {'Content-Type':'application/json','Cookie':f'n8n-auth={auth}'}

ts = str(uuid.uuid4())[:8]
path = f'seedream-batch-{ts}'

code = """const input = $input.first().json;
const body = input.body || input;
const topic = body.topic || "产品推荐";
const style = body.style || "fresh";

const platforms = body.platforms || ["xiaohongshu","douyin","wechat"];

const promptMap = {
  xiaohongshu: "小红书封面图，{topic}，{style}风格，3:4竖版，高级感，留白设计，清晰中文标题",
  douyin: "抖音竖版视频封面，{topic}，{style}风格，9:16比例，大字标题，高对比度",
  wechat: "微信公众号头图，{topic}，{style}风格，16:9横版，简约商务，专业感",
};
const sizeMap = { xiaohongshu: "1024x1360", douyin: "1080x1920", wechat: "1920x1080" };

const styleMap = {
  fresh: "清新自然，浅色背景，柔和光线",
  luxury: "奢华高端，深色背景，金属质感",
  tech: "科技感，深蓝紫色调，霓虹光效",
  warm: "温暖舒适，暖黄灯光，日系治愈",
  minimal: "极简主义，大面积留白",
  guochao: "国潮风格，传统元素现代化，红金色调",
};

const results = {};
for (const plat of platforms) {
  try {
    const prompt = (promptMap[plat] || promptMap.xiaohongshu)
      .replace("{topic}", topic).replace("{style}", styleMap[style] || style);
    const response = await this.helpers.httpRequest({
      method: "POST",
      url: "https://ark.cn-beijing.volces.com/api/v3/images/generations",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer ark-cebfed59-1aa5-4f6d-b3f4-8a594653a621-7c688"
      },
      body: { model: "doubao-seedream-4-0-250828", prompt: prompt, size: sizeMap[plat] || "1024x1360", n: 1, response_format: "url" },
      json: true
    });
    results[plat] = { url: (response.data || [{}])[0].url, size: sizeMap[plat], status: "ok" };
  } catch(e) {
    results[plat] = { url: null, size: sizeMap[plat] || "?", status: "error", error: e.message };
  }
}
return { topic, style, covers: results, total: Object.keys(results).length };"""

wf = {
    'name': 'AI Seedream - Batch Cover Pack',
    'active': False,
    'nodes': [
        {
            'id': str(uuid.uuid4()), 'name': 'Webhook', 'type': 'n8n-nodes-base.webhook',
            'position': [250, 300], 'typeVersion': 1,
            'parameters': {'httpMethod': 'POST', 'path': path, 'responseMode': 'lastNode'},
            'webhookId': str(uuid.uuid4())
        },
        {
            'id': str(uuid.uuid4()), 'name': 'Generate Covers', 'type': 'n8n-nodes-base.code',
            'position': [600, 300], 'typeVersion': 2,
            'parameters': {'jsCode': code}
        }
    ],
    'connections': {'Webhook': {'main': [[{'node': 'Generate Covers', 'type': 'main', 'index': 0}]]}},
    'settings': {}
}

wf_json = j.dumps(wf, ensure_ascii=False)
r = requests.post(f'{BASE}/rest/workflows', data=wf_json.encode('utf-8'), headers=H)
d = r.json().get('data', r.json())
requests.patch(f'{BASE}/rest/workflows/{d["id"]}', json={'active': True}, headers=H)
print(f'Created: {d["id"][:16]}... path={path}')

# TEST sequential (3 calls since we can't parallel in n8n Code node)
test = requests.post(f'{BASE}/webhook/{path}',
    json={'topic': '新品咖啡上市', 'style': 'warm', 'platforms': ['xiaohongshu', 'douyin', 'wechat']},
    timeout=300)
print(f'Status: {test.status_code}')
if test.ok:
    r = test.json()
    covers = r.get('covers', {})
    for plat, info in covers.items():
        ok = 'OK' if info.get('status') == 'ok' else 'FAIL'
        url = (info.get('url', '')[:80]) if info.get('url') else 'N/A'
        print(f'  {plat:15s}: {ok} | {info.get("size", "?")} | {url}...')
    print(f'\nTotal covers: {r.get("total", 0)}')
else:
    print(test.text[:400])
