/**
 * AnalyticsCore - 数据分析引擎
 * 全平台数据看板 + AI洞察 + 自动周报
 */

'use client'

import { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Download,
  Sparkles,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

// ── 模拟数据 ──

interface PlatformStat {
  platform: string
  icon: string
  followers: number
  followersChange: number
  posts: number
  engagement: number
  engagementChange: number
  avgLikes: number
  avgComments: number
}

const PLATFORM_STATS: PlatformStat[] = [
  { platform: '小红书', icon: '📕', followers: 8520, followersChange: 12.5, posts: 45, engagement: 3240, engagementChange: 8.3, avgLikes: 234, avgComments: 45 },
  { platform: '抖音', icon: '🎵', followers: 3260, followersChange: -3.2, posts: 28, engagement: 1850, engagementChange: -15.0, avgLikes: 156, avgComments: 32 },
  { platform: '公众号', icon: '📰', followers: 1800, followersChange: 5.1, posts: 12, engagement: 890, engagementChange: 2.1, avgLikes: 45, avgComments: 18 },
  { platform: 'B站', icon: '📺', followers: 520, followersChange: 22.0, posts: 8, engagement: 420, engagementChange: 18.5, avgLikes: 78, avgComments: 25 },
]

const TOP_CONTENT = [
  { title: '学生党必入！成分党教你选对卸妆油', platform: '小红书', likes: 2347, comments: 186, shares: 520, trend: 'up' },
  { title: '我心中排名第一的重庆火锅探店', platform: '抖音', likes: 1890, comments: 234, shares: 320, trend: 'up' },
  { title: '2026年中小企业数字化转型趋势报告', platform: '公众号', likes: 456, comments: 89, shares: 156, trend: 'up' },
  { title: '300元以内蓝牙耳机横评', platform: 'B站', likes: 890, comments: 145, shares: 230, trend: 'down' },
  { title: '端午节促销活动方案（附模板）', platform: '公众号', likes: 234, comments: 34, shares: 89, trend: 'down' },
]

const AI_INSIGHTS = [
  { type: 'warning' as const, text: '抖音互动率持续下降 15%，建议增加教程类内容比例，参考竞品 @美妆达人小李 的内容风格。历史数据显示，教程类内容互动率比娱乐类高 35%。' },
  { type: 'opportunity' as const, text: '小红书 #夏季护肤 话题热度暴涨 200%，你还有 3 天窗口期。AI 已为你准备了 3 条话题相关内容草稿，点击查看。' },
  { type: 'positive' as const, text: 'B站频道增长强劲（+22%），"开箱测评"类内容表现最好。建议将 B站作为本月重点增长渠道，每周至少发布 2 条测评视频。' },
]

// 简易柱状图组件
function SimpleBar({ value, max, color, label }: { value: number; max: number; color: string; label?: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-[10px] text-muted-foreground w-8 shrink-0">{label}</span>}
      <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground w-10 text-right shrink-0">{value.toLocaleString()}</span>
    </div>
  )
}

export default function AnalyticsCore() {
  const [generatingReport, setGeneratingReport] = useState(false)

  const totalFollowers = PLATFORM_STATS.reduce((s, p) => s + p.followers, 0)
  const totalEngagement = PLATFORM_STATS.reduce((s, p) => s + p.engagement, 0)
  const totalPosts = PLATFORM_STATS.reduce((s, p) => s + p.posts, 0)
  const maxFollowers = Math.max(...PLATFORM_STATS.map(p => p.followers))

  const handleGenerateReport = async () => {
    setGeneratingReport(true)
    await new Promise(r => setTimeout(r, 2000))
    setGeneratingReport(false)
    toast.success('周报已生成，可下载查看')
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              数据分析引擎
            </h1>
            <p className="text-sm text-muted-foreground mt-1">跨平台数据聚合 · AI 洞察 · 自动周报</p>
          </div>
          <Button onClick={handleGenerateReport} disabled={generatingReport} className="cursor-pointer gap-2" size="sm">
            <Download className="h-4 w-4" />
            {generatingReport ? '生成中...' : '生成周报'}
          </Button>
        </div>

        {/* 总览卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '总粉丝', value: totalFollowers.toLocaleString(), icon: <Users className="h-5 w-5" />, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: '总互动', value: totalEngagement.toLocaleString(), icon: <Heart className="h-5 w-5" />, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: '总内容', value: `${totalPosts} 条`, icon: <BarChart3 className="h-5 w-5" />, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: '覆盖平台', value: `${PLATFORM_STATS.length} 个`, icon: <Share2 className="h-5 w-5" />, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className={cn('inline-flex p-2 rounded-lg mb-2', stat.bg)}><span className={stat.color}>{stat.icon}</span></div>
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 平台对比 + AI洞察 双栏 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* 平台数据对比 */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4">平台粉丝分布</h2>
            <div className="space-y-3">
              {PLATFORM_STATS.map(p => (
                <div key={p.platform} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      {p.icon} {p.platform}
                    </span>
                    <span className={cn('flex items-center gap-0.5 font-medium',
                      p.followersChange > 0 ? 'text-green-600' : 'text-red-500')}>
                      {p.followersChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(p.followersChange)}%
                    </span>
                  </div>
                  <SimpleBar value={p.followers} max={maxFollowers} color="bg-blue-500" />
                  <div className="flex gap-4 text-[10px] text-muted-foreground pl-14">
                    <span>📝 {p.posts}条</span>
                    <span>❤️ {p.avgLikes}均赞</span>
                    <span>💬 {p.avgComments}均评</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI 洞察 */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI 数据洞察
            </h2>
            <div className="space-y-3">
              {AI_INSIGHTS.map((insight, i) => (
                <div key={i}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg text-sm',
                    insight.type === 'warning' && 'bg-red-500/5 border border-red-500/10',
                    insight.type === 'opportunity' && 'bg-green-500/5 border border-green-500/10',
                    insight.type === 'positive' && 'bg-blue-500/5 border border-blue-500/10',
                  )}>
                  <span className={cn(
                    'mt-0.5 shrink-0',
                    insight.type === 'warning' && 'text-red-500',
                    insight.type === 'opportunity' && 'text-green-500',
                    insight.type === 'positive' && 'text-blue-500',
                  )}>
                    {insight.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                    {insight.type === 'opportunity' && <Zap className="h-4 w-4" />}
                    {insight.type === 'positive' && <TrendingUp className="h-4 w-4" />}
                  </span>
                  <p className="text-foreground/80 leading-relaxed text-xs">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 内容排行榜 */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-4">内容表现排行</h2>
          <div className="space-y-2">
            {TOP_CONTENT.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors">
                <span className="text-lg font-bold text-muted-foreground w-6 text-center shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{c.title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{c.platform}</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Heart className="h-3 w-3" />{c.likes.toLocaleString()}</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><MessageCircle className="h-3 w-3" />{c.comments}</span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Share2 className="h-3 w-3" />{c.shares}</span>
                  </div>
                </div>
                <span className={cn('text-xs', c.trend === 'up' ? 'text-green-600' : 'text-red-500')}>
                  {c.trend === 'up' ? '↑ 上升' : '↓ 下降'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 周报预告 */}
        <div className="rounded-xl bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20 p-6 text-center">
          <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-sm">AI 自动周报已就绪</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            每周日晚上 8:00 自动汇总全平台数据，AI 生成洞察和下周策略建议
          </p>
          <Button onClick={handleGenerateReport} disabled={generatingReport} className="cursor-pointer" size="sm">
            <Download className="h-4 w-4 mr-1" />
            {generatingReport ? 'AI 正在生成报告...' : '立即生成本周周报'}
          </Button>
        </div>
      </div>
    </div>
  )
}
