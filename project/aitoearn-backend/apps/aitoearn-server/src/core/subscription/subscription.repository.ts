import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { UserSubscription, UserSubscriptionDocument, QuotaUsage, QuotaUsageDocument } from './subscription.schema'

@Injectable()
export class SubscriptionRepository {
  constructor(
    @InjectModel(UserSubscription.name)
    private readonly subModel: Model<UserSubscriptionDocument>,

    @InjectModel(QuotaUsage.name)
    private readonly quotaModel: Model<QuotaUsageDocument>,
  ) {}

  // ── Subscription ──

  async getActiveByUserId(userId: string) {
    return this.subModel.findOne({ userId, status: { $in: ['active', 'past_due'] } }).lean().exec()
  }

  async getByUserId(userId: string) {
    return this.subModel.findOne({ userId }).sort({ createdAt: -1 }).lean().exec()
  }

  async create(data: Partial<UserSubscription>) {
    const doc = new this.subModel(data)
    return doc.save()
  }

  async updateStatus(id: string, status: string) {
    return this.subModel.findByIdAndUpdate(id, { status }, { new: true }).lean().exec()
  }

  // ── Quota ──

  async getMonthlyQuotaUsage(userId: string, action: string): Promise<number> {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const record = await this.quotaModel.findOne({ userId, action, month }).lean().exec()
    return record?.count || 0
  }

  async incrementQuota(userId: string, action: string, month: string): Promise<void> {
    await this.quotaModel.findOneAndUpdate(
      { userId, action, month },
      { $inc: { count: 1 } },
      { upsert: true, new: true },
    ).exec()
  }
}
