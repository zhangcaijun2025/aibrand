import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { SubscriptionController } from './subscription.controller'
import { SubscriptionService } from './subscription.service'
import { SubscriptionRepository } from './subscription.repository'
import {
  UserSubscription,
  UserSubscriptionSchema,
  QuotaUsage,
  QuotaUsageSchema,
} from './subscription.schema'

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
