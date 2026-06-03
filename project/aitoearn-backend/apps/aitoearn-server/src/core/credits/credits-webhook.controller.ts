/**
 * CreditsWebhookController - 支付回调 Webhook
 * Stripe Checkout Session 完成后的回调处理
 */
import { Controller, Headers, Logger, Post, RawBodyRequest, Req } from '@nestjs/common'
import { CreditsOrderService } from './credits-order.service'

@Controller('user/credits')
export class CreditsWebhookController {
  private readonly logger = new Logger(CreditsWebhookController.name)

  constructor(private readonly orderService: CreditsOrderService) {}

  @Post('webhook')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const stripeKey = process.env['STRIPE_SECRET_KEY']
    if (!stripeKey || !signature) {
      this.logger.warn('Stripe webhook: missing key or signature')
      return { received: true }
    }

    try {
      const Stripe = await import('stripe')
      const stripe = new Stripe.default(stripeKey)
      const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'] || ''

      const event = stripe.webhooks.constructEvent(
        req.body as any,
        signature,
        webhookSecret,
      )

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any
        const orderNo = session.metadata?.orderNo
        if (orderNo) {
          await this.orderService.confirmOrder(orderNo)
          this.logger.debug(`Payment confirmed for order: ${orderNo}`)
        }
      }

      return { received: true }
    }
    catch (error) {
      this.logger.error('Stripe webhook error', error)
      return { received: true }
    }
  }
}
