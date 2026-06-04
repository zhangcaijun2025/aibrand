/**
 * Agent Presence Store — AI 常驻感知状态管理
 *
 * 与 agent store (index.ts) 互补：
 *   agent store → 对话任务（TaskInstance、SSE流、消息历史）
 *   presence store → 存在感（唤醒状态、心情、系统健康、问候缓存）
 *
 * 生命周期：长连接心跳 · 低更新频率 · 高读取频率
 * 持久化：仅 hasCompletedFirstGreeting 和 lastActiveAt 写入 localStorage
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ─────────────────────────────────────────────

export type AgentMood = 'greeting' | 'idle' | 'working' | 'thinking' | 'alert'

export interface SystemStatus {
  totalComponents: number
  healthyComponents: number
  uptime: string
  alerts: number
  asyncTasksRunning: boolean
}

export interface MemoryContext {
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
  payload?: Record<string, unknown>
}

export interface GreetingData {
  greeting: string
  userName: string
  systemStatus: SystemStatus
  memoryContext: MemoryContext
  briefCards: BriefCard[]
  suggestions: Suggestion[]
  overnightBrief?: {
    hasEvents: boolean
    summary: string
    events: Array<{ title: string; description: string; resolved: boolean }>
  }
  isFirstVisit: boolean
  settlingIn: boolean
  asyncTasksRunning?: boolean
}

export interface AgentPresenceState {
  isAwake: boolean
  hasCompletedFirstGreeting: boolean
  mood: AgentMood
  lastActiveAt: number
  greetingData: GreetingData | null
  systemStatus: SystemStatus | null
  systemHealthPercent: number
}

interface AgentPresenceActions {
  wakeUp: (token: string) => Promise<void>
  setMood: (mood: AgentMood) => void
  touch: () => void
  completeFirstGreeting: () => void
  reset: () => void
}

// ─── Initial State ─────────────────────────────────────

const initialState: AgentPresenceState = {
  isAwake: false,
  hasCompletedFirstGreeting: false,
  mood: 'idle',
  lastActiveAt: 0,
  greetingData: null,
  systemStatus: null,
  systemHealthPercent: 100,
}

// ─── Store ─────────────────────────────────────────────

export const useAgentPresenceStore = create<AgentPresenceState & AgentPresenceActions>()(
  persist(
    (set) => ({
      ...initialState,

      wakeUp: async (token: string) => {
        try {
          const res = await fetch('/api/agent/greeting', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          })
          if (!res.ok) throw new Error(`Greeting API: ${res.status}`)
          const json = await res.json()
          if (json.code === 0 && json.data) {
            const data = json.data as GreetingData
            const sys = data.systemStatus
            const healthy = sys?.healthyComponents ?? 0
            const total = sys?.totalComponents ?? 1
            set({
              isAwake: true,
              greetingData: data,
              systemStatus: sys || null,
              systemHealthPercent: total > 0 ? Math.round((healthy / total) * 100) : 100,
              mood: data.overnightBrief?.hasEvents ? 'greeting' : 'idle',
              lastActiveAt: Date.now(),
            })
          }
        } catch {
          set({ isAwake: true, mood: 'alert', lastActiveAt: Date.now() })
        }
      },

      setMood: (mood) => set({ mood }),
      touch: () => set({ lastActiveAt: Date.now() }),
      completeFirstGreeting: () => set({ hasCompletedFirstGreeting: true }),
      reset: () => set({ ...initialState }),
    }),
    {
      name: 'agent-presence',
      partialize: (state) => ({
        hasCompletedFirstGreeting: state.hasCompletedFirstGreeting,
        lastActiveAt: state.lastActiveAt,
      }),
    },
  ),
)
