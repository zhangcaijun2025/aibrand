/**
 * Order Schema - 积分购买订单
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type OrderDocument = Order & Document

export enum OrderStatus {
  Pending = 'pending',       // 待支付
  Paid = 'paid',             // 已支付
  Completed = 'completed',   // 已完成（积分已到账）
  Failed = 'failed',         // 支付失败
  Expired = 'expired',       // 已过期
  Refunded = 'refunded',     // 已退款
}

@Schema({
  collection: 'creditOrders',
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Order {
  id: string

  @Prop({ required: true, index: true })
  userId: string

  @Prop({ required: true })
  amount: number // 充值金额（元）

  @Prop({ required: true })
  credits: number // 到账积分

  @Prop({ required: true, unique: true })
  orderNo: string // 订单号 16 位

  @Prop({ required: true, enum: OrderStatus, default: OrderStatus.Pending })
  status: OrderStatus

  @Prop({ required: false })
  paymentMethod?: string // 支付方式: stripe / alipay / wechat

  @Prop({ required: false })
  paymentUrl?: string // 支付链接

  @Prop({ required: false })
  paidAt?: Date // 支付时间

  @Prop({ required: false })
  completedAt?: Date // 完成时间（积分到账）

  @Prop({ type: Object, required: false })
  metadata?: Record<string, unknown>
}

export const OrderSchema = SchemaFactory.createForClass(Order)
OrderSchema.index({ createdAt: -1 })
OrderSchema.index({ userId: 1, status: 1 })
