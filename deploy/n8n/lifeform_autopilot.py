"""
Phase 6: Content Lifeform Auto-Pilot
Cron-triggered autonomous content generation using the super pipeline
"""
import requests, json as j, uuid, time

BASE = 'http://localhost:5678'
resp = requests.post(f'{BASE}/rest/login', json={'emailOrLdapLoginId': 'admin@aibrand.ai', 'password': 'aibrand2026'})
auth = resp.headers.get('Set-Cookie','').split('n8n-auth=')[1].split(';')[0]
H = {'Content-Type': 'application/json', 'Cookie': f'n8n-auth={auth}'}

ts = str(uuid.uuid4())[:8]
path = f'lifeform-{ts}'

# The lifeform code - wakes up, decides what to create, generates it
code = """// Content Lifeform — Autonomous Daily Content Pilot
const topics = [
  { topic: "AI内容创作新趋势", platform: "wechat", style: "tech" },
  { topic: "运营效率提升技巧", platform: "xiaohongshu", style: "fresh" },
  { topic: "品牌内容避坑指南", platform: "douyin", style: "warm" },
  { topic: "社交媒体增长策略", platform: "wechat", style: "minimal" },
  { topic: "本地生活探店推荐", platform: "xiaohongshu", style: "warm" },
];

// Pick topic based on day of week
const dayIdx = new Date().getDay() % topics.length;
const pick = topics[dayIdx];

// Step 1: Generate copywriting
const llmResp = await this.helpers.httpRequest({
  method: "POST", url: "http://aibrand-litellm:4000/v1/chat/completions",
  headers: { "Content-Type": "application/json", "Authorization": "Bearer aibrand-litellm-key-2026" },
  body: { model: "qwen-turbo", messages: [{ role: "user", content: "为" + pick.platform + "写一篇关于《" + pick.topic + "》的优质内容，风格" + pick.style + "，150字内，含emoji和话题标签。" }], max_tokens: 400, temperature: 0.85 },
  json: true
});
const copywriting = llmResp.choices[0].message.content;

// Step 2: Generate cover via ComfyUI
const size = pick.platform === "xiaohongshu" ? "1728x2304" : pick.platform === "douyin" ? "1440x2560" : "2560x1440";
const coverPrompt = pick.platform + "封面图，" + pick.topic + "，" + pick.style + "风格，高级感，清晰中文标题，专业设计";

const submitResp = await this.helpers.httpRequest({
  method: "POST", url: "http://host.docker.internal:8188/prompt",
  headers: { "Content-Type": "application/json" },
  body: { prompt: { "1": { inputs: { api_url: "https://ark.cn-beijing.volces.com/api/v3/images/generations", api_key: "ark-cebfed59-1aa5-4f6d-b3f4-8a594653a621-7c688", prompt: coverPrompt, seed: Math.floor(Math.random() * 999999), model: "doubao-seedream-4-0-250828", size: size, use_custom_size: false, custom_width: 1024, custom_height: 1360, watermark: false, sequential_image_generation: "disabled", max_images: 1, optimize_prompt_mode: "standard" }, class_type: "VolcanoEngineAPINode" }, "2": { inputs: { filename_prefix: "aibrand_lifeform", images: ["1", 0] }, class_type: "SaveImage" } }, client_id: "lifeform_" + Date.now() },
  json: true
});

let coverUrl = null;
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 3000));
  const hist = await this.helpers.httpRequest({ method: "GET", url: "http://host.docker.internal:8188/history/" + submitResp.prompt_id, json: true });
  const entry = hist[submitResp.prompt_id];
  if (entry && entry.outputs) {
    for (const [nid, out] of Object.entries(entry.outputs)) {
      if (out.images && out.images[0]) {
        coverUrl = "http://host.docker.internal:8188/view?filename=" + out.images[0].filename + "&subfolder=" + (out.images[0].subfolder || "") + "&type=" + (out.images[0].type || "output");
        break;
      }
    }
    if (coverUrl) break;
  }
}

return { auto_generated: true, date: new Date().toISOString(), topic: pick.topic, platform: pick.platform, style: pick.style, copywriting: copywriting, coverUrl: coverUrl, promptId: submitResp.prompt_id, status: coverUrl ? "published" : "failed" };"""

wf = {
    'name': 'Lifeform - Daily Auto Content',
    'active': False,
    'nodes': [
        {'id': str(uuid.uuid4()), 'name': 'Daily Trigger (Cron)', 'type': 'n8n-nodes-base.webhook', 'position': [250, 300], 'typeVersion': 1,
         'parameters': {'httpMethod': 'POST', 'path': path, 'responseMode': 'lastNode'}, 'webhookId': str(uuid.uuid4())},
        {'id': str(uuid.uuid4()), 'name': 'Auto Pilot', 'type': 'n8n-nodes-base.code', 'position': [600, 300], 'typeVersion': 2,
         'parameters': {'jsCode': code}}
    ],
    'connections': {'Daily Trigger (Cron)': {'main': [[{'node': 'Auto Pilot', 'type': 'main', 'index': 0}]]}},
    'settings': {}
}

wf_json = j.dumps(wf, ensure_ascii=False)
r = requests.post(f'{BASE}/rest/workflows', data=wf_json.encode('utf-8'), headers=H)
d = r.json().get('data', r.json())
requests.patch(f'{BASE}/rest/workflows/{d["id"]}', json={'active': True}, headers=H)
print(f'Lifeform WF: {d["id"][:16]}... active=True path={path}')

# Quick test
print('\n=== Lifeform Auto-Pilot Test ===')
t = requests.post(f'{BASE}/webhook/{path}', json={}, timeout=300)
print(f'Status: {t.status_code}')
if t.ok:
    r = t.json()
    print(f'Auto: {r.get("auto_generated")}')
    print(f'Topic: {r.get("topic")}')
    print(f'Platform: {r.get("platform")}')
    print(f'Copywriting: {(r.get("copywriting","?"))[:100]}...')
    print(f'Cover: {(r.get("coverUrl","?"))[:80]}...')
    print(f'Status: {r.get("status")}')
else:
    print(t.text[:300])
