/**
 * CreditsOrder DTO - 订单相关数据传输对象
 */
import { createZodDto } from '@yikart/common'
import { z } from 'zod'

// 创建订单
export const createOrderSchema = z.object({
  amount: z.number().min(10).describe('充值金额（元），最低10元'),
  planId: z.string().optional().describe('套餐标识'),
  paymentMethod: z.enum(['stripe', 'alipay', 'wechat']).optional().describe('支付方式'),
})

export class CreateOrderDto extends createZodDto(createOrderSchema, 'CreateOrderDto') {}

// 订单响应
export const orderVoSchema = z.object({
  orderId: z.string(),
  orderNo: z.string(),
  amount: z.number(),
  credits: z.number(),
  status: z.string(),
  paymentUrl: z.string().nullable().optional(),
  paymentQr: z.string().nullable().optional(),
  createdAt: z.string(),
})

export class OrderVo extends createZodDto(orderVoSchema, 'OrderVo') {}
