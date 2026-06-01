/**
 * useSubscription — 订阅状态与配额检查 Hook
 *
 * 用法:
 *   const { plan, quotaUsed, quotaLimit, canCreate, checkQuota } = useSubscription()
 *   if (!canCreate) return toast.error('本月配额已用完，请升级')
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { getMySubscriptionApi, type MySubscriptionVo } from '@/api/subscription'
import { useUserStore } from '@/store/user'

export function useSubscription() {
  const token = useUserStore(state => state.token)
  const [sub, setSub] = useState<MySubscriptionVo | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSubscription = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await getMySubscriptionApi()
      if (res?.data) {
        setSub(res.data as MySubscriptionVo)
      }
    } catch {
      // 未订阅时 API 可能 404，使用默认 free 计划
      setSub(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  // 当前计划
  const plan = sub?.planId || 'free'
  const planName = sub?.planName || '免费版'
  const quotaUsed = sub?.quotaUsed ?? 0
  const quotaLimit = sub?.quotaLimit ?? 10
  const quotaPercent = quotaLimit > 0 ? Math.round((quotaUsed / quotaLimit) * 100) : 0

  // 是否还能创建内容
  const canCreate = quotaUsed < quotaLimit

  // 剩余配额
  const quotaRemaining = Math.max(0, quotaLimit - quotaUsed)

  // 是否已订阅付费计划
  const isPro = plan === 'pro' || plan === 'enterprise'

  return {
    plan,
    planName,
    sub,
    loading,
    quotaUsed,
    quotaLimit,
    quotaPercent,
    quotaRemaining,
    canCreate,
    isPro,
    refresh: fetchSubscription,
    checkQuota: (action: string = 'create_content') => {
      if (!token) return false
      if (action === 'create_content') return canCreate
      return true
    },
  }
}
