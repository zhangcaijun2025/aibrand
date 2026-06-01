/**
 * QuotaBar — 配额使用进度条
 *
 * 显示当前订阅计划 + 月度配额使用情况
 * 超限时引导升级
 */

'use client'

import { useSubscription } from '@/hooks/useSubscription'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { AlertTriangle, Crown, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export function QuotaBar() {
  const { planName, quotaUsed, quotaLimit, quotaPercent, canCreate, isPro } = useSubscription()

  return (
    <div className={cn(
      'rounded-lg border p-3 space-y-2',
      !canCreate ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-card',
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPro ? (
            <Crown className="h-4 w-4 text-amber-500" />
          ) : null}
          <span className="text-xs font-medium">{planName}</span>
        </div>
        <span className={cn('text-xs', !canCreate ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
          {quotaUsed} / {quotaLimit} 条
        </span>
      </div>

      <Progress
        value={Math.min(quotaPercent, 100)}
        className={cn('h-2', quotaPercent >= 100 && '[&>div]:bg-red-500')}
      />

      {!canCreate && (
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-red-500">
            <AlertTriangle className="h-3 w-3" />
            本月配额已用完
          </div>
          <Link href="/pricing" className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
            升级计划 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {canCreate && quotaPercent >= 80 && (
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <AlertTriangle className="h-3 w-3" />
            配额即将用完
          </div>
          <Link href="/pricing" className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
            升级 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  )
}
