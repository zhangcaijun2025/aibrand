/**
 * AgentCommandBar — Cmd+K 全局命令面板
 *
 * 桌面端：Cmd+K / Ctrl+K 快捷键唤起
 * 移动端：顶部 AI 图标点击唤起（AgentOrb 已处理）
 *
 * 命令来源：
 *   1. Agent 建议（来自 greeting API 的 suggestions）
 *   2. n8n 工作流（来自后端工作流列表）
 *   3. 静态快捷命令（创作/发布/诊断/设置）
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Sparkles, Zap, PenLine, Send, BarChart3, Settings, X } from 'lucide-react'
import { useAgentPresenceStore } from '@/store/agent/agent-presence'
import { useUserStore } from '@/store/user'
import { useGetClientLng } from '@/hooks/useSystem'

// ─── Types ─────────────────────────────────────────────

interface Command {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  category: 'action' | 'suggestion' | 'workflow' | 'navigation'
  action: () => void
}

// ─── Static Commands ───────────────────────────────────

function getStaticCommands(
  router: ReturnType<typeof useRouter>,
  lng: string,
): Command[] {
  return [
    {
      id: 'create-content',
      label: '开始创作',
      description: '让 AI 帮你写小红书/抖音/B站内容',
      icon: <PenLine className="h-4 w-4" />,
      category: 'action',
      action: () => router.push(`/${lng}/create`),
    },
    {
      id: 'publish',
      label: '统一发布',
      description: '一键发布到多个平台',
      icon: <Send className="h-4 w-4" />,
      category: 'action',
      action: () => router.push(`/${lng}/publish`),
    },
    {
      id: 'diagnosis',
      label: '内容诊断',
      description: 'AI 诊断你的内容质量',
      icon: <Zap className="h-4 w-4" />,
      category: 'action',
      action: () => router.push(`/${lng}/diagnosis`),
    },
    {
      id: 'dashboard',
      label: '运营仪表盘',
      description: '查看全域运营数据',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'navigation',
      action: () => router.push(`/${lng}/dashboard`),
    },
    {
      id: 'agent-chat',
      label: 'Agent 对话',
      description: '跟 AI Agent 深入交流',
      icon: <Sparkles className="h-4 w-4" />,
      category: 'navigation',
      action: () => router.push(`/${lng}/agent`),
    },
    {
      id: 'settings',
      label: '设置',
      description: '管理订阅和偏好',
      icon: <Settings className="h-4 w-4" />,
      category: 'navigation',
      action: () => router.push(`/${lng}/pricing`),
    },
  ]
}

// ─── Component ─────────────────────────────────────────

export function AgentCommandBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const lng = useGetClientLng()

  const { greetingData, touch } = useAgentPresenceStore()
  const token = useUserStore((s) => s.token)

  // ── 监听唤起事件（AgentOrb 点击 / Cmd+K / 移动端图标）──
  useEffect(() => {
    const handler = () => {
      setOpen((prev) => !prev)
      setQuery('')
      setSelectedIdx(0)
      touch()
    }
    window.addEventListener('agent:command-bar', handler)
    return () => window.removeEventListener('agent:command-bar', handler)
  }, [touch])

  // ── 聚焦输入框 ──
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // ── Escape 关闭 ──
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // ── 构建命令列表 ──
  const staticCmds = getStaticCommands(router, lng)

  const suggestionCmds: Command[] = (greetingData?.suggestions || [])
    .slice(0, 5)
    .map((s, i) => ({
      id: `suggestion-${i}`,
      label: s.text.slice(0, 30),
      description: s.text,
      icon: <Sparkles className="h-4 w-4 text-purple-400" />,
      category: 'suggestion' as const,
      action: () => {
        if (s.action === 'navigate' && s.payload?.path) {
          router.push(s.payload.path as string)
        } else {
          router.push(`/${lng}/chat?q=${encodeURIComponent(s.text)}`)
        }
      },
    }))

  const allCommands = [...suggestionCmds, ...staticCmds]

  // ── 过滤 ──
  const filtered = query
    ? allCommands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase()),
      )
    : allCommands

  const selected = filtered[selectedIdx] || null

  // ── 键盘导航 ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && selected) {
        e.preventDefault()
        selected.action()
        setOpen(false)
      }
    },
    [filtered, selected],
  )

  // ── 游客/未登录不渲染 ──
  if (!token) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />

          {/* 命令面板 */}
          <motion.div
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[101]
                       w-full max-w-lg rounded-2xl border border-border
                       bg-card shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* 搜索框 */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIdx(0)
                }}
                onKeyDown={handleKeyDown}
                placeholder="跟 Agent 说你想做什么..."
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground
                           outline-none text-base"
              />
              <kbd className="hidden md:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md
                               bg-muted text-xs text-muted-foreground font-mono">
                esc
              </kbd>
              <button
                onClick={() => setOpen(false)}
                className="md:hidden p-1 rounded-md hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* 命令列表 */}
            <div className="max-h-64 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  没有匹配的命令 — 试试换个说法
                </div>
              )}
              {filtered.map((cmd, idx) => (
                <button
                  key={cmd.id}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                    transition-colors ${
                      idx === selectedIdx
                        ? 'bg-(--brand-purple)/10 text-(--brand-purple)'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  onClick={() => {
                    cmd.action()
                    setOpen(false)
                  }}
                  onMouseEnter={() => setSelectedIdx(idx)}
                >
                  <span className="shrink-0">{cmd.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{cmd.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {cmd.description}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground/50 uppercase">
                    {cmd.category === 'suggestion' && 'Agent 建议'}
                    {cmd.category === 'action' && '快捷'}
                    {cmd.category === 'navigation' && '导航'}
                  </span>
                </button>
              ))}
            </div>

            {/* 底部提示 */}
            <div className="flex items-center gap-3 px-4 py-2 border-t border-border text-[10px] text-muted-foreground/60">
              <span>↑↓ 导航</span>
              <span>↵ 选择</span>
              <span>esc 关闭</span>
              <span className="ml-auto">Agent · Cmd+K</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
