import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { SubscriptionController } from './subscription.controller'
import { SubscriptionRepository } from './subscription.repository'
import {
  QuotaUsage,
  QuotaUsageSchema,
  UserSubscription,
  UserSubscriptionSchema,
} from './subscription.schema'
import { SubscriptionService } from './subscription.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSubscription.name, schema: UserSubscriptionSchema },
      { name: QuotaUsage.name, schema: QuotaUsageSchema },
    ]),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionRepository],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
