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

  // ── 内置 Agent 初始化 ──

  /**
   * 为用户创建默认的系统 Agent
   */
  async ensureDefaultAgents(userId: string): Promise<void> {
    const existing = await this.agentModel.findOne({
      userId,
      source: 'system',
    }).exec()

    if (!existing) {
      await this.agentModel.create({
        userId,
        name: '小A',
        description: '你的全能运营伙伴',
        source: 'system',
        enabled: true,
        avatar: {
          style: 'css',
          appearance: 'purple-cyan gradient orb',
          color: 'var(--brand-gradient)',
        },
        personality: {
          tone: 'friendly',
          pace: 'normal',
          proactivity: 0.7,
        },
        wakeWords: ['@小A', '小A'],
        domains: ['内容运营', '竞品分析', '数据分析', '多平台发布'],
        intents: [
          'content_create',
          'competitor_analysis',
          'publish_content',
          'analytics',
          'account_manage',
        ],
        systemPrompt: [
          '你是一个AI全域运营伙伴，名叫小A。',
          '你的用户是内容创作者/个体创业者。',
          '风格：干练、可靠、温暖，不废话不卖萌。',
          '每次回答前先理解用户真正需要什么。',
          '用户思路不清晰时，引导用户理清思路。',
          '失败时给出备选方案，不要只报错。',
          '记得上次对话的内容，保持连续性。',
          '庆祝用户的里程碑，不只是完成任务。',
        ].join('\n'),
      })
      this.logger.log(`Created default Agent for userId=${userId}`)
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
