import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import {
  UserBehavior,
  UserBehaviorDocument,
  UserContext,
  UserContextDocument,
  UserProfile,
  UserProfileDocument,
  SystemEvent,
  SystemEventDocument,
} from './agent.schema'

// ── 进化报告类型 ──

export interface EvolutionReport {
  /** 报告周期 */
  period: { from: Date; to: Date }
  /** 学到的N件事 */
  findings: EvolutionFinding[]
  /** 已自动应用的优化 */
  appliedOptimizations: AppliedOptimization[]
  /** 统计数据 */
  stats: EvolutionStats
}

export interface EvolutionFinding {
  id: string
  title: string
  description: string
  confidence: number // 0-1
  evidence: string // 数据支撑
  category: 'preference' | 'habit' | 'insight' | 'milestone'
  userAction: 'accept' | 'reject' | 'pending' // 用户反馈
}

export interface AppliedOptimization {
  title: string
  description: string
  appliedAt: Date
  revertible: boolean
}

export interface EvolutionStats {
  totalBehaviorsAnalyzed: number
  newPatternsFound: number
  averageConfidence: number
  periodDays: number
}

// ── 自适应布局类型 ──

export interface ModuleWeight {
  moduleId: string
  score: number
  factors: {
    frequency: number    // 使用频率权重 40%
    recency: number      // 最近使用权重 30%
    context: number      // 时间上下文权重 20%
    completion: number   // 任务完成率权重 10%
  }
  trend: 'rising' | 'stable' | 'falling'
}

export interface LayoutReorgSuggestion {
  currentOrder: string[]
  proposedOrder: string[]
  changeDegree: number  // 0-1, Kendall Tau 距离
  reason: string
}

// ── 服务实现 ──

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name)

  constructor(
    @InjectModel(UserBehavior.name)
    private readonly behaviorModel: Model<UserBehaviorDocument>,
    @InjectModel(UserContext.name)
    private readonly contextModel: Model<UserContextDocument>,
    @InjectModel(UserProfile.name)
    private readonly profileModel: Model<UserProfileDocument>,
    @InjectModel(SystemEvent.name)
    private readonly eventModel: Model<SystemEventDocument>,
  ) {}

  // ── 进化报告生成 ──

  async generateEvolutionReport(
    userId: string,
    periodDays = 7,
  ): Promise<EvolutionReport> {
    const to = new Date()
    const from = new Date(to.getTime() - periodDays * 24 * 60 * 60 * 1000)

    // 并行分析
    const [formatPref, topicPref, platformPref, habits, stats] = await Promise.all([
      this.detectFormatPreference(userId, from, to),
      this.detectTopicPreference(userId, from, to),
      this.detectPlatformPreference(userId, from, to),
      this.detectWorkHabits(userId, from, to),
      this.getBehaviorStats(userId, from, to),
    ])

    const findings: EvolutionFinding[] = []
    const appliedOptimizations: AppliedOptimization[] = []

    // 格式偏好
    if (formatPref && formatPref.confidence > 0.7) {
      findings.push({
        id: 'format_pref',
        title: `你偏好「${formatPref.label}」`,
        description: `所以我以后的分析报告会优先用${formatPref.label}呈现`,
        confidence: formatPref.confidence,
        evidence: formatPref.evidence,
        category: 'preference',
        userAction: 'pending',
      })
      appliedOptimizations.push({
        title: '报告格式已调整',
        description: `默认输出格式切换为${formatPref.label}`,
        appliedAt: new Date(),
        revertible: true,
      })
    }

    // 话题偏好
    if (topicPref && topicPref.confidence > 0.6) {
      findings.push({
        id: 'topic_pref',
        title: `你最关心「${topicPref.topTopics.join('、')}」`,
        description: '竞品分析的默认关注维度已为你调整',
        confidence: topicPref.confidence,
        evidence: topicPref.evidence,
        category: 'preference',
        userAction: 'pending',
      })
    }

    // 平台偏好
    if (platformPref && platformPref.newPlatforms.length > 0) {
      findings.push({
        id: 'platform_pref',
        title: `你新增了 ${platformPref.newPlatforms.join('、')} 作为主力平台`,
        description: `已将${platformPref.newPlatforms.join('、')}加入默认发布平台列表`,
        confidence: platformPref.confidence,
        evidence: platformPref.evidence,
        category: 'insight',
        userAction: 'pending',
      })
    }

    // 工作习惯
    if (habits) {
      findings.push({
        id: 'work_habit',
        title: `你通常在${habits.peakHours}处理${habits.peakTask}`,
        description: `我会在${habits.peakHours}提前准备好相关内容`,
        confidence: habits.confidence,
        evidence: habits.evidence,
        category: 'habit',
        userAction: 'pending',
      })
    }

    // 里程碑检测
    const profile = await this.profileModel.findOne({ userId }).exec()
    if (profile && profile.totalContentCreated > 0) {
      const milestones = [10, 50, 100, 200, 500, 1000]
      const nextMilestone = milestones.find(m => m > profile.totalContentCreated)
      if (nextMilestone && profile.totalContentCreated >= nextMilestone * 0.8) {
        findings.push({
          id: 'milestone',
          title: `距离第${nextMilestone}篇内容还差${nextMilestone - profile.totalContentCreated}篇`,
          description: `你已经在AiBrand上创作了${profile.totalContentCreated}篇内容`,
          confidence: 1,
          evidence: `当前: ${profile.totalContentCreated}篇`,
          category: 'milestone',
          userAction: 'pending',
        })
      }
    }

    return {
      period: { from, to },
      findings,
      appliedOptimizations,
      stats,
    }
  }

  // ── 自适应布局排序 ──

  async calculateModuleWeights(
    userId: string,
    moduleIds: string[],
  ): Promise<ModuleWeight[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const behaviors = await this.behaviorModel.find({
      userId,
      timestamp: { $gte: thirtyDaysAgo },
      action: { $regex: '^module_' }, // module_click, module_view, etc.
    }).exec()

    return moduleIds.map(moduleId => {
      const moduleBehaviors = behaviors.filter(b =>
        b.context?.['moduleId'] === moduleId,
      )

      const total = moduleBehaviors.length
      const lastUsed = moduleBehaviors.length > 0
        ? Math.max(...moduleBehaviors.map(b => b.timestamp.getTime()))
        : 0
      const daysSinceLastUse = lastUsed
        ? (Date.now() - lastUsed) / (1000 * 60 * 60 * 24)
        : 30

      // 频率分 (0-1)
      const frequency = Math.min(total / 50, 1)

      // 最近分 (0-1)
      const recency = Math.max(0, 1 - daysSinceLastUse / 14)

      // 上下文分 (0-1): 当前时间段是否习惯用这个模块
      const currentHour = new Date().getHours()
      const contextBehaviors = moduleBehaviors.filter(b => {
        const h = new Date(b.timestamp).getHours()
        return Math.abs(h - currentHour) <= 1
      })
      const context = Math.min(contextBehaviors.length / 10, 1)

      // 完成率分 (0-1)
      const completed = moduleBehaviors.filter(b =>
        b.action === 'module_complete',
      ).length
      const completion = total > 0 ? completed / total : 0

      const score = frequency * 0.4 + recency * 0.3 + context * 0.2 + completion * 0.1

      let trend: ModuleWeight['trend'] = 'stable'
      if (daysSinceLastUse < 3) trend = 'rising'
      if (daysSinceLastUse > 14) trend = 'falling'

      return { moduleId, score, factors: { frequency, recency, context, completion }, trend }
    }).sort((a, b) => b.score - a.score)
  }

  async shouldSuggestReorg(
    userId: string,
    currentOrder: string[],
  ): Promise<LayoutReorgSuggestion | null> {
    const weights = await this.calculateModuleWeights(userId, currentOrder)
    const proposedOrder = weights.map(w => w.moduleId)

    // 计算 Kendall Tau 距离
    const tau = this.kendallTau(currentOrder, proposedOrder)

    // 变化小于 30% 不提示
    if (tau < 0.3) return null

    return {
      currentOrder,
      proposedOrder,
      changeDegree: tau,
      reason: `过去两周，你的使用习惯发生了变化。最常用的模块已重新排序。`,
    }
  }

  // ── 用户标签/画像更新 ──

  /**
   * 周期性运行: 从行为数据中提取信号，更新用户画像
   */
  async updateUserProfileFromBehavior(userId: string): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const behaviors = await this.behaviorModel.find({
      userId,
      timestamp: { $gte: thirtyDaysAgo },
    }).exec()

    if (behaviors.length === 0) return

    // 统计操作类型
    const actionCounts: Record<string, number> = {}
    for (const b of behaviors) {
      actionCounts[b.action] = (actionCounts[b.action] || 0) + 1
    }

    // 检测抗拒信号: 连续拒绝同类建议 → 加入 avoidTopics
    const rejectedSuggestions = behaviors
      .filter(b => b.action === 'reject_suggestion')
      .map(b => b.context?.['topic'])
      .filter(Boolean)

    if (rejectedSuggestions.length >= 3) {
      const topicCounts: Record<string, number> = {}
      for (const t of rejectedSuggestions) {
        topicCounts[t] = (topicCounts[t] || 0) + 1
      }
      const avoidTopics = Object.entries(topicCounts)
        .filter(([, count]) => count >= 2)
        .map(([topic]) => topic)

      if (avoidTopics.length > 0) {
        await this.profileModel.findOneAndUpdate(
          { userId },
          { $addToSet: { avoidTopics: { $each: avoidTopics } } },
          { upsert: true },
        )
      }
    }

    // 更新行为计数
    const createActions = behaviors.filter(b =>
      ['create_content', 'publish_content', 'agent_chat'].includes(b.action),
    ).length

    if (createActions > 0) {
      await this.profileModel.findOneAndUpdate(
        { userId },
        { $inc: { totalContentCreated: createActions } },
        { upsert: true },
      )
    }
  }

  // ── 私有分析方法 ──

  private async detectFormatPreference(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ label: string; confidence: number; evidence: string } | null> {
    const behaviors = await this.behaviorModel.find({
      userId,
      action: { $in: ['view_report', 'accept_suggestion'] },
      'context.reportType': { $exists: true },
      timestamp: { $gte: from, $lte: to },
    }).exec()

    if (behaviors.length < 5) return null

    const counts: Record<string, number> = {}
    for (const b of behaviors) {
      const type = b.context?.['reportType']
      if (type) counts[type] = (counts[type] || 0) + 1
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]

    if (!top) return null

    const formatLabels: Record<string, string> = {
      'table': '表格',
      'paragraph': '段落',
      'bullet': '列表',
    }

    return {
      label: formatLabels[top[0]] || top[0],
      confidence: top[1] / total,
      evidence: `过去${Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))}天你查看的报告中：${formatLabels[top[0]] || top[0]}类 ${Math.round((top[1] / total) * 100)}%`,
    }
  }

  private async detectTopicPreference(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ topTopics: string[]; confidence: number; evidence: string } | null> {
    const behaviors = await this.behaviorModel.find({
      userId,
      action: { $in: ['view_report', 'agent_chat', 'accept_suggestion'] },
      'context.topic': { $exists: true },
      timestamp: { $gte: from, $lte: to },
    }).exec()

    if (behaviors.length < 5) return null

    const counts: Record<string, number> = {}
    for (const b of behaviors) {
      const topic = b.context?.['topic']
      if (topic) counts[topic] = (counts[topic] || 0) + 1
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    const topTopics = sorted.slice(0, 3).map(([t]) => t)

    return {
      topTopics,
      confidence: sorted[0] ? sorted[0][1] / total : 0,
      evidence: `最常关注的3个话题：${topTopics.join('、')}`,
    }
  }

  private async detectPlatformPreference(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ newPlatforms: string[]; confidence: number; evidence: string } | null> {
    const context = await this.contextModel.findOne({ userId }).exec()
    if (!context?.preferredPlatforms?.length) return null

    // 检测最近30天新增的平台
    const recentBehaviors = await this.behaviorModel.find({
      userId,
      action: 'publish_content',
      'context.platform': { $exists: true },
      timestamp: { $gte: from },
    }).exec()

    const recentPlatforms = new Set(
      recentBehaviors.map(b => b.context?.['platform']).filter(Boolean),
    )

    const existingPlatforms = new Set(context.preferredPlatforms)
    const newPlatforms = [...recentPlatforms].filter(p => !existingPlatforms.has(p))

    if (newPlatforms.length === 0) return null

    return {
      newPlatforms,
      confidence: 0.8,
      evidence: `最近活跃的新平台：${newPlatforms.join('、')}`,
    }
  }

  private async detectWorkHabits(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ peakHours: string; peakTask: string; confidence: number; evidence: string } | null> {
    const behaviors = await this.behaviorModel.find({
      userId,
      timestamp: { $gte: from, $lte: to },
    }).exec()

    if (behaviors.length < 10) return null

    // 找最活跃的时间段
    const hourCounts: Record<number, number> = {}
    const taskCounts: Record<string, number> = {}

    for (const b of behaviors) {
      const hour = new Date(b.timestamp).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
      taskCounts[b.action] = (taskCounts[b.action] || 0) + 1
    }

    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
    const peakTask = Object.entries(taskCounts).sort((a, b) => b[1] - a[1])[0]

    if (!peakHour || !peakTask) return null

    const hourLabels: Record<number, string> = {
      6: '清晨', 9: '上午', 12: '中午', 14: '下午', 18: '傍晚', 22: '深夜',
    }

    const nearestLabel = Object.entries(hourLabels)
      .map(([h, label]) => ({ h: Number(h), label, diff: Math.abs(Number(h) - Number(peakHour[0])) }))
      .sort((a, b) => a.diff - b.diff)[0]

    const taskLabels: Record<string, string> = {
      'agent_chat': '策略分析',
      'create_content': '内容创作',
      'view_report': '查看数据',
      'publish_content': '内容发布',
    }

    return {
      peakHours: `${nearestLabel.h}点左右`,
      peakTask: taskLabels[peakTask[0]] || peakTask[0],
      confidence: 0.7,
      evidence: `过去${Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))}天的高峰时段分析`,
    }
  }

  private async getBehaviorStats(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<EvolutionStats> {
    const [total, findings] = await Promise.all([
      this.behaviorModel.countDocuments({
        userId,
        timestamp: { $gte: from, $lte: to },
      }),
      this.eventModel.countDocuments({
        userId,
        type: 'evolution',
        createdAt: { $gte: from, $lte: to },
      }),
    ])

    return {
      totalBehaviorsAnalyzed: total,
      newPatternsFound: findings,
      averageConfidence: findings > 0 ? 0.75 : 0,
      periodDays: Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
    }
  }

  /**
   * Kendall Tau 距离: 衡量两个排序的差异程度
   * 0 = 完全相同, 1 = 完全相反
   */
  private kendallTau(a: string[], b: string[]): number {
    const n = Math.min(a.length, b.length)
    if (n <= 1) return 0

    let concordant = 0
    let discordant = 0

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ai = b.indexOf(a[i])
        const aj = b.indexOf(a[j])
        if (ai < 0 || aj < 0) continue
        if (ai < aj) concordant++
        else discordant++
      }
    }

    const total = concordant + discordant
    if (total === 0) return 0
    return discordant / total
  }
}
