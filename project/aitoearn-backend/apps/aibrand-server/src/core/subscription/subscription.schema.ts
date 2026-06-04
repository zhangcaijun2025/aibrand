import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { type HydratedDocument } from 'mongoose'

// ── Subscription Plan ──

@Schema({ timestamps: true })
export class SubscriptionPlan {
  @Prop({ required: true, unique: true })
  planId!: string // 'free' | 'pro' | 'enterprise'

  @Prop({ required: true })
  name!: string

  @Prop({ required: true })
  price!: number // 分 (cents)

  @Prop({ required: true })
  interval!: 'month' | 'year'

  @Prop({ default: 0 })
  maxAccounts!: number

  @Prop({ default: 0 })
  maxContentPerMonth!: number

  @Prop({ default: 0 })
  maxPlatforms!: number

  @Prop({ type: [String], default: [] })
  features!: string[]
}

export type SubscriptionPlanDocument = HydratedDocument<SubscriptionPlan>
export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan)

// ── User Subscription ──

@Schema({ timestamps: true })
export class UserSubscription {
  @Prop({ required: true, index: true })
  userId!: string

  @Prop({ required: true })
  planId!: string

  @Prop({ required: true, default: 'active' })
  status!: 'active' | 'canceled' | 'expired' | 'past_due'

  @Prop({ required: true })
  startedAt!: Date

  @Prop({ required: true })
  expiresAt!: Date

  @Prop({ default: true })
  autoRenew!: boolean

  @Prop({ default: 'stripe' })
  paymentMethod!: 'stripe' | 'alipay' | 'wechat' | 'manual'

  @Prop()
  stripeSubscriptionId?: string

  @Prop()
  alipayTradeNo?: string
}

export type UserSubscriptionDocument = HydratedDocument<UserSubscription>
export const UserSubscriptionSchema = SchemaFactory.createForClass(UserSubscription)

// ── Quota Usage (for tracking monthly consumption) ──

@Schema({ timestamps: true })
export class QuotaUsage {
  @Prop({ required: true, index: true })
  userId!: string

  @Prop({ required: true })
  action!: string // 'create_content' | 'publish' | 'ai_chat' | ...

  @Prop({ required: true })
  month!: string // '2026-06'

  @Prop({ default: 0 })
  count!: number
}

export type QuotaUsageDocument = HydratedDocument<QuotaUsage>
export const QuotaUsageSchema = SchemaFactory.createForClass(QuotaUsage)
