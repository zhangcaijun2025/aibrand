"""
Sprint 4: Super Composite Workflow
Pipeline: Webhook → LiteLLM(text) → ComfyUI(cover) → Output
+ Multi-city GEO variant support
"""
import requests, json as j, uuid

BASE = 'http://localhost:5678'
resp = requests.post(f'{BASE}/rest/login', json={'emailOrLdapLoginId': 'admin@aibrand.ai', 'password': 'aibrand2026'})
auth = resp.headers.get('Set-Cookie','').split('n8n-auth=')[1].split(';')[0]
H = {'Content-Type': 'application/json', 'Cookie': f'n8n-auth={auth}'}

ts = str(uuid.uuid4())[:8]
path = f'super-{ts}'

code = """const input = $input.first().json;
const body = input.body || input;
const topic = body.topic || "产品推荐";
const platform = body.platform || "xiaohongshu";
const style = body.style || "fresh";
const cities = body.cities || [];

const styleMap = { fresh: "清新自然，浅色背景，柔和光线", luxury: "奢华高端，深色背景，金属质感", tech: "科技感，深蓝紫色调，霓虹光效", warm: "温暖舒适，暖黄灯光，日系治愈", minimal: "极简主义，大面积留白", guochao: "国潮风格，传统元素现代化" };
const sizes = { xiaohongshu: "1728x2304", douyin: "1440x2560", wechat: "2560x1440" };
const size = sizes[platform] || "1728x2304";

// Step 1: Generate copywriting via LiteLLM
const llmResp = await this.helpers.httpRequest({
  method: "POST", url: "http://aibrand-litellm:4000/v1/chat/completions",
  headers: { "Content-Type": "application/json", "Authorization": "Bearer aibrand-litellm-key-2026" },
  body: { model: "qwen-turbo", messages: [{ role: "user", content: "你是一个专业的内容创作者。为" + platform + "平台写一篇关于《" + topic + "》的种草文案，风格" + style + "。要求120字内，含2个emoji和2个话题标签。" }], max_tokens: 300, temperature: 0.8 },
  json: true
});
const copywriting = llmResp.choices[0].message.content || topic;

// Step 2: Extract visual keywords
const kwResp = await this.helpers.httpRequest({
  method: "POST", url: "http://aibrand-litellm:4000/v1/chat/completions",
  headers: { "Content-Type": "application/json", "Authorization": "Bearer aibrand-litellm-key-2026" },
  body: { model: "glm-4-flash", messages: [{ role: "user", content: "从以下文案中提取3个视觉关键词（只返回关键词，逗号分隔）：" + copywriting }], max_tokens: 50, temperature: 0.1 },
  json: true
});
const keywords = (kwResp.choices[0].message.content || topic).split(/[,，]/).slice(0, 3).join("，");

// Step 3: Build cover prompt
let coverPrompt = platform + "封面图，" + topic + "，" + (styleMap[style] || style) + "风格，" + size.split("x")[0] + "x" + size.split("x")[1] + "像素，高级感，清晰构图，关键词：" + keywords;

// Step 4: Generate covers - with or without GEO
const results = [];
const targetCities = cities.length > 0 ? cities : [null];

for (const city of targetCities) {
  let prompt = coverPrompt;
  if (city) {
    prompt = coverPrompt + "，城市" + city + "，本地化视觉风格";
  }

  const submitResp = await this.helpers.httpRequest({
    method: "POST", url: "http://host.docker.internal:8188/prompt",
    headers: { "Content-Type": "application/json" },
    body: { prompt: { "1": { inputs: { api_url: "https://ark.cn-beijing.volces.com/api/v3/images/generations", api_key: "ark-cebfed59-1aa5-4f6d-b3f4-8a594653a621-7c688", prompt: prompt, seed: Math.floor(Math.random() * 999999), model: "doubao-seedream-4-0-250828", size: size, use_custom_size: false, custom_width: 1024, custom_height: 1360, watermark: false, sequential_image_generation: "disabled", max_images: 1, optimize_prompt_mode: "standard" }, class_type: "VolcanoEngineAPINode" }, "2": { inputs: { filename_prefix: "aibrand_super", images: ["1", 0] }, class_type: "SaveImage" } }, client_id: "aibrand_super_" + Date.now() + "_" + (city || "default") },
    json: true
  });

  const promptId = submitResp.prompt_id;
  let imgUrl = null;

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const hist = await this.helpers.httpRequest({ method: "GET", url: "http://host.docker.internal:8188/history/" + promptId, json: true });
    const entry = hist[promptId];
    if (entry && entry.outputs) {
      for (const [nid, out] of Object.entries(entry.outputs)) {
        if (out.images && out.images[0]) {
          imgUrl = "http://host.docker.internal:8188/view?filename=" + out.images[0].filename + "&subfolder=" + (out.images[0].subfolder || "") + "&type=" + (out.images[0].type || "output");
          break;
        }
      }
      if (imgUrl) break;
    }
    if (entry && entry.status && entry.status.status_str === "error") break;
  }

  results.push({ city: city || "default", imageUrl: imgUrl, promptId: promptId, prompt: prompt });
}

return { topic, platform, style, copywriting, keywords, covers: results, totalCovers: results.length, status: "ready_to_publish" };"""

wf = {
    'name': 'Super Pipeline - Text+Cover+GEO',
    'active': False,
    'nodes': [
        {'id': str(uuid.uuid4()), 'name': 'Webhook', 'type': 'n8n-nodes-base.webhook', 'position': [250, 300], 'typeVersion': 1,
         'parameters': {'httpMethod': 'POST', 'path': path, 'responseMode': 'lastNode'}, 'webhookId': str(uuid.uuid4())},
        {'id': str(uuid.uuid4()), 'name': 'Full Pipeline', 'type': 'n8n-nodes-base.code', 'position': [600, 300], 'typeVersion': 2,
         'parameters': {'jsCode': code}}
    ],
    'connections': {'Webhook': {'main': [[{'node': 'Full Pipeline', 'type': 'main', 'index': 0}]]}},
    'settings': {}
}

wf_json = j.dumps(wf, ensure_ascii=False)
r = requests.post(f'{BASE}/rest/workflows', data=wf_json.encode('utf-8'), headers=H)
d = r.json().get('data', r.json())
requests.patch(f'{BASE}/rest/workflows/{d["id"]}', json={'active': True}, headers=H)
print(f'Super WF: {d["id"][:16]}... active=True path={path}')

# E2E TEST
print('\n=== E2E: LiteLLM → ComfyUI → Cover ===')
t = requests.post(f'{BASE}/webhook/{path}',
    json={'topic': '夏日防晒新品', 'platform': 'xiaohongshu', 'style': 'fresh'},
    timeout=300)
print(f'Status: {t.status_code}')
if t.ok:
    r = t.json()
    print(f'Copywriting: {(r.get("copywriting","?"))[:120]}...')
    print(f'Keywords: {r.get("keywords","?")}')
    covers = r.get('covers', [])
    for c in covers:
        print(f'Cover ({c["city"]}): {(c.get("imageUrl","?"))[:100]}...')
    print(f'Status: {r.get("status")}')
else:
    print(t.text[:400])

print('\n=== E2E: Multi-City GEO ===')
t2 = requests.post(f'{BASE}/webhook/{path}',
    json={'topic': '新品咖啡上市', 'platform': 'xiaohongshu', 'style': 'warm', 'cities': ['成都', '广州']},
    timeout=600)
print(f'Status: {t2.status_code}')
if t2.ok:
    r2 = t2.json()
    print(f'Copywriting: {(r2.get("copywriting","?"))[:100]}...')
    for c in r2.get('covers', []):
        ok = 'OK' if c.get('imageUrl') else 'FAIL'
        print(f'  {c["city"]}: {ok} | {(c.get("imageUrl","?"))[:80]}')
else:
    print(t2.text[:300])
