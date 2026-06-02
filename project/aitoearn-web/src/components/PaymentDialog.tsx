/**
 * PaymentDialog - 支付弹窗
 * 选择支付方式，显示二维码
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Check, Copy, ExternalLink, Loader2, CreditCard, AlertCircle } from 'lucide-react'
import { useTransClient } from '@/app/i18n/client'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/user'

interface PaymentDialogProps {
  open: boolean
  onClose: () => void
  amount: number
  credits: number
  onSuccess?: () => void
}

const PAYMENT_METHODS = [
  { key: 'alipay', label: '支付宝', icon: '💳', color: 'bg-blue-500' },
  { key: 'wechat', label: '微信支付', icon: '💚', color: 'bg-green-500' },
  { key: 'manual', label: '银行转账', icon: '🏦', color: 'bg-gray-500' },
]

export function PaymentDialog({ open, onClose, amount, credits, onSuccess }: PaymentDialogProps) {
  const token = useUserStore(state => state.token)
  const [step, setStep] = useState<'select' | 'paying' | 'qr' | 'success' | 'error'>('select')
  const [method, setMethod] = useState<string>('alipay')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [orderNo, setOrderNo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (open) { setStep('select'); setQrCode(null); setOrderNo(null); setErrorMsg('') }
  }, [open])

  const handlePay = async () => {
    if (!token) { toast.error('请先登录'); return }
    setLoading(true)
    setStep('paying')
    try {
      const res = await fetch('/api/user/credits/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount, paymentMethod: method }),
      })
      const json = await res.json()
      if (!res.ok || json.code !== 0) throw new Error(json.message || '创建订单失败')

      const data = json.data
      setOrderNo(data.orderNo)

      if (data.qrCode) {
        setQrCode(data.qrCode)
        setStep('qr')
        // 轮询订单状态
        startPolling(data.orderNo)
      } else if (method === 'manual') {
        setStep('success')
        toast.success('订单已创建，请联系管理员确认到账')
        onSuccess?.()
      } else {
        // 无二维码，降级为手动
        setStep('success')
        toast.success('自动支付暂不可用，已创建手动订单')
        onSuccess?.()
      }
    } catch (err: any) {
      setErrorMsg(err.message || '支付失败')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const startPolling = useCallback((no: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/user/credits/orders/${no}`)
        const json = await res.json()
        if (json.data?.status === 'completed') {
          clearInterval(interval)
          setStep('success')
          toast.success('支付成功！积分已到账')
          onSuccess?.()
        }
      } catch {}
    }, 3000)
    // 停止轮询 5 分钟后
    setTimeout(() => clearInterval(interval), 300000)
  }, [onSuccess])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">确认支付</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 cursor-pointer">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* 金额摘要 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center">
          <div className="text-sm text-gray-500">充值金额</div>
          <div className="text-3xl font-bold mt-1">¥{amount}</div>
          <div className="text-sm text-gray-500 mt-1">获得 <span className="text-blue-600 font-semibold">{credits.toLocaleString()}</span> 积分</div>
        </div>

        {step === 'select' && (
          <>
            <div className="text-sm font-medium mb-3">选择支付方式</div>
            <div className="space-y-2">
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.key} onClick={() => setMethod(pm.key)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer',
                    method === pm.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  )}>
                  <span className="text-2xl">{pm.icon}</span>
                  <span className="flex-1 text-left font-medium">{pm.label}</span>
                  {method === pm.key && <Check className="h-5 w-5 text-blue-500" />}
                </button>
              ))}
            </div>
            <Button onClick={handlePay} disabled={loading}
              className="w-full mt-4 h-11 text-base cursor-pointer">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 处理中...</> : `确认支付 ¥${amount}`}
            </Button>
          </>
        )}

        {step === 'paying' && (
          <div className="py-12 text-center">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-blue-500" />
            <p className="mt-4 text-sm text-gray-500">正在创建订单...</p>
          </div>
        )}

        {step === 'qr' && (
          <div className="text-center">
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 mx-auto inline-block">
              {/* 二维码显示区域 */}
              <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {qrCode?.startsWith('http') ? (
                  <img src={qrCode} alt="支付二维码" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-4">
                    <div className="text-6xl mb-2">{method === 'alipay' ? '💳' : '💚'}</div>
                    <p className="text-xs text-gray-500 break-all">{qrCode}</p>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-3 text-sm font-medium">
              请使用{method === 'alipay' ? '支付宝' : '微信'}扫码支付
            </p>
            <p className="text-xs text-gray-400 mt-1">¥{amount} · 订单号：{orderNo}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400">等待支付中...</span>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setStep('select')} className="flex-1 cursor-pointer">
                返回
              </Button>
              <Button size="sm" onClick={handlePay} disabled className="flex-1 opacity-50 cursor-not-allowed">
                已完成支付
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="mt-4 text-lg font-semibold text-green-600">操作成功</p>
            <p className="text-sm text-gray-500 mt-1">
              {method === 'manual' ? '订单已提交，等待管理员确认' : `${credits.toLocaleString()} 积分已到账`}
            </p>
            <Button onClick={onClose} className="mt-6 cursor-pointer">完成</Button>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="mt-4 text-sm text-red-600">{errorMsg || '支付失败，请重试'}</p>
            <div className="flex gap-2 mt-6 justify-center">
              <Button variant="outline" onClick={() => setStep('select')} className="cursor-pointer">重试</Button>
              <Button variant="ghost" onClick={onClose} className="cursor-pointer">取消</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
