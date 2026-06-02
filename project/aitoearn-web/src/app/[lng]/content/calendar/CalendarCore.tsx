/**
 * CalendarCore - 内容日历
 * 月/周视图 · 拖拽感知 · 冲突检测 · AI推荐时间
 */

'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Sparkles, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CalendarItem {
  id: string; title: string; platform: string; platformIcon: string; time: string; hasConflict?: boolean
}

function mockItems(): CalendarItem[] {
  return [
    { id: 'c1', title: '成分科普：卸妆油怎么选', platform: 'xhs', platformIcon: '📕', time: '6/1 周一 12:00' },
    { id: 'c2', title: '成分科普：卸妆油怎么选', platform: 'douyin', platformIcon: '🎵', time: '6/1 周一 18:00' },
    { id: 'c3', title: '端午节促销方案', platform: 'xhs', platformIcon: '📕', time: '6/2 周二 12:00' },
    { id: 'c4', title: '成分科普：卸妆油怎么选', platform: 'gzh', platformIcon: '📰', time: '6/2 周二 08:00' },
    { id: 'c5', title: '卸妆产品横评', platform: 'bilibili', platformIcon: '📺', time: '6/3 周三 12:00' },
    { id: 'c6', title: '端午促销方案', platform: 'douyin', platformIcon: '🎵', time: '6/3 周三 18:00' },
    { id: 'c7', title: '学生党护肤指南', platform: 'xhs', platformIcon: '📕', time: '6/4 周四 12:00', hasConflict: true },
    { id: 'c8', title: '学生党护肤指南', platform: 'douyin', platformIcon: '🎵', time: '6/4 周四 12:00', hasConflict: true },
    { id: 'c9', title: '成分科普：卸妆油怎么选', platform: 'bilibili', platformIcon: '📺', time: '6/5 周五 12:00' },
    { id: 'c10', title: '卸妆产品横评', platform: 'xhs', platformIcon: '📕', time: '6/6 周六 10:00' },
  ]
}

export default function CalendarCore() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [items] = useState<CalendarItem[]>(mockItems())
  const [showAIHint, setShowAIHint] = useState(true)

  // 本周日期
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) + weekOffset * 7)

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    return { day: ['一', '二', '三', '四', '五', '六', '日'][i], date: d.getDate(), month: d.getMonth() + 1, full: d, isToday: d.toDateString() === now.toDateString() }
  })

  // 冲突检测
  const conflicts = items.filter(i => i.hasConflict)

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> 内容日历
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{items.length} 条排期 · {conflicts.length} 个冲突待处理</p>
          </div>
          <div className="flex gap-2">
            <Link href="/content"><Button variant="outline" size="sm" className="cursor-pointer gap-1"><Plus className="h-3.5 w-3.5" />新增排期</Button></Link>
            <Button size="sm" className="cursor-pointer gap-1"><Sparkles className="h-3.5 w-3.5" />AI 智能排期</Button>
          </div>
        </div>

        {/* AI 推荐时间提示 */}
        {showAIHint && (
          <div className="rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20 p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium">AI 智能排期建议</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                基于你的历史数据和平台规则，AI 建议：小红书最佳发布时间 12:00-13:00，抖音 18:00-20:00，公众号 08:00-09:00。
                <button className="text-primary hover:underline ml-1">一键应用推荐时间</button>
              </p>
            </div>
            <button onClick={() => setShowAIHint(false)} className="text-xs text-muted-foreground hover:text-foreground shrink-0">✕</button>
          </div>
        )}

        {/* 冲突警告 */}
        {conflicts.length > 0 && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-red-700 text-xs">
              检测到 {conflicts.length} 个排期冲突——同一平台同一时段有 2 条内容冲突。建议错开至少 1 小时。
            </span>
          </div>
        )}

        {/* 周期切换 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {monday.getMonth() + 1}月{monday.getDate()}日 - {(() => { const s = new Date(monday); s.setDate(s.getDate() + 6); return `${s.getMonth() + 1}月${s.getDate()}日` })()}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer" onClick={() => setWeekOffset(o => o + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs cursor-pointer" onClick={() => setWeekOffset(0)}>回到本周</Button>
        </div>

        {/* 周视图 */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(d => {
            const dayItems = items.filter(i => {
              const md = `${d.month}/${d.date}`
              return i.time.includes(md)
            })
            return (
              <div key={d.date} className={cn('rounded-xl border min-h-40 p-2', d.isToday ? 'border-primary/50 bg-primary/5' : 'border-border bg-card')}>
                <div className="text-center mb-2">
                  <div className="text-[10px] text-muted-foreground">{d.day}</div>
                  <div className={cn('text-lg font-bold', d.isToday && 'text-primary')}>{d.date}</div>
                </div>
                <div className="space-y-1">
                  {dayItems.map(item => (
                    <div key={item.id}
                      className={cn('text-[10px] p-1.5 rounded-md leading-tight cursor-pointer transition-colors border',
                        item.hasConflict
                          ? 'bg-red-500/10 text-red-700 border-red-500/20 hover:bg-red-500/20'
                          : 'bg-muted/50 hover:bg-muted border-transparent')}>
                      <div className="flex items-center gap-1 font-medium">
                        <span>{item.platformIcon}</span>
                        <span className="truncate">{item.title.slice(0, 10)}...</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        {item.time.split(' ')[2]}
                        {item.hasConflict && <AlertTriangle className="h-2.5 w-2.5 text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-muted/50" />正常</span>
          <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-500/10 border border-red-500/20" />冲突</span>
          <span>📕 小红书</span><span>🎵 抖音</span><span>📰 公众号</span><span>📺 B站</span>
        </div>

        {/* 快速操作 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
          <Link href="/content" className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all group">
            <div className="flex items-center gap-3">
              <div className="inline-flex p-2.5 rounded-xl bg-primary/10"><Sparkles className="h-5 w-5 text-primary" /></div>
              <div className="flex-1"><div className="text-sm font-medium">AI 创作新内容</div><div className="text-xs text-muted-foreground">批量生成 + 自动排期</div></div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
          <Link href="/publish" className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all group">
            <div className="flex items-center gap-3">
              <div className="inline-flex p-2.5 rounded-xl bg-green-500/10"><Plus className="h-5 w-5 text-green-500" /></div>
              <div className="flex-1"><div className="text-sm font-medium">去发布中心</div><div className="text-xs text-muted-foreground">查看发布队列和状态</div></div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
