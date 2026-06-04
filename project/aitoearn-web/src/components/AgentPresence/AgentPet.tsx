/**
 * AgentPet — Codex 风格 AI 桌面宠物
 *
 * 替代 AgentOrb 呼吸球。有性格、有动画、可交互的像素宠物。
 * 参考 OpenAI Codex Pets: 状态可视化 + 情感连接 + 悬浮常驻。
 *
 * 状态 → 动画映射:
 *   idle       → 慢速呼吸 + 偶尔眨眼
 *   greeting   → 跳跃挥手
 *   working    → 忙碌奔跑
 *   thinking   → 歪头思考 + 微光粒子
 *   alert      → 抖动 + 颜色变化
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAgentPresenceStore } from '@/store/agent/agent-presence'
import { useUserStore } from '@/store/user'
import type { AgentMood } from '@/store/agent/agent-presence'

// ─── Pet avatar — SVG pixel-style character ───────────

function PetAvatar({ mood, onClick }: { mood: AgentMood; onClick?: () => void }) {
  // Simple but characterful SVG — can be replaced with sprite sheet later
  return (
    <motion.button
      onClick={onClick}
      className="relative cursor-pointer select-none focus:outline-none"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      animate={mood === 'working' ? { x: [0, 2, -2, 1, 0] } : {}}
      transition={mood === 'working' ? { duration: 0.6, repeat: Infinity } : {}}
      aria-label={`Agent — ${mood}`}
    >
      {/* Body */}
      <motion.div
        className="w-10 h-10 rounded-2xl flex items-center justify-center
                   bg-gradient-to-br from-(--brand-purple) to-(--brand-cyan)
                   shadow-lg shadow-(--brand-purple)/20"
        animate={
          mood === 'idle'
            ? { scale: [1, 1.03, 1] }
            : mood === 'greeting'
              ? { rotate: [-5, 5, -5, 0], scale: [1, 1.1, 1] }
              : mood === 'thinking'
                ? { rotate: [0, -5, 0, 5, 0] }
                : mood === 'alert'
                  ? { x: [-2, 2, -2, 2, 0] }
                  : {}
        }
        transition={
          mood === 'idle'
            ? { scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' } }
            : mood === 'greeting'
              ? { duration: 0.8, ease: 'easeOut' }
              : mood === 'thinking'
                ? { rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }
                : mood === 'alert'
                  ? { x: { duration: 0.4, repeat: Infinity } }
                  : {}
        }
      >
        {/* Face — simple emoji-like eyes */}
        <div className="relative w-6 h-6">
          {/* Eyes */}
          <motion.div className="absolute inset-0 flex items-center justify-center gap-1.5">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-white"
              animate={mood === 'thinking' ? { scaleY: [1, 0.2, 1] } : {}}
              transition={{ duration: 0.3, repeat: mood === 'thinking' ? Infinity : 0, repeatDelay: 2 }}
            />
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-white"
              animate={mood === 'thinking' ? { scaleY: [1, 0.2, 1] } : {}}
              transition={{ duration: 0.3, repeat: mood === 'thinking' ? Infinity : 0, repeatDelay: 2, delay: 0.05 }}
            />
          </motion.div>
          {/* Mouth */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-0.5 rounded-full bg-white/70"
            animate={
              mood === 'greeting'
                ? { scaleX: [1, 1.5, 1] }
                : mood === 'alert'
                  ? { scaleY: 1.5 }
                  : {}
            }
          />
        </div>
      </motion.div>

      {/* Sparkle particles (thinking mode) */}
      {mood === 'thinking' && (
        <>
          <motion.span
            className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-(--brand-purple)"
            animate={{ opacity: [0, 1, 0], y: [-4, -10, -16], scale: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="absolute -top-1 left-0 w-1 h-1 rounded-full bg-(--brand-cyan)"
            animate={{ opacity: [0, 1, 0], y: [-2, -8, -14], scale: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          />
        </>
      )}

      {/* Alert glow */}
      {mood === 'alert' && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-amber-500/30 blur-md"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.button>
  )
}

// ─── Tooltip ───────────────────────────────────────────

function PetTooltip({ mood, health }: { mood: AgentMood; health: number }) {
  const labels: Record<AgentMood, string> = {
    greeting: 'Agent 向你问好 👋',
    idle: `Agent 待命中 · 健康 ${health}%`,
    working: 'Agent 正在处理任务...',
    thinking: 'Agent 思考中...',
    alert: '⚠️ 部分服务需要关注',
  }

  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2
                    rounded-xl bg-card border border-border shadow-lg
                    text-xs whitespace-nowrap pointer-events-none">
      <p className="text-foreground font-medium">{labels[mood]}</p>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────

export function AgentPet() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const token = useUserStore((s) => s.token)
  const { mood, isAwake, systemHealthPercent, wakeUp } = useAgentPresenceStore()

  const [showTooltip, setShowTooltip] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Wake up Agent on mount
  useEffect(() => {
    if (token && !isAwake) wakeUp(token)
  }, [token, isAwake, wakeUp])

  // Hide on public pages
  const isPublic = /^\/([a-z]{2}-[A-Z]{2}\/)?(auth|welcome|websit)/.test(typeof window !== 'undefined' ? window.location.pathname : '')
  if (!token || isPublic || dismissed) return null

  const handleClick = () => {
    // Switch to AI tab
    window.dispatchEvent(new CustomEvent('tab:switch', { detail: 'ai' }))
    setTimeout(() => window.dispatchEvent(new CustomEvent('tab:focus-chat')), 200)
  }

  return (
    <div
      className="fixed bottom-20 right-4 z-40"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <AnimatePresence>
        {showTooltip && <PetTooltip mood={mood} health={systemHealthPercent} />}
      </AnimatePresence>

      <PetAvatar mood={mood} onClick={handleClick} />

      {/* Dismiss button */}
      <button
        onClick={(e) => { e.stopPropagation(); setDismissed(true) }}
        className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-muted
                   flex items-center justify-center opacity-0 group-hover:opacity-100
                   transition-opacity hover:bg-border"
        aria-label="隐藏宠物"
      >
        <span className="text-[8px] text-muted-foreground">✕</span>
      </button>
    </div>
  )
}
