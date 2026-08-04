import json

with open('/AstrBot/data/cmd_config.json', 'r', encoding='utf-8-sig') as f:
    cfg = json.load(f)

providers = cfg.get('provider', [])
provider_sources = cfg.get('provider_sources', [])

deepseek_provider = {
    'id': 'deepseek_default',
    'type': 'openai_chat_completion',
    'enable': True,
    'key': ['sk-ed55ee5109dd44e6940c3a4b63c527d7'],
    'api_base': 'https://api.deepseek.com',
    'model_config': {
        'deepseek-chat': {
            'name': 'DeepSeek Chat',
            'context_size': 131072,
            'max_tokens': 8192,
            'support_function_call': True,
            'support_image_input': False,
            'temperature': 0.7,
            'top_p': 0.9,
            'support_stream': True,
        },
    },
}

provider_source = {
    'id': 'deepseek_default',
    'type': 'openai_chat_completion',
    'key': 'sk-ed55ee5109dd44e6940c3a4b63c527d7',
    'api_base': 'https://api.deepseek.com',
    'model': ['deepseek-chat'],
}

existing_ids = [p.get('id') for p in providers]
if 'deepseek_default' not in existing_ids:
    providers.append(deepseek_provider)
    cfg['provider'] = providers

existing_source_ids = [p.get('id') for p in provider_sources]
if 'deepseek_default' not in existing_source_ids:
    provider_sources.append(provider_source)
    cfg['provider_sources'] = provider_sources

cfg.setdefault('provider_settings', {})
cfg['provider_settings']['default_provider_id'] = 'deepseek_default'

with open('/AstrBot/data/cmd_config.json', 'w', encoding='utf-8') as f:
    json.dump(cfg, f, ensure_ascii=False, indent=2)

total_p = len(cfg['provider'])
total_s = len(cfg['provider_sources'])
print('DeepSeek provider added. Providers: ' + str(total_p) + ', Sources: ' + str(total_s))
