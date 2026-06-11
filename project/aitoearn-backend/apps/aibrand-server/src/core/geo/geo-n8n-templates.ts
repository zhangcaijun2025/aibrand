/**
 * GEO n8n Workflow Templates — 自动化任务工作流定义
 *
 * 提供4个预置GEO工作流模板:
 * 1. platform-rule-scan:   平台地域规则定时扫描
 * 2. hotword-collect:      城市热词定时采集
 * 3. geo-health-report:    GEO健康日报推送
 * 4. sentiment-counter:    舆情自动对冲
 */

export const GEO_N8N_TEMPLATES = {
  /* ── Template 1: 平台地域规则扫描 ── */
  'platform-rule-scan': {
    name: 'GEO平台地域规则扫描',
    description: '每12h扫描8大平台地域规则变更，检测到变更→存入MongoDB→触发进化引擎',
    schedule: '0 */12 * * *', // 每12小时
    nodes: [
      {
        type: 'n8n-nodes-base.scheduleTrigger',
        name: '每12小时触发',
        parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 12 }] } },
      },
      {
        type: 'n8n-nodes-base.httpRequest',
        name: '获取平台规则',
        parameters: {
          url: '={{$env.AIBRAND_BFF_URL}}/api/geo/region?platform=xhs',
          method: 'GET',
          options: { response: { responseFormat: 'json' } },
        },
      },
      {
        type: 'n8n-nodes-base.set',
        name: '检测变更',
        parameters: {
          values: {
            string: [{ name: 'hasChanges', value: '={{$json.data.some(r => new Date(r.lastVerified) < new Date(Date.now() - 12*3600000))}}' }],
          },
        },
      },
      {
        type: 'n8n-nodes-base.if',
        name: '有变更?',
        parameters: { conditions: { string: [{ value1: '={{$json.hasChanges}}', operation: 'equals', value2: 'true' }] } },
      },
      {
        type: 'n8n-nodes-base.httpRequest',
        name: '触发进化Tick',
        parameters: {
          url: '={{$env.AIBRAND_BFF_URL}}/api/evolution/status',
          method: 'POST',
          headers: { header: [{ name: 'Content-Type', value: 'application/json' }] },
          body: { body: { action: 'run_tick' } },
        },
      },
    ],
    webhookPath: '/webhook/geo-platform-scan',
  },

  /* ── Template 2: 城市热词采集 ── */
  'hotword-collect': {
    name: 'GEO城市热词采集',
    description: '每6h采集重点城市热门话题，过滤敏感词→存入Redis缓存',
    schedule: '0 */6 * * *',
    nodes: [
      {
        type: 'n8n-nodes-base.scheduleTrigger',
        name: '每6小时触发',
        parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 6 }] } },
      },
      {
        type: 'n8n-nodes-base.httpRequest',
        name: '获取热门话题',
        parameters: {
          url: '={{$env.AIBRAND_BFF_URL}}/api/geo/region?hot=1',
          method: 'GET',
        },
      },
      {
        type: 'n8n-nodes-base.set',
        name: '过滤敏感词',
        parameters: {
          keepOnlySet: { values: [
            { name: 'safeTopics', value: '={{$json.data.filter(t => !/违禁|敏感/.test(t.topic))}}' },
          ]},
        },
      },
      {
        type: 'n8n-nodes-base.httpRequest',
        name: '存入BFF',
        parameters: {
          url: '={{$env.AIBRAND_BFF_URL}}/api/geo/evolve',
          method: 'POST',
          headers: { header: [{ name: 'Content-Type', value: 'application/json' }] },
          body: { body: { action: 'feed_sentiment', count: '={{$json.safeTopics.length}}' } },
        },
      },
    ],
    webhookPath: '/webhook/geo-hotword-collect',
  },

  /* ── Template 3: GEO健康日报 ── */
  'geo-health-report': {
    name: 'GEO健康日报推送',
    description: '每日生成GeoHealth报告，通过IM推送给运营团队',
    schedule: '0 9 * * *', // 每天9点
    nodes: [
      {
        type: 'n8n-nodes-base.scheduleTrigger',
        name: '每日9点',
        parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 24 }] } },
      },
      {
        type: 'n8n-nodes-base.httpRequest',
        name: '获取GeoHealth',
        parameters: {
          url: '={{$env.AIBRAND_BFF_URL}}/api/geo/health',
          method: 'GET',
        },
      },
      {
        type: 'n8n-nodes-base.set',
        name: '格式化报告',
        parameters: {
          values: {
            string: [
              { name: 'report', value: '=GEO健康日报\n\n综合分: {{$json.data.overall}}/100\nDS引擎: {{$json.data.dsHealth.score}}\n小豆引擎: {{$json.data.localHealth.score}}\n趋势: {{$json.data.trend}}\n\nAI提及率: {{$json.data.dsHealth.aiMentionRate}}%\nGEO均分: {{$json.data.localHealth.geoScoreAvg}}\nPOI准确率: {{$json.data.localHealth.tagPoiAccuracy}}%' },
            ],
          },
        },
      },
      {
        type: 'n8n-nodes-base.httpRequest',
        name: '推送IM',
        parameters: {
          url: '={{$env.AIBRAND_BFF_URL}}/api/agent/push',
          method: 'POST',
          headers: { header: [{ name: 'Content-Type', value: 'application/json' }] },
          body: { body: { target: 'wechat', title: 'GEO健康日报', content: '={{$json.report}}' } },
        },
      },
    ],
    webhookPath: '/webhook/geo-health-report',
  },

  /* ── Template 4: 舆情自动对冲 ── */
  'sentiment-counter': {
    name: 'GEO舆情自动对冲',
    description: '检测到高严重度负面舆情→自动生成正面内容→发布对冲',
    schedule: '0 */1 * * *', // 每小时
    nodes: [
      {
        type: 'n8n-nodes-base.scheduleTrigger',
        name: '每小时触发',
        parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
      },
      {
        type: 'n8n-nodes-base.httpRequest',
        name: '获取告警',
        parameters: {
          url: '={{$env.AIBRAND_BFF_URL}}/api/geo/sentiment?alerts=1',
          method: 'GET',
        },
      },
      {
        type: 'n8n-nodes-base.if',
        name: '有待处理告警?',
        parameters: { conditions: { number: [{ value1: '={{$json.total}}', operation: 'larger', value2: 0 }] } },
      },
      {
        type: 'n8n-nodes-base.httpRequest',
        name: '执行内容对冲',
        parameters: {
          url: '={{$env.AIBRAND_BFF_URL}}/api/geo/sentiment',
          method: 'POST',
          headers: { header: [{ name: 'Content-Type', value: 'application/json' }] },
          body: { body: { action: 'counter', eventId: '={{$json.data[0].id}}' } },
        },
      },
    ],
    webhookPath: '/webhook/geo-sentiment-counter',
  },
}

/** 导出为 n8n 可导入的 JSON */
export function exportN8nTemplates() {
  return Object.entries(GEO_N8N_TEMPLATES).map(([id, template]) => ({
    id,
    name: template.name,
    description: template.description,
    schedule: template.schedule,
    webhookPath: template.webhookPath,
    nodeCount: template.nodes.length,
  }))
}
