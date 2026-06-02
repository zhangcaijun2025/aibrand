/**
 * Onboarding — AI 业务诊断与升级路线图
 *
 * 4 步诊断：角色定位 → 痛点识别 → AI能力评估 → 个性化升级路线图
 * 从"收集信息"升级为"诊断 + 开方"，让用户一进来就感知价值
 */

'use client'

import { useState, useCallback } from 'react'
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  User,
  Target,
  Zap,
  Lightbulb,
  TrendingUp,
  Clock,
  Users2,
  DollarSign,
  Bot,
  BarChart3,
  Share2,
  PartyPopper,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── 步骤 1：角色与行业 ──

const ROLES = [
  { id: 'super_individual', label: '超级个体', desc: '个人做内容/知识付费/电商，一人多角', icon: '🚀' },
  { id: 'one_person', label: '一人公司', desc: '独立创业者，有团队外包但核心自己做', icon: '💼' },
  { id: 'small_biz', label: '中小企业', desc: '有小团队，需要流程化和规模化运营', icon: '🏢' },
]

const INDUSTRIES = [
  '美妆护肤', '科技数码', '教育培训', '美食餐饮', '服装服饰',
  '家居生活', '母婴亲子', '健身运动', '旅游出行', '金融财经',
  '医疗健康', '法律服务', '房地产', '农业', '其他',
]

const PLATFORMS = [
  { id: 'douyin', label: '抖音' },
  { id: 'xhs', label: '小红书' },
  { id: 'bilibili', label: 'B站' },
  { id: 'wechat', label: '公众号' },
  { id: 'sph', label: '视频号' },
  { id: 'kuaishou', label: '快手' },
]

// ── 步骤 2：业务痛点识别（五大痛点映射） ──

const PAIN_POINTS = [
  { id: 'cognitive', label: '认知断点', desc: '知道 AI 有用，但不知道怎么用到自己的生意里', icon: <Lightbulb className="h-5 w-5" />, color: 'text-amber-500' },
  { id: 'skill', label: '技能断层', desc: '用过 AI 但效果不好，写不出高质量指令', icon: <Bot className="h-5 w-5" />, color: 'text-blue-500' },
  { id: 'disconnected', label: '系统断连', desc: '工具太多数据不互通，重复劳动效率低', icon: <Share2 className="h-5 w-5" />, color: 'text-purple-500' },
  { id: 'isolated', label: '资源孤岛', desc: '一个人摸索很孤独，遇到问题没人交流', icon: <Users2 className="h-5 w-5" />, color: 'text-green-500' },
  { id: 'monetize', label: '变现鸿沟', desc: '有能力但不知道怎么变成收入', icon: <DollarSign className="h-5 w-5" />, color: 'text-red-500' },
]

// ── 步骤 3：当前 AI 使用成熟度 ──

const AI_MATURITY = [
  { id: 'beginner', label: '刚接触', desc: '听说过 AI，偶尔用 ChatGPT 聊聊天', icon: '🌱' },
  { id: 'explorer', label: '在尝试', desc: '经常用 AI 写文案、做图，但不成体系', icon: '🔍' },
  { id: 'practitioner', label: '日常使用', desc: 'AI 已经是日常工具，想进一步提升效率', icon: '⚡' },
  { id: 'advanced', label: '深度整合', desc: '已经把 AI 嵌入工作流，想规模化放大', icon: '🚀' },
]

// ── Types ──

interface OnboardingData {
  role: string
  industry: string
  platforms: string[]
  painPoints: string[]
  aiMaturity: string
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
        <div key={i}
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            i === current ? 'w-8' : i < current ? 'w-2' : 'w-2 bg-muted',
          )}
          style={i === current ? { background: 'var(--brand-gradient)' } : i < current ? { background: 'var(--brand-purple)', opacity: 0.4 } : undefined}
        />
      ))}
    </div>
  )
}

// ── 生成个性化路线图 ──

function generateRoadmap(data: OnboardingData) {
  const painLabels: Record<string, string> = {
    cognitive: '认知断点',
    skill: '技能断层',
    disconnected: '系统断连',
    isolated: '资源孤岛',
    monetize: '变现鸿沟',
  }

  const painStrategies: Record<string, string> = {
    cognitive: '先用 AI 完成一次完整的"选题→创作→发布→看数据"闭环，感受 AI 如何嵌入业务流程',
    skill: '从指令库选择 3 个模板直接使用，无需自己写 prompt，在模仿中学习',
    disconnected: '将你的账号绑定到 AiBrand，从此在一个地方管理所有平台的内容',
    isolated: '查看同行案例拆解室，看看和你类似的人是怎么做的。你并不孤单',
    monetize: '专注把内容做好，数据跑起来后，AI 会给你变现建议',
  }

  const steps: { title: string; desc: string; icon: string }[] = []

  // 本周
  steps.push({
    title: '本周目标：跑通第一个闭环',
    desc: [
      '1. 绑定你最常用的 2 个社交平台账号',
      '2. 在 AI 共创空间完成第一次内容创作',
      '3. 发布你的第一条 AI 内容并观察数据反馈',
    ].join('\n'),
    icon: '🎯',
  })

  // 本月
  const level = AI_MATURITY.find(m => m.id === data.aiMaturity)
  steps.push({
    title: '本月目标：建立 AI 运营习惯',
    desc: [
      data.painPoints.includes('skill')
        ? '• 每天使用指令库的 1 个模板，逐步建立自己的指令收藏夹'
        : '• 批量生成一周内容，尝试定时发布',
      data.painPoints.includes('disconnected')
        ? '• 完成所有平台的账号绑定，体验统一管理'
        : '• 在内容日历中排期下周内容',
      `• AI 成熟度：${level?.label || '刚接触'} → 下一阶段：${level?.id === 'beginner' ? '在尝试' : level?.id === 'explorer' ? '日常使用' : level?.id === 'practitioner' ? '深度整合' : '规模化'}`,
    ].join('\n'),
    icon: '📅',
  })

  // 三月
  steps.push({
    title: '三月目标：AI 成为你的运营伙伴',
    desc: [
      '• AI 自动生成每周数据报告，你只需看结论',
      '• 指令库有 50+ 个你专属的收藏模板',
      '• 跨平台内容一键适配、定时发布完全自动化',
      data.painPoints.includes('monetize')
        ? '• 启动第一个变现尝试（接广告 / 知识付费 / 私域转化）'
        : '• 开始帮身边的人做运营，成为圈子里的 AI 运营专家',
    ].join('\n'),
    icon: '🚀',
  })

  return {
    painSummary: data.painPoints.map(p => painLabels[p]).filter(Boolean),
    strategies: data.painPoints.map(p => painStrategies[p]).filter(Boolean),
    steps,
    role: ROLES.find(r => r.id === data.role)?.label || '',
    industry: data.industry || '未指定',
  }
}

// ── Main Component ──

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('')
  const [industry, setIndustry] = useState('')
  const [painPoints, setPainPoints] = useState<string[]>([])
  const [aiMaturity, setAiMaturity] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])

  const totalSteps = 4

  const data: OnboardingData = { role, industry, platforms, painPoints, aiMaturity }

  const handleComplete = useCallback(() => {
    onComplete(data)
  }, [role, industry, platforms, painPoints, aiMaturity, onComplete])

  const canNext = () => {
    if (step === 0) return !!role && !!industry
    if (step === 1) return painPoints.length > 0
    if (step === 2) return !!aiMaturity
    return true
  }

  const roadmap = step >= totalSteps ? generateRoadmap(data) : null

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <StepIndicator current={step} total={totalSteps} />

      {/* ── Step 0: 角色 + 行业 ── */}
      {step === 0 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 mb-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">欢迎来到 AiBrand！</h2>
            <p className="text-sm text-muted-foreground mt-2">告诉我你是谁，AI 将为你定制专属运营方案</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">你的角色</label>
            <div className="grid grid-cols-1 gap-2">
              {ROLES.map(r => (
                <button key={r.id} onClick={() => setRole(r.id)}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-xl border-2 text-left cursor-pointer transition-all duration-200',
                    role === r.id ? 'border-(--brand-purple) bg-(--brand-gradient-glow) shadow-(--brand-shadow-sm)' : 'border-border hover:border-(--brand-purple)/30 hover:-translate-y-0.5 hover:shadow-sm',
                  )}>
                  <span className="text-xl">{r.icon}</span>
                  <div>
                    <div className="font-medium text-sm">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.desc}</div>
                  </div>
                  {role === r.id && <Check className="h-5 w-5 text-primary ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">行业领域</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(ind => (
                <button key={ind} onClick={() => setIndustry(ind)}
                  className={cn('px-3 py-1.5 rounded-full text-sm border cursor-pointer transition-all duration-200',
                    industry === ind ? 'text-white border-transparent' : 'border-border hover:border-(--brand-purple)/40 hover:-translate-y-0.5',
                  )}
                  style={industry === ind ? { background: 'var(--brand-gradient)' } : undefined}>
                  {ind}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1: 痛点诊断 ── */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-red-500/10 mb-4">
              <Target className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold">你在运营中遇到哪些困扰？</h2>
            <p className="text-sm text-muted-foreground mt-2">选出最困扰你的问题（可多选），AI 会针对性帮你解决</p>
          </div>

          <div className="space-y-3">
            {PAIN_POINTS.map(p => (
              <button key={p.id} onClick={() => setPainPoints(prev =>
                prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id],
              )}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl border-2 text-left cursor-pointer transition-all w-full',
                  painPoints.includes(p.id) ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30',
                )}>
                <div className={cn(
                  'inline-flex p-2 rounded-lg shrink-0',
                  painPoints.includes(p.id) ? 'bg-primary/10' : 'bg-muted',
                )}>
                  <span className={p.color}>{p.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {p.label}
                    {painPoints.includes(p.id) && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: AI 成熟度 + 平台 ── */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 mb-4">
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold">你现在怎么用 AI？</h2>
            <p className="text-sm text-muted-foreground mt-2">选择最接近你当前状态的描述</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {AI_MATURITY.map(m => (
              <button key={m.id} onClick={() => setAiMaturity(m.id)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center cursor-pointer transition-all',
                  aiMaturity === m.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30',
                )}>
                <span className="text-2xl">{m.icon}</span>
                <div className="font-medium text-sm">{m.label}</div>
                <div className="text-[10px] text-muted-foreground leading-tight">{m.desc}</div>
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">你主要使用哪些平台？（可多选）</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setPlatforms(prev =>
                  prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id],
                )}
                  className={cn('px-3 py-2 rounded-lg border text-sm cursor-pointer transition-all text-center',
                    platforms.includes(p.id) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30',
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: 路线图预览 ── */}
      {step === totalSteps - 1 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-green-500/10 mb-4">
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold">即将为你生成专属方案</h2>
            <p className="text-sm text-muted-foreground mt-2">
              基于你的角色、行业和痛点，AI 将为你生成个性化的
              <strong>《AI 业务升级路线图》</strong>
            </p>
          </div>

          {/* 已选信息摘要 */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="text-sm font-medium">你的画像摘要</div>
            <div className="flex flex-wrap gap-1.5">
              {role && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-xs text-blue-600">
                  {ROLES.find(r => r.id === role)?.icon} {ROLES.find(r => r.id === role)?.label}
                </span>
              )}
              {industry && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-xs text-purple-600">
                  {industry}
                </span>
              )}
              {painPoints.map(p => {
                const pp = PAIN_POINTS.find(pp => pp.id === p)
                return (
                  <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-xs text-red-600">
                    {pp?.label}
                  </span>
                )
              })}
              {aiMaturity && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-xs text-green-600">
                  {AI_MATURITY.find(m => m.id === aiMaturity)?.icon} {AI_MATURITY.find(m => m.id === aiMaturity)?.label}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            点击"生成方案"，AI 将立即为你定制专属运营升级路线图
          </p>
        </div>
      )}

      {/* ── 完成页：AI 升级路线图 ── */}
      {step >= totalSteps && roadmap && (
        <div className="space-y-5 animate-in zoom-in duration-500">
          <div className="text-center">
            <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 mb-3">
              <PartyPopper className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">你的 AI 业务升级路线图</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {roadmap.role} · {roadmap.industry}
            </p>
          </div>

          {/* 痛点 + 策略 */}
          {roadmap.painSummary.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                重点关注
              </div>
              <div className="flex flex-wrap gap-1.5">
                {roadmap.painSummary.map(p => (
                  <span key={p} className="px-2.5 py-1 rounded-full bg-amber-500/10 text-xs text-amber-700 font-medium">{p}</span>
                ))}
              </div>
              <div className="space-y-1.5 mt-2">
                {roadmap.strategies.map((s, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {s}</p>
                ))}
              </div>
            </div>
          )}

          {/* 三阶段路线图 */}
          <div className="space-y-3">
            {roadmap.steps.map((s, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{s.icon}</span>
                  <span className="font-medium text-sm">{s.title}</span>
                </div>
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{s.desc}</pre>
              </div>
            ))}
          </div>

          <Button onClick={handleComplete} className="cursor-pointer w-full" size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            进入我的工作台
          </Button>
        </div>
      )}

      {/* ── 底部导航 ── */}
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
            {step === 0 && (
              <Button variant="ghost" className="cursor-pointer text-xs" onClick={onSkip}>跳过，先进去看看</Button>
            )}
            <Button
              onClick={() => {
                if (step === totalSteps - 1) {
                  setStep(totalSteps) // trigger roadmap generation
                } else {
                  setStep(s => s + 1)
                }
              }}
              disabled={!canNext()}
              className="cursor-pointer"
            >
              {step === totalSteps - 1 ? (
                <>生成方案 <Sparkles className="h-4 w-4 ml-1" /></>
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
