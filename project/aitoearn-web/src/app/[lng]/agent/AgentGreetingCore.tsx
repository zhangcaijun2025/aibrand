'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Send, ArrowRight } from 'lucide-react'
import { useUserStore } from '@/store/user'
import { useAgentPresenceStore } from '@/store/agent/agent-presence'
import { useGetClientLng } from '@/hooks/useSystem'

// ─── Types ───────────────────────────────────────────────────

type PageState = 'IDLE' | 'WAKING' | 'READY' | 'SLOW' | 'DEGRADED'

interface SystemStatus {
  totalComponents: number
  healthyComponents: number
  uptime: string
  alerts: number
  asyncTasksRunning: boolean
}

interface MemoryContext {
  projectCount: number
  competitorCount: number
  lastTopic: string
  isReturning: boolean
  daysSinceLastVisit: number
}

interface BriefCard {
  id: string
  type: string
  icon: string
  title: string
  value: string
  subtitle: string
  trend?: string
}

interface Suggestion {
  id: string
  text: string
  action: string
  payload: Record<string, any>
}

interface OvernightEvent {
  title: string
  description: string
  resolved: boolean
}

interface GreetingData {
  greeting: string
  userName: string
  systemStatus: SystemStatus
  memoryContext: MemoryContext
  briefCards: BriefCard[]
  suggestions: Suggestion[]
  overnightBrief?: {
    hasEvents: boolean
    summary: string
    events: OvernightEvent[]
  }
  isFirstVisit: boolean
  settlingIn: boolean
}

// ─── Animation timing constants ──────────────────────────────

const T = {
  DOT_BREATHE: 600,
  EYE_OPEN: 1200,
  GREETING_START: 2000,
  CARDS_START: 3000,
  READY: 4000,
  SLOW_THRESHOLD: 5000,
  DEGRADED_THRESHOLD: 8000,
  CARD_INTERVAL: 200,
  CHAR_SPEED: 60, // ms per character
}

// ─── Sub-components ──────────────────────────────────────────

/** 呼吸光点 → 睁眼线 */
function EyeLine({ phase }: { phase: 'dot' | 'line' | 'horizon' }) {
  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2"
      animate={
        phase === 'dot'
          ? { width: 8, height: 8, borderRadius: '50%', opacity: 0.6, top: '50%' }
          : phase === 'line'
            ? { width: '30%', height: 2, borderRadius: 1, opacity: 1, top: '50%' }
            : { width: '100%', height: 1, borderRadius: 0, opacity: 0.15, top: '12%' }
      }
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background:
          phase === 'horizon'
            ? 'linear-gradient(90deg, transparent 0%, var(--brand-purple) 20%, var(--brand-cyan) 80%, transparent 100%)'
            : 'var(--brand-gradient)',
      }}
    />
  )
}

/** 逐字打字 */
function TypewriterText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [chars, setChars] = useState(0)

  useEffect(() => {
    if (chars >= text.length) {
      onDone?.()
      return
    }
    const t = setTimeout(() => setChars(c => c + 1), T.CHAR_SPEED)
    return () => clearTimeout(t)
  }, [chars, text, onDone])

  return (
    <h1 className="text-2xl md:text-3xl font-medium text-white/90 text-center tracking-wide">
      {text.slice(0, chars)}
      <span className="inline-block w-0.5 h-5 bg-(--brand-cyan) ml-0.5 animate-pulse align-middle" />
    </h1>
  )
}

/** 状态脉冲标记 */
function StatusBadge({ status }: { status: SystemStatus }) {
  const allOk = status.alerts === 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex items-center gap-2 text-xs text-white/50 mt-3"
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${allOk ? 'bg-emerald-400' : 'bg-amber-400'} ${allOk ? '' : 'animate-pulse'}`}
      />
      {allOk ? `全部 ${status.totalComponents} 个组件在线` : status.uptime}
    </motion.div>
  )
}

/** 简报卡片 */
function BriefCardItem({ card, index, onClick }: { card: BriefCard; index: number; onClick?: () => void }) {
  const trendIcon = card.trend === 'up' ? '↑' : card.trend === 'down' ? '↓' : ''
  const trendColor = card.trend === 'up' ? 'text-emerald-400' : card.trend === 'down' ? 'text-amber-400' : 'text-white/30'

  return (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="flex flex-col items-start gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur px-4 py-3 text-left hover:bg-white/[0.08] transition-colors w-full max-w-[200px]"
    >
      <span className="text-lg">{card.icon}</span>
      <span className="text-white/80 text-sm font-medium">{card.title}</span>
      <span className="text-white/60 text-xs">
        {card.value}
        {trendIcon && <span className={`ml-1 ${trendColor}`}>{trendIcon}</span>}
      </span>
      <span className="text-white/30 text-[11px]">{card.subtitle}</span>
    </motion.button>
  )
}

/** 建议按钮 */
function SuggestionButton({ s, index, onClick }: { s: Suggestion; index: number; onClick: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 * index, duration: 0.35 }}
      onClick={onClick}
      className="rounded-full border border-white/[0.12] bg-white/[0.05] px-4 py-2 text-sm text-white/70 hover:bg-white/[0.12] hover:text-white transition-all"
    >
      {s.text}
    </motion.button>
  )
}

/** 右下角状态光点 */
function StatusDot({ alerts, asyncRunning }: { alerts: number; asyncRunning: boolean }) {
  const color = alerts > 0 ? 'bg-amber-400' : asyncRunning ? 'bg-blue-400' : 'bg-emerald-400'
  const pulse = alerts > 0 ? 'animate-pulse' : ''

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 0.7, scale: 1 }}
      transition={{ delay: 0.5 }}
      className="fixed bottom-6 right-6 z-50"
      title={alerts > 0 ? '有待处理事件' : asyncRunning ? '后台任务运行中' : '一切就绪'}
    >
      <div className={`w-3 h-3 rounded-full ${color} ${pulse} shadow-lg shadow-current`} />
    </motion.div>
  )
}

/** 晨间简报 (条件触发) */
function MorningBrief({ brief, onClose }: { brief: NonNullable<GreetingData['overnightBrief']>; onClose: () => void }) {
  const count = brief.events.length
  const isHeavy = count >= 3
  const isLight = count <= 2

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        isLight
          ? { opacity: 0, y: 20, transition: { delay: 2, duration: 0.5 } }
          : { opacity: 0, y: 20 }
      }
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm"
    >
      <div className="rounded-2xl border border-white/[0.1] bg-black/80 backdrop-blur-xl p-5 shadow-2xl">
        <p className="text-white/50 text-xs mb-3">🌙 你休息时</p>
        {brief.events.map((e, i) => (
          <div key={i} className="flex items-start gap-2 text-sm mb-2">
            <span className="text-xs mt-0.5">{e.resolved ? '✅' : '⚠️'}</span>
            <span className="text-white/70">{e.description}</span>
          </div>
        ))}
        <p className="text-white/30 text-xs mt-3">一切已处理完毕，无需额外操作。</p>
        <button
          onClick={onClose}
          className="mt-3 text-xs text-(--brand-cyan) hover:text-white transition-colors"
        >
          {isHeavy ? '处理' : '知道了'}
        </button>
      </div>
      {/* 自动消失计时 (轻量简报) */}
      {isLight && <AutoDismissTimer seconds={2} onDone={onClose} />}
    </motion.div>
  )
}

function AutoDismissTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, seconds * 1000)
    return () => clearTimeout(t)
  }, [seconds, onDone])
  return null
}

/** 降级视图 */
function DegradedFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
      <p className="text-white/60 text-sm">有些记忆还在加载中，但我已经在这里了。</p>
      <button
        onClick={onRetry}
        className="text-xs text-(--brand-cyan) hover:text-white transition-colors"
      >
        重新唤醒
      </button>
    </div>
  )
}

// ─── API ──────────────────────────────────────────────────────

async function fetchGreeting(token: string): Promise<GreetingData> {
  const res = await fetch('/api/agent/greeting', {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  const json = await res.json()
  if (json.code !== 0) throw new Error(json.message)
  return json.data
}

// ─── Main Component ───────────────────────────────────────────

export default function AgentGreetingCore() {
  const router = useRouter()
  const lng = useGetClientLng()
  const token = useUserStore(s => s.token)

  const [pageState, setPageState] = useState<PageState>('IDLE')
  const [eyePhase, setEyePhase] = useState<'dot' | 'line' | 'horizon'>('dot')
  const [greetingText, setGreetingText] = useState('')
  const [data, setData] = useState<GreetingData | null>(null)
  const [showCards, setShowCards] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showMorningBrief, setShowMorningBrief] = useState(false)
  const [greetingTyped, setGreetingTyped] = useState(false)
  const startTime = useRef(Date.now())

  // ── Animation timeline ────────────────────────────────────

  useEffect(() => {
    if (pageState !== 'WAKING') return

    const timers: NodeJS.Timeout[] = []

    // 0.6s: dot brightens
    // 1.2s: eye opens → line expands
    timers.push(setTimeout(() => setEyePhase('line'), T.EYE_OPEN - T.DOT_BREATHE))
    // 2.0s: line → horizon, greeting starts
    timers.push(setTimeout(() => {
      setEyePhase('horizon')
      if (data) buildGreetingText(data)
    }, T.GREETING_START - T.DOT_BREATHE))
    // 3.0s: cards
    timers.push(setTimeout(() => setShowCards(true), T.CARDS_START - T.DOT_BREATHE))
    // 3.8s: suggestions
    timers.push(setTimeout(() => setShowSuggestions(true), 3800 - T.DOT_BREATHE))
    // 4.5s: morning brief (if any)
    timers.push(setTimeout(() => {
      if (data?.overnightBrief?.hasEvents) setShowMorningBrief(true)
    }, 4500 - T.DOT_BREATHE))

    return () => timers.forEach(clearTimeout)
  }, [pageState, data])

  // ── Build greeting text ────────────────────────────────────

  const buildGreetingText = useCallback((d: GreetingData) => {
    const parts: string[] = []
    parts.push(`${d.greeting}，${d.userName}`)

    // Memory context enrichment
    const ctx = d.memoryContext
    if (ctx?.isReturning && ctx.daysSinceLastVisit > 3) {
      parts.push(`。好久不见`)
    }
    if (ctx?.projectCount > 0) {
      parts.push(`，你正在推进 ${ctx.projectCount} 个项目`)
    }
    if (ctx?.competitorCount > 0) {
      parts.push(`，关注着 ${ctx.competitorCount} 家竞品`)
    }

    // Settling in
    if (d.settlingIn) {
      parts.push('。我还在学习你的世界')
    }

    // First visit
    if (d.isFirstVisit) {
      setGreetingText(`欢迎。我是你全新的运营伙伴。这是我看到的世界——`)
      return
    }

    parts.push('。')
    setGreetingText(parts.join(''))
  }, [])

  // ── Initiate ────────────────────────────────────────────────

  useEffect(() => {
    if (!token) {
      router.push(`/${lng}/auth`)
      return
    }

    setPageState('WAKING')
    startTime.current = Date.now()

    fetchGreeting(token)
      .then(d => {
        const elapsed = Date.now() - startTime.current
        setData(d)
        // Sync to presence store
        const presence = useAgentPresenceStore.getState()
        presence.completeFirstGreeting()
        presence.wakeUp(token)

        if (elapsed > T.DEGRADED_THRESHOLD) {
          // Data arrived very late — show degraded then transition
          setPageState('READY')
        } else if (elapsed > T.SLOW_THRESHOLD) {
          // Arrived during SLOW — graceful recovery
          setEyePhase('horizon')
          buildGreetingText(d)
          setShowCards(true)
          setShowSuggestions(true)
          setPageState('READY')
        } else {
          // Normal — data arrived before 5s
          setPageState('WAKING') // animation continues
          setData(d)
        }
      })
      .catch(() => {
        setPageState('DEGRADED')
      })

    // Check SLOW threshold
    const slowCheck = setTimeout(() => {
      setPageState(s => (s === 'WAKING' ? 'SLOW' : s))
    }, T.SLOW_THRESHOLD)

    // Check DEGRADED threshold
    const degradedCheck = setTimeout(() => {
      setPageState(s => (s === 'WAKING' || s === 'SLOW') ? 'DEGRADED' : s)
    }, T.DEGRADED_THRESHOLD)

    return () => {
      clearTimeout(slowCheck)
      clearTimeout(degradedCheck)
    }
  }, [token])

  // ── Keyboard: Space to skip animation ───────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (pageState === 'WAKING' || pageState === 'SLOW')) {
        e.preventDefault()
        setEyePhase('horizon')
        if (data) {
          setGreetingText(data.greeting + '，' + data.userName + '。')
          setGreetingTyped(true)
        }
        setShowCards(true)
        setShowSuggestions(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pageState, data])

  // ── Handlers ────────────────────────────────────────────────

  const handleSuggestion = (s: Suggestion) => {
    if (s.action === 'chat') {
      router.push(`/${lng}/chat?q=${encodeURIComponent(s.payload.message)}`)
    } else if (s.action === 'navigate') {
      router.push(`/${lng}${s.payload.path}`)
    }
  }

  const handleCardClick = (card: BriefCard) => {
    if (card.id === 'competitors' || card.id === 'no_competitors') {
      router.push(`/${lng}/chat?agent=competitor-analyst`)
    } else if (card.id === 'project' || card.id === 'no_project') {
      router.push(`/${lng}/chat?agent=general`)
    } else if (card.id === 'quota') {
      router.push(`/${lng}/pricing`)
    }
  }

  const handleRetry = () => {
    setPageState('WAKING')
    setData(null)
    setShowCards(false)
    setShowSuggestions(false)
    setEyePhase('dot')
    setGreetingText('')
    startTime.current = Date.now()

    fetchGreeting(token!)
      .then(d => { setData(d); setPageState('READY') })
      .catch(() => setPageState('DEGRADED'))
  }

  // ─── Layout ─────────────────────────────────────────────────

  const isAwake = pageState === 'READY' || (pageState === 'WAKING' && data)

  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      {/* Top horizon line (stays after eye opens) */}
      {eyePhase === 'horizon' && (
        <div className="absolute top-[12%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-(--brand-purple)/20 to-transparent pointer-events-none" />
      )}

      {/* Eye-line animation area */}
      {(pageState === 'WAKING' || pageState === 'SLOW') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <EyeLine phase={eyePhase} />
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* SLOW indicator */}
        {pageState === 'SLOW' && !data && (
          <div className="mb-8">
            <div className="w-3 h-3 rounded-full bg-(--brand-purple)/60 animate-pulse mx-auto mb-3" />
            <p className="text-white/40 text-sm text-center">
              正在调取你的记忆，稍作等候
            </p>
          </div>
        )}

        {/* DEGRADED */}
        {pageState === 'DEGRADED' && <DegradedFallback onRetry={handleRetry} />}

        {/* Greeting text */}
        {isAwake && (
          <div className="mb-8 text-center">
            {greetingText ? (
              <h1 className="text-2xl md:text-3xl font-medium text-white/90 text-center tracking-wide leading-relaxed">
                {greetingText}
              </h1>
            ) : (
              eyePhase === 'horizon' && data && (
                <TypewriterText
                  text={data.greeting + '，' + data.userName + '。'}
                  onDone={() => setGreetingTyped(true)}
                />
              )
            )}
            {data?.systemStatus && greetingTyped && (
              <StatusBadge status={data.systemStatus} />
            )}
          </div>
        )}

        {/* Brief cards */}
        {showCards && data && (
          <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-xl">
            {data.briefCards.map((card, i) => (
              <BriefCardItem
                key={card.id}
                card={card}
                index={i}
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        )}

        {/* Suggestion buttons */}
        {showSuggestions && data && (
          <div className="flex flex-wrap justify-center gap-2">
            {data.suggestions.map((s, i) => (
              <SuggestionButton
                key={s.id}
                s={s}
                index={i}
                onClick={() => handleSuggestion(s)}
              />
            ))}
          </div>
        )}

        {/* Settling-in hint */}
        {greetingTyped && data?.settlingIn && data?.isFirstVisit && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-4 text-xs text-white/30"
          >
            8 位专属运营助手已自动为你配齐
          </motion.p>
        )}

        {/* Memory context — Agent 记得你 */}
        {greetingTyped && data?.memoryContext && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 flex flex-wrap justify-center gap-2"
          >
            {data.memoryContext.isReturning && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                               bg-white/[0.04] border border-white/[0.06] text-xs text-white/50">
                上次来访 {data.memoryContext.daysSinceLastVisit} 天前
              </span>
            )}
            {data.memoryContext.projectCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                               bg-white/[0.04] border border-white/[0.06] text-xs text-white/50">
                {data.memoryContext.projectCount} 个项目
              </span>
            )}
            {data.memoryContext.competitorCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                               bg-white/[0.04] border border-white/[0.06] text-xs text-white/50">
                {data.memoryContext.competitorCount} 家竞品
              </span>
            )}
            {data.memoryContext.lastTopic && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                               bg-white/[0.04] border border-white/[0.06] text-xs text-white/50">
                上次聊过：{data.memoryContext.lastTopic}
              </span>
            )}
          </motion.div>
        )}

        {/* Chat input bar */}
        {pageState === 'READY' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 w-full max-w-md"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const input = (e.target as HTMLFormElement).querySelector('input')
                if (input?.value.trim()) {
                  router.push(`/${lng}/chat?q=${encodeURIComponent(input.value.trim())}`)
                }
              }}
              className="flex items-center gap-2 rounded-2xl border border-white/[0.08]
                         bg-white/[0.03] backdrop-blur-xl px-4 py-3
                         focus-within:border-(--brand-purple)/30 focus-within:bg-white/[0.05]
                         transition-all duration-300"
            >
              <input
                type="text"
                placeholder="跟 Agent 说你想做什么..."
                className="flex-1 bg-transparent text-white/80 placeholder:text-white/25
                           outline-none text-sm"
                autoFocus={!data?.isFirstVisit}
              />
              <button
                type="submit"
                className="shrink-0 p-1.5 rounded-lg bg-(--brand-purple)/20
                           text-(--brand-purple) hover:bg-(--brand-purple)/30
                           transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="text-center text-[10px] text-white/20 mt-2">
              试试：帮我分析竞品 · 创作一篇小红书 · 查看运营数据
            </p>
          </motion.div>
        )}
      </div>

      {/* Morning brief popup */}
      <AnimatePresence>
        {showMorningBrief && data?.overnightBrief?.hasEvents && (
          <MorningBrief
            brief={data.overnightBrief}
            onClose={() => setShowMorningBrief(false)}
          />
        )}
      </AnimatePresence>

      {/* Status dot (bottom right) */}
      {pageState === 'READY' && data && (
        <StatusDot
          alerts={data.systemStatus.alerts}
          asyncRunning={data.systemStatus.asyncTasksRunning}
        />
      )}
    </main>
  )
}
