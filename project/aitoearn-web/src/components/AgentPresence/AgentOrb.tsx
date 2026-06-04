/**
 * AgentOrb — AI 常驻呼吸球
 *
 * 权限控制：仅认证路由显示，登录/欢迎/公开页面自动隐藏
 * 桌面端：右下角呼吸球 + Cmd+K 唤起命令面板
 * 移动端：顶部栏 AI 图标替代（触摸唤起）
 *
 * 状态-颜色映射：
 *   idle/greeting → 品牌紫青渐变 + 慢速呼吸
 *   working       → 渐变旋转 + 加速脉冲
 *   thinking      → 紫色脉冲 + 微光粒子
 *   alert         → 琥珀色告警脉冲
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { useNavigationLogic } from '@/app/layout/shared/hooks/useNavigationLogic'
import { useAgentPresenceStore } from '@/store/agent/agent-presence'
import { useUserStore } from '@/store/user'
import { isPublicPage } from '@/utils/route'
import type { AgentMood } from '@/store/agent/agent-presence'

// ─── 心情 → 样式映射 ────────────────────────────

const moodStyles: Record<AgentMood, { gradient: string; pulse: number; glow: string }> = {
  greeting: {
    gradient: 'var(--brand-gradient)',
    pulse: 1.05,
    glow: 'rgba(139,92,246,0.4)', // 紫色辉光
  },
  idle: {
    gradient: 'var(--brand-gradient)',
    pulse: 1.02,
    glow: 'rgba(139,92,246,0.25)',
  },
  working: {
    gradient: 'linear-gradient(135deg, var(--brand-purple), var(--brand-cyan), var(--brand-purple))',
    pulse: 1.08,
    glow: 'rgba(139,92,246,0.5)',
  },
  thinking: {
    gradient: 'linear-gradient(135deg, var(--brand-purple), oklch(70% 0.25 280), var(--brand-purple))',
    pulse: 1.06,
    glow: 'rgba(168,85,247,0.45)',
  },
  alert: {
    gradient: 'linear-gradient(135deg, oklch(65% 0.2 85), oklch(75% 0.2 75))',
    pulse: 1.1,
    glow: 'rgba(245,158,11,0.5)', // 琥珀辉光
  },
}

// ─── 组件 ─────────────────────────────────────────

export function AgentOrb() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthPage } = useNavigationLogic()
  const token = useUserStore((s) => s.token)

  const { isAwake, mood, systemStatus, systemHealthPercent, wakeUp } =
    useAgentPresenceStore()

  const [showTooltip, setShowTooltip] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // ── 检测移动端 ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── 登录后自动唤醒 Agent ──
  useEffect(() => {
    if (token && !isAwake) {
      wakeUp(token)
    }
  }, [token, isAwake, wakeUp])

  // ── 权限控制：游客页面隐藏 ──
  const shouldHide = isAuthPage || isPublicPage(pathname) || !token

  // ── 命令面板唤起 ──
  const openCommandBar = useCallback(() => {
    // 触发自定义事件，由 AgentCommandBar 监听
    window.dispatchEvent(new CustomEvent('agent:command-bar'))
    useAgentPresenceStore.getState().touch()
  }, [])

  // ── 跳转 AI Tab ──
  const goToAgent = useCallback(() => {
    useAgentPresenceStore.getState().touch()
    router.push('/agent')
  }, [router])

  // ── Cmd+K 快捷键 ──
  useEffect(() => {
    if (isMobile) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openCommandBar()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isMobile, openCommandBar])

  // ── 移动端顶部 AI 图标 ──
  if (isMobile && !shouldHide) {
    return (
      <motion.button
        className="fixed top-3 right-3 z-50 w-9 h-9 rounded-full flex items-center justify-center
                   bg-gradient-to-br from-(--brand-purple) to-(--brand-cyan) shadow-lg
                   active:scale-90 transition-transform"
        onClick={openCommandBar}
        whileTap={{ scale: 0.9 }}
        aria-label="打开 AI 助手"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
          <path d="M8 14v-2a4 4 0 0 1 8 0v2" />
          <circle cx="12" cy="14" r="8" />
          <circle cx="9" cy="13" r="1" fill="white" />
          <circle cx="15" cy="13" r="1" fill="white" />
        </svg>
      </motion.button>
    )
  }

  // ── 桌面端呼吸球 ──
  const style = moodStyles[mood] || moodStyles.idle

  return (
    <AnimatePresence>
      {!shouldHide && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* 辉光 */}
          <motion.div
            className="absolute inset-0 rounded-full blur-xl"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.3, 1],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: style.glow }}
          />

          {/* 球体 */}
          <motion.button
            className="relative w-7 h-7 rounded-full cursor-pointer shadow-lg
                       hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-(--brand-purple)/50"
            style={{ background: style.gradient }}
            animate={{
              scale: [1, style.pulse, 1],
              rotate: mood === 'working' ? [0, 360] : 0,
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
              rotate:
                mood === 'working'
                  ? { duration: 3, repeat: Infinity, ease: 'linear' }
                  : { duration: 0 },
            }}
            onClick={isAwake ? openCommandBar : goToAgent}
            aria-label={isAwake ? '打开 AI 命令面板 (Cmd+K)' : '唤醒 AI 助手'}
          >
            {/* 内点 */}
            <motion.span
              className="absolute inset-2 rounded-full bg-white/80"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.button>

          {/* Tooltip */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                className="absolute bottom-full right-0 mb-3 px-3 py-2 rounded-xl
                           bg-card border border-border shadow-lg text-xs whitespace-nowrap"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: style.gradient }}
                  />
                  <span className="text-foreground font-medium">
                    {mood === 'greeting' && 'Agent 在线'}
                    {mood === 'idle' && 'Agent 待命中'}
                    {mood === 'working' && 'Agent 工作中'}
                    {mood === 'thinking' && 'Agent 思考中'}
                    {mood === 'alert' && '部分服务异常'}
                  </span>
                </div>
                {systemStatus && (
                  <div className="text-muted-foreground mt-1">
                    {systemStatus.healthyComponents}/{systemStatus.totalComponents} 组件 ·{' '}
                    健康度 {systemHealthPercent}%
                  </div>
                )}
                <div className="text-muted-foreground/60 mt-0.5">
                  {isMobile ? '点击唤起 AI' : '点击或 Cmd+K 唤起'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
