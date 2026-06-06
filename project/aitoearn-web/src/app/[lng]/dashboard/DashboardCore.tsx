/**
 * DashboardCore - 全域运营仪表盘主组件
 * 3秒看清全局，10秒知道该做什么
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  BarChart3,
  Calendar,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  PenLine,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/user'

// ── 类型 ──

interface DashboardData {
  score: number
  scoreChange: number
  totalFollowers: number
  followersChange: number
  weeklyPosts: number
  weeklyPostsLimit?: number
  pendingReplies: number
  totalAccounts?: number
  connectedAccounts?: number
  creditsBalance?: number
  activePlan?: { name: string; maxAccounts: number; maxContentPerMonth: number } | null
  aiSuggestions: AISuggestion[]
  todayTodos: TodoItem[]
  weekCalendar: CalendarDay[]
  backendAvailable?: boolean
  systemStatus?: string
}

interface AISuggestion {
  id: string
  type: 'warning' | 'opportunity' | 'reminder'
  text: string
}

interface TodoItem {
  id: string
  text: string
  done: boolean
}

interface CalendarDay {
  day: string
  date: number
  hasContent: boolean
  platforms: string[]
  isToday: boolean
}

// ── 指标卡片配置 ──

interface MetricCard {
  key: string
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

// ── 组件 ──

export default function DashboardCore() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const userName = useUserStore(state => state.userInfo?.name) || ''
  const token = useUserStore(state => state.token)

  // 获取问候语
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 6) return '夜深了'
    if (hour < 9) return '早上好'
    if (hour < 12) return '上午好'
    if (hour < 14) return '中午好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }, [])

  const today = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}`
  }, [])

  // 加载数据
  const [usingMockData, setUsingMockData] = useState(false)
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadDashboard() {
      try {
        const res = await fetch('/api/user/dashboard', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        })
        if (cancelled) return
        if (res.ok) {
          const json = await res.json()
          if (json.code === 0 && json.data) {
            if (!cancelled) {
              setData(json.data)
              setUsingMockData(false)
              setLoading(false)
            }
            return
          }
        }
        // API 返回非预期响应 → 降级到 mock
        console.warn('[Dashboard] API returned unexpected response, using mock data')
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        // 网络错误或 API 不可达 → 降级使用 mock，但记录并提示用户
        console.warn('[Dashboard] API unreachable, using mock data:', err?.message || err)
      }
      // API 不可达时使用 mock 数据（避免白屏），但标记来源
      if (!cancelled) {
        setData(getMockData())
        setUsingMockData(true)
        setLoading(false)
      }
    }
    loadDashboard()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [token])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        加载失败，请刷新重试
      </div>
    )
  }

  const metrics: MetricCard[] = [
    { key: 'score', label: '运营指数', icon: <Zap className="h-5 w-5" />, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { key: 'followers', label: '总粉丝', icon: <Users className="h-5 w-5" />, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { key: 'posts', label: '本周发布', icon: <Send className="h-5 w-5" />, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { key: 'replies', label: '待回复', icon: <MessageSquare className="h-5 w-5" />, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { key: 'suggestions', label: 'AI 建议', icon: <Lightbulb className="h-5 w-5" />, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  ]

  const getMetricValue = (key: string) => {
    switch (key) {
      case 'score': return <>{data.score}<span className="text-xs ml-1 text-green-500">↑{data.scoreChange}</span></>
      case 'followers': return <>{fmtNum(data.totalFollowers)}<span className="text-xs ml-1 text-green-500">↑{data.followersChange}%</span></>
      case 'posts': return <>{data.weeklyPosts}<span className="text-xs ml-1 text-muted-foreground">条</span></>
      case 'replies': return <span className={data.pendingReplies > 0 ? 'text-orange-500' : ''}>{data.pendingReplies}<span className="text-xs ml-1 text-muted-foreground">条</span></span>
      case 'suggestions': return <>{data.aiSuggestions.length}<span className="text-xs ml-1 text-muted-foreground">条</span></>
      default: return null
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">

        {/* Mock 数据警告 */}
        {usingMockData && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <span className="text-lg">⚠️</span>
            <div>
              <span className="font-semibold">API 服务暂不可用</span>
              <span className="text-amber-600 ml-2">当前显示示例数据</span>
              <button
                onClick={() => window.location.reload()}
                className="ml-3 underline hover:text-amber-900 cursor-pointer font-medium"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {/* ── 问候 + 日期 ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">
              {greeting}，{userName || '朋友'}！
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{today}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/create">
              <Button size="sm" className="cursor-pointer gap-1.5">
                <PenLine className="h-4 w-4" />
                开始创作
              </Button>
            </Link>
          </div>
        </div>

        {/* ── 5 个指标卡片 ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {metrics.map(m => (
            <div key={m.key} className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
              <div className={cn('inline-flex p-2 rounded-lg mb-2', m.bgColor)}>
                <span className={m.color}>{m.icon}</span>
              </div>
              <div className="text-2xl font-bold">{getMetricValue(m.key)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        {/* ── 双栏布局：AI 建议 + 内容日历 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* AI 今日建议 */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="inline-flex p-1.5 rounded-lg bg-purple-500/10">
                <Sparkles className="h-4 w-4 text-purple-500" />
              </div>
              <h2 className="font-semibold text-sm">AI 今日建议</h2>
              <span className="text-xs text-muted-foreground ml-auto">{data.aiSuggestions.length} 条</span>
            </div>
            <div className="space-y-3">
              {data.aiSuggestions.map(s => (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg text-sm',
                    s.type === 'warning' && 'bg-red-500/5 border border-red-500/10',
                    s.type === 'opportunity' && 'bg-green-500/5 border border-green-500/10',
                    s.type === 'reminder' && 'bg-blue-500/5 border border-blue-500/10',
                  )}
                >
                  <span className={cn(
                    'mt-0.5 shrink-0',
                    s.type === 'warning' && 'text-red-500',
                    s.type === 'opportunity' && 'text-green-500',
                    s.type === 'reminder' && 'text-blue-500',
                  )}>
                    {s.type === 'warning' && <TrendingUp className="h-4 w-4 rotate-180" />}
                    {s.type === 'opportunity' && <Zap className="h-4 w-4" />}
                    {s.type === 'reminder' && <Calendar className="h-4 w-4" />}
                  </span>
                  <p className="text-foreground/80 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 本周内容日历 */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="inline-flex p-1.5 rounded-lg bg-blue-500/10">
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
              <h2 className="font-semibold text-sm">本周内容日历</h2>
              <Link href="/content/calendar" className="text-xs text-primary hover:underline ml-auto flex items-center gap-1">
                完整日历 <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {data.weekCalendar.map(d => (
                <div
                  key={d.date}
                  className={cn(
                    'flex flex-col items-center py-2 rounded-lg text-xs',
                    d.isToday && 'bg-primary/10 ring-1 ring-primary/30',
                    !d.isToday && 'hover:bg-muted/50',
                  )}
                >
                  <span className="text-[10px] text-muted-foreground mb-1">{d.day}</span>
                  <span className={cn('text-sm font-medium', d.isToday && 'text-primary')}>{d.date}</span>
                  {d.hasContent && (
                    <div className="flex gap-0.5 mt-1.5">
                      {d.platforms.map((p, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60" title={p} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/60" /> 有发布计划</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted" /> 空闲</span>
            </div>
          </div>
        </div>

        {/* ── 今日待办 ── */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex p-1.5 rounded-lg bg-green-500/10">
              <BarChart3 className="h-4 w-4 text-green-500" />
            </div>
            <h2 className="font-semibold text-sm">今日待办</h2>
            <span className="text-xs text-muted-foreground">
              {data.todayTodos.filter(t => !t.done).length}/{data.todayTodos.length} 项
            </span>
          </div>
          <div className="space-y-2">
            {data.todayTodos.map(todo => (
              <div
                key={todo.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg text-sm transition-colors',
                  todo.done ? 'text-muted-foreground line-through bg-muted/20' : 'hover:bg-muted/30',
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                  todo.done ? 'bg-primary border-primary' : 'border-muted-foreground/30',
                )}>
                  {todo.done && <span className="text-[10px] text-primary-foreground">✓</span>}
                </div>
                {todo.text}
              </div>
            ))}
          </div>
        </div>

        {/* ── 快捷操作 ── */}
        <div className="flex items-center justify-center gap-3 pb-6">
          <Link href="/create">
            <Button size="lg" className="cursor-pointer gap-2 rounded-full px-6">
              <Sparkles className="h-4 w-4" />
              AI 创作
            </Button>
          </Link>
          <Link href="/analytics">
            <Button variant="outline" size="lg" className="cursor-pointer gap-2 rounded-full px-6">
              <BarChart3 className="h-4 w-4" />
              查看数据
            </Button>
          </Link>
          <Link href="/publish">
            <Button variant="outline" size="lg" className="cursor-pointer gap-2 rounded-full px-6">
              <Send className="h-4 w-4" />
              快速发布
            </Button>
          </Link>
        </div>

      </div>
    </div>
  )
}

// ── 骨架屏 ──

function DashboardSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <div className="flex justify-center gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-32 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 工具函数 ──

function fmtNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}K`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

// ── 模拟数据 ──

function getMockData(): DashboardData {
  return {
    score: 85,
    scoreChange: 3,
    totalFollowers: 12580,
    followersChange: 3,
    weeklyPosts: 8,
    pendingReplies: 5,
    aiSuggestions: [
      { id: '1', type: 'warning', text: '你的抖音互动率本周下降 15%，建议增加教程类内容比例，参考竞品 @美妆达人小李 的内容风格' },
      { id: '2', type: 'opportunity', text: '#夏季护肤 话题在小红书热度上升 200%，你还有 3 天窗口期可以蹭这波流量' },
      { id: '3', type: 'reminder', text: '今天下午 5:00 有一条小红书内容待发布，记得最终确认封面图和话题标签' },
    ],
    todayTodos: [
      { id: '1', text: '审核 AI 生成的 3 条小红书内容草稿', done: false },
      { id: '2', text: '回复客户评论（5 条待处理）', done: false },
      { id: '3', text: '确认下周内容排期计划', done: false },
      { id: '4', text: '查看本周运营数据周报', done: true },
    ],
    weekCalendar: [
      { day: '一', date: 1, hasContent: true, platforms: ['小红书'], isToday: true },
      { day: '二', date: 2, hasContent: true, platforms: ['抖音'], isToday: false },
      { day: '三', date: 3, hasContent: true, platforms: ['小红书', 'B站'], isToday: false },
      { day: '四', date: 4, hasContent: true, platforms: ['小红书'], isToday: false },
      { day: '五', date: 5, hasContent: true, platforms: ['抖音'], isToday: false },
      { day: '六', date: 6, hasContent: true, platforms: ['小红书'], isToday: false },
      { day: '日', date: 7, hasContent: false, platforms: [], isToday: false },
    ],
  }
}
