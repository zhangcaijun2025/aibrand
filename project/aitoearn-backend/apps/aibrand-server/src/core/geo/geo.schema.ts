/**
 * GEO Module — MongoDB Schemas
 *
 * 地域数据 / 模板 / 评分 / 引用 / 舆情 / 规则 / 灰度部署
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { type HydratedDocument } from 'mongoose'

/* ── GeoRegion (地域数据) ── */

@Schema({ timestamps: true })
export class GeoRegion {
  @Prop({ required: true, unique: true, index: true })
  code!: string

  @Prop({ required: true })
  name!: string

  @Prop({ required: true, enum: ['province', 'city', 'district', 'biz_area', 'poi'] })
  level!: string

  @Prop()
  parentCode?: string

  @Prop({ type: [String], default: [] })
  alias!: string[]

  @Prop({ type: Map, of: [String], default: {} })
  platformTags!: Record<string, string[]>

  @Prop({ type: [String], default: [] })
  poitypes!: string[]

  @Prop({ type: [String], default: [] })
  hotwords!: string[]
}

export type GeoRegionDocument = HydratedDocument<GeoRegion>
export const GeoRegionSchema = SchemaFactory.createForClass(GeoRegion)

/* ── GeoAccountBinding (账号地域绑定) ── */

@Schema({ timestamps: true })
export class GeoAccountBinding {
  @Prop({ required: true, index: true })
  accountId!: string

  @Prop({ required: true })
  platform!: string

  @Prop({ required: true, type: [String] })
  regionCodes!: string[]

  @Prop({ required: true })
  primaryRegion!: string

  @Prop({ type: [String], default: [] })
  radiateRegions!: string[]

  @Prop({ required: true, enum: ['local', 'national', 'overseas'], default: 'national' })
  geoType!: string
}

export type GeoAccountBindingDocument = HydratedDocument<GeoAccountBinding>
export const GeoAccountBindingSchema = SchemaFactory.createForClass(GeoAccountBinding)

/* ── GeoTemplate (地域内容模板) ── */

@Schema({ timestamps: true })
export class GeoTemplate {
  @Prop({ required: true })
  name!: string

  @Prop({ required: true })
  platform!: string

  @Prop({ type: [String], default: [] })
  regionCodes!: string[]

  @Prop({ required: true })
  content!: string

  @Prop({ default: 'system', enum: ['system', 'personal'] })
  source!: string

  @Prop({ default: 'active', enum: ['active', 'deprecated', 'draft'] })
  status!: string

  @Prop({ default: 0 })
  usageCount!: number

  @Prop({ default: 50 })
  avgEngagement!: number

  @Prop()
  deprecatedAt?: Date
}

export type GeoTemplateDocument = HydratedDocument<GeoTemplate>
export const GeoTemplateSchema = SchemaFactory.createForClass(GeoTemplate)

/* ── GeoScoreRecord (GEO评分记录) ── */

@Schema({ timestamps: true })
export class GeoScoreRecord {
  @Prop({ required: true })
  title!: string

  @Prop({ required: true })
  overall!: number

  @Prop({ type: Object, required: true })
  dimensions!: Record<string, number>

  @Prop({ required: true })
  platform!: string

  @Prop({ default: Date.now })
  timestamp!: Date
}

export type GeoScoreRecordDocument = HydratedDocument<GeoScoreRecord>
export const GeoScoreRecordSchema = SchemaFactory.createForClass(GeoScoreRecord)

/* ── GeoCitationEvent (引用监测事件) ── */

@Schema({ timestamps: true })
export class GeoCitationEvent {
  @Prop({ required: true })
  platform!: string

  @Prop({ required: true })
  prompt!: string

  @Prop({ default: 'informational' })
  promptType!: string

  @Prop({ default: false })
  brandMentioned!: boolean

  @Prop({ default: 'none' })
  brandPosition!: string

  @Prop({ default: Date.now })
  timestamp!: Date
}

export type GeoCitationEventDocument = HydratedDocument<GeoCitationEvent>
export const GeoCitationEventSchema = SchemaFactory.createForClass(GeoCitationEvent)

/* ── GeoSentimentEvent (舆情事件) ── */

@Schema({ timestamps: true })
export class GeoSentimentEvent {
  @Prop({ required: true })
  content!: string

  @Prop({ required: true, enum: ['positive', 'neutral', 'negative'] })
  sentiment!: string

  @Prop({ default: 'low', enum: ['low', 'medium', 'high', 'critical'] })
  severity!: string

  @Prop({ required: true })
  topic!: string

  @Prop()
  source?: string

  @Prop()
  actionTaken?: string

  @Prop({ default: Date.now })
  timestamp!: Date
}

export type GeoSentimentEventDocument = HydratedDocument<GeoSentimentEvent>
export const GeoSentimentEventSchema = SchemaFactory.createForClass(GeoSentimentEvent)

/* ── GeoPlatformRule (平台地域规则) ── */

@Schema({ timestamps: true })
export class GeoPlatformRule {
  @Prop({ required: true, index: true })
  platform!: string

  @Prop({ required: true })
  ruleType!: string

  @Prop({ required: true })
  description!: string

  @Prop({ type: Object, required: true })
  specification!: Record<string, any>

  @Prop({ default: Date.now })
  enforcedSince!: Date

  @Prop({ default: Date.now })
  lastVerified!: Date

  @Prop()
  source?: string
}

export type GeoPlatformRuleDocument = HydratedDocument<GeoPlatformRule>
export const GeoPlatformRuleSchema = SchemaFactory.createForClass(GeoPlatformRule)

/* ── GeoCanaryDeploy (灰度部署记录) ── */

@Schema({ timestamps: true })
export class GeoCanaryDeploy {
  @Prop({ required: true })
  proposalId!: string

  @Prop({ default: 'draft' })
  stage!: string

  @Prop({ required: true })
  targetModule!: string

  @Prop({ required: true })
  changeType!: string

  @Prop()
  changeDescription?: string

  @Prop({ default: 'low' })
  riskLevel!: string

  @Prop({ default: Date.now })
  startedAt!: Date

  @Prop()
  fullRolloutAt?: Date

  @Prop({ type: Object, default: {} })
  metrics!: { preScore: number; currentScore?: number; delta?: number }

  @Prop({ default: 'active', enum: ['active', 'completed', 'rolled_back'] })
  status!: string

  @Prop()
  rollbackReason?: string
}

export type GeoCanaryDeployDocument = HydratedDocument<GeoCanaryDeploy>
export const GeoCanaryDeploySchema = SchemaFactory.createForClass(GeoCanaryDeploy)

/* ── GeoHealthSnapshot (健康快照) ── */

@Schema({ timestamps: true })
export class GeoHealthSnapshot {
  @Prop({ required: true })
  overall!: number

  @Prop({ required: true })
  dsHealth!: number

  @Prop({ required: true })
  localHealth!: number

  @Prop({ default: Date.now })
  timestamp!: Date
}

export type GeoHealthSnapshotDocument = HydratedDocument<GeoHealthSnapshot>
export const GeoHealthSnapshotSchema = SchemaFactory.createForClass(GeoHealthSnapshot)
