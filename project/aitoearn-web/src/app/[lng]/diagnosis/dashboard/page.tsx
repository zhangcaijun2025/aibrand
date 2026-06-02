/**
 * 运营总览 Dashboard
 *
 * 全域运营工作台首页 — 全链路漏斗 + 账号健康总览 + 快捷入口 + 任务队列
 * 数据来源：NoteRx Model A API + 品类基线数据库
 */
'use client'

import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  ChevronRight,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Megaphone,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Stethoscope,
  Target,
  TrendingUp,
  Upload,
  UserCheck,
  Video,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useTransClient } from '@/app/i18n/client'
import { cn } from '@/lib/utils'

// ==================== Simple Progress Bar ====================

function ColoredProgress({ value, colorClass }: { value: number; colorClass: string }) {
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-primary/10">
      <div
        className={cn('h-full rounded-full transition-all duration-500', colorClass)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

// ==================== Types ====================

interface CategoryBaseline {
  key: string
  name_cn: string
  sample_size: number
  avg_engagement: number
  viral_threshold: number
}

interface DashboardData {
  categories: Record<string, CategoryBaseline>
  totalSamples: number
  totalComments: number
}

// ==================== Mock Data (待后端 API 就绪后替换) ====================

const MOCK_FUNNEL = {
  generated: 12,
  diagnosed: 9,
  published: 5,
  viral: 1,
}

const MOCK_ACCOUNT_SCORES = [
  { platform: '小红书', score: 85, grade: 'A', trend: 3, color: 'text-red-500', bg: 'bg-red-500' },
  { platform: '抖音', score: 62, grade: 'B', trend: -2, color: 'text-cyan-500', bg: 'bg-cyan-500' },
  { platform: 'B站', score: 35, grade: 'C', trend: 0, color: 'text-pink-500', bg: 'bg-pink-500' },
  { platform: '微博', score: 41, grade: 'C', trend: 1, color: 'text-orange-500', bg: 'bg-orange-500' },
]

const MOCK_TASKS = [
  { id: 1, type: 'optimize', severity: 'warning' as const, text: '标签策略不足', detail: '2篇内容需要优化标签', action: '优化', route: '/diagnosis/workbench' },
  { id: 2, type: 'rewrite', severity: 'warning' as const, text: '标题吸引力低', detail: '1篇内容建议重写标题', action: '重写', route: '/diagnosis/workbench' },
  { id: 3, type: 'publish', severity: 'success' as const, text: '待发布内容', detail: '小红书春季穿搭... 诊断85分', action: '发布', route: '/accounts' },
  { id: 4, type: 'publish', severity: 'success' as const, text: '待发布内容', detail: '抖音产品测评... 诊断72分', action: '发布', route: '/accounts' },
]

const MOCK_ACTIVITY = [
  { time: '14:28', platform: '小红书', title: '春季穿搭', score: 85, status: '已发布', statusColor: 'text-green-500' },
  { time: '13:15', platform: '抖音', title: '产品测评', score: 72, status: '优化中', statusColor: 'text-yellow-500' },
  { time: '11:42', platform: 'B站', title: '教程脚本', score: 68, status: '待优化', statusColor: 'text-red-500' },
  { time: '09:30', platform: '全平台', title: '账号体检', score: null, status: '已完成', statusColor: 'text-blue-500' },
]

// ==================== Sub-components ====================

/** 统计卡片 */
function StatCard({
  label,
  value,
  trend,
  colorClass,
  icon,
}: {
  label: string
  value: number | string
  trend?: string
  colorClass?: string
  icon: React.ReactNode
}) {
  return (
    <Card className="flex-1 min-w-[120px]">
      <CardContent className="p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <span className={cn('text-muted-foreground/60', colorClass)}>{icon}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={cn('text-2xl font-bold tracking-tight tabular-nums', colorClass)}>
            {value}
          </span>
          {trend && (
            <span className={cn(
              'text-xs font-medium',
              trend.startsWith('↑') || trend.startsWith('+')
                ? 'text-green-500'
                : 'text-red-500'
            )}>
              {trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** 快捷入口卡片 */
function QuickActionCard({
  icon,
  label,
  desc,
  href,
  colorClass,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  href: string
  colorClass: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center gap-2 p-5 rounded-xl border border-border',
        'bg-card hover:bg-accent hover:border-primary/30',
        'transition-all duration-300 group cursor-pointer',
        'hover:shadow-lg hover:-translate-y-0.5',
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center',
        'transition-transform duration-300 group-hover:scale-110',
        colorClass,
      )}>
        {icon}
      </div>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{desc}</span>
    </Link>
  )
}

/** 账号健康条 */
function PlatformHealthBar({
  platform,
  score,
  grade,
  trend,
  bg,
}: {
  platform: string
  score: number
  grade: string
  trend: number
  bg: string
}) {
  const getGradeColor = (g: string) => {
    if (g === 'A') return 'text-green-500'
    if (g === 'B') return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium w-14 shrink-0">{platform}</span>
      <div className="flex-1"><ColoredProgress value={score} colorClass={bg} /></div>
      <span className="text-sm font-semibold tabular-nums w-8 text-right">{score}</span>
      <span className={cn('text-xs font-bold w-5 text-center', getGradeColor(grade))}>{grade}</span>
      <span className={cn(
        'text-xs w-8 text-right tabular-nums',
        trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-muted-foreground',
      )}>
        {trend > 0 ? `↑${trend}` : trend < 0 ? `↓${Math.abs(trend)}` : '—'}
      </span>
    </div>
  )
}

// ==================== Main Page ====================

export default function DashboardPage() {
  const { t } = useTransClient('route')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/model-a/categories')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* ── 页面标题 ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain size={24} className="text-primary" />
            {t('diagnosisOverview')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            全链路运营总览 · 最后更新 14:32 · 监控中 🟢
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/diagnosis/workbench" className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}>
            <Stethoscope size={16} />
            新建诊断
          </Link>
          <Link href="/ai-social" className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
            <Sparkles size={16} />
            AI 写稿
          </Link>
        </div>
      </div>

      {/* ── 统计卡片行 ── */}
      <div className="flex gap-3 flex-wrap">
        <StatCard label="账号健康" value="85" trend="↑3" colorClass="text-green-500" icon={<UserCheck size={16} />} />
        <StatCard label="待诊断" value="3" colorClass="text-blue-500" icon={<Stethoscope size={16} />} />
        <StatCard label="待发布" value="2" colorClass="text-purple-500" icon={<Send size={16} />} />
        <StatCard label="需复诊" value="1" colorClass="text-orange-500" icon={<Activity size={16} />} />
        <StatCard label="本周新增" value="+12" trend="↑18%" colorClass="text-cyan-500" icon={<TrendingUp size={16} />} />
      </div>

      {/* ── 主内容区：全链路漏斗 + 账号健康 + 快捷入口 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左列：全链路漏斗 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 size={18} />
              全链路漏斗（本周）
            </CardTitle>
            <CardDescription>内容生成 → 诊断 → 发布 → 爆款转化追踪</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5 mt-2">
              {/* Step 1: 生成 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Edit3 size={14} className="text-blue-500" />
                    ① 内容生成
                  </span>
                  <span className="text-sm font-bold tabular-nums">{MOCK_FUNNEL.generated} 篇</span>
                </div>
                <ColoredProgress value={100} colorClass="bg-blue-500" />
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ChevronRight size={16} className="text-muted-foreground/40 rotate-90" />
              </div>

              {/* Step 2: 诊断 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Stethoscope size={14} className="text-purple-500" />
                    ② 诊断优化
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {MOCK_FUNNEL.diagnosed} / {MOCK_FUNNEL.generated} 篇
                  </span>
                </div>
                <ColoredProgress
                  value={(MOCK_FUNNEL.diagnosed / MOCK_FUNNEL.generated) * 100}
                  colorClass="bg-purple-500"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  诊断通过率 {Math.round((MOCK_FUNNEL.diagnosed / MOCK_FUNNEL.generated) * 100)}% · 3篇待诊断
                </p>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ChevronRight size={16} className="text-muted-foreground/40 rotate-90" />
              </div>

              {/* Step 3: 发布 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Send size={14} className="text-cyan-500" />
                    ③ 全平台发布
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {MOCK_FUNNEL.published} / {MOCK_FUNNEL.diagnosed} 篇
                  </span>
                </div>
                <ColoredProgress
                  value={(MOCK_FUNNEL.published / MOCK_FUNNEL.diagnosed) * 100}
                  colorClass="bg-cyan-500"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  发布转化率 {Math.round((MOCK_FUNNEL.published / MOCK_FUNNEL.diagnosed) * 100)}% · 2篇待发布
                </p>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ChevronRight size={16} className="text-muted-foreground/40 rotate-90" />
              </div>

              {/* Step 4: 爆款 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Zap size={14} className="text-yellow-500" />
                    ④ 爆款产出
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {MOCK_FUNNEL.viral} / {MOCK_FUNNEL.published} 篇
                  </span>
                </div>
                <ColoredProgress
                  value={(MOCK_FUNNEL.viral / MOCK_FUNNEL.published) * 100}
                  colorClass="bg-yellow-500"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  爆款率 {Math.round((MOCK_FUNNEL.viral / MOCK_FUNNEL.published) * 100)}% · 超过品类爆款线
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 右列：账号健康 + 快捷入口 */}
        <div className="space-y-4">
          {/* 账号健康 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck size={18} />
                账号健康
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_ACCOUNT_SCORES.map(acc => (
                  <PlatformHealthBar key={acc.platform} {...acc} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 快捷入口 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">⚡ 快捷诊断</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <QuickActionCard
                  icon={<Edit3 size={20} />}
                  label="粘贴内容"
                  desc="粘贴文案开始诊断"
                  href="/diagnosis/workbench"
                  colorClass="bg-blue-500/10 text-blue-500"
                />
                <QuickActionCard
                  icon={<Search size={20} />}
                  label="输入URL"
                  desc="输入链接智能抓取"
                  href="/diagnosis/workbench?mode=url"
                  colorClass="bg-purple-500/10 text-purple-500"
                />
                <QuickActionCard
                  icon={<FileText size={20} />}
                  label="从草稿选择"
                  desc="从草稿箱选择内容"
                  href="/diagnosis/workbench?mode=draft"
                  colorClass="bg-green-500/10 text-green-500"
                />
                <QuickActionCard
                  icon={<UserCheck size={20} />}
                  label="账号体检"
                  desc="多平台健康评分"
                  href="/diagnosis/data-center?tab=account"
                  colorClass="bg-orange-500/10 text-orange-500"
                />
                <QuickActionCard
                  icon={<Video size={20} />}
                  label="AI 视频制作"
                  desc="OpenMontage 智能制片"
                  href="/"
                  colorClass="bg-pink-500/10 text-pink-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 底部：任务队列 + 研究数据 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 任务队列 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target size={18} />
              待处理任务
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {MOCK_TASKS.map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      task.severity === 'warning' ? 'bg-yellow-500' : 'bg-green-500',
                    )} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.text}</p>
                      <p className="text-xs text-muted-foreground truncate">{task.detail}</p>
                    </div>
                  </div>
                  <Link
                    href={task.route}
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'sm' }),
                      'gap-1 shrink-0 text-xs',
                    )}
                  >
                    {task.action}
                    <ArrowRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 研究数据摘要 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain size={18} />
              NoteRx 研究数据集
            </CardTitle>
            <CardDescription>基于真实小红书笔记的统计分析</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : data ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-accent/50">
                    <div className="text-xl font-bold text-blue-500">{data.totalSamples || 874}</div>
                    <div className="text-[10px] text-muted-foreground">训练笔记</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-accent/50">
                    <div className="text-xl font-bold text-purple-500">{data.totalComments || '2,465'}</div>
                    <div className="text-[10px] text-muted-foreground">评论分析</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-accent/50">
                    <div className="text-xl font-bold text-green-500">
                      {data.categories ? Object.keys(data.categories).length : 5}
                    </div>
                    <div className="text-[10px] text-muted-foreground">品类基线</div>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground leading-relaxed">
                  <p>· 分析方法：Spearman · 回归 · K-Means · PCA</p>
                  <p>· 5 Agent 辩论：内容分析 · 视觉诊断 · 增长策略 · 用户模拟 · 综合裁判</p>
                  <p>· Model A 前端即时评分 &lt;50ms</p>
                </div>
                <Link
                  href="/diagnosis/data-center"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full gap-1 text-xs')}
                >
                  查看完整数据中心
                  <ArrowRight size={12} />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">无法加载研究数据</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── 最近动态 ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity size={18} />
            最近动态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {MOCK_ACTIVITY.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 py-2.5 px-3 rounded-lg hover:bg-accent transition-colors text-sm"
              >
                <span className="text-xs text-muted-foreground tabular-nums w-12 shrink-0">{item.time}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">{item.platform}</Badge>
                <span className="font-medium truncate flex-1">{item.title}</span>
                {item.score !== null && (
                  <Badge
                    variant={item.score >= 80 ? 'default' : item.score >= 60 ? 'secondary' : 'destructive'}
                    className="text-[10px] shrink-0"
                  >
                    {item.score}分
                  </Badge>
                )}
                <span className={cn('text-xs shrink-0 w-14 text-right', item.statusColor)}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
