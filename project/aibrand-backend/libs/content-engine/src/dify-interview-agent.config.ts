/**
 * Dify「内容智造-引导式采访」Agent 配置
 *
 * 此文件定义 Agent 的完整 Prompt 和配置参数，
 * 可直接导入 Dify 创建 Agent 应用，或通过 Dify API 编程创建。
 *
 * 使用方式：
 * 1. Dify UI：复制 SYSTEM_PROMPT 到 Agent 系统提示词
 * 2. Dify API：POST /console/api/apps 创建应用并设置参数
 *
 * 关联后端：ContentEngineService.routeInterview() 调用此 Agent
 */

// ═══════════════════════════════════════════════════════════
// 系统提示词
// ═══════════════════════════════════════════════════════════

export const INTERVIEW_AGENT_SYSTEM_PROMPT = `# 角色
你是 AiBrand 内容智造引擎的「引导式采访员」。
你的任务是通过友好的选择题式对话，帮助用户将模糊的内容创作想法转化为精准的结构化 Brief。

# 核心原则

1. **绝不冷冰冰报错**：即使用户输入"写个好东西"，你也要主动举例引导，而不是说"请重新输入"。
2. **选择题优先**：每次只问 1-2 个关键点，给出可视化选项（4-8 个），让用户点选。
3. **智能跳过**：如果用户输入中已包含某信息（如"帮我写一篇小红书种草文案"），自动跳过对应提问。
4. **最多 5 轮**：整个采访不超过 5 轮提问，超过则直接生成 Brief。
5. **渐进深入**：从大类到细节。行业大类→细分行业，不一次性问太深。

# 采访流程

## 步骤 0：意图清晰度评估
首先分析用户输入的清晰度：
- 包含 4+ 要素（产品+平台+风格+受众+目的）→ 快速确认模式，1 轮确认即可
- 包含 1-3 个要素 → 补齐式提问，只问缺失的
- 几乎没有有效信息 → AI 主动推荐模式，给方向性建议

## 步骤 1-5：最多 5 轮选择题

每轮展示：
- 问题文字 + 副标题（如"已从你的品牌信息自动填入，可修改"）
- 4-8 个可视化选项按钮
- "跳过此步"按钮（非必问字段）
- 步骤进度指示（如"第 2/5 步"）

### 必问字段（不能跳过）：
1. **行业品类** — 如果品牌库已有则跳过
2. **内容类型** — 产品介绍/品牌故事/教程/促销/用户案例/蹭热点

### 可跳过字段：
3. **目标受众** — 品牌库已有则跳过
4. **风格语气** — 品牌库有默认值则展示确认
5. **发布平台** — 已绑定账号自动填入

## 行业细分追问
当用户选择了以下大类行业时，自动追问细分：
- SaaS → CRM/财税/HR/协同办公/营销工具
- 餐饮 → 火锅/茶饮/快餐/烘焙/正餐
- 美妆 → 护肤/彩妆/香水/个护
- 服饰 → 女装/男装/运动/童装

## 样本反推模式
如果用户不知道想要什么风格，主动提供样本反推：
"不知道想要什么风格？我给你看几组同行业的案例，选你喜欢的就行。"

展示 3-5 组不同风格的案例描述，用户勾选后自动提取风格向量。

# 输出格式

每次响应用 JSON 格式（嵌入对话中，用户不可见）：

\`\`\`json
{
  "step": "当前步骤 (0=初始评估, 1-5=采访轮次, done=完成)",
  "action": "ask_card | confirm_brief | recommend | error_recovery",
  "clarityScore": 0.0-1.0,
  "card": {
    "mode": "single_select | multi_select | text_input",
    "question": "问题文本",
    "subtitle": "副标题或提示",
    "options": [{ "label": "选项名", "value": "选项值", "preselected": false }],
    "stepIndicator": "第 X/5 步",
    "allowSkip": true
  },
  "briefUpdate": { "field": "字段路径", "value": "更新的值" },
  "nextExpectedInput": "single_choice | multi_choice | text | confirm"
}
\`\`\`

# 初始分析格式（步骤 0）

\`\`\`json
{
  "clarityScore": 0.0-1.0,
  "route": "fast_confirm | gap_filling | ai_recommend | manual_form",
  "extractedFields": {
    "industry": { "primary": "行业" },
    "targetAudience": { "segments": ["标签1"] },
    "contentType": "product_intro",
    "goal": "awareness",
    "tone": "professional",
    "platforms": ["xiaohongshu"]
  },
  "fieldsToAsk": ["需要提问的字段列表"],
  "estimatedRounds": 1-5,
  "missingContext": "简短说明还缺什么信息"
}
\`\`\`

# 错误恢复

- 用户输入无法理解时：展示 3 个方向性示例引导（"你是想要这种口语化推荐？还是正式品牌故事？或者短视频爆款开头？"）
- 用户中途改变主意时：记住已填信息，只修改变化的部分
- 用户想跳过所有提问时：切换到手动表单模式

# 语气

- 友好、专业、不过度热情
- 中文为主，行业术语用中文
- 每条回复控制在 200 字以内（选项卡片内容不计入）
`

// ═══════════════════════════════════════════════════════════
// Agent 配置参数
// ═══════════════════════════════════════════════════════════

export const INTERVIEW_AGENT_CONFIG = {
  /** Agent 名称（在 Dify 中创建时使用） */
  name: '内容智造-引导式采访',
  /** Agent 描述 */
  description: '通过结构化选择题引导用户输出精准 ContentBrief，驱动文案/图片/视频生成',
  /** 模型配置 */
  model: {
    provider: 'deepseek',
    name: 'deepseek-chat',
    parameters: {
      temperature: 0.7,
      max_tokens: 2048,
      top_p: 0.9,
    },
  },
  /** 对话设置 */
  conversation: {
    /** 开场白 */
    opening_statement: `嗨！我是你的内容创作助手 👋

我可以帮你把模糊的想法变成精准的内容方案。不管是写文案、做图片还是剪视频，我们先聊聊你的需求。

你可以直接告诉我你想做什么，比如：
• "帮我推广一款新面霜"
• "写一篇品牌故事，我们是一家咖啡店"
• "最近想在小红书发些内容，不知道发什么"

或者你也可以让我来引导你，一步步来 😊`,
    /** 建议问题（预置在输入框上方） */
    suggested_questions: [
      '帮我写一篇产品推广文案',
      '我想在小红书上发内容，帮我规划',
      '我有一个新品要上市，需要全套内容方案',
      '看看最近适合发什么内容',
    ],
  },
  /** 变量（外部传入） */
  variables: [
    {
      name: 'brand_knowledge',
      type: 'text',
      description: '品牌知识库 JSON（行业、受众、风格偏好等）',
      required: false,
    },
    {
      name: 'bound_platforms',
      type: 'text',
      description: '用户已绑定的平台列表，逗号分隔',
      required: false,
    },
    {
      name: 'history_briefs_summary',
      type: 'text',
      description: '用户历史 Brief 摘要，用于风格偏好学习',
      required: false,
    },
  ],
  /** 功能开关 */
  features: {
    /** 启用对话记忆（同一用户跨 session 记住品牌信息） */
    memory: true,
    /** 对话记忆窗口 */
    memory_window: 20,
    /** 启用文件上传（用户可上传参考图） */
    file_upload: true,
    /** 允许的图像类型 */
    file_upload_types: ['image/png', 'image/jpeg', 'image/webp'],
  },
} as const

// ═══════════════════════════════════════════════════════════
// 采访问题模板（完整版，与后端 QUESTION_TEMPLATES 同步）
// ═══════════════════════════════════════════════════════════

export const INTERVIEW_QUESTION_TEMPLATES = [
  {
    id: 'industry',
    question: '你的产品属于哪个行业？',
    subtitle: '选择行业后我会给出更精准的内容建议',
    mode: 'single_select' as const,
    required: true,
    options: [
      { label: '🍔 餐饮美食', value: '餐饮', refinable: true },
      { label: '👗 服饰穿搭', value: '服饰', refinable: true },
      { label: '💄 美妆护肤', value: '美妆', refinable: true },
      { label: '💻 SaaS / 软件', value: 'SaaS', refinable: true },
      { label: '📚 教育培训', value: '教育', refinable: false },
      { label: '📱 3C 数码', value: '3C数码', refinable: false },
      { label: '👶 母婴亲子', value: '母婴', refinable: false },
      { label: '🏠 家居生活', value: '家居', refinable: false },
      { label: '🏥 医疗健康', value: '医疗', refinable: false },
      { label: '📦 其他行业', value: '其他', refinable: false },
    ],
  },
  {
    id: 'audience',
    question: '你的目标受众是谁？',
    subtitle: '可多选，精准定位让内容更有针对性',
    mode: 'multi_select' as const,
    required: false,
    options: [
      { label: '💼 职场白领', value: '职场白领' },
      { label: '🎓 学生党', value: '学生' },
      { label: '👨‍👩‍👧 宝妈/宝爸', value: '宝妈宝爸' },
      { label: '🏢 中小企业主', value: '中小企业主' },
      { label: '📊 市场/运营人', value: '市场运营' },
      { label: '🤖 科技爱好者', value: '科技爱好者' },
      { label: '🔥 Z 世代', value: 'Z世代' },
    ],
  },
  {
    id: 'contentType',
    question: '你想创作什么类型的内容？',
    subtitle: '不同类型的内容结构和重点完全不同',
    mode: 'single_select' as const,
    required: true,
    options: [
      { label: '🛍️ 产品种草/介绍', value: 'product_intro', hint: '突出卖点和体验感' },
      { label: '📖 品牌故事', value: 'brand_story', hint: '传递品牌理念和价值观' },
      { label: '📝 教程/攻略', value: 'tutorial', hint: '干货实用，建立专业度' },
      { label: '🎉 促销/活动', value: 'promotion', hint: '激发紧迫感和购买欲' },
      { label: '⭐ 用户案例/口碑', value: 'social_proof', hint: '真实体验建立信任' },
      { label: '🔥 蹭热点/话题', value: 'trend_hijack', hint: '借势流量快速出圈' },
    ],
  },
  {
    id: 'tone',
    question: '你希望内容是什么风格？',
    subtitle: '品牌库有默认风格时会自动选中',
    mode: 'single_select' as const,
    required: false,
    options: [
      { label: '👔 专业正式', value: 'professional', hint: '适合 B2B、企业宣传' },
      { label: '☕ 亲切温暖', value: 'warm', hint: '适合生活方式、母婴品牌' },
      { label: '🎯 年轻潮流', value: 'trendy', hint: '适合 Z 世代消费品' },
      { label: '😄 幽默风趣', value: 'humorous', hint: '适合社交媒体、快消品' },
      { label: '💕 情感共鸣', value: 'emotional', hint: '适合故事型、品牌向内容' },
      { label: '✨ 简约克制', value: 'minimalist', hint: '适合高端、设计向品牌' },
    ],
  },
  {
    id: 'platforms',
    question: '你打算发布到哪些平台？',
    subtitle: '不同平台的格式、话术、长度都不同',
    mode: 'multi_select' as const,
    required: true,
    options: [
      { label: '📕 小红书', value: 'xiaohongshu' },
      { label: '🎵 抖音', value: 'douyin' },
      { label: '💬 公众号', value: 'wechat_article' },
      { label: '📹 视频号', value: 'wechat_video' },
      { label: '📢 微博', value: 'weibo' },
      { label: '📺 B站', value: 'bilibili' },
      { label: '📷 Instagram', value: 'instagram' },
      { label: '🎬 TikTok', value: 'tiktok' },
    ],
  },
]

// ═══════════════════════════════════════════════════════════
// 样本库（用于样本反推功能）
// ═══════════════════════════════════════════════════════════

export const SAMPLE_TEMPLATES_BY_INDUSTRY: Record<string, Array<{
  id: string
  title: string
  description: string
  styleKeywords: string[]
  platform: string
}>> = {
  '美妆': [
    {
      id: 'beauty_1',
      title: '沉浸式护肤体验',
      description: '第一人称视角，早晨/晚间护肤流程，强调质地和吸收感，背景音乐舒缓',
      styleKeywords: ['沉浸式', '质感', '慢节奏', '真实感'],
      platform: 'xiaohongshu',
    },
    {
      id: 'beauty_2',
      title: '成分党深度解析',
      description: '专业分析产品成分表，对比同类产品，数据可视化，理性消费引导',
      styleKeywords: ['专业', '数据驱动', '科普', '理性'],
      platform: 'xiaohongshu',
    },
    {
      id: 'beauty_3',
      title: '场景化变美',
      description: '约会/面试/通勤等场景切入，快速打造妆容，强调效果对比',
      styleKeywords: ['场景化', '对比', '实用', '快速'],
      platform: 'douyin',
    },
  ],
  '餐饮': [
    {
      id: 'food_1',
      title: '探店 Vlog',
      description: '第一视角探店体验，环境展示→菜品特写→品尝反应，BGM 轻快',
      styleKeywords: ['探店', '氛围感', '食欲感', '真实体验'],
      platform: 'douyin',
    },
    {
      id: 'food_2',
      title: '美食图文笔记',
      description: '高饱和度食物特写 + 详细口味描述 + 打卡攻略，适合收藏',
      styleKeywords: ['高饱和度', '攻略', '收藏向', '细节描述'],
      platform: 'xiaohongshu',
    },
  ],
  'SaaS': [
    {
      id: 'saas_1',
      title: '痛点解决方案',
      description: '行业痛点切入→产品解决方案→效果数据→客户案例，专业简洁',
      styleKeywords: ['痛点切入', '数据说话', '专业', '解决方案'],
      platform: 'wechat_article',
    },
    {
      id: 'saas_2',
      title: '产品实操教程',
      description: '分步骤演示产品使用，截图/GIF+文字说明，突出效率提升',
      styleKeywords: ['教程', '实操', '效率', '截图'],
      platform: 'wechat_article',
    },
  ],
}
