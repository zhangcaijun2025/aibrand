import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Cron } from '@nestjs/schedule'
import type { ModelConfigDocument, ModelCallLogDocument } from './model.schema'

@Injectable()
export class ModelService {
  private readonly logger = new Logger(ModelService.name)

  constructor(
    @InjectModel('ModelConfig') private configModel: Model<ModelConfigDocument>,
    @InjectModel('ModelCallLog') private logModel: Model<ModelCallLogDocument>,
  ) {}

  async seedDefaults(): Promise<void> {
    const defaults = [
      { name: 'claude-opus', tier: 'T0', provider: 'anthropic', modelId: 'claude-opus-4-8', costPer1k: 0.015, rpm: 20, supports: ['evolution_proposal','deep_analysis'] },
      { name: 'claude-sonnet', tier: 'T1', provider: 'anthropic', modelId: 'claude-sonnet-4-6', costPer1k: 0.003, rpm: 50, supports: ['content_creation','quality_check','geo_writing'] },
      { name: 'deepseek-r1', tier: 'T1', provider: 'deepseek', modelId: 'deepseek-reasoner', costPer1k: 0.002, rpm: 100, supports: ['reasoning','analysis'] },
      { name: 'claude-haiku', tier: 'T2', provider: 'anthropic', modelId: 'claude-haiku-4-5', costPer1k: 0.0008, rpm: 200, supports: ['reply','classification','summary'] },
      { name: 'deepseek-v3', tier: 'T3', provider: 'deepseek', modelId: 'deepseek-chat', costPer1k: 0.00028, rpm: 500, supports: ['completion','reply','basic_qa'] },
    ]
    for (const d of defaults) {
      await this.configModel.updateOne({ name: d.name }, d, { upsert: true })
    }
  }

  async getConfigs() { return this.configModel.find().lean() }
  async getConfig(name: string) { return this.configModel.findOne({ name }).lean() }
  async updateHealth(name: string, healthy: boolean, error?: string) {
    return this.configModel.updateOne({ name }, { healthy, ...(error ? { lastError: error } : {}) })
  }

  async logCall(log: any) { return this.logModel.create(log) }
  async getMetrics(windowMs: number = 3600000) {
    const since = new Date(Date.now() - windowMs)
    const logs = await this.logModel.find({ timestamp: { $gte: since } }).lean()
    const total = logs.length
    const totalCost = logs.reduce((s, l) => s + (l.cost || 0), 0)
    const totalTokens = logs.reduce((s, l) => s + (l.tokensUsed?.total || 0), 0)
    const byModel: Record<string, any> = {}
    for (const l of logs) {
      if (!byModel[l.model]) byModel[l.model] = { calls: 0, success: 0, latency: 0 }
      byModel[l.model].calls++
      if (l.success) byModel[l.model].success++
      byModel[l.model].latency += l.latencyMs
    }
    for (const m of Object.keys(byModel)) {
      byModel[m].successRate = Math.round((byModel[m].success / byModel[m].calls) * 100)
      byModel[m].avgLatency = Math.round(byModel[m].latency / byModel[m].calls)
    }
    return { total, totalCost: Math.round(totalCost * 10000) / 10000, totalTokens, byModel }
  }

  @Cron('0 */6 * * * *')
  async handleMetricsSnapshot() {
    const metrics = await this.getMetrics(3600000)
    this.logger.log(`Model metrics: ${metrics.total} calls, $${metrics.totalCost}`)
  }
}
