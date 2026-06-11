import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Cron, CronExpression } from '@nestjs/schedule'
import type {
  GeoRegionDocument, GeoAccountBindingDocument, GeoTemplateDocument,
  GeoScoreRecordDocument, GeoCitationEventDocument, GeoSentimentEventDocument,
  GeoPlatformRuleDocument, GeoCanaryDeployDocument, GeoHealthSnapshotDocument,
} from './geo.schema'

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name)

  constructor(
    @InjectModel('GeoRegion') private regionModel: Model<GeoRegionDocument>,
    @InjectModel('GeoAccountBinding') private accountBindingModel: Model<GeoAccountBindingDocument>,
    @InjectModel('GeoTemplate') private templateModel: Model<GeoTemplateDocument>,
    @InjectModel('GeoScoreRecord') private scoreModel: Model<GeoScoreRecordDocument>,
    @InjectModel('GeoCitationEvent') private citationModel: Model<GeoCitationEventDocument>,
    @InjectModel('GeoSentimentEvent') private sentimentModel: Model<GeoSentimentEventDocument>,
    @InjectModel('GeoPlatformRule') private ruleModel: Model<GeoPlatformRuleDocument>,
    @InjectModel('GeoCanaryDeploy') private canaryModel: Model<GeoCanaryDeployDocument>,
    @InjectModel('GeoHealthSnapshot') private healthModel: Model<GeoHealthSnapshotDocument>,
  ) {}

  /* ── Region Queries ── */

  async getAllRegions() {
    return this.regionModel.find().lean()
  }

  async getRegionByCode(code: string) {
    return this.regionModel.findOne({ code }).lean()
  }

  async searchRegions(query: string) {
    const re = new RegExp(query, 'i')
    return this.regionModel.find({ $or: [{ name: re }, { alias: re }] }).lean()
  }

  async getPlatformRules(platform?: string) {
    const filter = platform ? { platform } : {}
    return this.ruleModel.find(filter).lean()
  }

  /* ── Score Persistence ── */

  async saveScore(score: { title: string; overall: number; dimensions: Record<string, number>; platform: string }) {
    return this.scoreModel.create({ ...score, timestamp: new Date() })
  }

  async getScoreHistory(limit = 20) {
    return this.scoreModel.find().sort({ timestamp: -1 }).limit(limit).lean()
  }

  /* ── Citation Persistence ── */

  async saveCitation(event: { platform: string; prompt: string; promptType: string; brandMentioned: boolean; brandPosition: string }) {
    return this.citationModel.create({ ...event, timestamp: new Date() })
  }

  async getCitationHistory(limit = 50) {
    return this.citationModel.find().sort({ timestamp: -1 }).limit(limit).lean()
  }

  async getCitationStats() {
    const total = await this.citationModel.countDocuments()
    const mentioned = await this.citationModel.countDocuments({ brandMentioned: true })
    return { total, mentioned, mentionRate: total > 0 ? Math.round((mentioned / total) * 100) : 0 }
  }

  /* ── Sentiment Persistence ── */

  async saveSentiment(event: { content: string; sentiment: string; severity: string; topic: string }) {
    return this.sentimentModel.create({ ...event, timestamp: new Date() })
  }

  async getSentimentHistory(limit = 50) {
    return this.sentimentModel.find().sort({ timestamp: -1 }).limit(limit).lean()
  }

  /* ── Health Snapshot ── */

  async saveHealthSnapshot(snapshot: { overall: number; dsHealth: number; localHealth: number }) {
    return this.healthModel.create({ ...snapshot, timestamp: new Date() })
  }

  async getHealthHistory(limit = 30) {
    return this.healthModel.find().sort({ timestamp: -1 }).limit(limit).lean()
  }

  /* ── Templates ── */

  async getTemplates(platform?: string, status?: string) {
    const filter: any = {}
    if (platform) filter.platform = platform
    if (status) filter.status = status
    return this.templateModel.find(filter).lean()
  }

  async updateTemplateStatus(id: string, status: string) {
    const update: any = { status }
    if (status === 'deprecated') update.deprecatedAt = new Date()
    return this.templateModel.findByIdAndUpdate(id, update, { new: true }).lean()
  }

  /* ── Canary Deployments ── */

  async getActiveCanaryDeployments() {
    return this.canaryModel.find({ status: 'active' }).lean()
  }

  async saveCanaryDeployment(deploy: any) {
    return this.canaryModel.create(deploy)
  }

  /* ── Account Bindings ── */

  async bindAccount(binding: { accountId: string; platform: string; regionCodes: string[]; primaryRegion: string; radiateRegions: string[]; geoType: string }) {
    return this.accountBindingModel.findOneAndUpdate(
      { accountId: binding.accountId },
      binding,
      { upsert: true, new: true },
    ).lean()
  }

  async getAccountBindings(platform?: string) {
    const filter = platform ? { platform } : {}
    return this.accountBindingModel.find(filter).lean()
  }

  /* ── Health Check Cron ── */

  @Cron(CronExpression.EVERY_HOUR)
  async handleHealthSnapshot() {
    const [scoreCount, citationStats, sentimentCount] = await Promise.all([
      this.scoreModel.countDocuments(),
      this.getCitationStats(),
      this.sentimentModel.countDocuments(),
    ])
    this.logger.log(`GEO Health: ${scoreCount} scores, ${citationStats.total} citations, ${sentimentCount} sentiment events`)
  }
}
