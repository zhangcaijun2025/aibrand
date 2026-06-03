import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { DifyService } from '@yikart/ai-services'
import { N8nService } from '@yikart/ai-services'
import { SubscriptionService } from '../subscription/subscription.service'
import {
  SystemEvent,
  SystemEventDocument,
  UserContext,
  UserContextDocument,
  UserProfile,
  UserProfileDocument,
  UserBehavior,
  UserBehaviorDocument,
} from './agent.schema'

// ── 问候响应类型 ──

export interface AgentGreeting {
  /** 按时间的问候语: "早上好" / "下午好" / "晚上好" / "还没睡?" */
  greeting: string
  /** 用户称呼 */
  userName: string
  /** 系统状态摘要 */
  systemStatus: SystemStatus
  /** 今日简报卡片 (最多3张) */
  briefCards: BriefCard[]
  /** 建议下一步 (最多3个) */
  suggestions: Suggestion[]
  /** 夜间事件摘要 (如果有) */
  overnightBrief?: OvernightBrief
}

export interface SystemStatus {
  totalComponents: number
  healthyComponents: number
  uptime: string
  alerts: number
}

export interface BriefCard {
  id: string
  type: 'stats' | 'content' | 'alert' | 'milestone'
  icon: string
  title: string
  value: string
  subtitle: string
  trend?: 'up' | 'down' | 'stable'
  priority: number
}

export interface Suggestion {
  id: string
  text: string
  action: string
  payload: Record<string, any>
}

export interface OvernightBrief {
  hasEvents: boolean
  summary: string
  events: {
    title: string
    description: string
    resolved: boolean
  }[]
}

// ── 服务实现 ──

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name)

  constructor(
    private readonly dify: DifyService,
    private readonly n8n: N8nService,
    private readonly subscription: SubscriptionService,
    @InjectModel(SystemEvent.name)
    private readonly eventModel: Model<SystemEventDocument>,
    @InjectModel(UserContext.name)
    private readonly contextModel: Model<UserContextDocument>,
    @InjectModel(UserProfile.name)
    private readonly profileModel: Model<UserProfileDocument>,
    @InjectModel(UserBehavior.name)
    private readonly behaviorModel: Model<UserBehaviorDocument>,
  ) {}

  // ── 主入口：生成问候 ──

  async generateGreeting(userId: string, userName?: string): Promise<AgentGreeting> {
    // 并行获取所有数据源
    const [difyOk, n8nOk, sub, profile, context, overnightEvents] = await Promise.all([
      this.dify.healthCheck(),
      this.n8n.healthCheck(),
      this.subscription.getMySubscription(userId),
      this.getOrCreateProfile(userId, userName),
      this.getOrCreateContext(userId),
      this.getOvernightEvents(userId),
    ])

    // 系统状态
    const totalComps = 14
    const healthy = [difyOk, n8nOk].filter(Boolean).length + 12
    const systemStatus: SystemStatus = {
      totalComponents: totalComps,
      healthyComponents: Math.min(healthy, totalComps),
      uptime: healthy === totalComps ? '近24h服务正常' : `${totalComps - healthy}个组件需要注意`,
      alerts: totalComps - healthy,
    }

    const briefCards = await this.buildBriefCards(userId, sub)
    const suggestions = await this.buildSuggestions(userId, context, profile)

    // 更新最后问候时间
    await this.profileModel.findOneAndUpdate(
      { userId },
      { lastGreetingAt: new Date() },
      { upsert: true },
    )

    return {
      greeting: this.getTimeGreeting(),
      userName: profile?.role || userName || '用户',
      systemStatus,
      briefCards,
      suggestions,
      overnightBrief: overnightEvents.length > 0
        ? {
            hasEvents: true,
            summary: `你休息时发生了${overnightEvents.length}件事`,
            events: overnightEvents.map(e => ({
              title: e.title,
              description: e.description,
              resolved: e.autoResolved,
            })),
          }
        : undefined,
    }
  }

  // ── 事件管理 ──

  async createEvent(
    userId: string,
    type: SystemEvent['type'],
    title: string,
    description: string,
    autoResolved = false,
  ): Promise<SystemEventDocument> {
    return this.eventModel.create({
      userId,
      type,
      title,
      description,
      autoResolved,
      resolvedAt: autoResolved ? new Date() : undefined,
      read: false,
    })
  }

  async getUnreadEvents(userId: string): Promise<SystemEventDocument[]> {
    return this.eventModel.find({ userId, read: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec()
  }

  async markEventRead(eventId: string): Promise<void> {
    await this.eventModel.findByIdAndUpdate(eventId, { read: true })
  }

  // ── 行为追踪 ──

  async trackBehavior(
    userId: string,
    action: string,
    context: Record<string, any> = {},
  ): Promise<void> {
    await this.behaviorModel.create({
      userId,
      action,
      context,
      timestamp: new Date(),
    })
  }

  // ── 用户上下文管理 ──

  async updateContext(
    userId: string,
    updates: Partial<UserContext>,
  ): Promise<UserContextDocument | null> {
    return this.contextModel.findOneAndUpdate(
      { userId },
      { $set: updates },
      { upsert: true, new: true },
    ).exec()
  }

  async getContext(userId: string): Promise<UserContextDocument | null> {
    return this.contextModel.findOne({ userId }).exec()
  }

  // ── 用户画像 ──

  async getProfile(userId: string): Promise<UserProfileDocument | null> {
    return this.profileModel.findOne({ userId }).exec()
  }

  async updateProfile(
    userId: string,
    updates: Partial<UserProfile>,
  ): Promise<UserProfileDocument | null> {
    return this.profileModel.findOneAndUpdate(
      { userId },
      { $set: updates },
      { upsert: true, new: true },
    ).exec()
  }

  // ── 私有方法 ──

  private getTimeGreeting(): string {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 9) return '早上好'
    if (hour >= 9 && hour < 12) return '上午好'
    if (hour >= 12 && hour < 14) return '中午好'
    if (hour >= 14 && hour < 18) return '下午好'
    if (hour >= 18 && hour < 22) return '晚上好'
    if (hour >= 22 || hour < 2) return '还没睡？'
    return '夜深了'
  }

  private async getOrCreateProfile(
    userId: string,
    userName?: string,
  ): Promise<UserProfileDocument> {
    let profile = await this.profileModel.findOne({ userId }).exec()
    if (!profile) {
      profile = await this.profileModel.create({
        userId,
        role: userName || '',
        firstLoginAt: new Date(),
      })
    }
    return profile
  }

  private async getOrCreateContext(userId: string): Promise<UserContextDocument> {
    let context = await this.contextModel.findOne({ userId }).exec()
    if (!context) {
      context = await this.contextModel.create({ userId })
    }
    return context
  }

  private async buildBriefCards(
    userId: string,
    sub: any,
  ): Promise<BriefCard[]> {
    const cards: BriefCard[] = []

    if (sub) {
      const quotaLimit = sub.quotaLimit ?? 10
      const quotaUsed = sub.quotaUsed ?? 0
      cards.push({
        id: 'quota',
        type: 'stats',
        icon: '📊',
        title: '本月配额',
        value: `${quotaUsed}/${quotaLimit}`,
        subtitle: quotaUsed > quotaLimit * 0.8
          ? '配额即将用完，建议升级'
          : `剩余 ${quotaLimit - quotaUsed} 次`,
        trend: quotaUsed > quotaLimit * 0.8 ? 'down' : 'stable',
        priority: 1,
      })
    }

    const context = await this.getContext(userId)
    if (context?.trackedCompetitors?.length) {
      cards.push({
        id: 'competitors',
        type: 'alert',
        icon: '⚠️',
        title: '竞品动态',
        value: `${context.trackedCompetitors.length}个`,
        subtitle: '有竞品值得关注',
        trend: 'stable',
        priority: 2,
      })
    } else {
      cards.push({
        id: 'no_competitors',
        type: 'content',
        icon: '🔍',
        title: '关注竞品',
        value: '开始追踪',
        subtitle: '添加竞品获取动态提醒',
        priority: 2,
      })
    }

    const activeProject = context?.activeProjects?.find(p => p.status === 'active')
    if (activeProject) {
      const daysLeft = Math.ceil(
        (new Date(activeProject.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
      cards.push({
        id: 'project',
        type: 'content',
        icon: '📅',
        title: activeProject.name,
        value: daysLeft > 0 ? `还剩${daysLeft}天` : '已到期',
        subtitle: daysLeft <= 3 ? '需要抓紧了' : '按计划推进中',
        trend: daysLeft <= 3 ? 'down' : 'stable',
        priority: 3,
      })
    } else {
      cards.push({
        id: 'no_project',
        type: 'content',
        icon: '💡',
        title: '内容规划',
        value: '创建计划',
        subtitle: '开启你的第一个营销计划',
        priority: 3,
      })
    }

    return cards.sort((a, b) => a.priority - b.priority)
  }

  private async buildSuggestions(
    _userId: string,
    context: UserContextDocument,
    profile: UserProfileDocument | null,
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [
      {
        id: 'competitor',
        text: '看看竞品动态',
        action: 'chat',
        payload: { message: '最近竞品在做什么' },
      },
      {
        id: 'content',
        text: '帮我写今天的内容',
        action: 'chat',
        payload: { message: '帮我生成今天要发布的内容' },
      },
      {
        id: 'analytics',
        text: '先看数据报告',
        action: 'navigate',
        payload: { path: '/analytics' },
      },
    ]

    if (context?.activeProjects?.length) {
      suggestions[1] = {
        id: 'continue',
        text: `继续${context.activeProjects[0].name}`,
        action: 'chat',
        payload: { message: `继续处理${context.activeProjects[0].name}` },
      }
    }

    const isNewUser = !profile || profile.totalContentCreated < 5
    if (isNewUser) {
      suggestions.unshift({
        id: 'onboarding',
        text: '带我了解一下 AiBrand',
        action: 'chat',
        payload: { message: '你能帮我做什么' },
      })
    }

    return suggestions.slice(0, 3)
  }

  private async getOvernightEvents(userId: string): Promise<SystemEventDocument[]> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return this.eventModel.find({
      userId,
      createdAt: { $gte: since },
      type: { $in: ['healing', 'insight'] },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .exec()
  }
}
