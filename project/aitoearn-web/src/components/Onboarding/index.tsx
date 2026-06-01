/**
 * Onboarding — 新用户引导流程
 *
 * 4 步引导：选择角色 → 内容偏好 → 绑定平台 → 首次创作
 * 完成后自动跳转工作台
 */

'use client'

import { useState, useCallback } from 'react'
import { Check, ChevronRight, ChevronLeft, Sparkles, User, Palette, Link2, PenLine, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── 步骤定义 ──

const ROLES = [
  { id: 'super_individual', label: '超级个体', desc: '个人创作者，内容变现', icon: '🚀' },
  { id: 'one_person', label: '一人公司', desc: '独立运营，效率优先', icon: '💼' },
  { id: 'small_biz', label: '小微企业', desc: '团队协作，品牌建设', icon: '🏢' },
  { id: 'medium_biz', label: '中型企业', desc: '多部门协同，全域运营', icon: '🏭' },
]

const PLATFORMS = [
  { id: 'douyin', label: '抖音' },
  { id: 'xhs', label: '小红书' },
  { id: 'bilibili', label: 'B站' },
  { id: 'wechat', label: '公众号' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
]

const INDUSTRIES = [
  '美妆护肤', '科技数码', '教育培训', '美食餐饮', '服装服饰',
  '家居生活', '母婴亲子', '健身运动', '旅游出行', '金融财经',
]

const STYLES = [
  { id: 'professional', label: '专业严谨', icon: '👔' },
  { id: 'casual', label: '轻松日常', icon: '☕' },
  { id: 'humorous', label: '幽默搞笑', icon: '😄' },
  { id: 'storytelling', label: '故事叙事', icon: '📖' },
  { id: 'trendy', label: '潮流时尚', icon: '🔥' },
]

// ── Types ──

interface OnboardingData {
  role: string
  platforms: string[]
  industry: string
  style: string
}

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void
  onSkip?: () => void
}

// ── Step Component ──

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={cn(
          'h-2 rounded-full transition-all duration-300',
          i === current ? 'w-8 bg-primary' : i < current ? 'w-2 bg-primary/40' : 'w-2 bg-muted',
        )} />
      ))}
    </div>
  )
}

// ── Main Component ──

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [industry, setIndustry] = useState('')
  const [style, setStyle] = useState('')
  const [topic, setTopic] = useState('')

  const totalSteps = 4

  const handleComplete = useCallback(() => {
    onComplete({ role, platforms, industry, style })
  }, [role, platforms, industry, style, onComplete])

  const canNext = () => {
    if (step === 0) return !!role
    if (step === 1) return !!industry && !!style
    if (step === 2) return true // platforms optional
    if (step === 3) return true // topic optional
    return true
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <StepIndicator current={step} total={totalSteps} />

      {/* ── Step 0: 选择角色 ── */}
      {step === 0 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">欢迎来到 AiBrand！</h2>
            <p className="text-sm text-muted-foreground mt-2">选择你的角色，我们将为你定制专属体验</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {ROLES.map(r => (
              <button key={r.id} onClick={() => setRole(r.id)}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl border-2 text-left cursor-pointer transition-all',
                  role === r.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30',
                )}>
                <span className="text-2xl">{r.icon}</span>
                <div>
                  <div className="font-medium">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.desc}</div>
                </div>
                {role === r.id && <Check className="h-5 w-5 text-primary ml-auto shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 1: 内容偏好 ── */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 mb-4">
              <Palette className="h-8 w-8 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold">内容偏好</h2>
            <p className="text-sm text-muted-foreground mt-2">选择你的行业和内容风格</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">行业领域</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(ind => (
                <button key={ind} onClick={() => setIndustry(ind)}
                  className={cn('px-3 py-1.5 rounded-full text-sm border cursor-pointer transition-all',
                    industry === ind ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40',
                  )}>
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">内容风格</label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map(s => (
                <button key={s.id} onClick={() => setStyle(s.id)}
                  className={cn('flex items-center gap-2 p-3 rounded-xl border-2 text-sm cursor-pointer transition-all',
                    style === s.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
                  )}>
                    <span>{s.icon}</span> {s.label}
                    {style === s.id && <Check className="h-4 w-4 text-primary ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: 绑定平台 ── */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 mb-4">
              <Link2 className="h-8 w-8 text-cyan-500" />
            </div>
            <h2 className="text-xl font-semibold">绑定你的社交平台</h2>
            <p className="text-sm text-muted-foreground mt-2">选择你正在使用的平台（可多选，稍后也可添加）</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => setPlatforms(prev =>
                prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id],
              )}
                className={cn('flex items-center gap-3 p-3 rounded-xl border-2 text-sm cursor-pointer transition-all',
                  platforms.includes(p.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
                )}>
                {platforms.includes(p.id) && <Check className="h-4 w-4 text-primary shrink-0" />}
                <span className={cn(!platforms.includes(p.id) && 'ml-7')}>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3: 首次创作 ── */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 mb-4">
              <PenLine className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold">开始你的第一次 AI 创作</h2>
            <p className="text-sm text-muted-foreground mt-2">输入一个主题，我们将为你生成第一条 AI 内容</p>
          </div>

          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">AI 内容生成</span>
            </div>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="例如：618大促活动推广文案..."
              className="w-full h-24 px-4 py-3 rounded-lg border border-border bg-background text-sm resize-none outline-none focus:border-primary/60 placeholder:text-muted-foreground/50"
            />
            <p className="text-xs text-muted-foreground mt-2">
              输入主题后，AI 将自动分析你的品牌调性，生成适合多平台发布的内容
            </p>
          </div>

          <div className="flex justify-center">
            <Button variant="outline" className="cursor-pointer text-xs" onClick={onSkip}>
              稍后再说，先看看平台
            </Button>
          </div>
        </div>
      )}

      {/* ── 完成页 ── */}
      {step >= totalSteps && (
        <div className="text-center space-y-6 animate-in zoom-in duration-500">
          <div className="inline-flex p-4 rounded-full bg-green-500/10 mb-4">
            <PartyPopper className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-semibold">一切就绪！</h2>
          <p className="text-sm text-muted-foreground">
            你的 AiBrand 工作台已经准备好了<br />
            {topic ? '点击下方按钮开始你的第一次 AI 创作' : '开始探索吧'}
          </p>
          <Button onClick={handleComplete} className="cursor-pointer" size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            开始创作
          </Button>
        </div>
      )}

      {/* ── 底部导航按钮 ── */}
      {step < totalSteps && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <div>
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(s => s - 1)} className="cursor-pointer">
                <ChevronLeft className="h-4 w-4 mr-1" /> 上一步
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step < totalSteps - 1 && (
              <Button variant="ghost" className="cursor-pointer text-xs" onClick={onSkip}>跳过引导</Button>
            )}
            <Button
              onClick={() => step === totalSteps - 1 ? handleComplete() : setStep(s => s + 1)}
              disabled={!canNext()}
              className="cursor-pointer"
            >
              {step === totalSteps - 1 ? (
                <>完成 <Sparkles className="h-4 w-4 ml-1" /></>
              ) : (
                <>下一步 <ChevronRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 步骤文字 */}
      <p className="text-center text-xs text-muted-foreground mt-4">
        {step < totalSteps ? `第 ${step + 1} 步，共 ${totalSteps} 步` : ''}
      </p>
    </div>
  )
}
