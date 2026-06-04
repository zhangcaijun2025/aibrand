/**
 * AiTabView — AI Tab 主界面 (WeChat 聊天列表模式)
 *
 * Agent 主动推送消息 + 用户对话入口。不是传统页面，是"AI 在跟你说话"。
 */

'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, TrendingUp, Bell, Zap, Send, ChevronRight } from 'lucide-react'
import { useAgentPresenceStore } from '@/store/agent/agent-presence'
import { useUserStore } from '@/store/user'
import { useGetClientLng } from '@/hooks/useSystem'
import { AgentPet } from '@/components/AgentPresence/AgentPet'
import type { GreetingData } from '@/store/agent/agent-presence'

// ─── Message bubble types ────────────────────────────

interface AgentMessage {
  id: string
  type: 'greeting' | 'insight' | 'alert' | 'suggestion' | 'status'
  text: string
  subtext?: string
  action?: { label: string; path: string }
  time: string
}

// ─── Build messages from greeting data ───────────────

function buildMessages(data: GreetingData): AgentMessage[] {
  const msgs: AgentMessage[] = []
  const now = new Date()
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`

  // Greeting
  msgs.push({
    id: 'greeting',
    type: 'greeting',
    text: `${data.greeting}，${data.userName}`,
    subtext: data.settlingIn
      ? '我还在学习你的世界，8 位专属助手已就位'
      : data.memoryContext.isReturning
        ? `上次见你是 ${data.memoryContext.daysSinceLastVisit} 天前`
        : undefined,
    time,
  })

  // System status
  const sys = data.systemStatus
  if (sys) {
    const statusText =
      sys.alerts > 0
        ? `${sys.healthyComponents}/${sys.totalComponents} 组件正常 · 1 个需要注意`
        : `全部 ${sys.totalComponents} 个组件运行正常`
    msgs.push({
      id: 'status',
      type: 'status',
      text: statusText,
      subtext: sys.asyncTasksRunning ? '后台任务运行中' : undefined,
      time,
    })
  }

  // Brief cards → insight messages
  data.briefCards.forEach((card, i) => {
    const isWarning = card.trend === 'down' || card.type === 'warning'
    msgs.push({
      id: `card-${i}`,
      type: isWarning ? 'alert' : 'insight',
      text: `${card.icon} ${card.title}: ${card.value}`,
      subtext: card.subtitle,
      action: card.id === 'quota'
        ? { label: '查看配额', path: '/pricing' }
        : { label: '去看看', path: `/chat?agent=${card.type}` },
      time,
    })
  })

  // Suggestions
  data.suggestions.forEach((s, i) => {
    msgs.push({
      id: `sug-${i}`,
      type: 'suggestion',
      text: s.text,
      action: {
        label: s.action === 'navigate' ? '去看看' : '聊聊',
        path: s.action === 'navigate' && s.payload?.path
          ? String(s.payload.path)
          : `/chat?q=${encodeURIComponent(s.text)}`,
      },
      time,
    })
  })

  return msgs
}

// ─── Sub-components ──────────────────────────────────

function AgentMessageBubble({
  msg,
  onAction,
}: {
  msg: AgentMessage
  onAction: (path: string) => void
}) {
  const typeStyles: Record<string, string> = {
    greeting: 'border-l-(--brand-purple) bg-(--brand-purple)/5',
    insight: 'border-l-(--brand-cyan) bg-(--brand-cyan)/5',
    alert: 'border-l-amber-500 bg-amber-500/5',
    suggestion: 'border-l-emerald-500 bg-emerald-500/5',
    status: 'border-l-muted-foreground/30 bg-muted/20',
  }

  const typeIcons: Record<string, React.ReactNode> = {
    greeting: <Sparkles className="h-4 w-4 text-(--brand-purple)" />,
    insight: <TrendingUp className="h-4 w-4 text-(--brand-cyan)" />,
    alert: <Bell className="h-4 w-4 text-amber-500" />,
    suggestion: <Zap className="h-4 w-4 text-emerald-500" />,
    status: null,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`mx-4 mb-3 rounded-2xl border border-border/50 ${typeStyles[msg.type] || ''}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {typeIcons[msg.type] && (
            <span className="mt-0.5 shrink-0">{typeIcons[msg.type]}</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {msg.text}
            </p>
            {msg.subtext && (
              <p className="mt-1 text-xs text-muted-foreground">{msg.subtext}</p>
            )}
            {msg.action && (
              <button
                onClick={() => onAction(msg.action!.path)}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full
                           bg-(--brand-purple)/10 text-(--brand-purple) text-xs font-medium
                           hover:bg-(--brand-purple)/20 transition-colors"
              >
                {msg.action.label}
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── First-visit greeting animation ──────────────────

function AwakeningOverlay({ data, onDone }: { data: GreetingData; onDone: () => void }) {
  const [phase, setPhase] = useState<'dot' | 'line' | 'text' | 'done'>('dot')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('line'), 600)
    const t2 = setTimeout(() => setPhase('text'), 1200)
    const t3 = setTimeout(() => { setPhase('done'); onDone() }, 2500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  if (phase === 'done') return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background">
      <motion.div
        className="text-center"
        animate={
          phase === 'dot'
            ? { opacity: 0.4, scale: 0.8 }
            : phase === 'line'
              ? { opacity: 1, scale: 1.05 }
              : { opacity: 1, scale: 1 }
        }
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {phase !== 'text' ? (
          <motion.div
            className="w-16 h-16 rounded-2xl mx-auto"
            style={{ background: 'var(--brand-gradient)' }}
            animate={phase === 'line' ? { borderRadius: '30%', width: 80 } : {}}
          />
        ) : (
          <div>
            <h1 className="text-2xl font-medium text-foreground">
              {data.greeting}，{data.userName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.settlingIn ? '我还在学习你的世界' : '今天有什么可以帮你？'}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────

export function AiTabView() {
  const router = useRouter()
  const lng = useGetClientLng()
  const token = useUserStore((s) => s.token)
  const { greetingData, hasCompletedFirstGreeting, completeFirstGreeting, isAwake } =
    useAgentPresenceStore()

  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [showAwakening, setShowAwakening] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Build messages from greeting data
  useEffect(() => {
    if (greetingData) {
      setMessages(buildMessages(greetingData))
    }
  }, [greetingData])

  // First visit → show awakening
  useEffect(() => {
    if (greetingData && !hasCompletedFirstGreeting) {
      // Small delay to ensure smooth mount
      const t = setTimeout(() => setShowAwakening(true), 200)
      return () => clearTimeout(t)
    }
  }, [greetingData, hasCompletedFirstGreeting])

  // Focus on chat input (Cmd+K)
  useEffect(() => {
    const handler = () => inputRef.current?.focus()
    window.addEventListener('tab:focus-chat', handler)
    return () => window.removeEventListener('tab:focus-chat', handler)
  }, [])

  const handleAction = useCallback(
    (path: string) => {
      if (path.startsWith('/chat')) {
        const url = new URL(path, 'http://localhost')
        const q = url.searchParams.get('q') || url.searchParams.get('agent') || ''
        router.push(`/${lng}${path}`)
      } else {
        router.push(`/${lng}${path}`)
      }
    },
    [router, lng],
  )

  const handleSend = () => {
    const q = chatInput.trim()
    if (!q) return
    setChatInput('')
    router.push(`/${lng}/chat?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Awakening overlay (first visit only) */}
      <AnimatePresence>
        {showAwakening && greetingData && (
          <AwakeningOverlay
            data={greetingData}
            onDone={() => {
              setShowAwakening(false)
              completeFirstGreeting()
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AgentPet />
            <div>
              <h1 className="text-base font-semibold text-foreground">AiBrand</h1>
              <p className="text-[10px] text-muted-foreground">
                {isAwake ? 'Agent 在线' : '唤醒中...'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        {messages.length === 0 && !greetingData && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            正在连接 Agent...
          </div>
        )}
        {messages.map((msg) => (
          <AgentMessageBubble key={msg.id} msg={msg} onAction={handleAction} />
        ))}

        {/* Empty space for scroll */}
        <div className="h-4" />
      </div>

      {/* Chat input */}
      <div className="shrink-0 px-4 py-3 border-t border-border/50 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 rounded-2xl border border-border
                        bg-muted/30 px-4 py-2.5 focus-within:border-(--brand-purple)/30
                        focus-within:bg-muted/50 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            placeholder="跟 Agent 说你想做什么..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/60
                       outline-none text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!chatInput.trim()}
            className="shrink-0 p-1.5 rounded-lg bg-(--brand-purple) text-white
                       disabled:opacity-30 disabled:cursor-not-allowed
                       hover:bg-(--brand-purple)/90 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
