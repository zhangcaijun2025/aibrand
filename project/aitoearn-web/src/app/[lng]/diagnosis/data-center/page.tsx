/**
 * 数据中心 — 全域运营数据总览
 *
 * Tab 1: 账号体检 — 多平台账号健康评分
 * Tab 2: 内容表现 — 已发布内容实际数据
 * Tab 3: 行业对标 — 品类 Top 内容基准
 * Tab 4: 预测校准 — 诊断打分 vs 实际表现
 * Tab 5: 趋势 — 账号成长曲线
 */
'use client'

import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Heart,
  Loader2,
  MessageCircle,
  RefreshCw,
  Repeat,
  Search,
  Share2,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useTransClient } from '@/app/i18n/client'
import { cn } from '@/lib/utils'

// ==================== Simple Progress ====================

function ColoredProgress({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/10">
      <div className={cn('h-full rounded-full transition-all duration-500', colorClass)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

// ==================== Mock Data ====================

interface CategoryBaseline {
  key: string
  name_cn: string
  sample_size: number
  avg_engagement: number
  viral_threshold: number
}

const MOCK_ACCOUNT_CHECKUP = {
  xhs: { platform: '小红书', score: 85, grade: 'A', dimensions: [
    { label: '内容生产力', score: 80, weight: 20 },
    { label: '互动质量', score: 88, weight: 30 },
    { label: '粉丝基础', score: 82, weight: 25 },
    { label: '发布频率', score: 65, weight: 10 },
    { label: '成长潜力', score: 78, weight: 15 },
  ]},
  douyin: { platform: '抖音', score: 62, grade: 'B', dimensions: [
    { label: '内容生产力', score: 60, weight: 20 },
    { label: '互动质量', score: 55, weight: 30 },
    { label: '粉丝基础', score: 70, weight: 25 },
    { label: '发布频率', score: 45, weight: 10 },
    { label: '成长潜力', score: 68, weight: 15 },
  ]},
}

const MOCK_CONTENT_PERFORMANCE = [
  { title: '春季护肤routine分享', platform: '小红书', date: '05/28', likes: 2300, collects: 856, comments: 142, diagnosisScore: 85, actualScore: 88, status: 'near' as const },
  { title: '一周穿搭不重样', platform: '小红书', date: '05/25', likes: 4500, collects: 2100, comments: 320, diagnosisScore: 78, actualScore: 92, status: 'viral' as const },
  { title: '产品测评避坑指南', platform: '抖音', date: '05/27', likes: 892, collects: 203, comments: 67, diagnosisScore: 72, actualScore: 60, status: 'under' as const },
  { title: '平价好物推荐合集', platform: '小红书', date: '05/22', likes: 1800, collects: 920, comments: 156, diagnosisScore: 82, actualScore: 80, status: 'near' as const },
  { title: '教程：零基础学编程', platform: 'B站', date: '05/20', likes: 3100, collects: 1200, comments: 289, diagnosisScore: 68, actualScore: 90, status: 'viral' as const },
]

// ==================== Sub Components ====================

function StatBadge({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="text-center p-4 rounded-xl bg-accent/40">
      <div className={cn('text-2xl font-bold tabular-nums', color)}>{value}{unit}</div>
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

function PerformanceRow({ item }: { item: typeof MOCK_CONTENT_PERFORMANCE[0] }) {
  const statusCfg = {
    near: { label: '接近预测', color: 'text-green-500', bg: 'bg-green-500/10' },
    viral: { label: '远超预期', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    under: { label: '低于预期', color: 'text-red-500', bg: 'bg-red-500/10' },
  }[item.status]

  return (
    <div className="flex items-center gap-4 py-3 px-3 rounded-lg hover:bg-accent transition-colors text-sm">
      <span className="font-medium truncate flex-1 min-w-0">{item.title}</span>
      <Badge variant="outline" className="text-[10px] shrink-0">{item.platform}</Badge>
      <span className="text-xs text-muted-foreground shrink-0 w-10">{item.date}</span>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs flex items-center gap-1"><Heart size={12} className="text-red-500" />{item.likes.toLocaleString()}</span>
        <span className="text-xs flex items-center gap-1"><Star size={12} className="text-yellow-500" />{item.collects.toLocaleString()}</span>
        <span className="text-xs flex items-center gap-1"><MessageCircle size={12} className="text-blue-500" />{item.comments}</span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 w-24 justify-end">
        <span className="text-xs text-muted-foreground">{item.diagnosisScore}→</span>
        <span className={cn('text-xs font-bold', item.actualScore >= item.diagnosisScore ? 'text-green-500' : 'text-red-500')}>
          {item.actualScore}
        </span>
      </div>
      <Badge variant="outline" className={cn('text-[10px] shrink-0', statusCfg.bg, statusCfg.color)}>
        {statusCfg.label}
      </Badge>
    </div>
  )
}

// ==================== Main Page ====================

export default function DataCenterPage() {
  const [categories, setCategories] = useState<CategoryBaseline[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/model-a/categories')
      .then(r => r.json())
      .then(d => {
        const cats = Object.entries(d.categories || {}).map(([key, val]: any) => ({
          key, ...val,
        }))
        setCategories(cats)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 size={24} className="text-primary" />
            数据中心
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            全域数据追踪 · 预测校准 · 趋势分析
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1">
            <RefreshCw size={14} />
            刷新数据
          </Button>
          <Button variant="outline" size="sm" className="gap-1">
            <Download size={14} />
            导出报表
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-3">
        <StatBadge label="全平台账号" value={4} color="text-blue-500" />
        <StatBadge label="已发布内容" value={12} color="text-purple-500" />
        <StatBadge label="总互动量" value="18.5k" color="text-green-500" />
        <StatBadge label="平均健康分" value={68} color="text-yellow-500" />
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="account" className="gap-1.5">
            <UserCheck size={14} />账号体检
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5">
            <Activity size={14} />内容表现
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="gap-1.5">
            <Target size={14} />行业对标
          </TabsTrigger>
          <TabsTrigger value="calibration" className="gap-1.5">
            <Zap size={14} />预测校准
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-1.5">
            <TrendingUp size={14} />趋势
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Account Checkup */}
        <TabsContent value="account" className="space-y-4">
          {Object.values(MOCK_ACCOUNT_CHECKUP).map(acc => (
            <Card key={acc.platform}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{acc.platform}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-2xl font-bold', acc.score >= 80 ? 'text-green-500' : acc.score >= 60 ? 'text-yellow-500' : 'text-red-500')}>
                      {acc.score}
                    </span>
                    <Badge variant={acc.grade === 'A' ? 'default' : 'secondary'}>{acc.grade}级</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {acc.dimensions.map(d => (
                  <div key={d.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className="font-medium tabular-nums">{d.score}<span className="text-[10px] text-muted-foreground"> / 权重{d.weight}%</span></span>
                    </div>
                    <ColoredProgress value={d.score} colorClass={d.score >= 80 ? 'bg-green-500' : d.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab 2: Content Performance */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">已发布内容实际表现</CardTitle>
              <CardDescription>发布后回流的真实互动数据，与诊断预测对比</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {MOCK_CONTENT_PERFORMANCE.map((item, idx) => (
                  <PerformanceRow key={idx} item={item} />
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>🔥 远超预期: {MOCK_CONTENT_PERFORMANCE.filter(i => i.status === 'viral').length}篇</span>
                <span>✅ 接近预测: {MOCK_CONTENT_PERFORMANCE.filter(i => i.status === 'near').length}篇</span>
                <span>⚠️ 低于预期: {MOCK_CONTENT_PERFORMANCE.filter(i => i.status === 'under').length}篇</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Industry Benchmark */}
        <TabsContent value="benchmark">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">品类基线数据</CardTitle>
              <CardDescription>基于 NoteRx 研究数据的各品类基准值</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium">品类</th>
                        <th className="text-right py-2 px-3 font-medium">样本量</th>
                        <th className="text-right py-2 px-3 font-medium">平均互动</th>
                        <th className="text-right py-2 px-3 font-medium">爆款线</th>
                        <th className="text-right py-2 px-3 font-medium">爆款率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(cat => (
                        <tr key={cat.key} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                          <td className="py-2.5 px-3 font-medium">{cat.name_cn || cat.key}</td>
                          <td className="py-2.5 px-3 text-right">{cat.sample_size}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{cat.avg_engagement?.toLocaleString() || '-'}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-yellow-500 tabular-nums">{cat.viral_threshold?.toLocaleString() || '-'}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">10.4%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Prediction Calibration */}
        <TabsContent value="calibration">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">诊断预测 vs 实际表现</CardTitle>
              <CardDescription>Spearman ρ=0.72 · 诊断平均高估 5.2 分</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Calibration scatter plot placeholders */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                  <div className="text-2xl font-bold text-green-500 tabular-nums">2</div>
                  <div className="text-xs text-muted-foreground">接近预测（偏差&lt;10）</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                  <div className="text-2xl font-bold text-yellow-500 tabular-nums">2</div>
                  <div className="text-xs text-muted-foreground">远超预期（+10以上）</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                  <div className="text-2xl font-bold text-red-500 tabular-nums">1</div>
                  <div className="text-xs text-muted-foreground">低于预期（-10以上）</div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium">系统校准建议</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={12} className="text-green-500" />
                    <span className="text-muted-foreground">标题维度：预测值接近实际效果，权重合理</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={12} className="text-yellow-500" />
                    <span className="text-muted-foreground">视觉维度：当前低估视觉重要性，建议上调权重 5-8%</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={12} className="text-yellow-500" />
                    <span className="text-muted-foreground">标签维度：不同平台标签影响力差异大，建议分平台建模</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 size={12} className="text-blue-500" />
                    <span className="text-muted-foreground">整体偏差：诊断系统平均高估 5.2 分，建议全局校准</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Trends */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">账号成长趋势</CardTitle>
              <CardDescription>近30天账号评分变化</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { platform: '小红书', scores: [78, 80, 79, 82, 81, 83, 85], trend: 'up' },
                  { platform: '抖音', scores: [65, 63, 66, 64, 62, 60, 62], trend: 'flat' },
                  { platform: 'B站', scores: [40, 42, 38, 35, 37, 36, 35], trend: 'down' },
                ].map(acc => (
                  <div key={acc.platform} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{acc.platform}</span>
                      <Badge variant="outline" className={cn(
                        'text-[10px]',
                        acc.trend === 'up' ? 'text-green-500' : acc.trend === 'flat' ? 'text-yellow-500' : 'text-red-500',
                      )}>
                        {acc.trend === 'up' ? '↑ 上升' : acc.trend === 'flat' ? '→ 持平' : '↓ 下降'}
                      </Badge>
                    </div>
                    <div className="flex items-end gap-1 h-16">
                      {acc.scores.map((s, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex-1 rounded-t transition-all',
                            s >= 70 ? 'bg-green-500/40' : s >= 50 ? 'bg-yellow-500/40' : 'bg-red-500/40',
                          )}
                          style={{ height: `${(s / 100) * 64}px` }}
                          title={`第${i + 1}周: ${s}分`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>4周前</span><span>3周前</span><span>2周前</span><span>上周</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
