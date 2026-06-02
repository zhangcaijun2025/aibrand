/**
 * Payment API - 积分购买/充值接口
 */

import http from '@/utils/request'

/** 创建订单请求 */
export interface CreateOrderParams {
  /** 充值金额（元） */
  amount: number
  /** 套餐标识（可选，自定义充值可不传） */
  planId?: string
  /** 支付方式 */
  paymentMethod?: 'alipay' | 'wechat' | 'stripe'
}

/** 创建订单响应 */
export interface CreateOrderVo {
  /** 订单 ID */
  orderId: string
  /** 支付跳转 URL */
  paymentUrl?: string
  /** 支付二维码 URL */
  qrCodeUrl?: string
}

/**
 * 创建积分购买订单
 * POST /api/user/credits/orders
 */
export function createCreditOrderApi(params: CreateOrderParams) {
  return http.post<CreateOrderVo>('user/credits/orders', params)
}

/**
 * 查询订单状态
 * GET /api/user/credits/orders/:orderId
 */
export function getOrderStatusApi(orderId: string) {
  return http.get<{ status: string }>(`user/credits/orders/${orderId}`)
}
