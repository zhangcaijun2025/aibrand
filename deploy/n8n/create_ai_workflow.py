import requests
import json

BASE = "http://localhost:5678"

# 1. Login
resp = requests.post(f"{BASE}/rest/login", json={
    "emailOrLdapLoginId": "admin@aibrand.ai",
    "password": "aibrand2026"
})
print(f"Login: {resp.status_code}")

# Extract cookie from Set-Cookie header
set_cookie = resp.headers.get('Set-Cookie', '')
auth_val = set_cookie.split('n8n-auth=')[1].split(';')[0]
print(f"Auth: {auth_val[:30]}...")

# 2. Create workflow with manual Cookie header
wf = {
    "name": "AI LiteLLM - Hello World",
    "nodes": [
        {"id": "n1-trigger", "name": "When clicked, execute", "type": "n8n-nodes-base.manualTrigger", "position": [250, 300], "typeVersion": 1},
        {"id": "n2-ai", "name": "LiteLLM (qwen-turbo)", "type": "@n8n/n8n-nodes-langchain.openAi", "position": [600, 300], "typeVersion": 1,
         "parameters": {"model": "qwen-turbo", "options": {"baseURL": "http://aibrand-litellm:4000/v1", "temperature": 0.7, "maxTokens": 200}},
         "credentials": {"openAiApi": {"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "LiteLLM Gateway"}}}
    ],
    "connections": {"n1-trigger": {"main": [[{"node": "n2-ai", "type": "main", "index": 0}]]}},
    "settings": {}
}

headers = {
    "Content-Type": "application/json",
    "Cookie": f"n8n-auth={auth_val}"
}
resp2 = requests.post(f"{BASE}/rest/workflows", json=wf, headers=headers)
print(f"Workflow: {resp2.status_code}")
if resp2.ok:
    wf_id = resp2.json().get('id')
    print(f"Created: {resp2.json().get('name')} (ID: {wf_id[:16]}...)")

    # 3. Also create a webhook-based workflow for easy testing
    wf2 = {
        "name": "AI LiteLLM - Webhook Reply",
        "nodes": [
            {"id": "w1-webhook", "name": "Webhook", "type": "n8n-nodes-base.webhook", "position": [250, 300], "typeVersion": 1,
             "parameters": {"httpMethod": "POST", "path": "ai-reply", "responseMode": "lastNode"}},
            {"id": "w2-ai", "name": "AI Reply (qwen-turbo)", "type": "@n8n/n8n-nodes-langchain.openAi", "position": [600, 300], "typeVersion": 1,
             "parameters": {"model": "qwen-turbo", "options": {"baseURL": "http://aibrand-litellm:4000/v1", "temperature": 0.7, "maxTokens": 300}},
             "credentials": {"openAiApi": {"id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "name": "LiteLLM Gateway"}}}
        ],
        "connections": {"w1-webhook": {"main": [[{"node": "w2-ai", "type": "main", "index": 0}]]}},
        "settings": {}
    }

    resp3 = requests.post(f"{BASE}/rest/workflows", json=wf2, headers=headers)
    if resp3.ok:
        wf2_id = resp3.json().get('id')
        print(f"Created webhook: {resp3.json().get('name')} (ID: {wf2_id[:16]}...)")

        # Activate it
        resp4 = requests.patch(f"{BASE}/rest/workflows/{wf2_id}", json={"active": True}, headers=headers)
        print(f"Activated: {resp4.status_code}")
    else:
        print(f"Webhook failed: {resp3.text[:200]}")
else:
    print(f"Failed: {resp2.text[:300]}")
