import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { type HydratedDocument } from 'mongoose'

// ── System Event (系统事件日志) ──
// 记录 Agent 在后台做的所有事：自愈、洞察、里程碑

@Schema({ timestamps: true })
export class SystemEvent {
  @Prop({ required: true, index: true })
  userId!: string

  @Prop({ required: true })
  type!: 'healing' | 'insight' | 'milestone' | 'evolution'

  @Prop({ required: true })
  title!: string

  @Prop({ required: true })
  description!: string

  @Prop({ default: false })
  autoResolved!: boolean

  @Prop()
  resolvedAt?: Date

  @Prop({ default: false })
  read!: boolean
}

export type SystemEventDocument = HydratedDocument<SystemEvent>
export const SystemEventSchema = SchemaFactory.createForClass(SystemEvent)

// ── User Context (跨会话上下文) ──
// L2 记忆：用户在做什么，关注什么，偏好什么

@Schema({ timestamps: true })
export class UserContext {
  @Prop({ required: true, unique: true, index: true })
  userId!: string

  // 竞品关注
  @Prop({ type: [String], default: [] })
  trackedCompetitors!: string[]

  // 进行中的项目
  @Prop({
    type: [{
      name: String,
      deadline: Date,
      status: { type: String, enum: ['planning', 'active', 'completed'] },
    }],
    default: [],
  })
  activeProjects!: { name: string; deadline: Date; status: string }[]

  // 最近会话摘要
  @Prop({
    type: [{
      date: Date,
      topic: String,
      keyFindings: [String],
      userFeedback: { type: String, enum: ['positive', 'neutral', 'negative'] },
    }],
    default: [],
  })
  recentSessions!: {
    date: Date
    topic: string
    keyFindings: string[]
    userFeedback: 'positive' | 'neutral' | 'negative'
  }[]

  // 内容偏好
  @Prop({ type: [String], default: [] })
  preferredPlatforms!: string[]

  @Prop({ default: '' })
  preferredStyle!: string

  @Prop({ default: 'auto' })
  preferredFormat!: 'table' | 'paragraph' | 'bullet' | 'auto'
}

export type UserContextDocument = HydratedDocument<UserContext>
export const UserContextSchema = SchemaFactory.createForClass(UserContext)

// ── User Profile (长期画像) ──
// L3 记忆：你是谁，你的成长曲线

@Schema({ timestamps: true })
export class UserProfile {
  @Prop({ required: true, unique: true, index: true })
  userId!: string

  @Prop({ default: '' })
  industry!: string

  @Prop({ default: '' })
  role!: string

  // 成长指标
  @Prop({ default: 0 })
  totalContentCreated!: number

  @Prop({ default: 0 })
  totalPlatformsConnected!: number

  @Prop({ type: Date, default: Date.now })
  firstLoginAt!: Date

  @Prop()
  lastGreetingAt?: Date

  // 里程碑
  @Prop({
    type: [{
      date: Date,
      title: String,
      description: String,
    }],
    default: [],
  })
  milestones!: { date: Date; title: string; description: string }[]

  // 学习到的信号
  @Prop({ type: [String], default: [] })
  strengths!: string[] // 用户长项

  @Prop({ type: [String], default: [] })
  avoidTopics!: string[] // 抗拒信号

  @Prop({ default: false })
  onboardingComplete!: boolean
}

export type UserProfileDocument = HydratedDocument<UserProfile>
export const UserProfileSchema = SchemaFactory.createForClass(UserProfile)

// ── User Behavior (行为埋点) ──
// 所有用户操作的事件流，供进化引擎分析

@Schema({ timestamps: true })
export class UserBehavior {
  @Prop({ required: true, index: true })
  userId!: string

  @Prop({ required: true })
  action!: string // 'view_report' | 'accept_suggestion' | 'reject_suggestion' | 'edit_content' | ...

  @Prop({ type: Object, default: {} })
  context!: Record<string, any>

  @Prop({ default: Date.now })
  timestamp!: Date
}

export type UserBehaviorDocument = HydratedDocument<UserBehavior>
export const UserBehaviorSchema = SchemaFactory.createForClass(UserBehavior)
