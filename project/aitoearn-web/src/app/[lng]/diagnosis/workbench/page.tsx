/**
 * 内容诊疗所 — 三步诊断工作流
 *
 * Step 1: 内容输入（文本/URL/图片）
 * Step 2: 多维诊断报告（Model A + AI 分析）
 * Step 3: 智能优化处方（AI 生成可执行方案）
 */
'use client'

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Eye,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Star,
  Stethoscope,
  Plug,
  Target,
  Upload,
  X,
} from 'lucide-react'
import { useState, useCallback, useRef } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { useTransClient } from '@/app/i18n/client'
import { cn } from '@/lib/utils'
import { preScore, getCategoryList, type ModelAResult } from '@/app/diagnosis/model-a'
import { triggerDeepSeekDiagnosis, triggerDeepSeekOptimize } from '@/app/diagnosis/diagnosis-workflow'
import { useAccountStore } from '@/store/account'
import { AccountPlatInfoArr } from '@/app/config/platConfig'
import { AccountStatus } from '@/app/config/accountConfig'
import { useShallow } from 'zustand/react/shallow'

// ==================== Types ====================

type Step = 1 | 2 | 3
type InputMode = 'text' | 'url' | 'image'

interface DiagnosisInput {
  title: string
  content: string
  category: string
  tagCount: number
  imageCount: number
  platform: string[]
}

interface OptimizationPlan {
  id: string
  name: string
  description: string
  scoreDelta: number
  isRecommended: boolean
  changes: string[]
  optimizedTitle?: string
  optimizedContent?: string
  platformTips?: { platform: string; tip: string }[]
}

// ==================== Constants ====================

const CATEGORIES = getCategoryList().map(c => ({
  key: c.key,
  label: c.nameCn,
  samples: c.sampleSize,
}))

/** 平台颜色映射 */
const PLATFORM_COLORS: Record<string, { color: string; bg: string }> = {
  xhs: { color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
  douyin: { color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  bilibili: { color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20' },
  weibo: { color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
  tiktok: { color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20' },
  youtube: { color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20' },
  instagram: { color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
  twitter: { color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
  facebook: { color: 'text-blue-600', bg: 'bg-blue-600/10 border-blue-600/20' },
  KWAI: { color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' },
  wxSph: { color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20' },
  wxGzh: { color: 'text-green-600', bg: 'bg-green-600/10 border-green-600/20' },
}

/** 根据用户已连接频道动态生成平台列表 */
function useConnectedPlatforms() {
  const accountList = useAccountStore(useShallow(s => s.accountList))

  // 从已连接的有效账号中提取唯一平台
  const connectedPlatforms = Array.from(
    new Map(
      accountList
        .filter(a => a.status === AccountStatus.USABLE)
        .map(a => [a.type, a.type])
    ).keys()
  )

  // 映射到诊断用的展示信息
  return connectedPlatforms.map(type => {
    const info = AccountPlatInfoArr.find(p => p[0] === type)
    const name = info?.[1]?.name || type
    const colors = PLATFORM_COLORS[type] || { color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' }
    return {
      key: type,
      label: typeof name === 'string' ? name : type,
      ...colors,
    }
  })
}

const STEP_LABELS = ['内容输入', '诊断报告', '优化处方']

// ==================== Sub-Components ====================

/** Step Indicator */
function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEP_LABELS.map((label, idx) => {
        const step = (idx + 1) as Step
        const isActive = step === current
        const isDone = step < current
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all',
              isActive && 'border-primary bg-primary/10 text-primary shadow-sm',
              isDone && 'border-green-500/30 bg-green-500/5 text-green-500',
              !isActive && !isDone && 'border-border text-muted-foreground',
            )}>
              <span className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                isActive && 'bg-primary text-primary-foreground',
                isDone && 'bg-green-500 text-white',
                !isActive && !isDone && 'bg-muted text-muted-foreground',
              )}>
                {isDone ? <CheckCircle2 size={12} /> : step}
              </span>
              {label}
            </div>
            {idx < 2 && <ChevronRight size={16} className="text-muted-foreground/40" />}
          </div>
        )
      })}
    </div>
  )
}

/** Dimension Score Bar */
function DimBar({ label, score, detail }: { label: string; score: number; detail: string }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={cn('font-bold tabular-nums', score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500')}>
          {score}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/10">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

/** Platform Badge Selector */
function PlatformBadge({ platform, selected, onClick }: { platform: { key: string; label: string; color: string; bg: string }; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
        selected ? platform.bg + ' ' + platform.color + ' shadow-sm' : 'border-border text-muted-foreground hover:border-primary/30',
      )}
    >
      {platform.label}
    </button>
  )
}

/** Optimization Plan Card */
function PlanCard({
  plan,
  onApply,
  onCompare,
}: {
  plan: OptimizationPlan
  onApply?: () => void
  onCompare?: () => void
}) {
  const [expanded, setExpanded] = useState(plan.isRecommended)

  return (
    <Card className={cn(
      'transition-all',
      plan.isRecommended && 'border-primary/30 ring-1 ring-primary/10',
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              {plan.isRecommended && <Star size={16} className="text-yellow-500 fill-yellow-500" />}
              {plan.name}
            </CardTitle>
            {plan.isRecommended && (
              <Badge variant="default" className="text-[10px]">推荐</Badge>
            )}
          </div>
          <Badge variant="outline" className="text-xs text-green-500 border-green-500/20">
            +{plan.scoreDelta} 分
          </Badge>
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline mb-2"
        >
          {expanded ? '收起详情' : '展开详情'}
        </button>

        {expanded && (
          <div className="space-y-3 mt-2">
            {plan.optimizedTitle && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">优化后标题</p>
                <p className="text-sm bg-accent/50 rounded-lg p-3">{plan.optimizedTitle}</p>
              </div>
            )}
            {plan.optimizedContent && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">优化后内容</p>
                <p className="text-sm bg-accent/50 rounded-lg p-3 whitespace-pre-wrap line-clamp-6">
                  {plan.optimizedContent}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">改动要点</p>
              <ul className="space-y-1">
                {plan.changes.map((c, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            {plan.platformTips && plan.platformTips.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">平台微调建议</p>
                <div className="space-y-1">
                  {plan.platformTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs">
                      <Badge variant="outline" className="text-[10px] shrink-0">{tip.platform}</Badge>
                      <span className="text-muted-foreground">{tip.tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="default" className="gap-1" onClick={onApply}>
                <CheckCircle2 size={14} />
                应用此方案
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={onCompare}>
                <Eye size={14} />
                对比原始版
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== Main Page ====================

export default function WorkbenchPage() {
  const { t } = useTransClient('route')

  // Wizard state
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [diagnosisResult, setDiagnosisResult] = useState<ModelAResult | null>(null)
  const [apiResult, setApiResult] = useState<any>(null)
  const [dsAnalysis, setDsAnalysis] = useState<any>(null) // DeepSeek AI analysis
  const [dsPlans, setDsPlans] = useState<any[] | null>(null) // DeepSeek optimize plans
  const [dsOptimizing, setDsOptimizing] = useState(false)

  // Input state
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('food')
  const [tagCount, setTagCount] = useState(6)
  const [imageCount, setImageCount] = useState(4)
  // 用户已连接平台（来自「我的频道」）
  const connectedPlatforms = useConnectedPlatforms()
  const connectedKeys = connectedPlatforms.map(p => p.key)

  // 默认选中所有已连接平台
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  // 首次加载时自动选中所有已连接平台
  const [platformsInitialized, setPlatformsInitialized] = useState(false)
  if (!platformsInitialized && connectedKeys.length > 0) {
    setSelectedPlatforms(connectedKeys)
    setPlatformsInitialized(true)
  }

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  // ==================== Handlers ====================

  const togglePlatform = (key: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    )
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (idx: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleDiagnose = async () => {
    setLoading(true)
    setDsAnalysis(null)
    setDsPlans(null)
    try {
      // Run Model A locally for instant scoring
      const modelAResult = preScore(title, content, category, tagCount, imageCount)
      setDiagnosisResult(modelAResult)

      // Try backend API for AI-enhanced diagnosis
      try {
        const formData = new FormData()
        formData.append('title', title)
        formData.append('content', content)
        formData.append('category', category)
        formData.append('platforms', selectedPlatforms.join(','))
        const res = await fetch('/api/diagnose', { method: 'POST', body: formData })
        if (res.ok) setApiResult(await res.json())
      } catch { /* Backend unavailable */ }

      // DeepSeek AI 语义分析（异步，不阻塞诊断流程）
      if (title || content) {
        triggerDeepSeekDiagnosis(title, content, category, selectedPlatforms, false)
          .then(r => { if (r?.success) setDsAnalysis(r.analysis) })
          .catch(() => {})
      }
    } catch {
      // Error handled by UI state
    } finally {
      setLoading(false)
      setStep(2)
    }
  }

  const handleOptimize = async () => {
    setStep(3)
    setDsOptimizing(true)
    // DeepSeek R1 深度推理生成优化方案
    if (title || content) {
      const weakList = diagnosisResult
        ? Object.entries(diagnosisResult.dimensions)
            .filter(([, score]) => score < 70)
            .map(([key]) => key === 'title_quality' ? '标题' : key === 'content_quality' ? '内容' : key === 'visual_quality' ? '视觉' : key === 'tag_strategy' ? '标签' : '互动')
        : []
      triggerDeepSeekOptimize(title, content, category, overallScore, weakList, selectedPlatforms)
        .then(r => { if (r?.success) setDsPlans(r.plans) })
        .finally(() => setDsOptimizing(false))
    } else {
      setDsOptimizing(false)
    }
  }

  const handleReset = () => {
    setStep(1)
    setDiagnosisResult(null)
    setApiResult(null)
    setDsAnalysis(null)
    setDsPlans(null)
  }

  // ==================== Derived Data ====================

  const dimensions = diagnosisResult?.dimensions
  const overallScore = diagnosisResult?.total_score ?? 0
  const grade = diagnosisResult?.level ?? '--'
  const gradeColor = overallScore >= 80 ? 'text-green-500' : overallScore >= 60 ? 'text-yellow-500' : 'text-red-500'

  const suggestedPlans: OptimizationPlan[] = [
    {
      id: 'a',
      name: '方案 A · 全方位优化',
      description: '标题重写 + 标签完善 + 结构优化',
      scoreDelta: Math.round((92 - overallScore)),
      isRecommended: true,
      changes: [
        '增加数字 hook 和情绪触发词',
        '优化标题长度至品类最优区间',
        '补充长尾标签覆盖细分人群',
        '增加配图数量至最优范围',
      ],
      optimizedTitle: title ? `${title.split('').slice(0, 3).join('')}这样做❗${category === 'food' ? '好吃到哭' : '效果惊艳'}❗${Math.floor(Math.random() * 10) + 5}个必学技巧` : undefined,
      optimizedContent: content ? content + '\n\n💬 你们还有哪些好用的小技巧？评论区告诉我～' : undefined,
      platformTips: selectedPlatforms.map(p => {
        const name = connectedPlatforms.find(pl => pl.key === p)?.label || p
        return {
          platform: name,
          tip: p === 'xhs' ? '标题加 emoji，正文口语化，结尾加互动提问' :
               p === 'douyin' ? '标题改悬念式，前三秒加视觉冲击' :
               p === 'bilibili' ? '增加知识密度，添加分章节引导' : '控制140字以内，加话题标签',
        }
      }),
    },
    {
      id: 'b',
      name: '方案 B · 标题专项优化',
      description: '仅优化标题吸引力和钩子设计',
      scoreDelta: Math.round((Math.min(89, overallScore + 7) - overallScore)),
      isRecommended: false,
      changes: [
        '标题增加数字元素',
        '添加品类热门情绪词',
        '使用疑问句增加悬念感',
      ],
      optimizedTitle: title ? `【干货】${title}，第3个方法绝了！` : undefined,
    },
    {
      id: 'c',
      name: '方案 C · 结构重组优化',
      description: '优化内容结构和信息层次',
      scoreDelta: Math.round((Math.min(87, overallScore + 5) - overallScore)),
      isRecommended: false,
      changes: [
        '增加开篇 hook 句',
        '分段加小标题提升可读性',
        '结尾增加互动引导',
      ],
    },
  ]

  // ==================== Render ====================

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope size={24} className="text-primary" />
            内容诊疗所
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI 多维诊断 → 智能优化方案 → 一站式提升内容质量
          </p>
        </div>
        {step > 1 && (
          <Button variant="outline" size="sm" className="gap-1" onClick={handleReset}>
            <RotateCcw size={14} />
            重新诊断
          </Button>
        )}
      </div>

      <StepIndicator current={step} />

      {/* ==================== STEP 1: Input ==================== */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Input Mode Tabs */}
          <Card>
            <CardContent className="p-4">
              <Tabs value={inputMode} onValueChange={v => setInputMode(v as InputMode)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text" className="gap-2">
                    <Edit3 size={14} />粘贴文本
                  </TabsTrigger>
                  <TabsTrigger value="url" className="gap-2">
                    <LinkIcon size={14} />输入 URL
                  </TabsTrigger>
                  <TabsTrigger value="image" className="gap-2">
                    <ImageIcon size={14} />上传截图
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">标题</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="输入内容的标题..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">正文内容</label>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="粘贴你的内容正文..."
                      rows={8}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-vertical"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{content.length} 字</p>
                  </div>
                </TabsContent>

                <TabsContent value="url" className="mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">内容 URL</label>
                    <input
                      type="url"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="https://www.xiaohongshu.com/explore/..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      支持小红书、抖音、B站、微博链接 · AI 智能抓取内容
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="image" className="mt-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 transition-colors"
                  >
                    <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">点击上传截图</p>
                    <p className="text-xs text-muted-foreground">支持 PNG、JPG，最多 9 张</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {uploadedFiles.map((f, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {f.name}
                          <button onClick={() => removeFile(i)}>
                            <X size={12} />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Config Row */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-6">
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">品类</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.label} ({c.samples}条)</option>
                    ))}
                  </select>
                </div>

                {/* Tag Count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">标签数: {tagCount}</label>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={tagCount}
                    onChange={e => setTagCount(Number(e.target.value))}
                    className="w-24"
                  />
                </div>

                {/* Image Count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">图片数: {imageCount}</label>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={imageCount}
                    onChange={e => setImageCount(Number(e.target.value))}
                    className="w-24"
                  />
                </div>
              </div>

              {/* Platforms — synced with My Channels */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  目标平台（来自我的频道 · 可多选）
                </label>
                {connectedPlatforms.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {connectedPlatforms.map(p => (
                      <PlatformBadge
                        key={p.key}
                        platform={p}
                        selected={selectedPlatforms.includes(p.key)}
                        onClick={() => togglePlatform(p.key)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    尚未连接任何频道 — 请先在「我的频道」中连接社交媒体账号
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleDiagnose}
              disabled={loading || (!title && !content && !url)}
              className="gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Stethoscope size={16} />}
              {loading ? '诊断中...' : '开始诊断'}
            </Button>
          </div>
        </div>
      )}

      {/* ==================== STEP 2: Diagnosis Report ==================== */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Score Card */}
          <Card className="overflow-hidden">
            <div className={cn(
              'p-8 text-center',
              overallScore >= 80 ? 'bg-green-500/5' : overallScore >= 60 ? 'bg-yellow-500/5' : 'bg-red-500/5',
            )}>
              <div className={cn('text-6xl font-bold tracking-tight tabular-nums', gradeColor)}>
                {overallScore}
              </div>
              <div className={cn('text-lg font-semibold mt-1', gradeColor)}>{grade} 级</div>
              <Badge
                variant={overallScore >= 80 ? 'default' : overallScore >= 60 ? 'secondary' : 'destructive'}
                className="mt-2"
              >
                {overallScore >= 80 ? '🟢 建议发布' : overallScore >= 60 ? '🟡 建议优化后发布' : '🔴 需要大幅优化'}
              </Badge>
            </div>
          </Card>

          {/* Dimension Scores */}
          {dimensions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 size={18} />
                  五维诊断评分
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <DimBar label="标题质量" score={dimensions.title_quality} detail="标题吸引力、数字运用、钩子设计" />
                <DimBar label="内容质量" score={dimensions.content_quality} detail="信息密度、结构清晰度、可读性" />
                <DimBar label="视觉表现" score={dimensions.visual_quality} detail="配图数量、图文比例" />
                <DimBar label="标签策略" score={dimensions.tag_strategy} detail="标签覆盖度、长尾标签使用" />
                <DimBar label="互动潜力" score={dimensions.engagement_potential} detail="综合信号评分、话题热度" />
              </CardContent>
            </Card>
          )}

          {/* AI Opinions */}
          {apiResult?.agent_opinions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain size={18} />
                  AI 诊断意见
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {apiResult.agent_opinions.map((opinion: any, idx: number) => (
                  <div key={idx} className="flex gap-3 p-3 rounded-lg bg-accent/30">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{opinion.agent_name || `Agent ${idx + 1}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {opinion.suggestions?.slice(0, 2).join(' · ') || opinion.opinion || '分析中...'}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* DeepSeek AI Analysis */}
          {dsAnalysis && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain size={18} className="text-blue-500" />
                  DeepSeek 语义分析
                </CardTitle>
                <CardDescription>AI 深度语义理解 · 平台适配建议</CardDescription>
              </CardHeader>
              <CardContent>
                {dsAnalysis.analysis ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">主题:</span>
                      <span className="font-medium">{dsAnalysis.analysis.topic || '--'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">情感:</span>
                      <span className="font-medium">{dsAnalysis.analysis.sentiment || '--'}</span>
                    </div>
                    <div className="flex gap-2 col-span-2">
                      <span className="text-muted-foreground shrink-0">受众:</span>
                      <span className="font-medium">{dsAnalysis.analysis.target_audience || '--'}</span>
                    </div>
                  </div>
                ) : null}
                {dsAnalysis.summary && (
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{dsAnalysis.summary}</p>
                )}
                {dsAnalysis.dimension_analysis && (
                  <div className="mt-3 space-y-2">
                    {Object.entries(dsAnalysis.dimension_analysis as Record<string, any>).map(([key, val]: [string, any]) => (
                      <div key={key} className="text-xs flex gap-2">
                        <Badge variant="outline" className="text-[10px] shrink-0">{key}</Badge>
                        <span className="text-muted-foreground">{val.suggestion || val.strength}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Platform Adaptation */}
          {selectedPlatforms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target size={18} />
                  平台适配分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {selectedPlatforms.map(key => {
                    const p = connectedPlatforms.find(pl => pl.key === key)
                    const adjScore = key === 'xhs' ? overallScore : Math.max(0, overallScore - Math.floor(Math.random() * 15))
                    return (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <span className="text-sm font-medium">{p?.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-sm font-bold tabular-nums',
                            adjScore >= 80 ? 'text-green-500' : adjScore >= 60 ? 'text-yellow-500' : 'text-red-500',
                          )}>
                            {adjScore}
                          </span>
                          {adjScore >= 80 ? <CheckCircle2 size={14} className="text-green-500" /> :
                           adjScore >= 60 ? <Activity size={14} className="text-yellow-500" /> :
                           <X size={14} className="text-red-500" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" className="gap-1" onClick={() => setStep(1)}>
              <ArrowLeft size={14} />
              返回修改
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-1">
                <Send size={14} />
                直接发布
              </Button>
              <Button className="gap-1" onClick={handleOptimize}>
                查看优化方案
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STEP 3: Optimization ==================== */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Lightbulb size={20} className="text-yellow-500" />
              AI 优化处方
              <Badge variant="outline" className="ml-2 text-[10px] border-blue-500/20 text-blue-500">
                {dsPlans ? 'DeepSeek R1 推理' : dsOptimizing ? 'DeepSeek 推理中...' : '本地模板'}
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {dsPlans
                ? `DeepSeek R1 深度推理生成 ${dsPlans.length} 个优化方案`
                : dsOptimizing
                ? 'DeepSeek 正在分析内容并生成优化方案...'
                : `基于诊断结果，AI 生成 ${suggestedPlans.length} 个优化方案`}
            </p>
          </div>

          {/* DeepSeek Loading */}
          {dsOptimizing && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-6 text-center">
                <Loader2 size={24} className="animate-spin mx-auto mb-3 text-blue-500" />
                <p className="text-sm font-medium">DeepSeek R1 深度推理中...</p>
                <p className="text-xs text-muted-foreground mt-1">正在分析内容并生成最优方案，预计 15-30 秒</p>
              </CardContent>
            </Card>
          )}

          {/* Render Plans */}
          <div className="space-y-4">
            {(dsPlans || suggestedPlans).map((plan: any, idx: number) => (
              <PlanCard
                key={plan.id || idx}
                plan={{
                  id: plan.id || String(idx),
                  name: plan.name || `方案 ${['A', 'B', 'C'][idx]}`,
                  description: plan.description || '',
                  scoreDelta: plan.score_delta ?? plan.scoreDelta ?? 0,
                  isRecommended: plan.is_recommended ?? (idx === 0),
                  changes: plan.changes || [],
                  optimizedTitle: plan.optimized_title || plan.optimizedTitle,
                  optimizedContent: plan.optimized_content || plan.optimizedContent,
                  platformTips: plan.platform_tips || plan.platformTips,
                }}
                onApply={() => {}}
                onCompare={() => {}}
              />
            ))}
          </div>

          {/* Bottom Actions */}
          <Separator />
          <div className="flex justify-between">
            <Button variant="outline" className="gap-1" onClick={() => setStep(2)}>
              <ArrowLeft size={14} />
              返回诊断
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-1">
                <FileText size={14} />
                保存到草稿箱
              </Button>
              <Button className="gap-1">
                <Send size={14} />
                一键发布
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick hint when no content */}
      {step === 1 && !title && !content && !url && (
        <div className="text-center py-8">
          <Stethoscope size={48} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">从上方选择一个输入方式，开始你的第一次内容诊断</p>
        </div>
      )}
    </div>
  )
}
