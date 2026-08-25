import { Global, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { HelpersModule } from '@yikart/helpers'
import { CreditsOrderController } from './credits-order.controller'
import { Order, OrderSchema } from './credits-order.schema'
import { CreditsOrderService } from './credits-order.service'
import { CreditsPurchaseConsumer } from './credits-purchase.consumer'
import { CreditsRefundConsumer } from './credits-refund.consumer'
import { CreditsWebhookController } from './credits-webhook.controller'
import { CreditsController } from './credits.controller'
import { CreditsService } from './credits.service'

@Global()
@Module({
  imports: [
    HelpersModule,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [CreditsController, CreditsOrderController, CreditsWebhookController],
  providers: [CreditsService, CreditsOrderService, CreditsPurchaseConsumer, CreditsRefundConsumer],
  exports: [CreditsService, CreditsOrderService],
})
export class CreditsModule { }
