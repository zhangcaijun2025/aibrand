/**
 * AdminOrdersPage - 后台订单管理
 * 查看待处理订单，手动确认付款
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, X, RefreshCw, Search, Clock, CreditCard } from 'lucide-react'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { getCurrencySymbol } from '@/utils/currency'
import { useUserStore } from '@/store/user'

const cnySymbol = getCurrencySymbol('CNY')

interface Order {
  _id: string
  orderNo: string
  userId: string
  amount: number
  credits: number
  status: string
  createdAt: string
  paidAt: string | null
  completedAt: string | null
}

const ADMIN_SECRET = 'aibrand-admin-2026'

export default function AdminOrdersPage() {
  const { t } = useTransClient('common')
  const token = useUserStore(state => state.token)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('pending')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      // 直接通过本地支付服务查询（不走 Next.js 代理，避免路径冲突）
      const res = await fetch('http://localhost:3999/api/user/credits/admin/list', {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      })
      if (!res.ok) throw new Error('获取失败')
      const data = await res.json()
      setOrders(data.data || [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleConfirm = async (orderNo: string) => {
    setConfirming(orderNo)
    try {
      const res = await fetch('http://localhost:3999/api/user/credits/admin/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNo, secret: ADMIN_SECRET }),
      })
      if (res.ok) {
        toast.success(`订单 ${orderNo} 已确认，积分已到账`)
        fetchOrders()
      } else {
        toast.error('确认失败')
      }
    } catch {
      toast.error('确认失败，请检查支付服务')
    } finally {
      setConfirming(null)
    }
  }

  const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter)

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="border-b border-border bg-background px-6 py-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
            <CreditCard className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">订单管理</h1>
            <p className="text-xs text-muted-foreground">查看和处理充值订单</p>
          </div>
        </div>
      </div>

      <div className="border-b border-border shrink-0">
        <div className="flex px-6 gap-0">
          {[
            { key: 'pending', label: '待处理' },
            { key: 'completed', label: '已完成' },
            { key: 'all', label: '全部' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={cn('px-5 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer',
                filter === tab.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'
              )}>
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={fetchOrders}
            className="flex items-center gap-1 px-3 py-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} /> 刷新
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">加载中...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Clock className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">暂无{filter === 'pending' ? '待处理' : ''}订单</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <div key={order._id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{order.orderNo}</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium',
                      order.status === 'pending' && 'bg-amber-100 text-amber-700',
                      order.status === 'completed' && 'bg-green-100 text-green-700',
                      order.status === 'paid' && 'bg-blue-100 text-blue-700',
                    )}>{order.status}</span>
                  </div>
                  <div className="mt-1 text-sm">
                    <span className="font-semibold">{cnySymbol}{order.amount}</span>
                    <span className="text-muted-foreground mx-1">→</span>
                    <span className="text-primary font-semibold">{order.credits} 积分</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    用户: {order.userId?.substring(0, 12)}... | {new Date(order.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="shrink-0 ml-4">
                  {order.status === 'pending' && (
                    <Button size="sm" onClick={() => handleConfirm(order.orderNo)}
                      disabled={confirming === order.orderNo}
                      className="bg-green-600 hover:bg-green-700 text-white cursor-pointer">
                      {confirming === order.orderNo ? '处理中...' : <><Check className="h-3 w-3 mr-1" />确认到账</>}
                    </Button>
                  )}
                  {(order.status === 'completed' || order.status === 'paid') && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> {order.completedAt ? new Date(order.completedAt).toLocaleString('zh-CN') : '已处理'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
