/**
 * PublishCore - 统一分发中控（深度增强版）
 * 发布日历 + 队列管理 + 平台健康 + 发布后验证 + 历史记录
 */

'use client'

import { useState } from 'react'
import {
  Calendar, Check, Clock, Edit3, Eye, History, Layers, RefreshCw,
  Send, Sparkles, AlertTriangle, Wifi, WifiOff, ChevronLeft, ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

// ── 平台定义（含健康状态） ──
interface PlatformInfo {
  id: string; name: string; icon: string; specs: string
  health: 'online' | 'degraded' | 'offline'
  rateLimit: { used: number; total: number }
}

const PLATFORMS: PlatformInfo[] = [
  { id: 'xhs', name: '小红书', icon: '📕', specs: '图文·300-500字', health: 'online', rateLimit: { used: 23, total: 100 } },
  { id: 'douyin', name: '抖音', icon: '🎵', specs: '视频·15-60s', health: 'online', rateLimit: { used: 67, total: 100 } },
  { id: 'gzh', name: '公众号', icon: '📰', specs: '图文·1500-2000字', health: 'degraded', rateLimit: { used: 5, total: 10 } },
  { id: 'bilibili', name: 'B站', icon: '📺', specs: '视频·3-8min', health: 'online', rateLimit: { used: 12, total: 50 } },
]

// ── 发布项 ──
interface PublishItem {
  id: string; title: string
  platform: string; platformIcon: string
  status: 'scheduled' | 'publishing' | 'published' | 'failed'
  scheduledAt: string
  publishedAt?: string
  content: string
  verified?: boolean
  postUrl?: string
  stats?: { views: number; likes: number }
}

function mockQueue(): PublishItem[] {
  const now = new Date()
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  const t = (h: number, m: number) => { const d = new Date(now); d.setHours(h, m, 0, 0); return d }
  return [
    { id: 'q1', title: '成分科普：卸妆油怎么选', platform: 'xhs', platformIcon: '📕', status: 'published', scheduledAt: fmt(t(12, 0)), publishedAt: fmt(t(12, 2)), verified: true, postUrl: 'https://xhs.cn/...', stats: { views: 2340, likes: 156 }, content: '已发布版本...' },
    { id: 'q2', title: '成分科普：卸妆油怎么选', platform: 'douyin', platformIcon: '🎵', status: 'published', scheduledAt: fmt(t(18, 0)), publishedAt: fmt(t(18, 5)), verified: true, postUrl: 'https://douyin.com/...', stats: { views: 890, likes: 45 }, content: '已发布版本...' },
    { id: 'q3', title: '成分科普：卸妆油怎么选', platform: 'gzh', platformIcon: '📰', status: 'scheduled', scheduledAt: fmt(t(8, 0)), content: '已排期版本...' },
    { id: 'q4', title: '成分科普：卸妆油怎么选', platform: 'bilibili', platformIcon: '📺', status: 'scheduled', scheduledAt: fmt(t(12, 0)), content: '已排期版本...' },
    { id: 'q5', title: '端午节促销方案', platform: 'xhs', platformIcon: '📕', status: 'failed', scheduledAt: fmt(t(14, 0)), content: '发布失败版本...' },
  ]
}

export default function PublishCore() {
  const [view, setView] = useState<'queue' | 'calendar' | 'history'>('queue')
  const [queue, setQueue] = useState<PublishItem[]>(mockQueue())
  const [publishingAll, setPublishingAll] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [verifyId, setVerifyId] = useState<string | null>(null)

  // ── 全量发布 ──
  const handlePublishAll = async () => {
    const ready = queue.filter(q => q.status === 'scheduled').length
    if (ready === 0) { toast.error('没有待发布的内容'); return }
    setPublishingAll(true)
    for (const q of queue.filter(q => q.status === 'scheduled')) {
      setQueue(prev => prev.map(x => x.id === q.id ? { ...x, status: 'publishing' as const } : x))
      await new Promise(r => setTimeout(r, 800))
      const now = new Date()
      setQueue(prev => prev.map(x => x.id === q.id ? {
        ...x, status: 'published' as const,
        publishedAt: `${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
        verified: x.platform !== 'gzh', // 模拟：公众号需要手动验证
        stats: x.platform !== 'gzh' ? { views: Math.floor(Math.random() * 1000), likes: Math.floor(Math.random() * 100) } : undefined,
      } : x))
    }
    setPublishingAll(false)
    toast.success(`已发布 ${ready} 个平台`)
  }

  // ── 发布后验证 ──
  const handleVerify = (id: string) => {
    setQueue(prev => prev.map(x => x.id === id ? { ...x, verified: true, postUrl: `https://${PLATFORMS.find(p => p.id === x.platform)?.name.toLowerCase()}.com/verified`, stats: { views: Math.floor(Math.random() * 2000), likes: Math.floor(Math.random() * 200) } } : x))
    setVerifyId(null)
    toast.success('验证通过')
  }

  // ── 日历生成 ──
  const calDays = () => {
    const y = calendarMonth.getFullYear(); const m = calendarMonth.getMonth()
    const first = new Date(y, m, 1).getDay()
    const days = new Date(y, m + 1, 0).getDate()
    const today = new Date().getDate()
    const result: { date: number; empty: boolean; isToday: boolean; items: PublishItem[] }[] = []
    for (let i = 0; i < first; i++) result.push({ date: 0, empty: true, isToday: false, items: [] })
    for (let d = 1; d <= days; d++) {
      const dateItems = queue.filter(q => new Date(q.scheduledAt).getDate() === d)
      result.push({ date: d, empty: false, isToday: d === today, items: dateItems })
    }
    return result
  }

  const publishedCount = queue.filter(q => q.status === 'published').length
  const scheduledCount = queue.filter(q => q.status === 'scheduled').length
  const failedCount = queue.filter(q => q.status === 'failed').length

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-6 space-y-5">

        {/* 标题 + 操作 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> 统一分发中控
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {scheduledCount} 条待发布 · {publishedCount} 条已发布 · {failedCount} 条失败
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex gap-1 bg-muted rounded-lg p-0.5">
              {[{ k: 'queue', l: '队列', i: <Layers className="h-3.5 w-3.5" /> }, { k: 'calendar', l: '日历', i: <Calendar className="h-3.5 w-3.5" /> }, { k: 'history', l: '历史', i: <History className="h-3.5 w-3.5" /> }].map(tab => (
                <button key={tab.k} onClick={() => setView(tab.k as typeof view)}
                  className={cn('flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all',
                    view === tab.k ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {tab.i} {tab.l}
                </button>
              ))}
            </div>
            <Button onClick={handlePublishAll} disabled={publishingAll || scheduledCount === 0} className="cursor-pointer gap-1" size="sm">
              <Sparkles className="h-4 w-4" /> {publishingAll ? '发布中...' : `一键发布 ${scheduledCount} 平台`}
            </Button>
          </div>
        </div>

        {/* ── 平台健康状态 ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PLATFORMS.map(p => (
            <div key={p.id} className={cn('rounded-xl border p-3', p.health === 'offline' ? 'border-red-500/20 bg-red-500/5' : p.health === 'degraded' ? 'border-amber-500/20 bg-amber-500/5' : 'border-border bg-card')}>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-sm font-medium">{p.icon} {p.name}</span>
                {p.health === 'online' ? <Wifi className="h-3.5 w-3.5 text-green-500" /> :
                  p.health === 'degraded' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> :
                    <WifiOff className="h-3.5 w-3.5 text-red-500" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>速率限制</span>
                  <span>{p.rateLimit.used}/{p.rateLimit.total}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', p.rateLimit.used / p.rateLimit.total > 0.8 ? 'bg-red-500' : p.rateLimit.used / p.rateLimit.total > 0.5 ? 'bg-amber-500' : 'bg-green-500')}
                    style={{ width: `${(p.rateLimit.used / p.rateLimit.total) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── 视图 1: 发布队列 ── */}
        {view === 'queue' && (
          <div className="space-y-3 animate-in fade-in">
            {queue.map(q => (
              <div key={q.id} className={cn('rounded-xl border bg-card p-4 flex items-center gap-4',
                q.status === 'failed' ? 'border-red-500/20' : 'border-border')}>
                <span className="text-xl shrink-0">{q.platformIcon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{q.title}</span>
                    <span className="text-xs text-muted-foreground">· {PLATFORMS.find(p => p.id === q.platform)?.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                      {q.status === 'published' ? `已发布 ${q.publishedAt}` : `排期 ${q.scheduledAt}`}
                    </span>
                    {q.status === 'published' && q.verified && <span className="text-green-600 flex items-center gap-0.5"><Check className="h-3 w-3" />已验证</span>}
                    {q.status === 'published' && !q.verified && <span className="text-amber-500 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" />待验证</span>}
                    {q.status === 'failed' && <span className="text-red-500 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" />发布失败</span>}
                    {q.stats && <span>👁 {q.stats.views} · ❤️ {q.stats.likes}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {q.status === 'published' && !q.verified && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] cursor-pointer" onClick={() => setVerifyId(q.id)}>
                      <Eye className="h-3 w-3 mr-1" />验证
                    </Button>
                  )}
                  {q.status === 'failed' && (
                    <Button size="sm" className="h-7 text-[10px] cursor-pointer" onClick={() => {
                      setQueue(prev => prev.map(x => x.id === q.id ? { ...x, status: 'scheduled' } : x)); toast.success('已重新排期')
                    }}>
                      <RefreshCw className="h-3 w-3 mr-1" />重试
                    </Button>
                  )}
                  {q.status === 'published' && q.postUrl && (
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] cursor-pointer"
                      onClick={() => { navigator.clipboard.writeText(q.postUrl || ''); toast.success('链接已复制') }}>
                      复制链接
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 验证弹窗 */}
        {verifyId && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setVerifyId(null)}>
            <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="font-semibold text-sm">发布后验证</h3>
              <p className="text-xs text-muted-foreground">请确认该内容在平台上已成功发布且可正常访问</p>
              {queue.find(q => q.id === verifyId)?.postUrl && (
                <input readOnly value={queue.find(q => q.id === verifyId)?.postUrl} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs" />
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setVerifyId(null)}>取消</Button>
                <Button size="sm" className="cursor-pointer" onClick={() => handleVerify(verifyId)}>确认已发布</Button>
              </div>
            </div>
          </div>
        )}

        {/* ── 视图 2: 发布日历 ── */}
        {view === 'calendar' && (
          <div className="rounded-xl border border-border bg-card p-5 animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">{calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月</h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer"
                  onClick={() => setCalendarMonth(new Date())}>今</Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="py-1 text-muted-foreground font-medium">{d}</div>)}
              {calDays().map((d, i) => (
                <div key={i} className={cn('min-h-16 p-1 rounded-lg border',
                  d.empty ? 'border-transparent' : d.isToday ? 'border-primary/50 bg-primary/5' : 'border-border/50 hover:border-primary/20',
                )}>
                  {!d.empty && <div className={cn('text-xs font-medium mb-0.5', d.isToday && 'text-primary')}>{d.date}</div>}
                  {d.items.map(q => (
                    <div key={q.id} className={cn('text-[9px] px-1 py-0.5 rounded truncate mb-0.5',
                      q.status === 'published' ? 'bg-green-500/10 text-green-700' : q.status === 'failed' ? 'bg-red-500/10 text-red-700' : 'bg-blue-500/10 text-blue-700')}>
                      {q.platformIcon} {q.status === 'published' ? '已发布' : q.status === 'failed' ? '失败' : '排期'}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 视图 3: 发布历史 ── */}
        {view === 'history' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              {[
                { label: '本月发布', value: queue.filter(q => q.status === 'published').length, color: 'text-green-500' },
                { label: '成功率', value: `${Math.round((queue.filter(q => q.status === 'published').length / Math.max(queue.length, 1)) * 100)}%`, color: 'text-blue-500' },
                { label: '平均延迟', value: '< 2分钟', color: 'text-amber-500' },
              ].map(s => (
                <div key={s.label} className="text-center p-4 rounded-xl border border-border bg-card">
                  <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
            {queue.filter(q => q.status === 'published').map(q => (
              <div key={q.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
                <span className="text-xl">{q.platformIcon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{q.title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{PLATFORMS.find(p => p.id === q.platform)?.name}</span>
                    <span>· 发布 {q.publishedAt}</span>
                    {q.stats && <span>· 👁 {q.stats.views} ❤️ {q.stats.likes}</span>}
                  </div>
                </div>
                <div className={cn('px-2 py-1 rounded-full text-[10px] font-medium', q.verified ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700')}>
                  {q.verified ? '已验证' : '待验证'}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
