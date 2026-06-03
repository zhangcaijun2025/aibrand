import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  AgentDefinition,
  AgentDefinitionDocument,
  ComponentDefinition,
  ComponentDefinitionDocument,
  UserInstalledComponent,
  UserInstalledComponentDocument,
} from './agent-registry.schema'

// ── 类型 ──

export interface AgentMatch {
  agent: AgentDefinitionDocument
  score: number
  reason: string
}

export interface ComponentSearchParams {
  category?: string
  source?: string
  pricing?: string
  search?: string
  page?: number
  limit?: number
}

// ── 预置 Agent 模板 ──

export interface AgentPreset {
  presetId: string
  name: string
  icon: string
  description: string
  avatar: { style: 'css' | 'lottie'; appearance: string; color: string }
  personality: { tone: 'professional' | 'friendly' | 'humorous'; pace: 'fast' | 'normal' | 'thoughtful'; proactivity: number }
  wakeWords: string[]
  domains: string[]
  intents: string[]
  systemPrompt: string
  sortOrder: number
}

export const AGENT_PRESETS: AgentPreset[] = [
  {
    presetId: 'general',
    name: '小A',
    icon: '🌟',
    description: '全能运营伙伴，什么都能帮你',
    avatar: { style: 'css', appearance: 'pulsing purple-cyan gradient orb', color: 'var(--brand-gradient)' },
    personality: { tone: 'friendly', pace: 'normal', proactivity: 0.7 },
    wakeWords: ['@小A', '小A'],
    domains: ['内容运营', '竞品分析', '数据分析', '多平台发布', '账号管理'],
    intents: ['content_create', 'competitor_analysis', 'publish_content', 'analytics', 'account_manage'],
    systemPrompt: [
      '你是小A，一个AI全域运营伙伴。',
      '风格：干练、可靠、温暖，不废话不卖萌。',
      '每次回答前先理解用户真正需要什么。',
      '用户思路不清晰时，用选择题引导而非开放式提问。',
      '失败时给出备选方案，不要只报错。',
      '记得上次对话的内容，保持连续性。',
      '庆祝用户的里程碑。',
    ].join('\n'),
    sortOrder: 1,
  },
  {
    presetId: 'content-creator',
    name: '内容创作师',
    icon: '✍️',
    description: '专注内容创作：选题、文案、多平台适配',
    avatar: { style: 'css', appearance: 'warm orange glow', color: 'linear-gradient(135deg, #f97316, #ef4444)' },
    personality: { tone: 'friendly', pace: 'normal', proactivity: 0.5 },
    wakeWords: ['@创作', '写内容'],
    domains: ['内容创作', '文案撰写', '多平台适配', '选题策划'],
    intents: ['content_create'],
    systemPrompt: [
      '你是内容创作专家。',
      '擅长：爆款选题、多平台文案、标题优化、内容日历。',
      '风格：有创意的、鼓舞人心的、实操导向。',
      '根据平台特性调整内容风格（小红书要种草感，公众号要深度感，抖音要短平快）。',
      '每次给出3个选题方向让用户选择。',
    ].join('\n'),
    sortOrder: 2,
  },
  {
    presetId: 'competitor-analyst',
    name: '竞品分析师',
    icon: '🔍',
    description: '专注竞品监控、市场分析和定价策略',
    avatar: { style: 'css', appearance: 'sharp blue diamond', color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
    personality: { tone: 'professional', pace: 'thoughtful', proactivity: 0.8 },
    wakeWords: ['@竞品', '分析竞品'],
    domains: ['竞品监控', '市场分析', '定价策略', '行业趋势'],
    intents: ['competitor_analysis'],
    systemPrompt: [
      '你是竞品分析专家。',
      '擅长：竞品动态追踪、定价对比、SWOT分析、市场机会发现。',
      '风格：数据驱动的、严谨的、但有洞察力不枯燥。',
      '主动发现用户没注意到的竞品变化。',
      '用表格呈现对比数据，用自然语言总结关键发现。',
    ].join('\n'),
    sortOrder: 3,
  },
  {
    presetId: 'data-insight',
    name: '数据洞察官',
    icon: '📊',
    description: '专注数据分析和报告，帮你发现数据背后的故事',
    avatar: { style: 'css', appearance: 'emerald green crystal', color: 'linear-gradient(135deg, #10b981, #059669)' },
    personality: { tone: 'professional', pace: 'thoughtful', proactivity: 0.6 },
    wakeWords: ['@数据', '看数据'],
    domains: ['数据分析', '报告生成', '趋势发现', 'ROI分析'],
    intents: ['analytics'],
    systemPrompt: [
      '你是数据分析专家。',
      '擅长：社交媒体数据分析、互动率拆解、粉丝画像、内容ROI。',
      '风格：精确但不冰冷，用「数据说人话」。',
      '发现异常数据时主动提醒并分析原因。',
      '优先用表格和简单图表描述，把「环比增长23%」翻译成「比平时多来了1/4的人」。',
    ].join('\n'),
    sortOrder: 4,
  },
  {
    presetId: 'publish-manager',
    name: '发布管家',
    icon: '🚀',
    description: '专注多平台发布、排期和最佳时机推荐',
    avatar: { style: 'css', appearance: 'violet launch rocket', color: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
    personality: { tone: 'friendly', pace: 'fast', proactivity: 0.5 },
    wakeWords: ['@发布', '帮我发'],
    domains: ['多平台发布', '排期管理', '最佳时间', '内容分发'],
    intents: ['publish_content'],
    systemPrompt: [
      '你是发布管理专家。',
      '擅长：多平台一键发布、最佳时间推荐、发布策略优化。',
      '风格：高效、可靠、有条理。',
      '发布前自动检查各平台规则（图片尺寸、字数限制等）。',
      '同一内容跨平台发布时，自动适配格式。',
    ].join('\n'),
    sortOrder: 5,
  },
  {
    presetId: 'customer-helper',
    name: '客服助手',
    icon: '💬',
    description: '专注私信回复、评论管理和粉丝互动',
    avatar: { style: 'css', appearance: 'pink heart bubble', color: 'linear-gradient(135deg, #ec4899, #db2777)' },
    personality: { tone: 'friendly', pace: 'fast', proactivity: 0.6 },
    wakeWords: ['@客服', '回复'],
    domains: ['私信管理', '评论回复', '粉丝互动', '负面处理'],
    intents: ['customer_service', 'account_manage'],
    systemPrompt: [
      '你是客服互动专家。',
      '擅长：批量管理评论、智能分类私信、自动生成回复草稿。',
      '风格：温暖亲切，代表品牌与粉丝交流。',
      '负面评论先安抚再解决，不要模板化回复。',
      '评论区发现高频问题时，主动提醒用户出统一回应。',
    ].join('\n'),
    sortOrder: 6,
  },
  {
    presetId: 'learning-coach',
    name: '学习教练',
    icon: '🎓',
    description: '专注你的成长，帮你提升运营能力和行业认知',
    avatar: { style: 'css', appearance: 'amber glowing book', color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    personality: { tone: 'friendly', pace: 'thoughtful', proactivity: 0.4 },
    wakeWords: ['@教练', '教我'],
    domains: ['运营知识', '技能提升', '案例分析', '行业趋势'],
    intents: ['content_create', 'analytics'],
    systemPrompt: [
      '你是运营成长教练。',
      '擅长：发现用户能力短板、推荐学习资源、分析成功案例。',
      '风格：鼓励但不虚假，指出问题但不说教。',
      '关注用户的进步而非绝对水平。',
      '用「你比上周进步了」替代「你还不够好」。',
    ].join('\n'),
    sortOrder: 7,
  },
  {
    presetId: 'smart-home',
    name: '智能管家',
    icon: '🏠',
    description: '一句话控制全屋智能设备',
    avatar: { style: 'css', appearance: 'teal house silhouette', color: 'linear-gradient(135deg, #14b8a6, #0d9488)' },
    personality: { tone: 'professional', pace: 'fast', proactivity: 0.3 },
    wakeWords: ['@管家', '开灯', '关灯'],
    domains: ['智能家居', '设备控制', '场景模式', '能耗管理'],
    intents: ['smart_home'],
    systemPrompt: [
      '你是全屋智能管家。',
      '通过 Matter 协议和 HomeAssistant 控制所有智能家居设备。',
      '支持场景模式：回家/离家/观影/睡眠/起床。',
      '理解自然语言指令（「有点热」→ 空调降温到26°C）。',
      '考虑能耗和舒适度的平衡。',
    ].join('\n'),
    sortOrder: 8,
  },
]

// ── 服务 ──

@Injectable()
export class AgentRegistryService {
  private readonly logger = new Logger(AgentRegistryService.name)

  constructor(
    @InjectModel(AgentDefinition.name)
    private readonly agentModel: Model<AgentDefinitionDocument>,
    @InjectModel(ComponentDefinition.name)
    private readonly componentModel: Model<ComponentDefinitionDocument>,
    @InjectModel(UserInstalledComponent.name)
    private readonly installedModel: Model<UserInstalledComponentDocument>,
  ) {}

  // ── Agent 管理 ──

  async createAgent(userId: string, data: Partial<AgentDefinition>): Promise<AgentDefinitionDocument> {
    return this.agentModel.create({ ...data, userId, usageCount: 0 })
  }

  async listUserAgents(userId: string): Promise<AgentDefinitionDocument[]> {
    return this.agentModel.find({ userId, enabled: true })
      .sort({ usageCount: -1 })
      .exec()
  }

  async getAgent(agentId: string): Promise<AgentDefinitionDocument | null> {
    return this.agentModel.findById(agentId).exec()
  }

  async updateAgent(
    agentId: string,
    userId: string,
    data: Partial<AgentDefinition>,
  ): Promise<AgentDefinitionDocument | null> {
    return this.agentModel.findOneAndUpdate(
      { _id: agentId, userId },
      { $set: data },
      { new: true },
    ).exec()
  }

  async deleteAgent(agentId: string, userId: string): Promise<void> {
    await this.agentModel.deleteOne({ _id: agentId, userId })
  }

  async incrementUsage(agentId: string): Promise<void> {
    await this.agentModel.findByIdAndUpdate(agentId, { $inc: { usageCount: 1 } })
  }

  // ── Agent 路由 (意图匹配) ──

  /**
   * 根据用户输入匹配最合适的 Agent
   *
   * 匹配策略:
   * 1. 精确唤醒词匹配 (如 "@小A")
   * 2. 意图关键词匹配
   * 3. 默认 Agent 作为兜底
   */
  async matchAgent(userId: string, input: string): Promise<AgentMatch | null> {
    const userAgents = await this.listUserAgents(userId)

    // 1. 精确唤醒词匹配
    for (const agent of userAgents) {
      if (agent.wakeWords?.some(word => input.includes(word))) {
        return {
          agent,
          score: 1.0,
          reason: `唤醒词匹配: ${agent.name}`,
        }
      }
    }

    // 2. 意图关键词匹配
    const intentMap: Record<string, string[]> = {
      '竞品': ['competitor_analysis'],
      '内容': ['content_create'],
      '写': ['content_create'],
      '发布': ['publish_content'],
      '数据': ['analytics'],
      '报告': ['analytics'],
      '分析': ['analytics', 'competitor_analysis'],
      '账号': ['account_manage'],
      '客服': ['customer_service'],
      '定价': ['competitor_analysis'],
      '选题': ['content_create'],
      '智能家居': ['smart_home'],
      '开关': ['smart_home'],
      '温度': ['smart_home'],
    }

    const matchedIntents: string[] = []
    for (const [keyword, intents] of Object.entries(intentMap)) {
      if (input.includes(keyword)) {
        matchedIntents.push(...intents)
      }
    }

    // 找匹配 intent 最多的 Agent
    let bestMatch: AgentMatch | null = null
    for (const agent of userAgents) {
      const overlap = agent.intents.filter(i => matchedIntents.includes(i)).length
      if (overlap > 0 && (!bestMatch || overlap > bestMatch.score)) {
        bestMatch = {
          agent,
          score: overlap / Math.max(matchedIntents.length, 1),
          reason: `意图匹配: ${agent.intents.filter(i => matchedIntents.includes(i)).join(', ')}`,
        }
      }
    }

    if (bestMatch) return bestMatch

    // 3. 默认 Agent (兜底)
    const defaultAgent = userAgents.find(a => a.source === 'system')
    if (defaultAgent) {
      return {
        agent: defaultAgent,
        score: 0.1,
        reason: '默认 Agent',
      }
    }

    return null
  }

  // ── 组件市场 ──

  async searchComponents(params: ComponentSearchParams): Promise<{
    data: ComponentDefinitionDocument[]
    total: number
    page: number
    limit: number
  }> {
    const { category, source, pricing, search, page = 1, limit = 20 } = params
    const filter: Record<string, any> = {
      enabled: true,
      reviewStatus: 'approved',
    }

    if (category) filter['category'] = category
    if (source) filter['source'] = source
    if (pricing) filter['pricing'] = pricing
    if (search) {
      filter['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const [data, total] = await Promise.all([
      this.componentModel.find(filter)
        .sort({ installCount: -1, rating: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.componentModel.countDocuments(filter),
    ])

    return { data, total, page, limit }
  }

  async getComponent(componentId: string): Promise<ComponentDefinitionDocument | null> {
    return this.componentModel.findOne({ componentId }).exec()
  }

  async createComponent(
    data: Partial<ComponentDefinition>,
  ): Promise<ComponentDefinitionDocument> {
    return this.componentModel.create(data)
  }

  // ── 用户组件安装 ──

  async installComponent(
    userId: string,
    componentId: string,
    config: Record<string, any> = {},
  ): Promise<UserInstalledComponentDocument> {
    // 检查组件是否存在
    const component = await this.componentModel.findOne({ componentId }).exec()
    if (!component) {
      throw new Error(`Component ${componentId} not found`)
    }

    // 更新安装计数
    await this.componentModel.findOneAndUpdate(
      { componentId },
      { $inc: { installCount: 1 } },
    )

    return this.installedModel.create({
      userId,
      componentId,
      config,
      installedAt: new Date(),
    })
  }

  async uninstallComponent(userId: string, componentId: string): Promise<void> {
    await this.installedModel.deleteOne({ userId, componentId })
    await this.componentModel.findOneAndUpdate(
      { componentId },
      { $inc: { installCount: -1 } },
    )
  }

  async listUserInstalledComponents(
    userId: string,
  ): Promise<UserInstalledComponentDocument[]> {
    return this.installedModel.find({ userId, enabled: true })
      .sort({ installedAt: -1 })
      .exec()
  }

  async toggleComponent(
    userId: string,
    componentId: string,
    enabled: boolean,
  ): Promise<void> {
    await this.installedModel.findOneAndUpdate(
      { userId, componentId },
      { $set: { enabled } },
    )
  }

  // ── 预设管理 ──

  /** 获取所有预置模板定义（供前端展示预设库） */
  getPresets(): AgentPreset[] {
    return AGENT_PRESETS
  }

  /** 获取某个预设的原始模板 */
  getPresetById(presetId: string): AgentPreset | undefined {
    return AGENT_PRESETS.find(p => p.presetId === presetId)
  }

  // ── 内置 Agent 初始化 ──

  /**
   * 为用户创建所有预置 Agent（幂等操作）
   * 首次调用：创建所有 preset 的副本
   * 再次调用：仅补充缺失的 preset（新增预设时用到）
   */
  async ensureDefaultAgents(userId: string): Promise<AgentDefinitionDocument[]> {
    const all: AgentDefinitionDocument[] = []

    for (const preset of AGENT_PRESETS) {
      const existing = await this.agentModel.findOne({
        userId,
        presetId: preset.presetId,
      }).exec()

      if (existing) {
        all.push(existing)
      } else {
        const created = await this.agentModel.create({
          userId,
          presetId: preset.presetId,
          name: preset.name,
          icon: preset.icon,
          description: preset.description,
          source: 'system',
          enabled: true,
          customized: false,
          avatar: preset.avatar,
          personality: preset.personality,
          wakeWords: preset.wakeWords,
          domains: preset.domains,
          intents: preset.intents,
          systemPrompt: preset.systemPrompt,
          sortOrder: preset.sortOrder,
          usageCount: 0,
        })
        all.push(created)
        this.logger.log(`Created preset Agent "${preset.name}" for userId=${userId}`)
      }
    }

    return all
  }

  /**
   * 将某个 Agent 重置为预设默认值
   */
  async resetAgentToPreset(
    agentId: string,
    userId: string,
  ): Promise<AgentDefinitionDocument | null> {
    const agent = await this.agentModel.findOne({ _id: agentId, userId }).exec()
    if (!agent || !agent.presetId) return null

    const preset = AGENT_PRESETS.find(p => p.presetId === agent.presetId)
    if (!preset) return null

    return this.agentModel.findOneAndUpdate(
      { _id: agentId, userId },
      {
        $set: {
          name: preset.name,
          icon: preset.icon,
          description: preset.description,
          avatar: preset.avatar,
          personality: preset.personality,
          wakeWords: preset.wakeWords,
          domains: preset.domains,
          intents: preset.intents,
          systemPrompt: preset.systemPrompt,
          sortOrder: preset.sortOrder,
          customized: false,
        },
      },
      { new: true },
    ).exec()
  }

  // ── Agent 定制（带 customized 标记） ──

  /**
   * 更新 Agent（自动标记为 customized）
   */
  async customizeAgent(
    agentId: string,
    userId: string,
    data: Partial<AgentDefinition>,
  ): Promise<AgentDefinitionDocument | null> {
    return this.agentModel.findOneAndUpdate(
      { _id: agentId, userId },
      {
        $set: {
          ...data,
          customized: true, // 自动标记为已定制
        },
      },
      { new: true },
    ).exec()
  }

  /**
   * 用户拖拽调整 Agent 排序
   */
  async reorderAgents(
    userId: string,
    orderedIds: string[],
  ): Promise<void> {
    const ops = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, userId },
        update: { $set: { sortOrder: index + 1 } },
      },
    }))
    await this.agentModel.bulkWrite(ops)
  }

  /**
   * 快速配置 Agent：一次性调整名称、形象、唤醒词和能力范围
   * 这是最常见的用户操作 — 在一个面板里完成所有设置
   */
  async quickConfig(
    agentId: string,
    userId: string,
    config: {
      name?: string
      icon?: string
      avatar?: { style?: 'css' | 'lottie'; appearance?: string; color?: string }
      personality?: { tone?: 'professional' | 'friendly' | 'humorous'; pace?: 'fast' | 'normal' | 'thoughtful'; proactivity?: number }
      wakeWords?: string[]
      intents?: string[]
      domains?: string[]
      enabled?: boolean
    },
  ): Promise<AgentDefinitionDocument | null> {
    const setFields: Record<string, any> = { customized: true }
    if (config.name !== undefined) setFields['name'] = config.name
    if (config.icon !== undefined) setFields['icon'] = config.icon
    if (config.enabled !== undefined) setFields['enabled'] = config.enabled
    if (config.wakeWords !== undefined) setFields['wakeWords'] = config.wakeWords
    if (config.intents !== undefined) setFields['intents'] = config.intents
    if (config.domains !== undefined) setFields['domains'] = config.domains

    if (config.avatar) {
      setFields['avatar'] = {}
      if (config.avatar.style) setFields['avatar'].style = config.avatar.style
      if (config.avatar.appearance) setFields['avatar'].appearance = config.avatar.appearance
      if (config.avatar.color) setFields['avatar'].color = config.avatar.color
    }

    if (config.personality) {
      setFields['personality'] = {}
      if (config.personality.tone) setFields['personality'].tone = config.personality.tone
      if (config.personality.pace) setFields['personality'].pace = config.personality.pace
      if (config.personality.proactivity !== undefined) setFields['personality'].proactivity = config.personality.proactivity
    }

    return this.agentModel.findOneAndUpdate(
      { _id: agentId, userId },
      { $set: setFields },
      { new: true },
    ).exec()
  }

  /**
   * 获取用户 Agent 的定制状态摘要
   * 前端用来展示「哪些 Agent 已被你自定义过」
   */
  async getCustomizationSummary(userId: string): Promise<{
    total: number
    customized: number
    agents: { id: string; name: string; presetId: string; customized: boolean }[]
  }> {
    const agents = await this.agentModel.find({
      userId,
      source: 'system',
      enabled: true,
    }).sort({ sortOrder: 1 }).exec()

    return {
      total: agents.length,
      customized: agents.filter(a => a.customized).length,
      agents: agents.map(a => ({
        id: a._id.toString(),
        name: a.name,
        presetId: a.presetId,
        customized: a.customized,
      })),
    }
  }

  /**
   * 初始化内置组件库
   */
  async ensureBuiltinComponents(): Promise<void> {
    const builtins = [
      {
        componentId: 'agent-chat',
        name: 'AI 对话',
        description: 'Agent 对话面板，支持多Agent切换和流式响应',
        category: 'agent',
        source: 'official',
        pricing: 'free',
        reviewStatus: 'approved',
        ui: { entry: 'AiChatPanel', props: {}, slots: ['main'], styles: 'inherited' },
        agentIntegration: {
          intents: ['*'],
          tools: [{ name: 'chat', description: '发送消息给Agent', parameters: { message: 'string' } }],
          prompt: '',
        },
      },
      {
        componentId: 'competitor-tracker',
        name: '竞品追踪',
        description: '自动监控竞品动态，发现变化主动提醒',
        category: 'analytics',
        source: 'official',
        pricing: 'free',
        reviewStatus: 'approved',
        ui: { entry: 'CompetitorTracker', props: {}, slots: ['sidebar', 'dashboard'], styles: 'inherited' },
        agentIntegration: {
          intents: ['competitor_analysis'],
          tools: [
            { name: 'track_competitor', description: '添加竞品监控', parameters: { name: 'string', platform: 'string' } },
            { name: 'get_competitor_report', description: '获取竞品报告', parameters: { competitorId: 'string' } },
          ],
          prompt: '你是竞品分析助手，专注于监控和分析竞品动态。',
        },
      },
      {
        componentId: 'content-planner',
        name: '内容规划',
        description: '选题建议+内容日历+发布排期',
        category: 'content',
        source: 'official',
        pricing: 'free',
        reviewStatus: 'approved',
        ui: { entry: 'ContentPlanner', props: {}, slots: ['dashboard'], styles: 'inherited' },
        agentIntegration: {
          intents: ['content_create', 'publish_content'],
          tools: [
            { name: 'suggest_topics', description: '基于热点和用户偏好推荐选题', parameters: { industry: 'string' } },
            { name: 'schedule_content', description: '排期内容发布', parameters: { contentId: 'string', scheduledAt: 'string' } },
          ],
          prompt: '你是内容规划助手，帮用户选题、排期、优化发布策略。',
        },
      },
      {
        componentId: 'smart-home',
        name: '全屋智能管家',
        description: '通用协议连接智能家居设备，一句话控制全屋电器',
        category: 'smart_home',
        source: 'official',
        pricing: 'free',
        reviewStatus: 'approved',
        sandboxRequired: false,
        ui: { entry: 'SmartHomeHub', props: {}, slots: ['widget'], styles: 'isolated' },
        endpoints: [
          { method: 'POST', path: '/api/smart-home/command', description: '发送设备控制指令' },
          { method: 'GET', path: '/api/smart-home/devices', description: '获取已连接设备列表' },
        ],
        agentIntegration: {
          intents: ['smart_home'],
          tools: [
            { name: 'control_device', description: '控制智能设备', parameters: { device: 'string', action: 'string', value: 'any' } },
            { name: 'list_devices', description: '列出所有设备', parameters: {} },
            { name: 'activate_scene', description: '激活场景模式', parameters: { scene: 'string' } },
          ],
          prompt: '你是全屋智能管家，通过Matter协议和HomeAssistant控制用户的智能家居设备。',
        },
      },
    ]

    for (const comp of builtins) {
      const existing = await this.componentModel.findOne({
        componentId: comp.componentId,
      }).exec()

      if (!existing) {
        await this.componentModel.create(comp)
        this.logger.log(`Created builtin component: ${comp.componentId}`)
      }
    }
  }
}
