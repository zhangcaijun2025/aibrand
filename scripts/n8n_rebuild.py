import sqlite3, json, uuid, os, time

DB_PATH = os.path.join(os.environ['TEMP'], 'n8n-final.sqlite')
os.system(f'docker cp n8n:/home/node/.n8n/database.sqlite "{DB_PATH}"')

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

now_str = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
c.execute("SELECT id FROM project LIMIT 1")
proj_id = c.fetchone()[0]

# Dify API key for Content Factory app
DIFY_KEY = 'app-yyqOFelScAqYi3v55LrEVKAB'
DIFY_V1 = 'http://dify-nginx-1:80/v1/chat-messages'

def make_uuid():
    return str(uuid.uuid4())

def make_http_node(name, url, method='POST', body_params=None, auth_bearer=None, timeout=30000):
    node_id = make_uuid()
    params = {
        'method': method,
        'url': url,
        'options': {'timeout': timeout},
        'authentication': 'none',
        'sendHeaders': bool(auth_bearer),
        'sendBody': bool(body_params),
    }
    if auth_bearer:
        params['headerParameters'] = {'parameters': [
            {'name': 'Authorization', 'value': f'Bearer {auth_bearer}'},
            {'name': 'Content-Type', 'value': 'application/json'},
        ]}
    if body_params:
        params['bodyParameters'] = {'parameters': body_params}
    return {
        'parameters': params,
        'id': node_id,
        'name': name,
        'type': 'n8n-nodes-base.httpRequest',
        'typeVersion': 4,
        'position': [640, 300],
    }

def make_code_node(name, code, position=None):
    return {
        'parameters': {'jsCode': code, 'language': 'javaScript'},
        'id': make_uuid(),
        'name': name,
        'type': 'n8n-nodes-base.code',
        'typeVersion': 2,
        'position': position or [640, 300],
    }

def make_webhook_node(name, path, method='POST'):
    return {
        'parameters': {'httpMethod': method, 'path': path, 'options': {}, 'authentication': 'none'},
        'id': make_uuid(),
        'name': name,
        'type': 'n8n-nodes-base.webhook',
        'typeVersion': 2,
        'position': [250, 300],
    }

def make_schedule_node(name, cron_rule):
    return {
        'parameters': {'rule': {'interval': [{'expression': cron_rule, 'field': 'cronExpression'}]}},
        'id': make_uuid(),
        'name': name,
        'type': 'n8n-nodes-base.scheduleTrigger',
        'typeVersion': 1,
        'position': [250, 300],
    }

def make_if_node(name, condition):
    """condition: {left, op, right}"""
    return {
        'parameters': {
            'conditions': {
                'string': [{'value1': condition['left'], 'operation': condition['op'], 'value2': condition['right']}],
                'options': {'caseSensitive': True, 'leftValue': '', 'typeValidation': 'strict'} if condition['op'] == 'equal' else {},
            },
            'options': {},
        },
        'id': make_uuid(),
        'name': name,
        'type': 'n8n-nodes-base.if',
        'typeVersion': 2,
        'position': [1040, 300],
    }

def make_respond_node(name='Respond to Webhook'):
    return {
        'parameters': {'respondWith': 'json', 'responseBody': '={{ $json }}'},
        'id': make_uuid(),
        'name': name,
        'type': 'n8n-nodes-base.respondToWebhook',
        'typeVersion': 1,
        'position': [1450, 300],
    }

def delete_workflow(wf_id):
    c.execute('DELETE FROM workflow_entity WHERE id = ?', (wf_id,))
    c.execute('DELETE FROM shared_workflow WHERE workflowId = ?', (wf_id,))

def insert_workflow(name, nodes, connections, active=True, description=''):
    wf_id = make_uuid()
    version_id = make_uuid()
    c.execute('''INSERT INTO workflow_entity
        (id, name, active, nodes, connections, settings, "versionId", triggerCount, meta,
         "createdAt", "updatedAt", "versionCounter", description, "activeVersionId")
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (wf_id, name, 1 if active else 0,
         json.dumps(nodes), json.dumps(connections),
         json.dumps({'saveExecutionProgress': True, 'saveManualExecutions': True, 'callerPolicy': 'workflowsFromSameOwner'}),
         version_id, 0, '{}', now_str, now_str, 1, description, version_id))
    c.execute('INSERT INTO shared_workflow ("workflowId", "projectId", role, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)',
              (wf_id, proj_id, 'workflow:owner', now_str, now_str))
    return wf_id

# ── Delete old bare-bones AiBrand workflows ──
c.execute("SELECT id, name FROM workflow_entity WHERE name LIKE 'AiBrand%'")
old = c.fetchall()
for oid, oname in old:
    delete_workflow(oid)
    print(f"Deleted old: {oname}")

# ═══════════════════════════════════════════════════════
# 1. AiBrand - Competitor Analysis (6 nodes)
# ═══════════════════════════════════════════════════════
print("\n=== Building: Competitor Analysis ===")

wh = make_webhook_node('Webhook', 'aibrand/competitor-analysis')

# API call to fetch competitor data (real HTTP request)
fetch = make_http_node('Fetch Competitor Data',
    url='http://ai-data-service:4000/api/competitor/search',
    method='POST',
    body_params=[
        {'name': 'keywords', 'value': '={{ $json.keywords || $json.query || "" }}'},
        {'name': 'platforms', 'value': '={{ $json.platforms || "xhs,douyin" }}'},
        {'name': 'limit', 'value': '={{ $json.limit || 10 }}'},
        {'name': 'source', 'value': 'aibrand'},
    ],
    timeout=15000)

# Code to parse & structure
parse = make_code_node('Parse & Structure', '''const items = $input.all();
let allData = [];
items.forEach(batch => {
  const d = batch.json;
  if (Array.isArray(d)) allData.push(...d);
  else if (d.data && Array.isArray(d.data)) allData.push(...d.data);
  else if (d.posts) allData.push(...d.posts);
  else allData.push(d);
});

// Extract key fields & deduplicate
const seen = new Set();
let structured = allData
  .filter(item => {
    const key = item.url || item.id || item.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, 20)
  .map(item => ({
    platform: item.platform || 'unknown',
    title: item.title || '',
    author: item.author || item.creator || '',
    likes: parseInt(item.likes || item.like_count || 0),
    comments: parseInt(item.comments || item.comment_count || 0),
    shares: parseInt(item.shares || item.share_count || 0),
    engagement: parseInt(item.likes || 0) + parseInt(item.comments || 0) + parseInt(item.shares || 0),
    url: item.url || item.share_url || '',
    tags: Array.isArray(item.tags) ? item.tags.join(',') : (item.tags || ''),
    publishTime: item.publish_time || item.create_time || '',
    snippet: (item.content || item.desc || '').substring(0, 500),
  }))
  .sort((a, b) => b.engagement - a.engagement);

return [{ json: { competitors: structured, total: structured.length } }];''',
    position=[1040, 300])

# Call Dify to analyze
dify_analyze = make_http_node('Dify: Analyze Patterns',
    url='http://dify-nginx-1:80/v1/chat-messages',
    auth_bearer=DIFY_KEY,
    body_params=[
        {'name': 'inputs', 'value': '={}'},
        {'name': 'query', 'value': '=分析以下竞品内容数据，提取爆款规律：标题模式、标签策略、发布时机、互动特征。输出JSON格式的分析结论。数据：{{ JSON.stringify($json.competitors.slice(0,10)) }}'},
        {'name': 'response_mode', 'value': 'blocking'},
        {'name': 'user', 'value': 'aibrand-workflow'},
    ],
    timeout=60000)

# Code: format insights
insights = make_code_node('Format Insights Report', '''const input = $input.first().json;
const difyAnswer = input.answer || '';
const competitors = $('Parse & Structure').first().json.competitors || [];
const topPosts = competitors.slice(0, 5).map(c => ({
  platform: c.platform,
  title: c.title.substring(0, 80),
  engagement: c.engagement,
  url: c.url,
}));

let analysis = {};
try {
  const jsonMatch = difyAnswer.match(/\\{[\\s\\S]*\\}/);
  if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
} catch(e) {}

return [{
  json: {
    success: true,
    data: {
      competitors_scanned: competitors.length,
      top_posts: topPosts,
      patterns: analysis.patterns || analysis.takeaways || {},
      keywords: analysis.keywords || [],
      ai_insights: difyAnswer,
      recommended_actions: analysis.recommendations || [],
      generated_at: new Date().toISOString(),
    }
  }
}];''',
    position=[1450, 300])

resp1 = make_respond_node()

nodes1 = [wh, fetch, parse, dify_analyze, insights, resp1]
conns1 = {
    'Webhook': {'main': [[{'node': 'Fetch Competitor Data', 'type': 'main', 'index': 0}]]},
    'Fetch Competitor Data': {'main': [[{'node': 'Parse & Structure', 'type': 'main', 'index': 0}]]},
    'Parse & Structure': {'main': [[{'node': 'Dify: Analyze Patterns', 'type': 'main', 'index': 0}]]},
    'Dify: Analyze Patterns': {'main': [[{'node': 'Format Insights Report', 'type': 'main', 'index': 0}]]},
    'Format Insights Report': {'main': [[{'node': 'Respond to Webhook', 'type': 'main', 'index': 0}]]},
}
wf1_id = insert_workflow('AiBrand - Competitor Analysis', nodes1, conns1, True,
    'Multi-step: Webhook triggers competitor content scraping -> parses & ranks by engagement -> sends to Dify AI for pattern analysis -> returns structured insights with top posts & recommendations')
print(f"  Created: {wf1_id[:8]}... (6 nodes)")

# ═══════════════════════════════════════════════════════
# 2. AiBrand - Trending Topics (Schedule + Webhook)
# ═══════════════════════════════════════════════════════
print("\n=== Building: Trending Topics ===")

sched = make_schedule_node('Hourly Schedule', '0 */1 * * *')

fetch_trends = make_http_node('Fetch Trending Topics',
    url='http://ai-data-service:4000/api/trending/topics',
    method='GET',
    timeout=15000)

code_filter = make_code_node('Filter & Rank Topics', '''const items = $input.all();
let topics = [];
items.forEach(batch => {
  let d = batch.json;
  // Parse different API response formats
  if (d.data && Array.isArray(d.data)) topics.push(...d.data);
  else if (Array.isArray(d)) topics.push(...d);
  else if (d.topics) topics.push(...d.topics);
  else topics.push(d);
});

// Score & rank topics
const scored = topics
  .filter(t => t.title || t.topic || t.keyword)
  .map((t, i) => ({
    topic: t.title || t.topic || t.keyword,
    category: t.category || t.industry || 'general',
    heat_score: parseInt(t.heat || t.score || t.popularity || (100 - i * 5)),
    source: t.source || t.platform || 'unknown',
    trend_url: t.url || '',
  }))
  .sort((a, b) => b.heat_score - a.heat_score)
  .slice(0, 30);

return [{ json: { topics: scored, count: scored.length, fetched_at: new Date().toISOString() } }];''',
    position=[1040, 300])

dify_enrich = make_http_node('Dify: Enrich Topics',
    url='http://dify-nginx-1:80/v1/chat-messages',
    auth_bearer=DIFY_KEY,
    body_params=[
        {'name': 'inputs', 'value': '={}'},
        {'name': 'query', 'value': '=分析以下热搜话题，对每个话题评估与AiBrand（AI全域运营平台）的关联度（高/中/低），并给出内容创作建议。返回JSON。话题列表：{{ JSON.stringify($json.topics.slice(0,15)) }}'},
        {'name': 'response_mode', 'value': 'blocking'},
        {'name': 'user', 'value': 'aibrand-workflow'},
    ],
    timeout=60000)

code_format = make_code_node('Format Topic Report', '''const input = $input.first().json;
const difyAnswer = input.answer || '';
const topics = $('Filter & Rank Topics').first().json.topics || [];

let enriched = [];
try {
  const match = difyAnswer.match(/\\{[\\s\\S]*\\}/);
  if (match) {
    const parsed = JSON.parse(match[0]);
    enriched = (parsed.topics || parsed.recommendations || []).slice(0, 20);
  }
} catch(e) {}

// Merge original scores with Dify analysis
const result = topics.slice(0, 20).map(t => {
  const enrich = enriched.find(e => (e.topic || '').includes(t.topic.substring(0, 4))) || {};
  return { ...t, relevance: enrich.relevance || 'medium', content_angle: enrich.angle || enrich.suggestion || '', };
});

return [{
  json: {
    success: true,
    data: {
      topics: result,
      total_fetched: topics.length,
      ai_analyzed: enriched.length,
      generated_at: new Date().toISOString(),
    }
  }
}];''',
    position=[1450, 300])

wh2 = make_webhook_node('Manual Webhook', 'aibrand/trending-topics')

resp2 = make_respond_node()

nodes2 = [sched, wh2, fetch_trends, code_filter, dify_enrich, code_format, resp2]
conns2 = {
    'Hourly Schedule': {'main': [[{'node': 'Fetch Trending Topics', 'type': 'main', 'index': 0}]]},
    'Manual Webhook': {'main': [[{'node': 'Fetch Trending Topics', 'type': 'main', 'index': 0}]]},
    'Fetch Trending Topics': {'main': [[{'node': 'Filter & Rank Topics', 'type': 'main', 'index': 0}]]},
    'Filter & Rank Topics': {'main': [[{'node': 'Dify: Enrich Topics', 'type': 'main', 'index': 0}]]},
    'Dify: Enrich Topics': {'main': [[{'node': 'Format Topic Report', 'type': 'main', 'index': 0}]]},
    'Format Topic Report': {'main': [[{'node': 'Respond to Webhook', 'type': 'main', 'index': 0}]]},
}
wf2_id = insert_workflow('AiBrand - Trending Topics', nodes2, conns2, True,
    'Dual trigger (hourly cron + manual webhook): Fetches trending topics -> AI filters & ranks by heat -> Dify enriches with content angles -> Returns structured topic report with relevance scoring')
print(f"  Created: {wf2_id[:8]}... (7 nodes)")

# ═══════════════════════════════════════════════════════
# 3. AiBrand - Post-Publish Analytics
# ═══════════════════════════════════════════════════════
print("\n=== Building: Post-Publish Analytics ===")

wh3 = make_webhook_node('Webhook', 'aibrand/post-publish-tracking')

fetch_analytics = make_http_node('Fetch Platform Analytics',
    url='http://ai-data-service:4000/api/analytics/content',
    method='POST',
    body_params=[
        {'name': 'content_ids', 'value': '={{ JSON.stringify($json.content_ids || $json.contentIds || []) }}'},
        {'name': 'platforms', 'value': '={{ $json.platforms || "" }}'},
        {'name': 'source', 'value': 'aibrand'},
    ],
    timeout=20000)

code_metrics = make_code_node('Calculate Metrics', '''const items = $input.all();
let allAnalytics = [];
items.forEach(batch => {
  const d = batch.json;
  if (Array.isArray(d)) allAnalytics.push(...d);
  else if (d.analytics) allAnalytics.push(...d.analytics);
  else if (d.data) allAnalytics.push(...(Array.isArray(d.data) ? d.data : [d.data]));
  else allAnalytics.push(d);
});

// Calculate aggregated metrics
let totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0, totalEngagement = 0;
const byPlatform = {};

allAnalytics.forEach(item => {
  const views = parseInt(item.views || item.play_count || 0);
  const likes = parseInt(item.likes || 0);
  const comments = parseInt(item.comments || 0);
  const shares = parseInt(item.shares || 0);
  const engagement = likes + comments + shares;
  const platform = item.platform || 'unknown';

  totalViews += views;
  totalLikes += likes;
  totalComments += comments;
  totalShares += shares;
  totalEngagement += engagement;

  if (!byPlatform[platform]) byPlatform[platform] = { views: 0, likes: 0, comments: 0, shares: 0, engagement: 0, count: 0 };
  byPlatform[platform].views += views;
  byPlatform[platform].likes += likes;
  byPlatform[platform].comments += comments;
  byPlatform[platform].shares += shares;
  byPlatform[platform].engagement += engagement;
  byPlatform[platform].count += 1;
});

const avgEngagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : 0;

return [{
  json: {
    summary: { total_contents: allAnalytics.length, total_views: totalViews, total_likes: totalLikes, total_comments: totalComments, total_shares: totalShares, total_engagement: totalEngagement, avg_engagement_rate: avgEngagementRate + '%' },
    by_platform: byPlatform,
    raw_data: allAnalytics.slice(0, 50),
    calculated_at: new Date().toISOString(),
  }
}];''',
    position=[1040, 300])

dify_report = make_http_node('Dify: Performance Report',
    url='http://dify-nginx-1:80/v1/chat-messages',
    auth_bearer=DIFY_KEY,
    body_params=[
        {'name': 'inputs', 'value': '={}'},
        {'name': 'query', 'value': '=基于以下内容发布数据生成效果分析报告。总结亮点、问题及优化建议。数据：{{ JSON.stringify($json.summary) }}。按平台数据：{{ JSON.stringify($json.by_platform) }}'},
        {'name': 'response_mode', 'value': 'blocking'},
        {'name': 'user', 'value': 'aibrand-workflow'},
    ],
    timeout=60000)

code_report = make_code_node('Format Performance Report', '''const input = $input.first().json;
const difyAnswer = input.answer || '';
const summary = $('Calculate Metrics').first().json.summary;
const byPlatform = $('Calculate Metrics').first().json.by_platform;

return [{
  json: {
    success: true,
    data: {
      summary: summary,
      by_platform: byPlatform,
      ai_report: difyAnswer,
      top_content: $('Calculate Metrics').first().json.raw_data.sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 3),
      generated_at: new Date().toISOString(),
    }
  }
}];''',
    position=[1450, 300])

resp3 = make_respond_node()

nodes3 = [wh3, fetch_analytics, code_metrics, dify_report, code_report, resp3]
conns3 = {
    'Webhook': {'main': [[{'node': 'Fetch Platform Analytics', 'type': 'main', 'index': 0}]]},
    'Fetch Platform Analytics': {'main': [[{'node': 'Calculate Metrics', 'type': 'main', 'index': 0}]]},
    'Calculate Metrics': {'main': [[{'node': 'Dify: Performance Report', 'type': 'main', 'index': 0}]]},
    'Dify: Performance Report': {'main': [[{'node': 'Format Performance Report', 'type': 'main', 'index': 0}]]},
    'Format Performance Report': {'main': [[{'node': 'Respond to Webhook', 'type': 'main', 'index': 0}]]},
}
wf3_id = insert_workflow('AiBrand - Post-Publish Analytics', nodes3, conns3, True,
    'Content ID input -> Fetches platform analytics -> Calculates metrics by platform -> Dify AI generates performance report -> Returns structured report with insights')
print(f"  Created: {wf3_id[:8]}... (6 nodes)")

# ═══════════════════════════════════════════════════════
# 4. AiBrand - Account Health Monitor
# ═══════════════════════════════════════════════════════
print("\n=== Building: Account Health Monitor ===")

sched4 = make_schedule_node('Daily Schedule', '0 8 * * *')

fetch_accounts = make_http_node('Fetch Connected Accounts',
    url='http://ai-data-service:4000/api/accounts/status',
    method='GET',
    timeout=15000)

code_check = make_code_node('Check Account Health', '''const items = $input.all();
let accounts = [];
items.forEach(batch => {
  const d = batch.json;
  if (Array.isArray(d)) accounts.push(...d);
  else if (d.accounts) accounts.push(...d.accounts);
  else if (d.data) accounts.push(...d.data);
  else accounts.push(d);
});

const now = new Date();
const results = accounts.map(acc => {
  const expiryDate = acc.token_expiry || acc.expires_at || acc.expireTime;
  const isExpired = expiryDate ? new Date(expiryDate) < now : false;
  const daysRemaining = expiryDate ? Math.floor((new Date(expiryDate) - now) / (1000 * 60 * 60 * 24)) : null;
  let status = 'healthy';
  if (isExpired) status = 'expired';
  else if (daysRemaining !== null && daysRemaining < 7) status = 'expiring_soon';
  else if (acc.status === 'error' || acc.status === 'disabled') status = 'error';

  return {
    account_id: acc.id || acc.account_id,
    platform: acc.platform || acc.plat_type,
    account_name: acc.name || acc.account_name || acc.username || '',
    status: status,
    token_expiry: expiryDate,
    days_remaining: daysRemaining,
    last_active: acc.last_active || acc.last_sync,
    error_message: acc.error || acc.message || '',
  };
});

const unhealthy = results.filter(r => r.status !== 'healthy');
const expired = results.filter(r => r.status === 'expired');
const expiring = results.filter(r => r.status === 'expiring_soon');

return [{
  json: {
    total_accounts: accounts.length,
    healthy: results.length - unhealthy.length,
    expiring_soon: expiring.length,
    expired: expired.length,
    accounts: results,
    needs_attention: unhealthy,
    alerts: expired.map(a => `${a.platform}账号"${a.account_name}"令牌已过期，请重新授权`),
    checked_at: new Date().toISOString(),
  }
}];''',
    position=[1040, 300])

if_node = make_if_node('Any Issues?', {'left': '={{ $json.expired + $json.expiring_soon }}', 'op': 'greater', 'right': '0'})

# Fix the IF condition to use number comparison
if_node['parameters']['conditions'] = {
    'number': [{'value1': '={{ $json.expired + $json.expiring_soon }}', 'operation': 'greater', 'value2': 0}]
}

dify_alert = make_http_node('Dify: Generate Alert Message',
    url='http://dify-nginx-1:80/v1/chat-messages',
    auth_bearer=DIFY_KEY,
    body_params=[
        {'name': 'inputs', 'value': '={}'},
        {'name': 'query', 'value': '=以下账号需要关注，生成友好的用户通知消息：{{ JSON.stringify($json.alerts) }}。{{ JSON.stringify($json.needs_attention) }}'},
        {'name': 'response_mode', 'value': 'blocking'},
        {'name': 'user', 'value': 'aibrand-workflow'},
    ],
    timeout=60000)

code_alert = make_code_node('Format Alert', '''const input = $input.first().json;
const health = $('Check Account Health').first().json;
const difyMsg = input.answer || '';

return [{
  json: {
    success: true,
    data: {
      summary: { total: health.total_accounts, healthy: health.healthy, expiring: health.expiring_soon, expired: health.expired },
      alerts: health.alerts,
      ai_notification: difyMsg,
      details: health.needs_attention,
      generated_at: new Date().toISOString(),
    }
  }
}];''',
    position=[1450, 300])

code_no_issues = make_code_node('All Healthy Report', '''const health = $('Check Account Health').first().json;
return [{
  json: {
    success: true,
    data: {
      summary: { total: health.total_accounts, healthy: health.healthy, expiring: 0, expired: 0 },
      message: `所有${health.total_accounts}个账号状态正常`,
      generated_at: new Date().toISOString(),
    }
  }
}];''',
    position=[1040, 300])

wh4 = make_webhook_node('Manual Webhook', 'aibrand/account-health-check')
resp4 = make_respond_node()

nodes4 = [sched4, wh4, fetch_accounts, code_check, if_node, dify_alert, code_alert, code_no_issues, resp4]
conns4 = {
    'Daily Schedule': {'main': [[{'node': 'Fetch Connected Accounts', 'type': 'main', 'index': 0}]]},
    'Manual Webhook': {'main': [[{'node': 'Fetch Connected Accounts', 'type': 'main', 'index': 0}]]},
    'Fetch Connected Accounts': {'main': [[{'node': 'Check Account Health', 'type': 'main', 'index': 0}]]},
    'Check Account Health': {'main': [[{'node': 'Any Issues?', 'type': 'main', 'index': 0}]]},
    'Any Issues?': {
        'main': [
            [{'node': 'Dify: Generate Alert Message', 'type': 'main', 'index': 0}],
            [{'node': 'All Healthy Report', 'type': 'main', 'index': 0}],
        ]
    },
    'Dify: Generate Alert Message': {'main': [[{'node': 'Format Alert', 'type': 'main', 'index': 0}]]},
    'Format Alert': {'main': [[{'node': 'Respond to Webhook', 'type': 'main', 'index': 0}]]},
    'All Healthy Report': {'main': [[{'node': 'Respond to Webhook', 'type': 'main', 'index': 0}]]},
}
wf4_id = insert_workflow('AiBrand - Account Health Monitor', nodes4, conns4, True,
    'Daily cron + manual webhook: Fetches all connected social accounts -> checks OAuth expiry -> IF issues found: Dify generates user-friendly alert -> Returns health report. IF all healthy: returns OK status')
print(f"  Created: {wf4_id[:8]}... (9 nodes)")

# ── Save ──
conn.commit()
conn.close()

# Copy back
print("\nWriting back to n8n container...")
os.system(f'docker cp "{DB_PATH}" n8n:/home/node/.n8n/database.sqlite')
print("Restarting n8n...")
os.system('docker restart n8n')
time.sleep(5)
print("\nDone! 4 fully functional workflows created.")
