/**
 * TabLayout — WeChat 风格底部 4 Tab 布局
 *
 * 替代传统侧边栏导航。AI Tab 是默认主界面（Agent 对话），
 * 其余 Tab 按功能组织。切换 Tab 不改变 URL。
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, ClipboardList, Users, User } from 'lucide-react'
import { useUserStore } from '@/store/user'
import { useAgentPresenceStore } from '@/store/agent/agent-presence'
import { AiTabView } from './views/AiTabView'
import { WorkTabView } from './views/WorkTabView'
import { AssetsTabView } from './views/AssetsTabView'
import { MeTabView } from './views/MeTabView'

// ─── Types ───────────────────────────────────────────

export type TabId = 'ai' | 'work' | 'assets' | 'me'

interface TabDef {
  id: TabId
  label: string
  icon: (active: boolean) => React.ReactNode
}

// ─── Global tab state (shared across component remounts) ──

let _activeTab: TabId = 'ai'
let _setters: Array<(t: TabId) => void> = []

export function switchTab(tab: TabId) {
  _activeTab = tab
  _setters.forEach((s) => s(tab))
}

// ─── Tab transition ──────────────────────────────────

const slideVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

// ─── Component ───────────────────────────────────────

export function TabLayout() {
  const [activeTab, setActiveTab] = useState<TabId>(_activeTab)
  const token = useUserStore((s) => s.token)
  const { isAwake, wakeUp, systemStatus } = useAgentPresenceStore()

  // Register/unregister global setter
  useEffect(() => {
    _setters.push(setActiveTab)
    return () => {
      _setters = _setters.filter((s) => s !== setActiveTab)
    }
  }, [])

  // Sync internal → global
  const switchTo = useCallback((tab: TabId) => {
    _activeTab = tab
    _setters.forEach((s) => s(tab))
  }, [])

  // Wake up Agent
  useEffect(() => {
    if (token && !isAwake) wakeUp(token)
  }, [token, isAwake, wakeUp])

  // Cmd+K → focus AI Tab chat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        switchTo('ai')
        setTimeout(() => window.dispatchEvent(new CustomEvent('tab:focus-chat')), 100)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [switchTo])

  if (!token) return null

  const tabs: TabDef[] = [
    { id: 'ai', label: 'AI', icon: (a) => <MessageCircle className={`h-5 w-5 ${a ? 'fill-current' : ''}`} /> },
    { id: 'work', label: '工作', icon: (a) => <ClipboardList className={`h-5 w-5 ${a ? 'fill-current' : ''}`} /> },
    { id: 'assets', label: '资产', icon: (a) => <Users className={`h-5 w-5 ${a ? 'fill-current' : ''}`} /> },
    { id: 'me', label: '我', icon: (a) => <User className={`h-5 w-5 ${a ? 'fill-current' : ''}`} /> },
  ]

  const alerts = systemStatus?.alerts ?? 0

  return (
    <div className="flex flex-col h-dvh w-full bg-background">
      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="absolute inset-0 overflow-y-auto"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            {activeTab === 'ai' && <AiTabView />}
            {activeTab === 'work' && <WorkTabView />}
            {activeTab === 'assets' && <AssetsTabView />}
            {activeTab === 'me' && <MeTabView />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Tab Bar */}
      <nav className="shrink-0 flex items-center justify-around h-14
                      bg-background/95 backdrop-blur border-t border-border">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => switchTo(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5
                          flex-1 h-full transition-colors duration-150
                          ${isActive ? 'text-(--brand-purple)' : 'text-muted-foreground/70 hover:text-foreground'}`}
            >
              {tab.icon(isActive)}
              {tab.id === 'ai' && alerts > 0 && (
                <span className="absolute top-1.5 right-[30%] flex items-center justify-center
                                 min-w-[16px] h-4 px-1 rounded-full bg-amber-500
                                 text-[9px] font-bold text-white leading-none">
                  {alerts}
                </span>
              )}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
