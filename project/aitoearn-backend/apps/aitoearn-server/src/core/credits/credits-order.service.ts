/**
 * CreditsOrderService - 订单服务
 * 处理积分购买订单的创建、支付、完成
 */
import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { CreditsType } from '@yikart/common'
import { AddCreditsDto, CreditsHelperService } from '@yikart/helpers'
import { Redlock } from '@yikart/redlock'
import { Model } from 'mongoose'
import { RedlockKey } from '../../common/enums'
import { CreateOrderDto } from './credits-order.dto'
import { Order, OrderDocument, OrderStatus } from './credits-order.schema'

@Injectable()
export class CreditsOrderService {
  private readonly logger = new Logger(CreditsOrderService.name)

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly creditsHelper: CreditsHelperService,
  ) {}

  /** 生成 16 位订单号 */
  private generateOrderNo(): string {
    const now = new Date()
    const yymmdd = now.getFullYear().toString().slice(2) +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0')
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `AB${yymmdd}${rand}`
  }

  /** 计算金额对应的积分：1元 = 100积分/7 ≈ 14.28积分 */
  private calcCredits(amount: number): number {
    return Math.round(amount / 7 * 100)
  }

  /**
   * 创建订单
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    const credits = this.calcCredits(dto.amount)
    const orderNo = this.generateOrderNo()

    let paymentUrl: string | null = null

    // 尝试创建 Stripe Checkout Session
    if (dto.paymentMethod === 'stripe' || !dto.paymentMethod) {
      paymentUrl = await this.createStripePayment(orderNo, dto.amount, credits)
    }

    const order = await this.orderModel.create({
      userId,
      orderNo,
      amount: dto.amount,
      credits,
      status: OrderStatus.Pending,
      paymentMethod: dto.paymentMethod || 'stripe',
      paymentUrl,
      metadata: { planId: dto.planId },
    })

    this.logger.debug(`Order created: ${orderNo}, amount: ${dto.amount}, credits: ${credits}`)

    return {
      orderId: order.id,
      orderNo: order.orderNo,
      amount: order.amount,
      credits: order.credits,
      status: order.status,
      paymentUrl: order.paymentUrl || null,
      createdAt: order.createdAt?.toISOString?.() || new Date().toISOString(),
    }
  }

  /**
   * 创建 Stripe Checkout Session
   */
  private async createStripePayment(
    orderNo: string,
    amount: number,
    credits: number,
  ): Promise<string | null> {
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY
      if (!stripeKey) {
        this.logger.warn('STRIPE_SECRET_KEY not set, skipping Stripe payment')
        return null
      }

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Stripe = require('stripe')
      const stripe = new Stripe(stripeKey)

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:6060'

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `AiBrand 积分 - ${credits} Credits`,
              description: `¥${amount} → ${credits} credits`,
            },
            unit_amount: Math.round(amount / 7.2 * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${frontendUrl}/zh-CN/pricing?order=${orderNo}&status=success`,
        cancel_url: `${frontendUrl}/zh-CN/pricing?order=${orderNo}&status=cancel`,
        metadata: { orderNo },
      })

      return session.url || null
    }
    catch (error) {
      this.logger.error('Failed to create Stripe session', error)
      return null
    }
  }

  /**
   * 确认订单支付成功并发放积分
   */
  @Redlock(RedlockKey.CreditsExpirationCheck, 30, { throwOnFailure: true })
  async confirmOrder(orderNo: string): Promise<boolean> {
    const order = await this.orderModel.findOne({ orderNo })
    if (!order) {
      this.logger.warn(`Order not found: ${orderNo}`)
      return false
    }
    if (order.status !== OrderStatus.Pending) {
      this.logger.warn(`Order ${orderNo} already ${order.status}`)
      return false
    }

    // 标记已支付
    order.status = OrderStatus.Paid
    order.paidAt = new Date()
    await order.save()

    // 发放积分（使用现有 CreditsHelper，自动创建记录+更新余额）
    const addDto = AddCreditsDto.create({
      userId: order.userId,
      amount: order.credits,
      type: CreditsType.Purchase,
      description: `积分购买: ¥${order.amount} → ${order.credits} credits`,
      metadata: { orderNo, orderId: order.id },
    })
    await this.creditsHelper.addCredits(addDto)

    // 标记完成
    order.status = OrderStatus.Completed
    order.completedAt = new Date()
    await order.save()

    this.logger.debug(`Order ${orderNo} completed: ${order.credits} credits to ${order.userId}`)
    return true
  }

  /**
   * 手动确认订单（管理员用）
   */
  async adminConfirmOrder(orderNo: string): Promise<boolean> {
    return this.confirmOrder(orderNo)
  }

  /**
   * 查询订单状态
   */
  async getOrderStatus(orderNo: string) {
    const order = await this.orderModel.findOne({ orderNo }).lean()
    if (!order) return null
    return { status: order.status, orderNo: order.orderNo }
  }

  /**
   * 获取用户订单列表
   */
  async getUserOrders(userId: string, page = 1, pageSize = 20) {
    const [list, total] = await Promise.all([
      this.orderModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.orderModel.countDocuments({ userId }),
    ])
    return { list, total, page, pageSize }
  }
}
