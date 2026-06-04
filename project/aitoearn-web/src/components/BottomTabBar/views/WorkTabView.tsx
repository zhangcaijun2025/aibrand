/**
 * WorkTabView — 工作 Tab
 *
 * 今日工作清单 + 快捷操作入口。
 * 不是传统 Dashboard 数据看板，是 AI 整理好的"要做什么"。
 */

'use client'

import { useRouter } from 'next/navigation'
import { PenLine, Send, Zap, BarChart3, Sparkles } from 'lucide-react'
import { useAgentPresenceStore } from '@/store/agent/agent-presence'
import { useGetClientLng } from '@/hooks/useSystem'

const quickActions = [
  { id: 'create', label: 'AI 创作', desc: '写小红书/抖音/B站内容', icon: PenLine, color: 'text-purple-500', bg: 'bg-purple-500/10', path: '/create' },
  { id: 'publish', label: '统一发布', desc: '一键发布到多平台', icon: Send, color: 'text-blue-500', bg: 'bg-blue-500/10', path: '/publish' },
  { id: 'diagnosis', label: '内容诊断', desc: 'AI 诊断内容质量', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', path: '/diagnosis' },
  { id: 'analytics', label: '数据分析', desc: '查看全域运营数据', icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-500/10', path: '/analytics' },
]

export function WorkTabView() {
  const router = useRouter()
  const lng = useGetClientLng()
  const { greetingData } = useAgentPresenceStore()

  const suggestions = greetingData?.suggestions || []
  const briefCards = greetingData?.briefCards || []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="text-lg font-semibold text-foreground">工作</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          今天有 {suggestions.length + briefCards.length} 件事值得关注
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Quick Actions */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            快捷操作
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((a) => (
              <button
                key={a.id}
                onClick={() => router.push(`/${lng}${a.path}`)}
                className="flex items-start gap-3 p-4 rounded-2xl border border-border/50
                           hover:border-border hover:shadow-sm transition-all text-left"
              >
                <span className={`shrink-0 p-2 rounded-xl ${a.bg}`}>
                  <a.icon className={`h-5 w-5 ${a.color}`} />
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground">{a.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Suggestions as tasks */}
        {suggestions.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Agent 建议
            </h2>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/${lng}/chat?q=${encodeURIComponent(s.text)}`)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl border border-border/30
                             hover:bg-muted/30 transition-colors text-left"
                >
                  <Sparkles className="h-4 w-4 text-(--brand-purple) shrink-0" />
                  <span className="text-sm text-foreground">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Brief cards summary */}
        {briefCards.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              今日概况
            </h2>
            <div className="space-y-2">
              {briefCards.map((card, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/30"
                >
                  <div>
                    <div className="text-sm font-medium text-foreground">{card.title}</div>
                    <div className="text-xs text-muted-foreground">{card.subtitle}</div>
                  </div>
                  <span className="text-lg font-semibold text-foreground">{card.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
