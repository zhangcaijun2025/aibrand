/**
 * 智能客服中心种子数据
 * FAQ 知识库 + 话术模板 + 工单类型 + 评论回复模板
 */

// ── FAQ 知识库（7 大模块） ──

export interface FAQItem {
  id: string
  module: string
  question: string
  answer: string
  keywords: string[]
  relatedLinks?: string[]
}

export const FAQ_DATABASE: FAQItem[] = [
  // 模块 1：注册使用
  {
    id: 'faq-1',
    module: '注册使用',
    question: '如何注册 AiBrand 账号？',
    answer: '访问 aibrand.cn，点击右上角"登录"，输入邮箱后点击"发送验证码"，输入收到的验证码即可自动完成注册。新用户注册后会进入 4 步业务诊断引导，AI 会为你生成个性化的《AI 业务升级路线图》。',
    keywords: ['注册', '账号', '登录', '验证码'],
  },
  {
    id: 'faq-2',
    module: '注册使用',
    question: '收不到邮箱验证码怎么办？',
    answer: '请检查：1）邮箱地址是否输入正确；2）垃圾邮件箱中是否有验证码邮件；3）如果超过 2 分钟未收到，可以重新点击发送。如果问题持续，请联系在线客服。',
    keywords: ['验证码', '邮箱', '收不到', '登录问题'],
  },
  {
    id: 'faq-3',
    module: '注册使用',
    question: '如何绑定我的社交平台账号？',
    answer: '登录后进入"多平台账号"页面，点击"添加账号"，选择你要绑定的平台（支持抖音、小红书、B站、公众号、视频号等），按照指引完成 OAuth 授权即可。每个平台授权流程不同，如遇到问题可以查看对应的帮助教程。',
    keywords: ['绑定', '账号', '平台', '抖音', '小红书', 'OAuth'],
  },

  // 模块 2：会员计费
  {
    id: 'faq-4',
    module: '会员计费',
    question: '免费版和会员版有什么区别？',
    answer: '免费版：3 个社交账号、每月 10 条 AI 内容、3 个平台发布、基础数据看板。会员版（¥299/月）：10 个账号、100 条内容、6 平台、AI 自动回复、高级数据分析+自动周报。企业版（¥999/月）：30 个账号、无限内容、14 平台、多用户协作、白标定制。',
    keywords: ['免费', '会员', '价格', '区别', '对比', 'Pro'],
    relatedLinks: ['/pricing'],
  },
  {
    id: 'faq-5',
    module: '会员计费',
    question: '如何升级会员？',
    answer: '进入"订阅中心"页面，选择 Pro 版或企业版，点击"订阅"即可跳转支付。支持支付宝和微信支付。升级后立即生效，所有功能即刻解锁。年付可省 2 个月费用。',
    keywords: ['升级', '会员', '付费', 'Pro', '订阅'],
    relatedLinks: ['/pricing'],
  },
  {
    id: 'faq-6',
    module: '会员计费',
    question: '积分是什么？怎么获取？',
    answer: '积分用于 AI 模型调用消耗（内容生成、图片生成、视频处理等）。100 积分 = 1 美元。获取方式：1）注册赠送 50 积分；2）购买积分包；3）会员每月赠送积分。积分自获取之日起 12 个月内有效。',
    keywords: ['积分', 'credits', '消耗', '充值'],
    relatedLinks: ['/pricing'],
  },

  // 模块 3：故障排查
  {
    id: 'faq-7',
    module: '故障排查',
    question: '内容发布失败怎么办？',
    answer: '发布失败常见原因：1）平台账号授权过期（需重新授权）；2）内容不符合平台规则（敏感词、图片尺寸等）；3）平台 API 限流。建议：先检查账号状态，再用"AI 内容质量审核"功能预检，最后查看发布记录中的错误详情。',
    keywords: ['发布失败', '错误', '故障', '发布不了'],
  },
  {
    id: 'faq-8',
    module: '故障排查',
    question: 'AI 生成的内容不满意怎么办？',
    answer: '1）在"指令共创空间"重新调整需求描述，越具体效果越好；2）在"案例拆解室"查看同行的高质量指令是怎么写的；3）使用"提示词工坊"的模板直接套用。核心原则：给 AI 更多上下文（产品信息、目标人群、风格偏好、字数要求），结果越精准。',
    keywords: ['AI', '生成', '不满意', '质量', '效果不好'],
  },

  // 模块 4：变现规则
  {
    id: 'faq-9',
    module: '变现规则',
    question: '我怎么用 AiBrand 赚钱？',
    answer: 'AiBrand 帮你在三个方面变现：1）提效率省成本——AI 替代人工运营，一个月省 ¥8,000+ 运营工资；2）内容变现——高质量内容带来更多粉丝和客户，转化为收入；3）服务变现——当你熟练使用 AiBrand 后，可以帮其他企业做代运营（用平台工具），收取服务费。平台不会从你的收入中抽成。',
    keywords: ['赚钱', '变现', '收入', '钱'],
  },

  // 模块 5：合规规范
  {
    id: 'faq-10',
    module: '合规规范',
    question: '平台内容发布有哪些限制？',
    answer: '请遵守各社交平台的社区规范和内容政策。AiBrand 不发布任何违法违规内容。AI 生成内容前会自动进行合规审核。禁止发布：色情低俗、政治敏感、虚假广告、侵权盗版等违规内容。',
    keywords: ['限制', '违规', '审核', '规则'],
  },

  // 模块 6：功能教程
  {
    id: 'faq-11',
    module: '功能教程',
    question: '怎么批量生成多平台内容？',
    answer: '在"AI 创作"页面输入一个主题，AI 会自动适配为小红书、抖音、公众号等不同平台的格式。你也可以在"内容日历"中排期，让 AI 按计划自动生成和发布。推荐使用"内容自动化流水线"工作流模板，实现选题→创作→适配→发布全流程自动化。',
    keywords: ['批量', '多平台', '自动生成', '教程'],
    relatedLinks: ['/create', '/knowledge/workflows'],
  },
  {
    id: 'faq-12',
    module: '功能教程',
    question: '如何使用指令库？',
    answer: '进入"知识库 → 指令库"，按行业、场景、平台、内容形态筛选适合你的指令模板。找到合适的模板后，点击"展开指令"查看完整内容，点击"复制"即可使用。你也可以收藏常用指令，建立自己的专属指令库。',
    keywords: ['指令', '模板', '提示词', 'prompt'],
    relatedLinks: ['/knowledge/commands'],
  },

  // 模块 7：增值服务
  {
    id: 'faq-13',
    module: '增值服务',
    question: '企业版有什么额外的服务？',
    answer: '企业版（¥999/月）包含：1）30 个社交账号管理；2）无限 AI 内容生成；3）14 个全平台发布；4）多用户协作+内容审批流程；5）白标定制（用自己的品牌 Logo 和域名）；6）专属技术支持（1v1 客服+优先响应）；7）私有化部署选项。适合有团队协作需求的中小企业。',
    keywords: ['企业', 'Enterprise', '定制', '白标', '私有部署'],
    relatedLinks: ['/pricing'],
  },
]

// ── 话术模板（6 种场景） ──

export interface ScriptTemplate {
  id: string
  scene: string
  description: string
  examples: { situation: string; response: string }[]
}

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'script-1',
    scene: '开场话术',
    description: 'AI 亲和问候，快速进入服务状态',
    examples: [
      {
        situation: '用户第一次咨询',
        response: 'Hi！我是 AiBrand 的 AI 助手小 A 👋 关于平台的任何问题都可以问我。你可以直接描述遇到的问题，或者从下方快捷菜单选择～',
      },
      {
        situation: '人工接应',
        response: '您好！我是客服专员 [名字]。刚才 AI 助手已经把您的问题同步给我了，我来帮您进一步处理。',
      },
    ],
  },
  {
    id: 'script-2',
    scene: '常规咨询',
    description: '专业简洁，直击问题，搭配实操步骤',
    examples: [
      {
        situation: '用户问功能怎么用',
        response: '好的，[功能名称] 的操作是这样的：\n\n1️⃣ [第一步]\n2️⃣ [第二步]\n3️⃣ [第三步]\n\n你可以点击这里直接跳转 → [功能页面链接]\n如果操作中有任何问题，随时问我～',
      },
    ],
  },
  {
    id: 'script-3',
    scene: '新手引导',
    description: '耐心分步指导，适配新手操作短板',
    examples: [
      {
        situation: '新用户不知道怎么开始',
        response: '完全理解！刚开始用确实需要一点时间熟悉。我建议你按这个顺序试试：\n\n📍 第一步：先绑定你最常用的 2 个社交账号 → "多平台账号"页面\n📍 第二步：在"AI 创作"里试试写一条小红书笔记\n📍 第三步：发布后观察数据反馈\n\n每一步大概 2-3 分钟，总共 10 分钟就能跑通第一个闭环。需要我陪你一步步操作吗？',
      },
    ],
  },
  {
    id: 'script-4',
    scene: '情绪投诉',
    description: '先共情安抚→致歉→核查解决→同步进度',
    examples: [
      {
        situation: '用户投诉功能有问题',
        response: '非常抱歉给你带来了不好的体验！我理解你的感受。[确认问题详情]。我马上帮你排查，预计 [X] 分钟内给你答复。这期间如果有任何进展，我会第一时间同步给你。',
      },
      {
        situation: '用户不满意 AI 结果',
        response: '我完全理解你的 frustration。AI 有时候确实需要更精准的引导才能产出理想的结果。让我帮你看看具体是哪里不满意，我们一起调整指令，直到拿到你满意的效果。你的时间不会被浪费的。',
      },
    ],
  },
  {
    id: 'script-5',
    scene: '规则拒绝',
    description: '委婉坚定，说明规范，不激化矛盾',
    examples: [
      {
        situation: '用户要求违规功能',
        response: '感谢你的建议！不过根据平台规范和相关法律法规，这个功能目前暂时无法支持。我们这样做是为了保护所有用户的账号安全和平台长期健康发展。如果你有类似需求，我可以帮你看看有没有合规的替代方案？',
      },
    ],
  },
  {
    id: 'script-6',
    scene: '转化引导',
    description: '问题解决后自然植入高阶权益，弱化营销感',
    examples: [
      {
        situation: '免费用户体验了 AI 内容功能',
        response: '看起来 AI 帮你省了不少时间！🎉 顺便提一下，会员版支持一次性批量生成 10 条内容，还能自动适配多平台发布，很多和你一样的 [行业] 用户升级后效率提升了 3 倍。你现在升级的话，首月还有优惠。需要我帮你看看详情吗？',
      },
      {
        situation: '用户咨询企业版',
        response: '你的需求听起来很适合企业版。它比会员版多了多用户协作、内容审批流程和白标定制，特别适合有小团队的场景。我可以帮你约一个 15 分钟的产品演示，让你全面了解企业版能带来什么价值。要安排吗？',
      },
    ],
  },
]

// ── 工单类型 ──

export interface TicketType {
  id: string
  label: string
  priority: '低' | '中' | '高' | '紧急'
  description: string
  sla: string // 服务等级协议
}

export const TICKET_TYPES: TicketType[] = [
  { id: 'bug', label: 'Bug 反馈', priority: '高', description: '功能异常、报错、崩溃等技术问题', sla: '4 小时内响应' },
  { id: 'account', label: '账号问题', priority: '高', description: '登录异常、账号冻结、数据丢失', sla: '2 小时内响应' },
  { id: 'billing', label: '付费/退款', priority: '紧急', description: '支付异常、重复扣费、退款申请', sla: '1 小时内响应' },
  { id: 'feature', label: '功能建议', priority: '低', description: '新功能需求、改进建议', sla: '3 个工作日内回复' },
  { id: 'compliance', label: '内容合规', priority: '中', description: '内容被拦截、合规咨询', sla: '8 小时内响应' },
  { id: 'custom', label: '企业定制', priority: '中', description: '私有部署、定制开发、白标咨询', sla: '24 小时内响应' },
]

// ── 对外回复模板（帮用户回复他的客户） ──

export interface ReplyTemplate {
  id: string
  scene: string
  platform: string
  template: string
}

export const REPLY_TEMPLATES: ReplyTemplate[] = [
  {
    id: 'reply-1',
    scene: '好评感谢',
    platform: '通用',
    template: '感谢你的认可！{个性化回应} 我们会继续努力做好 {产品/内容}，有问题随时找我～',
  },
  {
    id: 'reply-2',
    scene: '产品咨询',
    platform: '通用',
    template: '谢谢你的关注！关于 {产品名称} 的 {咨询要点}：\n{具体回答}\n如果还有疑问，可以 {进一步了解的入口} 哦～',
  },
  {
    id: 'reply-3',
    scene: '价格询问',
    platform: '通用',
    template: '你好呀！{产品/服务名称} 的价格是 {价格信息}。目前有 {优惠活动}。你可以通过 {购买/咨询链接} 了解更多详情～',
  },
  {
    id: 'reply-4',
    scene: '投诉处理',
    platform: '通用',
    template: '非常抱歉给你带来了不好的体验！我们非常重视你的反馈，已经记录下来并会尽快处理。方便的话可以私信我 {联系方式}，我亲自帮你跟进解决。',
  },
  {
    id: 'reply-5',
    scene: '商务合作',
    platform: '通用',
    template: '感谢你的关注和信任！关于合作事宜，请将你的合作意向和联系方式发送到 {合作邮箱}，我们会有专门的商务同事在 24 小时内与你联系。期待合作！',
  },
]
