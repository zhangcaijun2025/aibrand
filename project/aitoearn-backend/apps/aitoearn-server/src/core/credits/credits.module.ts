import { Global, Module } from '@nestjs/common'
import { HelpersModule } from '@yikart/helpers'
import { CreditsPurchaseConsumer } from './credits-purchase.consumer'
import { CreditsRefundConsumer } from './credits-refund.consumer'
import { CreditsController } from './credits.controller'
import { CreditsOrderController } from './credits-order.controller'
import { CreditsWebhookController } from './credits-webhook.controller'
import { CreditsService } from './credits.service'

@Global()
@Module({
  imports: [
    HelpersModule,
  ],
  controllers: [CreditsController, CreditsOrderController, CreditsWebhookController],
  providers: [CreditsService, CreditsPurchaseConsumer, CreditsRefundConsumer],
  exports: [CreditsService],
})
export class CreditsModule { }
