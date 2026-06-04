/**
 * AiBrand Dify 知识库初始化脚本
 *
 * 使用方法：
 * 1. 在浏览器打开 http://localhost:8082 并登录
 * 2. 按 F12 打开开发者工具，切换到 Console 标签
 * 3. 粘贴本脚本全部内容，按 Enter 运行
 * 4. 脚本自动创建 3 个知识库 + 内容工厂 Agent 应用
 */

(async () => {
  const API = 'http://localhost:8082/console/api'

  async function post(path, body) {
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    })
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
    return r.json()
  }

  async function get(path) {
    const r = await fetch(`${API}${path}`, { credentials: 'include' })
    if (!r.ok) throw new Error(`${r.status}`)
    return r.json()
  }

  // ── Step 1: 创建知识库 ──
  console.log('📚 创建知识库...')

  const datasets = [
    { name: 'AiBrand 品牌知识库', desc: '品牌故事、产品信息、话术风格、历史优质内容范例' },
    { name: '平台规则库', desc: '小红书/抖音/B站/公众号违禁词、审核规则、内容格式要求、广告法' },
    { name: '行业趋势库', desc: '美妆/科技/教育等行业热搜话题、竞品分析、季节性话题日历' },
  ]

  const createdDatasets = []
  for (const ds of datasets) {
    const result = await post('/datasets', {
      name: ds.name,
      description: ds.desc,
      indexing_technique: 'high_quality',
      permission: 'all_team_members',
    })
    console.log(`  ✅ ${ds.name} (ID: ${result.id})`)
    createdDatasets.push(result)
  }

  // ── Step 2: 上传初始文档到品牌知识库 ──
  console.log('📝 上传初始文档...')

  const brandDocs = [
    {
      name: 'AiBrand 品牌介绍',
      text: `AiBrand 是一家 AI 全域运营平台，帮助超级个体和中小企业实现 AI 驱动的全链路运营。
目标客户：一人公司、超级个体、中小微企业。
核心功能：AI 内容创作（智能选题→多平台生成→质量检测）、多平台一键发布（覆盖14个主流平台）、智能客户互动（AI评论回复+企业微信接入）、全域数据洞察。
品牌调性：年轻、专业、务实。沟通风格：直接、有用、不啰嗦。`
    },
    {
      name: '内容创作最佳实践',
      text: `高质量内容的标准：
1. 标题要有数字、悬念或利益点
2. 开头3秒决定用户是否继续看
3. 图文内容：500-800字为最佳长度（小红书）
4. 视频脚本：前3秒必须有钩子，15-60秒为最佳时长
5. 内容要有明确的CTA（关注/购买/评论）
6. 使用真实数据和案例支撑观点
7. 适配平台调性：小红书重种草和生活感、抖音重娱乐和节奏、B站重深度和弹幕文化、公众号重专业和系统性`
    },
  ]

  for (const doc of brandDocs) {
    await post(`/datasets/${createdDatasets[0].id}/documents`, {
      name: doc.name,
      text: doc.text,
      indexing_technique: 'high_quality',
      process_rule: { mode: 'automatic' },
    })
    console.log(`  ✅ ${doc.name}`)
  }

  // ── Step 3: 上传平台规则文档 ──
  const rulesDocs = [
    {
      name: '小红书内容规则',
      text: `小红书内容审核要点：
- 禁止直接展示联系方式（微信/电话）
- 医疗健康类内容需资质认证
- 金融类内容需持牌
- 禁止过度营销话术（"最""第一""绝对"）
- 内容需有真实使用体验
- 标签使用：每篇3-5个标签，优先长尾标签
- 最佳发布时间：工作日 12:00-14:00, 18:00-22:00；周末 10:00-14:00, 16:00-22:00`
    },
    {
      name: '广告法合规要点',
      text: `广告法核心禁止词：
- 绝对化用语：最、第一、唯一、独家、首选、顶级
- 虚假宣传：效果承诺、前后对比造假
- 医疗断言：治疗、治愈、根治
- 投资承诺：保证收益、稳赚不赔
- 无资质声称：未取得相关认证不得声称专业
建议：用"深受好评""值得一试""很多用户反馈"替代绝对化表达`
    },
  ]

  for (const doc of rulesDocs) {
    await post(`/datasets/${createdDatasets[1].id}/documents`, {
      name: doc.name,
      text: doc.text,
      indexing_technique: 'high_quality',
      process_rule: { mode: 'automatic' },
    })
    console.log(`  ✅ ${doc.name}`)
  }

  // ── Step 4: 创建内容工厂 Agent 应用 ──
  console.log('🤖 创建内容工厂 Agent 应用...')

  const app = await post('/apps', {
    name: 'AiBrand 内容工厂 Agent',
    description: '智能内容创作Agent：意图分析→选题研究→多平台内容生成→质量检测',
    mode: 'chat',
    icon_type: 'emoji',
    icon: '✨',
    icon_background: '#7C3AED',
  })
  console.log(`  ✅ App: ${app.name} (ID: ${app.id})`)

  // ── 关联知识库 ──
  await post(`/apps/${app.id}/datasets`, {
    dataset_ids: createdDatasets.map(d => d.id),
  })
  console.log('  ✅ 已关联 3 个知识库')

  // ── 配置系统 Prompt ──
  await post(`/apps/${app.id}/model-config`, {
    pre_prompt: `你是 AiBrand 的内容策略专家，负责帮助用户完成从选题到发布的全链路内容创作。

你的工作流程：
1. 理解用户的意图（行业、目标、平台、调性）
2. 基于知识库中的品牌信息和平台规则，提供选题建议
3. 生成适配各平台的高质量内容
4. 自动检测合规性和内容质量

核心原则：
- 内容必须有价值：要么有用，要么有趣
- 适配平台调性：不同平台用不同的语言风格
- 严格遵守广告法和平台规则
- 用数据说话：引用真实案例和趋势
- 保持 AiBrand 专业务实的品牌调性

当你需要查找品牌信息、平台规则或行业趋势时，请使用知识库检索。`,
  })
  console.log('  ✅ 已配置系统 Prompt')

  // ── 获取应用 API Key ──
  const appDetail = await get(`/apps/${app.id}/api-keys`)
  console.log('\n🎉 全部完成！')
  console.log(`应用 ID: ${app.id}`)
  if (appDetail?.data?.length) {
    console.log(`API Key: ${appDetail.data[0].token}`)
  }
  console.log(`\n访问: http://localhost:8082/app/${app.id}`)
})()
