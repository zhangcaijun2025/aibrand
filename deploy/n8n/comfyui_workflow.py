import requests, json as j, uuid, time

BASE = 'http://localhost:5678'
resp = requests.post(f'{BASE}/rest/login', json={'emailOrLdapLoginId': 'admin@aibrand.ai', 'password': 'aibrand2026'})
auth = resp.headers.get('Set-Cookie','').split('n8n-auth=')[1].split(';')[0]
H = {'Content-Type': 'application/json', 'Cookie': f'n8n-auth={auth}'}

ts = str(uuid.uuid4())[:8]
path = f'comfyui-{ts}'

code = """const input = $input.first().json;
const body = input.body || input;
const topic = body.topic || "产品推荐";
const platform = body.platform || "xiaohongshu";
const style = body.style || "fresh";

const prompts = {
  xiaohongshu: "小红书封面图，${topic}，${style}风格，3:4竖版，高级感，留白设计，清晰中文标题",
  douyin: "抖音竖版视频封面，${topic}，${style}风格，9:16比例，大字标题，高对比度",
  wechat: "微信公众号头图，${topic}，${style}风格，16:9横版，简约商务，专业感"
};
const sizes = { xiaohongshu: "1728x2304", douyin: "1440x2560", wechat: "2560x1440" };

const styleMap = {
  fresh: "清新自然，浅色背景，柔和光线",
  luxury: "奢华高端，深色背景，金属质感",
  tech: "科技感，深蓝紫色调，霓虹光效",
  warm: "温暖舒适，暖黄灯光，日系治愈",
  minimal: "极简主义，大面积留白",
  guochao: "国潮风格，传统元素现代化"
};

const fullPrompt = (prompts[platform] || prompts.xiaohongshu).replace("${topic}", topic).replace("${style}", styleMap[style] || style);
const size = sizes[platform] || "1728x2304";

const submitResp = await this.helpers.httpRequest({
  method: "POST", url: "http://localhost:8188/prompt",
  headers: { "Content-Type": "application/json" },
  body: {
    prompt: { "1": { inputs: { api_url: "https://ark.cn-beijing.volces.com/api/v3/images/generations", api_key: "ark-cebfed59-1aa5-4f6d-b3f4-8a594653a621-7c688", prompt: fullPrompt, seed: Math.floor(Math.random() * 999999), model: "doubao-seedream-4-0-250828", size: size, use_custom_size: false, custom_width: 1024, custom_height: 1360, watermark: false, sequential_image_generation: "disabled", max_images: 1, optimize_prompt_mode: "standard" }, class_type: "VolcanoEngineAPINode" }, "2": { inputs: { filename_prefix: "aibrand_n8n", images: ["1", 0] }, class_type: "SaveImage" } },
    client_id: "aibrand_n8n_" + Date.now()
  }, json: true
});

const promptId = submitResp.prompt_id;

let imgFilename = null; let imgSubfolder = ""; let imgType = "output";
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 3000));
  const histResp = await this.helpers.httpRequest({ method: "GET", url: "http://localhost:8188/history/" + promptId, json: true });
  const entry = histResp[promptId];
  if (entry && entry.outputs) {
    for (const [nid, out] of Object.entries(entry.outputs)) {
      if (out.images && out.images[0]) {
        imgFilename = out.images[0].filename;
        imgSubfolder = out.images[0].subfolder || "";
        imgType = out.images[0].type || "output";
        break;
      }
    }
    if (imgFilename) break;
  }
  if (entry && entry.status && entry.status.status_str === "error") break;
}

return { topic, platform, prompt: fullPrompt, promptId, imageUrl: imgFilename ? "http://localhost:8188/view?filename=" + imgFilename + "&subfolder=" + imgSubfolder + "&type=" + imgType : null, status: imgFilename ? "success" : "error" };"""

wf = {
    'name': 'AI ComfyUI - Smart Cover (Volcano)',
    'active': False,
    'nodes': [
        {
            'id': str(uuid.uuid4()), 'name': 'Webhook', 'type': 'n8n-nodes-base.webhook',
            'position': [250, 300], 'typeVersion': 1,
            'parameters': {'httpMethod': 'POST', 'path': path, 'responseMode': 'lastNode'},
            'webhookId': str(uuid.uuid4())
        },
        {
            'id': str(uuid.uuid4()), 'name': 'ComfyUI Pipeline', 'type': 'n8n-nodes-base.code',
            'position': [600, 300], 'typeVersion': 2,
            'parameters': {'jsCode': code}
        }
    ],
    'connections': {'Webhook': {'main': [[{'node': 'ComfyUI Pipeline', 'type': 'main', 'index': 0}]]}},
    'settings': {}
}

wf_json = j.dumps(wf, ensure_ascii=False)
r = requests.post(f'{BASE}/rest/workflows', data=wf_json.encode('utf-8'), headers=H)
d = r.json().get('data', r.json())
requests.patch(f'{BASE}/rest/workflows/{d["id"]}', json={'active': True}, headers=H)
print(f'Created: {d["id"][:16]}... active=True path={path}')

# E2E TEST
print('\n=== E2E TEST: n8n → ComfyUI → Seedream 4.0 ===')
t = requests.post(f'{BASE}/webhook/{path}',
    json={'topic': '夏日护肤秘籍', 'platform': 'xiaohongshu', 'style': 'fresh'},
    timeout=300)
print(f'Status: {t.status_code}')
if t.ok:
    r = t.json()
    print(f'Topic: {r.get("topic")}')
    print(f'Prompt ID: {r.get("promptId")}')
    print(f'Image: {(r.get("imageUrl", "?"))[:120]}')
    print(f'Status: {r.get("status")}')
else:
    print(t.text[:400])
