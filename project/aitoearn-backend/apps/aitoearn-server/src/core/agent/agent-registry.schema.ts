import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { type HydratedDocument } from 'mongoose'

// ── Agent 定义 ──
// 用户可以创建自定义 Agent，配置名称/形象/性格/工具

@Schema({ timestamps: true })
export class AgentDefinition {
  @Prop({ required: true, index: true })
  userId!: string

  @Prop({ required: true })
  name!: string // "小A" / "运营喵" / ...

  @Prop({ default: '' })
  description!: string

  @Prop({ default: true })
  enabled!: boolean

  // 形象
  @Prop({
    type: {
      style: { type: String, enum: ['2d', '3d', 'lottie', 'css'], default: 'css' },
      appearance: String,
      color: String,
    },
    default: {},
  })
  avatar!: {
    style: '2d' | '3d' | 'lottie' | 'css'
    appearance: string
    color: string
  }

  // 性格
  @Prop({
    type: {
      tone: {
        type: String,
        enum: ['professional', 'friendly', 'humorous', 'custom'],
        default: 'friendly',
      },
      pace: {
        type: String,
        enum: ['fast', 'normal', 'thoughtful'],
        default: 'normal',
      },
      proactivity: { type: Number, default: 0.7, min: 0, max: 1 },
    },
    default: {},
  })
  personality!: {
    tone: 'professional' | 'friendly' | 'humorous' | 'custom'
    pace: 'fast' | 'normal' | 'thoughtful'
    proactivity: number
  }

  // 触发词
  @Prop({ type: [String], default: [] })
  wakeWords!: string[] // ["@小A", "小A在吗"]

  // 专属知识领域
  @Prop({ type: [String], default: [] })
  domains!: string[]

  // 处理的能力
  @Prop({ type: [String], default: [] })
  intents!: string[] // ["content_create", "competitor_analysis", ...]

  // System Prompt
  @Prop({ default: '' })
  systemPrompt!: string

  // 来源
  @Prop({ default: 'user' })
  source!: 'user' | 'marketplace' | 'system'

  // 安装的组件 ID 列表
  @Prop({ type: [String], default: [] })
  componentIds!: string[]

  @Prop({ default: 0 })
  usageCount!: number
}

export type AgentDefinitionDocument = HydratedDocument<AgentDefinition>
export const AgentDefinitionSchema = SchemaFactory.createForClass(AgentDefinition)

// ── 组件定义 ──
// 可安装的功能组件，来自官方/社区/用户自建

@Schema({ timestamps: true })
export class ComponentDefinition {
  @Prop({ required: true, unique: true })
  componentId!: string

  @Prop({ required: true })
  name!: string

  @Prop({ default: '' })
  description!: string

  @Prop({ default: '1.0.0' })
  version!: string

  @Prop({ required: true })
  author!: string

  @Prop({ default: 'official' })
  source!: 'official' | 'community' | 'user'

  // 分类
  @Prop({ required: true })
  category!: 'agent' | 'tool' | 'analytics' | 'content' | 'publish' | 'smart_home' | 'other'

  // 定价
  @Prop({ default: 'free' })
  pricing!: 'free' | 'paid' | 'subscription'

  // 前端 UI 入口
  @Prop({
    type: {
      entry: String,
      props: Object,
      slots: [String],
      styles: { type: String, enum: ['isolated', 'inherited'], default: 'isolated' },
    },
    default: {},
  })
  ui!: {
    entry: string
    props: Record<string, any>
    slots: string[]
    styles: 'isolated' | 'inherited'
  }

  // 后端能力
  @Prop({
    type: [{
      method: String,
      path: String,
      description: String,
    }],
    default: [],
  })
  endpoints!: { method: string; path: string; description: string }[]

  // Agent 集成
  @Prop({
    type: {
      intents: [String],
      tools: [{
        name: String,
        description: String,
        parameters: Object,
      }],
      prompt: String,
    },
    default: {},
  })
  agentIntegration!: {
    intents: string[]
    tools: { name: string; description: string; parameters: Record<string, any> }[]
    prompt: string
  }

  // 依赖
  @Prop({ type: [String], default: [] })
  dependencies!: string[]

  // 权限
  @Prop({ type: [String], default: [] })
  permissions!: string[]

  // 安全
  @Prop({ default: false })
  sandboxRequired!: boolean

  @Prop({ default: 'pending' })
  reviewStatus!: 'pending' | 'approved' | 'rejected'

  // 安装统计
  @Prop({ default: 0 })
  installCount!: number

  @Prop({ default: 0 })
  rating!: number

  @Prop({ default: true })
  enabled!: boolean
}

export type ComponentDefinitionDocument = HydratedDocument<ComponentDefinition>
export const ComponentDefinitionSchema = SchemaFactory.createForClass(ComponentDefinition)

// ── 用户已安装组件 ──

@Schema({ timestamps: true })
export class UserInstalledComponent {
  @Prop({ required: true, index: true })
  userId!: string

  @Prop({ required: true })
  componentId!: string

  @Prop({ default: true })
  enabled!: boolean

  @Prop({ type: Object, default: {} })
  config!: Record<string, any> // 用户自定义配置

  @Prop({ default: Date.now })
  installedAt!: Date
}

export type UserInstalledComponentDocument = HydratedDocument<UserInstalledComponent>
export const UserInstalledComponentSchema = SchemaFactory.createForClass(UserInstalledComponent)

// 复合唯一索引: 一个用户不能重复安装同一个组件
UserInstalledComponentSchema.index({ userId: 1, componentId: 1 }, { unique: true })
