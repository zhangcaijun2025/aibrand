/**
 * Subscription API - 订阅计划与状态查询
 */

import http from '@/utils/request'

// ── Types ──

export interface PlanVo {
  planId: string
  name: string
  price: number
  interval: string
  maxAccounts: number
  maxContentPerMonth: number
  maxPlatforms: number
  features: string[]
}

export interface MySubscriptionVo {
  planId: string
  planName: string
  status: string
  startedAt: string
  expiresAt: string
  autoRenew: boolean
  quotaUsed: number
  quotaLimit: number
  features: string[]
}

export interface SubscribeResponseVo {
  paymentUrl: string
  orderId: string
}

// ── API Methods ──

/** 获取所有订阅计划 */
export function getSubscriptionPlansApi() {
  return http.get<{ plans: PlanVo[] }>('/user/subscription/plans')
}

/** 获取我的订阅状态 */
export function getMySubscriptionApi() {
  return http.get<MySubscriptionVo>('/user/subscription')
}

/** 订阅计划 */
export function subscribeApi(params: {
  planId: string
  interval: 'month' | 'year'
  paymentMethod: 'stripe' | 'alipay'
  returnUrl?: string
}) {
  return http.post<SubscribeResponseVo>('/user/subscription/subscribe', params)
}

/** 取消订阅 */
export function cancelSubscriptionApi() {
  return http.delete('/user/subscription')
}
