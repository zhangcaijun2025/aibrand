/**
 * MeTabView — 我 Tab
 *
 * 订阅计划 · 积分余额 · 进化报告 · 设置。
 * 类微信"我"页面，个人信息 + 功能入口列表。
 */

'use client'

import { useRouter } from 'next/navigation'
import { Coins, TrendingUp, Settings, CreditCard, ChevronRight, Sparkles } from 'lucide-react'
import { useUserStore } from '@/store/user'
import { useAgentPresenceStore } from '@/store/agent/agent-presence'
import { useGetClientLng } from '@/hooks/useSystem'

export function MeTabView() {
  const router = useRouter()
  const lng = useGetClientLng()
  const userInfo = useUserStore((s) => s.userInfo)
  const creditsBalance = useUserStore((s) => s.creditsBalance)
  const { systemHealthPercent, greetingData } = useAgentPresenceStore()

  const userName = userInfo?.name || userInfo?.mail || '用户'
  const evolutionScore = greetingData?.memoryContext
    ? Math.min(100, greetingData.memoryContext.projectCount * 10 + greetingData.memoryContext.competitorCount * 5 + 50)
    : 0

  const menuItems = [
    {
      icon: Coins,
      label: '订阅计划',
      desc: 'Free · 升级解锁更多功能',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      path: '/pricing',
    },
    {
      icon: CreditCard,
      label: '积分余额',
      desc: `${creditsBalance || 0} 积分`,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      path: '/pricing',
    },
    {
      icon: TrendingUp,
      label: '进化报告',
      desc: `Agent 已学习 ${evolutionScore} 个模式`,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      path: '/ai-console',
    },
    {
      icon: Settings,
      label: '设置',
      desc: '通知偏好 · Agent 行为',
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      path: '/pricing',
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="text-lg font-semibold text-foreground">我</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile card */}
        <div className="px-4 py-5 flex items-center gap-4 border-b border-border/30">
          <div className="w-14 h-14 rounded-full bg-(--brand-gradient) flex items-center justify-center
                          text-white font-semibold text-lg shadow-md">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-base font-semibold text-foreground">{userName}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${systemHealthPercent >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-xs text-muted-foreground">
                系统健康 {systemHealthPercent}% · Agent 在线
              </span>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="py-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(`/${lng}${item.path}`)}
              className="flex items-center gap-4 w-full px-4 py-4 hover:bg-muted/30 transition-colors text-left"
            >
              <span className={`shrink-0 p-2 rounded-xl ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
            </button>
          ))}
        </div>

        {/* Evolution card */}
        {greetingData && (
          <div className="mx-4 my-3 p-4 rounded-2xl border border-(--brand-purple)/20
                          bg-(--brand-purple)/5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-(--brand-purple)" />
              <span className="text-xs font-medium text-(--brand-purple)">Agent 进化中</span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {greetingData.settlingIn
                ? '我还在学习你的工作模式，使用越多、越懂你'
                : greetingData.memoryContext.isReturning
                  ? `上次来访 ${greetingData.memoryContext.daysSinceLastVisit} 天前，欢迎回来`
                  : 'Agent 正在持续学习你的偏好和行为'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
