/**
 * Model Module — MongoDB Schemas (模型集成后端支撑)
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { type HydratedDocument } from 'mongoose'

@Schema({ timestamps: true })
export class ModelConfig {
  @Prop({ required: true, unique: true })
  name!: string

  @Prop({ required: true })
  tier!: string

  @Prop({ required: true })
  provider!: string

  @Prop({ required: true })
  modelId!: string

  @Prop({ required: true })
  costPer1k!: number

  @Prop({ default: true })
  healthy!: boolean

  @Prop()
  apiBase?: string

  @Prop({ default: 500 })
  rpm!: number

  @Prop({ default: 100000 })
  tpm!: number

  @Prop({ default: 4096 })
  maxTokens!: number

  @Prop({ type: [String], default: [] })
  supports!: string[]
}

export type ModelConfigDocument = HydratedDocument<ModelConfig>
export const ModelConfigSchema = SchemaFactory.createForClass(ModelConfig)

@Schema({ timestamps: true })
export class ModelCallLog {
  @Prop({ required: true, index: true })
  model!: string

  @Prop({ required: true })
  scenario!: string

  @Prop({ default: true })
  success!: boolean

  @Prop({ required: true })
  latencyMs!: number

  @Prop({ type: Object, default: {} })
  tokensUsed!: { prompt: number; completion: number; total: number }

  @Prop({ default: 0 })
  cost!: number

  @Prop({ default: 0 })
  degradationTier!: number

  @Prop({ default: 'free' })
  userTier!: string

  @Prop({ default: Date.now })
  timestamp!: Date
}

export type ModelCallLogDocument = HydratedDocument<ModelCallLog>
export const ModelCallLogSchema = SchemaFactory.createForClass(ModelCallLog)
