#!/usr/bin/env python3
"""AiBrand Dify initialization — datasets + documents + agent app"""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests, json, base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding

DIFY = 'http://localhost:5001'
EMAIL = '2393162266@qq.com'
PASSWORD = 'admin123'

s = requests.Session()

# Step 1: Get RSA public key & encrypt password
print('[AUTH] Getting encryption key...')
r = s.get(f'{DIFY}/console/api/encryption', timeout=10)
if r.status_code != 200:
    print(f'[FAIL] Cannot get key: {r.status_code} {r.text[:200]}')
    exit(1)

pub_pem = r.json().get('public_key', '')
print(f'   Key: {len(pub_pem)} chars')

pub_key = serialization.load_pem_public_key(pub_pem.encode())
encrypted = pub_key.encrypt(PASSWORD.encode(), padding.PKCS1v15())
enc_pw = base64.b64encode(encrypted).decode()

# Step 2: Login
print('[LOGIN] Signing in...')
r = s.post(f'{DIFY}/console/api/login', json={
    'email': EMAIL,
    'password': enc_pw,
    'remember_me': True,
}, timeout=10)
print(f'   Status: {r.status_code}')
if r.status_code != 200:
    print(f'   [FAIL] {r.text[:200]}')
    exit(1)

# Step 3: Create datasets
datasets_def = [
    {
        'name': 'AiBrand 品牌知识库',
        'desc': '品牌故事、产品信息、话术风格、历史优质内容范例',
        'docs': [
            ('AiBrand 品牌介绍', 'AiBrand 是一家 AI 全域运营平台，帮助超级个体和中小企业实现 AI 驱动的全链路运营。核心功能：AI 内容创作（智能选题-多平台生成-质量检测）、多平台一键发布（覆盖14个主流平台）、智能客户互动（AI评论回复+企业微信接入）、全域数据洞察。品牌调性：年轻、专业、务实。'),
            ('内容创作最佳实践', '高质量内容标准：1.标题要有数字、悬念或利益点 2.开头3秒决定用户是否继续看 3.小红书图文500-800字最佳 4.视频脚本前3秒必须有钩子，15-60秒最佳 5.内容要有明确CTA 6.使用真实数据和案例支撑观点 7.适配平台调性。'),
        ]
    },
    {
        'name': '平台规则库',
        'desc': '小红书/抖音/B站/公众号违禁词、审核规则、广告法合规',
        'docs': [
            ('广告法合规要点', '广告法核心禁止词：绝对化用语（最/第一/唯一/独家/首选/顶级）、虚假宣传（效果承诺、前后对比造假）、医疗断言（治疗/治愈/根治）、投资承诺（保证收益/稳赚不赔）。建议用深受好评、值得一试替代绝对化表达。'),
            ('小红书内容规则', '小红书审核要点：禁止直接展示联系方式、医疗健康类需资质认证、金融类需持牌、禁止过度营销话术、内容需有真实使用体验。标签每篇3-5个。最佳发布时间：工作日12-14点/18-22点，周末10-14点/16-22点。'),
            ('抖音内容规则', '抖音审核要点：口播类视频需真人出镜或授权素材、禁止诱导互动、医疗金融内容需认证。推荐时长15-60秒。最佳发布时间：工作日7-9点/12-14点/18-22点。热门BGM和话题标签可提升曝光。'),
        ]
    },
    {
        'name': '行业趋势库',
        'desc': '美妆/科技/教育等行业热搜话题、竞品分析、季节性话题日历',
        'docs': []
    },
]

created = []

print('\n[DATA] Creating datasets...')
for ds in datasets_def:
    r = s.post(f'{DIFY}/console/api/datasets', json={
        'name': ds['name'], 'description': ds['desc'],
        'indexing_technique': 'high_quality', 'permission': 'all_team_members',
    }, timeout=15)
    if r.status_code in (200, 201):
        ds_id = r.json().get('id')
        print(f'   [OK] {ds["name"]} ({ds_id})')
        created.append({'id': ds_id, 'name': ds['name'], 'docs': ds['docs']})
    else:
        print(f'   [FAIL] {ds["name"]}: {r.status_code} {r.text[:80]}')

# Step 4: Upload documents
print('\n[DOC] Uploading documents...')
for ds in created:
    for doc_name, doc_text in ds['docs']:
        r = s.post(f'{DIFY}/console/api/datasets/{ds["id"]}/documents', json={
            'name': doc_name, 'text': doc_text,
            'indexing_technique': 'high_quality',
            'process_rule': {'mode': 'automatic'},
        }, timeout=15)
        state = '[OK]' if r.status_code in (200, 201) else f'[FAIL {r.status_code}]'
        print(f'   {state} [{ds["name"]}] {doc_name}')

# Step 5: Create app
print('\n[APP] Creating agent app...')
r = s.post(f'{DIFY}/console/api/apps', json={
    'name': 'AiBrand Content Factory',
    'description': '智能内容创作Agent：意图分析-选题研究-多平台生成-质量检测',
    'mode': 'chat', 'icon_type': 'emoji', 'icon': 'sparkles', 'icon_background': '#7C3AED',
}, timeout=15)
if r.status_code in (200, 201):
    app_id = r.json().get('id')
    print(f'   [OK] App ID: {app_id}')
else:
    print(f'   [FAIL] {r.status_code} {r.text[:200]}')
    exit(1)

# Step 6: Link datasets
print('[LINK] Linking datasets...')
dataset_ids = [d['id'] for d in created]
s.post(f'{DIFY}/console/api/apps/{app_id}/datasets', json={'dataset_ids': dataset_ids}, timeout=15)

# Step 7: Configure prompt
print('[CONFIG] Setting prompt...')
s.post(f'{DIFY}/console/api/apps/{app_id}/model-config', json={
    'pre_prompt': '你是 AiBrand 的内容策略专家。工作流程：1.理解用户意图（行业、目标、平台、调性）2.基于知识库提供选题建议 3.生成适配各平台的高质量内容 4.检测合规性和质量。核心原则：内容必须有用或有趣、适配平台调性、遵守广告法、用数据说话、保持专业务实品牌调性。需要时使用知识库检索。',
}, timeout=15)

# Summary
print('\n' + '='*50)
print('[DONE] AiBrand Dify initialized!')
print('='*50)
print(f'\nDatasets: {len(created)}')
for d in created: print(f'  - {d["name"]} ({d["id"]})')
print(f'\nApp ID: {app_id}')
print(f'URL: http://localhost:8082/app/{app_id}')
