/**
 * 诊断历史 — 全部诊断记录
 *
 * 支持筛选/搜索/批量对比
 * 每条记录展示完整生命周期时间线
 */
'use client'

import {
  ArrowUpDown,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Stethoscope,
  TrendingUp,
  X,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTransClient } from '@/app/i18n/client'
import { cn } from '@/lib/utils'

// ==================== Types ====================

interface DiagnosisRecord {
  id: string
  title: string
  platform: string[]
  category: string
  score: number
  grade: string
  date: string
  status: 'published' | 'optimizing' | 'pending' | 'archived'
  hasOptimization: boolean
}

// ==================== Mock Data ====================

const MOCK_RECORDS: DiagnosisRecord[] = [
  { id: 'dx-001', title: '春季护肤routine分享', platform: ['小红书', '抖音'], category: '美妆', score: 85, grade: 'A', date: '2026-05-28 14:22', status: 'published', hasOptimization: true },
  { id: 'dx-002', title: '一周穿搭不重样', platform: ['小红书'], category: '穿搭', score: 78, grade: 'B', date: '2026-05-25 10:15', status: 'published', hasOptimization: true },
  { id: 'dx-003', title: '产品测评避坑指南', platform: ['抖音'], category: '科技', score: 72, grade: 'B', date: '2026-05-27 16:08', status: 'optimizing', hasOptimization: true },
  { id: 'dx-004', title: '平价好物推荐合集', platform: ['小红书', '微博'], category: '生活', score: 82, grade: 'A', date: '2026-05-22 09:45', status: 'published', hasOptimization: false },
  { id: 'dx-005', title: '零基础学编程 Day 1', platform: ['B站'], category: '科技', score: 68, grade: 'B', date: '2026-05-20 11:30', status: 'optimizing', hasOptimization: true },
  { id: 'dx-006', title: '周末探店合集 Vol.3', platform: ['小红书'], category: '美食', score: 91, grade: 'S', date: '2026-05-18 15:00', status: 'published', hasOptimization: false },
  { id: 'dx-007', title: '敏感肌防晒测评', platform: ['小红书', '抖音'], category: '美妆', score: 75, grade: 'B', date: '2026-05-15 13:20', status: 'pending', hasOptimization: false },
  { id: 'dx-008', title: '通勤穿搭5分钟搞定', platform: ['小红书'], category: '穿搭', score: 88, grade: 'A', date: '2026-05-12 08:50', status: 'published', hasOptimization: true },
  { id: 'dx-009', title: '手机摄影调色教程', platform: ['B站', '抖音'], category: '科技', score: 70, grade: 'B', date: '2026-05-10 17:35', status: 'archived', hasOptimization: false },
  { id: 'dx-010', title: '居家好物开箱分享', platform: ['小红书'], category: '生活', score: 83, grade: 'A', date: '2026-05-08 12:10', status: 'published', hasOptimization: false },
]

const PLATFORM_COLORS: Record<string, string> = {
  '小红书': 'bg-red-500/10 text-red-500 border-red-500/20',
  '抖音': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  'B站': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  '微博': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
}

const STATUS_CONFIG = {
  published: { label: '已发布', color: 'text-green-500', bg: 'bg-green-500/10' },
  optimizing: { label: '优化中', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  pending: { label: '待处理', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  archived: { label: '已归档', color: 'text-muted-foreground', bg: 'bg-muted' },
}

// ==================== Main Page ====================

export default function HistoryPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [compareMode, setCompareMode] = useState(false)

  // Filter + sort
  const filtered = useMemo(() => {
    let records = [...MOCK_RECORDS]

    if (search) {
      const q = search.toLowerCase()
      records = records.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      records = records.filter(r => r.status === statusFilter)
    }

    if (platformFilter !== 'all') {
      records = records.filter(r => r.platform.includes(platformFilter))
    }

    records.sort((a, b) => {
      const valA = sortBy === 'date' ? new Date(a.date).getTime() : a.score
      const valB = sortBy === 'date' ? new Date(b.date).getTime() : b.score
      return sortOrder === 'desc' ? valB - valA : valA - valB
    })

    return records
  }, [search, statusFilter, platformFilter, sortBy, sortOrder])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 3) next.add(id)
      return next
    })
  }

  const toggleCompareMode = () => {
    setCompareMode(!compareMode)
    if (compareMode) setSelected(new Set())
  }

  // Stats
  const totalRecords = MOCK_RECORDS.length
  const avgScore = Math.round(MOCK_RECORDS.reduce((s, r) => s + r.score, 0) / totalRecords)
  const publishedCount = MOCK_RECORDS.filter(r => r.status === 'published').length
  const viralCount = MOCK_RECORDS.filter(r => r.score >= 85).length

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList size={24} className="text-primary" />
            诊断历史
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {totalRecords} 条记录 · 平均 {avgScore} 分 · {publishedCount} 篇已发布
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={compareMode ? 'default' : 'outline'}
            size="sm"
            className="gap-1"
            onClick={toggleCompareMode}
          >
            <SlidersHorizontal size={14} />
            {compareMode ? '退出对比' : '批量对比'}
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Download size={14} />
            导出
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-blue-500 tabular-nums">{totalRecords}</div>
          <div className="text-[10px] text-muted-foreground">总诊断数</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-green-500 tabular-nums">{viralCount}</div>
          <div className="text-[10px] text-muted-foreground">优质内容 (≥85分)</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-purple-500 tabular-nums">{avgScore}</div>
          <div className="text-[10px] text-muted-foreground">平均分</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-xl font-bold text-cyan-500 tabular-nums">{publishedCount}</div>
          <div className="text-[10px] text-muted-foreground">已发布</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索标题、ID、品类..."
                className="pl-8 h-9 text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X size={14} className="text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">全部状态</option>
              <option value="published">已发布</option>
              <option value="optimizing">优化中</option>
              <option value="pending">待处理</option>
              <option value="archived">已归档</option>
            </select>

            {/* Platform Filter */}
            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">全部平台</option>
              <option value="小红书">小红书</option>
              <option value="抖音">抖音</option>
              <option value="B站">B站</option>
              <option value="微博">微博</option>
            </select>

            {/* Sort */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setSortBy('date'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc') }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs border transition-colors flex items-center gap-1',
                  sortBy === 'date' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground',
                )}
              >
                <Calendar size={12} />
                时间
                {sortBy === 'date' && <ArrowUpDown size={10} />}
              </button>
              <button
                onClick={() => { setSortBy('score'); setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc') }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs border transition-colors flex items-center gap-1',
                  sortBy === 'score' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground',
                )}
              >
                <Star size={12} />
                分数
                {sortBy === 'score' && <ArrowUpDown size={10} />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Record List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ClipboardList size={40} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">没有匹配的记录</p>
              <p className="text-xs text-muted-foreground mt-1">尝试调整筛选条件</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(record => {
            const statusCfg = STATUS_CONFIG[record.status]
            const isSelected = selected.has(record.id)

            return (
              <Card
                key={record.id}
                className={cn(
                  'transition-all hover:border-primary/20',
                  isSelected && 'border-primary/50 ring-1 ring-primary/20',
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Checkbox in compare mode */}
                    {compareMode && (
                      <button
                        onClick={() => toggleSelect(record.id)}
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                        )}
                      >
                        {isSelected && <CheckCircle2 size={12} />}
                      </button>
                    )}

                    {/* Score badge */}
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg',
                      record.score >= 85 ? 'bg-green-500/10 text-green-500' :
                      record.score >= 70 ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500',
                    )}>
                      {record.score}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{record.title}</h3>
                        <Badge variant="outline" className="text-[10px]">{record.grade}级</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {record.platform.map(p => (
                          <Badge key={p} variant="outline" className={cn('text-[10px]', PLATFORM_COLORS[p] || '')}>
                            {p}
                          </Badge>
                        ))}
                        <span className="text-[10px] text-muted-foreground">{record.category}</span>
                        <span className="text-[10px] text-muted-foreground">{record.date}</span>
                      </div>
                    </div>

                    {/* Status */}
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', statusCfg.bg, statusCfg.color)}>
                      {statusCfg.label}
                    </Badge>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {record.hasOptimization && (
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                          <Eye size={14} />
                          查看优化
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                        详情
                        <ChevronDown size={12} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Compare Panel */}
      {compareMode && selected.size >= 2 && (
        <Card className="border-primary/30 ring-1 ring-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal size={18} />
              对比选中记录 ({selected.size}/3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {Array.from(selected).map(id => {
                const r = MOCK_RECORDS.find(r => r.id === id)
                if (!r) return null
                return (
                  <div key={r.id} className="p-3 rounded-lg bg-accent/30">
                    <p className="font-semibold truncate">{r.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold">{r.score}分</span>
                      <span className="text-xs text-muted-foreground">{r.grade}级</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.date}</p>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end mt-3">
              <Button size="sm" variant="default" className="gap-1 text-xs">
                <BarChart3 size={14} />
                生成对比报告
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state hint */}
      {!compareMode && (
        <p className="text-center text-xs text-muted-foreground">
          提示：点击"批量对比"可选择最多3条记录进行横向比较
        </p>
      )}
    </div>
  )
}
