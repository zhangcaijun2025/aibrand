#!/usr/bin/env python3
"""AiBrand Dify 初始化（T02b 校正版）— 意图理解 Chatflow + 构图/光影/风格知识库

用法: python dify_auto_setup.py [--skip-kb]
说明: Dify 1.13 登录密码需 base64 编码（FieldEncryption），console API 需 Cookie+CSRF。
      知识库需 embedding 模型（默认跳过，待 key 可用后 --kb 启用）。
"""
import sys, os, io, json, base64, urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DIFY = 'http://localhost:5001'
EMAIL = 'admin@dify.ai'
PASSWORD = os.environ.get('DIFY_ADMIN_PASSWORD', '')
if not PASSWORD:
    sys.exit('请设置 DIFY_ADMIN_PASSWORD 环境变量（Dify 管理员密码），勿硬编码凭据')

SKIP_KB = '--skip-kb' in sys.argv

import http.cookiejar

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {'Content-Type': 'application/json'}
    # 附带已捕获的 cookie
    cookies = '; '.join(f'{c.name}={c.value}' for c in cj)
    if cookies:
        headers['Cookie'] = cookies
    # 从 cookie jar 取 access_token / csrf
    tok = next((c.value for c in cj if c.name == 'access_token'), None)
    csrf = next((c.value for c in cj if c.name == 'csrf_token'), None)
    if tok: headers['Authorization'] = f'Bearer {tok}'
    if csrf: headers['X-CSRF-Token'] = csrf
    r = urllib.request.Request(f'{DIFY}{path}', data=data, headers=headers, method=method)
    try:
        resp = opener.open(r, timeout=20)
        return resp.status, json.loads(resp.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or '{}')

def main():
    # 1. 登录（base64 密码）
    enc = base64.b64encode(PASSWORD.encode()).decode()
    code, j = req('POST', '/console/api/login', {'email': EMAIL, 'password': enc, 'remember_me': False})
    print(f'[LOGIN] {code}', '✅' if code == 200 else f'❌ {j}')
    if code != 200:
        sys.exit(1)

    # 2. 知识库（可选，需 embedding）
    created = []
    if not SKIP_KB:
        print('[KB] 创建知识库（需 embedding 模型配置）...')
        for name, desc in [
            ('构图规则库', '三分法/对称/引导线/框架/对角线构图规则'),
            ('光影理论库', '伦勃朗/蝴蝶/分割/环形/霓虹/逆光光影理论'),
            ('风格词典库', '赛博朋克/极简/蒸汽波/暗黑/国潮/复古/未来主义风格词条'),
        ]:
            code, j = req('POST', '/console/api/datasets', {
                'name': name, 'description': desc,
                'indexing_technique': 'high_quality', 'permission': 'only_me',
            })
            if code in (200, 201):
                created.append({'id': j.get('id'), 'name': name})
                print(f'  ✅ {name} ({j.get("id")})')
            else:
                print(f'  ⚠️ {name}: {code} {j.get("message", "")}')
    else:
        print('[KB] 跳过知识库（--skip-kb）')

    # 3. 意图理解 Chatflow
    print('[APP] 创建意图理解 Chatflow...')
    code, app = req('POST', '/console/api/apps', {
        'name': '意图理解', 'description': '智创中心意图解析：自然语言 → 结构化创作意图（T01）',
        'mode': 'chat', 'icon_type': 'emoji', 'icon': '🎯', 'icon_background': '#4F46E5',
    })
    if code not in (200, 201):
        print(f'  ❌ 应用创建失败: {code} {app}')
        sys.exit(1)
    app_id = app['id']
    print(f'  ✅ App: {app_id}')

    # 4. 模型配置（deepseek-v4-flash）
    print('[CONFIG] 配置模型 deepseek-v4-flash...')
    pre_prompt = ('你是 AiBrand 智创中心意图解析器。将用户创作需求解析为结构化 JSON，只输出 JSON。'
                  '字段: modality/subject/style/platform/quality/count/duration/hasAudio/ecommerceType/'
                  'subType/scene/lighting/color/composition/mood/consistencyRequired/confidence。'
                  'subType 取值: text2img|img2img|outpaint|inpaint|upscale|remove_bg|text2video|'
                  'img2video|video_edit|manhua_episode|product_suite|style_transfer|unknown。'
                  'subject 只保留核心对象，去掉风格/平台/质量修饰词。')
    code, j = req('POST', f'/console/api/apps/{app_id}/model-config', {
        'model': {'provider': 'langgenius/deepseek/deepseek', 'name': 'deepseek-v4-flash',
                  'mode': 'chat', 'completion_params': {'temperature': 0.1, 'max_tokens': 800}},
        'pre_prompt': pre_prompt, 'prompt_type': 'simple',
    })
    print(f'  {"✅" if code == 200 else "⚠️"} 模型配置: {code}')

    # 5. 关联知识库
    if created:
        req('POST', f'/console/api/apps/{app_id}/datasets', {'dataset_ids': [d["id"] for d in created]})
        print(f'  ✅ 关联 {len(created)} 个知识库')

    # 6. 生成 API Key
    print('[KEY] 生成应用 API Key...')
    code, j = req('POST', f'/console/api/apps/{app_id}/api-keys')
    key = (j.get('data') or [{}])[0].get('token') if isinstance(j.get('data'), list) else None
    print(f'  App Key: {key}')

    print('\n' + '=' * 50)
    print('[DONE] T02b 初始化完成')
    print(f'  应用 ID: {app_id}')
    print(f'  App Key: {key}')
    print(f'  .env.local DIFY_ACCESS_TOKEN={key}')
    print('=' * 50)

if __name__ == '__main__':
    main()
