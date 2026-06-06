/**
 * CreditsWebhookController - 支付回调 Webhook
 * Stripe Checkout Session 完成后的回调处理
 */
import { Controller, Headers, HttpException, HttpStatus, Logger, Post, RawBodyRequest, Req } from '@nestjs/common'
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
      this.logger.error('Stripe webhook: missing key or signature')
      throw new HttpException('Webhook configuration error', HttpStatus.BAD_REQUEST)
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
      this.logger.error('Stripe webhook processing error', error)
      // Stripe 需要非 2xx 状态码才会重试；200 会导致支付确认丢失
      const status = error instanceof Error && error.message.includes('signature')
        ? HttpStatus.BAD_REQUEST   // 签名错误 → 不重试
        : HttpStatus.INTERNAL_SERVER_ERROR // 其他错误 → Stripe 重试
      throw new HttpException('Webhook processing failed', status)
    }
  }
}
